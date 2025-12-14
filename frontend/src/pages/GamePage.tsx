import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import Typewriter from '../components/Typewriter';
import ConfirmDialog from '../components/ConfirmDialog';
import GameOverPanel from '../components/GameOverPanel';
import CombatLogEntry, { type LogEntry } from '../components/CombatLogEntry';
import TypingLogEntry from '../components/TypingLogEntry';
import BottomSheet from '../components/BottomSheet';
import Spinner from '../components/Spinner';
import Tooltip from '../components/Tooltip';
import { isNarrativeText } from '../utils/combat';
import type { DiceResult } from '../types';

export default function GamePage() {
  const { gameState, narrative, availableActions, sendAction, exitGame, loadGame, isLoading, currentSlot, sceneType, combatInfo } = useGame();
  const navigate = useNavigate();
  const [isReading, setIsReading] = useState(false);
  const [pendingNarrative, setPendingNarrative] = useState<string[]>([]);
  const lastNarrativeLength = useRef(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lastDiceResult, setLastDiceResult] = useState<DiceResult | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);

  // 中間主視覺區的累積訊息 log
  const [combatLog, setCombatLog] = useState<LogEntry[]>([]);
  const [typingEntry, setTypingEntry] = useState<LogEntry | null>(null);
  const [typingCharIndex, setTypingCharIndex] = useState(0);
  const logIdRef = useRef(0);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const mobileLogContainerRef = useRef<HTMLDivElement>(null);

  // 受擊特效狀態
  const [enemyHit, setEnemyHit] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);

  // 手機版背包 Bottom Sheet 狀態
  const [showInventory, setShowInventory] = useState(false);

  // Redirect if no active game
  useEffect(() => {
    if (!currentSlot) {
      navigate('/');
    }
  }, [currentSlot, navigate]);

  // 待打字的訊息佇列
  const [pendingEntries, setPendingEntries] = useState<LogEntry[]>([]);

  // 用 ref 追蹤 lastDiceResult 以避免依賴問題
  const lastDiceResultRef = useRef<DiceResult | null>(null);
  lastDiceResultRef.current = lastDiceResult;

  // 偵測新敘事
  useEffect(() => {
    if (narrative.length > lastNarrativeLength.current) {
      const newTexts = narrative.slice(lastNarrativeLength.current);
      lastNarrativeLength.current = narrative.length;

      // 判斷：戰鬥中 或 含有系統訊息 → 主視覺區，否則 → 對話框
      const shouldGoToLog = sceneType === 'combat' || !isNarrativeText(newTexts);

      if (shouldGoToLog) {
        // 加入待打字佇列
        const entry: LogEntry = {
          id: logIdRef.current++,
          type: sceneType === 'combat' ? 'combat' : 'system',
          content: newTexts,
          diceResult: lastDiceResultRef.current || undefined,
        };
        setPendingEntries(prev => [...prev, entry]);
        setLastDiceResult(null);
      } else {
        // 純劇情用 Typewriter
        setPendingNarrative(newTexts);
        setIsReading(true);
      }
    }
  }, [narrative, sceneType]);

  // 處理打字佇列：當沒有正在打字的 entry 時，從佇列取出下一個
  useEffect(() => {
    if (!typingEntry && pendingEntries.length > 0) {
      const [next, ...rest] = pendingEntries;
      setTypingEntry(next);
      setTypingCharIndex(0);
      setPendingEntries(rest);
    }
  }, [typingEntry, pendingEntries]);

  // 打字效果
  const typingSpeed = 15; // ms per character
  const fullText = typingEntry ? typingEntry.content.join('\n') : '';

  useEffect(() => {
    if (!typingEntry) return;

    if (typingCharIndex < fullText.length) {
      const timer = setTimeout(() => {
        setTypingCharIndex(prev => prev + 1);
      }, typingSpeed);
      return () => clearTimeout(timer);
    } else {
      // 打字完成，將 entry 加入 combatLog
      setCombatLog(prev => [...prev, typingEntry]);
      setTypingEntry(null);
      setTypingCharIndex(0);
    }
  }, [typingEntry, typingCharIndex, fullText]);

  // 點擊加速打字
  const handleLogClick = () => {
    if (typingEntry && typingCharIndex < fullText.length) {
      // 直接顯示完整文字
      setTypingCharIndex(fullText.length);
    }
  };

  // 滾動到 log 底部（電腦版和手機版）- 使用 useLayoutEffect 確保 DOM 更新後立即滾動
  useLayoutEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    if (mobileLogContainerRef.current) {
      mobileLogContainerRef.current.scrollTop = mobileLogContainerRef.current.scrollHeight;
    }
  }, [combatLog, typingCharIndex]);

  const handleReadingComplete = () => {
    setPendingNarrative([]);
    setIsReading(false);
  };

  const handleExit = () => {
    setShowExitConfirm(true);
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    exitGame();
    navigate('/');
  };

  const handleGameOverRestart = async () => {
    if (!currentSlot) return;
    setIsGameOver(false);
    setIsReading(false);
    setPendingNarrative([]);
    setCombatLog([]);
    lastNarrativeLength.current = 0;
    await loadGame(currentSlot);
  };

  const handleGameOverMenu = () => {
    setIsGameOver(false);
    exitGame();
    navigate('/');
  };

  const handleAction = async (action: { id: string; type: string; label: string; data?: Record<string, unknown> }) => {
    try {
      const response = await sendAction({
        action_type: action.type,
        action_data: action.data || { choice_id: action.id }
      });
      // 儲存骰子結果（沒有時清除）
      if (response.dice_result) {
        setLastDiceResult(response.dice_result);
      } else {
        setLastDiceResult(null);
      }
      // 敵人受擊特效（玩家攻擊成功時）
      if (action.type === 'attack' && response.dice_result?.result === 'success') {
        setEnemyHit(true);
        setTimeout(() => setEnemyHit(false), 500);
      }
      // 玩家受擊特效（HP 減少時）
      const newPlayerHp = response.state_changes?.player_hp;
      if (typeof newPlayerHp === 'number' &&
          gameState?.player?.hp !== undefined &&
          newPlayerHp < gameState.player.hp) {
        setPlayerHit(true);
        setTimeout(() => setPlayerHit(false), 500);
      }
      // 檢查 Game Over
      if (typeof newPlayerHp === 'number' && newPlayerHp <= 0) {
        setIsGameOver(true);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  // Show loading or redirect if no slot
  if (!currentSlot) {
    return null;
  }

  const inCombat = sceneType === 'combat' && combatInfo;

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* ===== 電腦版 (md 以上) ===== */}
      <div className="hidden md:flex flex-1 min-h-0">
        {/* 左側面板（延伸到底） */}
        <aside className="w-56 lg:w-64 bg-gray-800 flex flex-col shrink-0 border-r border-gray-700">
          {/* 左上：敵人資訊（戰鬥時顯示） */}
          <div className="p-3 lg:p-4 border-b border-gray-700 min-h-[160px]">
            {inCombat ? (
              <div className={`border rounded-lg p-2 lg:p-3 transition-all duration-300 ${
                enemyHit
                  ? 'bg-red-600/70 border-red-400 scale-105 shadow-lg shadow-red-500/50 animate-hit-shake'
                  : combatInfo.enemy_hp <= 0
                    ? 'bg-gray-800/30 border-gray-600'
                    : 'bg-red-900/30 border-red-700'
              }`}>
                <h3 className={`font-bold text-sm lg:text-base mb-2 ${combatInfo.enemy_hp <= 0 ? 'text-gray-500 line-through' : 'text-red-400'}`}>
                  {combatInfo.enemy_name}
                </h3>
                {/* HP 條 */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>HP</span>
                    <span>{Math.max(0, combatInfo.enemy_hp)}/{combatInfo.enemy_max_hp}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${combatInfo.enemy_hp <= 0 ? 'bg-gray-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.max(0, (combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100)}%` }}
                    />
                  </div>
                </div>
                {/* 敵人能力 */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">迴避</span>
                    <span className="text-gray-300">{combatInfo.enemy_evasion}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">弱點</span>
                    <span className="text-amber-400">{combatInfo.enemy_weakness}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-600 text-sm text-center py-6">
                — 無敵人 —
              </div>
            )}
          </div>

          {/* 左下：角色狀態 */}
          <div className={`flex-1 p-3 lg:p-4 flex flex-col transition-all duration-300 ${
            playerHit ? 'bg-red-900/50 animate-hit-shake' : ''
          }`}>
            {gameState?.player ? (
              <>
                <h2 className={`text-base lg:text-lg font-bold mb-2 transition-colors ${
                  playerHit ? 'text-red-400' : 'text-amber-400'
                }`}>
                  {gameState.player.name}
                </h2>

                {/* HP/MP Bars */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className={`flex justify-between text-xs mb-1 ${
                      gameState.player.hp / gameState.player.max_hp <= 0.3 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      <span>HP</span>
                      <span>{gameState.player.hp}/{gameState.player.max_hp}</span>
                    </div>
                    <div className={`h-2 bg-gray-700 rounded-full overflow-hidden ${
                      playerHit ? 'animate-pulse' : ''
                    }`}>
                      <div
                        className={`h-full transition-all ${
                          gameState.player.hp / gameState.player.max_hp <= 0.3
                            ? 'bg-red-600 animate-pulse'
                            : 'bg-red-500'
                        }`}
                        style={{ width: `${(gameState.player.hp / gameState.player.max_hp) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>MP</span>
                      <span>{gameState.player.mp}/{gameState.player.max_mp}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(gameState.player.mp / gameState.player.max_mp) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <span className="text-gray-400">力</span>
                    <span className="float-right">{gameState.player.stats.strength}</span>
                  </div>
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <span className="text-gray-400">敏</span>
                    <span className="float-right">{gameState.player.stats.dexterity}</span>
                  </div>
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <span className="text-gray-400">智</span>
                    <span className="float-right">{gameState.player.stats.intelligence}</span>
                  </div>
                  <div className="bg-gray-700/50 p-1.5 rounded">
                    <span className="text-gray-400">感</span>
                    <span className="float-right">{gameState.player.stats.perception}</span>
                  </div>
                </div>

                {/* Gold */}
                <div className="bg-amber-900/30 p-1.5 rounded text-center text-sm">
                  <span className="text-amber-400">{gameState.player.gold} G</span>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-4">載入中...</div>
            )}

            {/* Exit Button */}
            <button
              onClick={handleExit}
              className="mt-auto py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm"
            >
              離開遊戲
            </button>
          </div>
        </aside>

        {/* 中間主視覺區：累積訊息 + 底部對話框 */}
        <main className="flex-1 flex flex-col min-h-0">
          {/* 戰鬥訊息 log */}
          <div
            ref={logContainerRef}
            className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 cursor-pointer"
            onClick={handleLogClick}
          >
            {combatLog.length === 0 && !typingEntry && !inCombat ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-gray-600 text-center">
                  {narrative.length === 0 ? '冒險即將開始...' : ''}
                </p>
              </div>
            ) : (
              <>
                {/* 已完成的 log */}
                {combatLog.map((entry) => (
                  <CombatLogEntry key={entry.id} entry={entry} />
                ))}
                {/* 正在打字的內容 */}
                {typingEntry && (
                  <TypingLogEntry
                    fullText={fullText}
                    charIndex={typingCharIndex}
                    diceResult={typingEntry.diceResult}
                  />
                )}
              </>
            )}
          </div>

          {/* 教學提示 */}
          {inCombat && combatInfo.tutorial_text && combatInfo.enemy_hp > 0 && (
            <div className="px-4 pb-2">
              <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-2">
                <p className="text-amber-300 text-xs">{combatInfo.tutorial_text}</p>
              </div>
            </div>
          )}

          {/* 底部對話框（在中間區域內） */}
          <div className="h-28 lg:h-32 bg-gray-800 border-t border-gray-700 p-3 shrink-0">
            <div className="h-full flex items-center justify-center">
              {isLoading ? (
                <Spinner size="md" />
              ) : isReading && pendingNarrative.length > 0 ? (
                <Typewriter
                  texts={pendingNarrative}
                  speed={50}
                  onComplete={handleReadingComplete}
                />
              ) : !inCombat && availableActions.length === 0 && narrative.length > 0 ? (
                <p className="text-gray-500 text-center">[ 章節結束 ]</p>
              ) : !inCombat && narrative.length === 0 ? (
                <p className="text-gray-500 text-center">冒險即將開始...</p>
              ) : (
                <p className="text-gray-600 text-sm">— 等待行動 —</p>
              )}
            </div>
          </div>
        </main>

        {/* 右側：物品欄 + 選項（延伸到底） */}
        <aside className="w-48 lg:w-56 bg-gray-800 border-l border-gray-700 shrink-0 flex flex-col">
          {/* 物品欄 */}
          <div className="flex-1 p-3 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-300 mb-2">物品欄</h3>
            <div className="text-xs">
              {!gameState?.player?.inventory || gameState.player.inventory.length === 0 ? (
                <p className="text-gray-500">空無一物</p>
              ) : (
                <ul className="space-y-1">
                  {gameState.player.inventory.map((item) => {
                    const isConsumable = item.type === 'consumable' || item.type === 'potion';
                    return (
                      <li key={item.id}>
                        <Tooltip
                          content={item.description || `${item.name} (${item.type})`}
                          position="bottom"
                        >
                          {isConsumable ? (
                            <button
                              onClick={() => handleAction({
                                id: `use_${item.id}`,
                                type: 'use_item',
                                label: item.name,
                                data: { item_id: item.id }
                              })}
                              disabled={isLoading}
                              className="w-full flex justify-between items-center p-1.5 rounded
                                         bg-gray-700/50 hover:bg-gray-600/50 transition-colors
                                         text-left disabled:opacity-50"
                            >
                              <span className="text-green-400 truncate">{item.name}</span>
                              <span className="text-gray-500 ml-1">x{item.quantity}</span>
                            </button>
                          ) : (
                            <div className="flex justify-between p-1.5 text-gray-400 cursor-help">
                              <span className="truncate">{item.name}</span>
                              <span className="text-gray-600 ml-1">x{item.quantity}</span>
                            </div>
                          )}
                        </Tooltip>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* 選項區（右側下方） */}
          {!isReading && availableActions.length > 0 && (
            <div className="p-3 border-t border-gray-700 bg-gray-800/80">
              <div className="space-y-1.5">
                {availableActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleAction(action)}
                    disabled={isLoading}
                    className={`w-full py-2 px-3 rounded-lg transition-all text-xs ${
                      inCombat
                        ? 'bg-red-900/50 hover:bg-red-800/60 border border-red-700 hover:border-red-500'
                        : 'bg-gray-700 hover:bg-gray-600 border border-gray-600 hover:border-amber-500'
                    }`}
                  >
                    <span className="text-gray-100">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* ===== 手機版 (md 以下) ===== */}
      <div className="flex md:hidden flex-col flex-1 min-h-0">
        {/* 頂部：角色狀態 + 右上按鈕 */}
        <div className="bg-gray-800 p-2 border-b border-gray-700">
          <div className="flex items-start gap-2">
            {/* 角色狀態 */}
            {gameState?.player && (
              <div className={`flex-1 transition-all duration-300 ${playerHit ? 'bg-red-900/50 animate-hit-shake' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-bold text-sm truncate">{gameState.player.name}</span>
                  <span className="text-amber-400/60 text-xs">{gameState.player.gold} G</span>
                </div>
                <div className="space-y-1">
                  {/* HP */}
                  <div className="flex items-center gap-2">
                    <span className={`text-xs w-6 ${
                      gameState.player.hp / gameState.player.max_hp <= 0.3 ? 'text-red-400' : 'text-gray-500'
                    }`}>HP</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          gameState.player.hp / gameState.player.max_hp <= 0.3
                            ? 'bg-red-600 animate-pulse'
                            : playerHit ? 'bg-red-500 animate-pulse' : 'bg-red-500'
                        }`}
                        style={{ width: `${(gameState.player.hp / gameState.player.max_hp) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs w-12 text-right ${
                      gameState.player.hp / gameState.player.max_hp <= 0.3 ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {gameState.player.hp}/{gameState.player.max_hp}
                    </span>
                  </div>
                  {/* MP */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6">MP</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${(gameState.player.mp / gameState.player.max_mp) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">
                      {gameState.player.mp}/{gameState.player.max_mp}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* 右上按鈕：離開 + 背包（垂直排列，44x44 觸控區域） */}
            <div className="flex flex-col items-center shrink-0">
              {/* 離開按鈕 - 使用門/登出圖示 */}
              <button
                onClick={handleExit}
                aria-label="離開遊戲"
                className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
              {/* 背包按鈕 */}
              <button
                onClick={() => setShowInventory(true)}
                aria-label="開啟物品欄"
                className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-amber-400 transition-colors relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {/* 物品數量徽章 */}
                {gameState?.player?.inventory && gameState.player.inventory.length > 0 && (
                  <span className="absolute top-1 right-1 bg-amber-500 text-gray-900 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {gameState.player.inventory.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 敵人狀態（戰鬥時獨立一列） */}
        {inCombat && (
          <div className={`bg-gray-800 px-2 py-1.5 border-b border-gray-700 transition-all duration-300 ${
            enemyHit ? 'bg-red-600/60 animate-hit-shake' : ''
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className={`text-sm font-bold ${combatInfo.enemy_hp <= 0 ? 'text-gray-500 line-through' : 'text-red-400'}`}>
                {combatInfo.enemy_name}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">迴避 {combatInfo.enemy_evasion}%</span>
                <span className="text-amber-400">弱點: {combatInfo.enemy_weakness}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-6">HP</span>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${combatInfo.enemy_hp <= 0 ? 'bg-gray-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(0, (combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-12 text-right">
                {Math.max(0, combatInfo.enemy_hp)}/{combatInfo.enemy_max_hp}
              </span>
            </div>
          </div>
        )}

        {/* 手機版教學提示 */}
        {inCombat && combatInfo.tutorial_text && combatInfo.enemy_hp > 0 && (
          <div className="bg-amber-900/30 border-b border-amber-700 px-3 py-2">
            <p className="text-amber-300 text-xs">{combatInfo.tutorial_text}</p>
          </div>
        )}

        {/* 中間主區域：戰鬥 log */}
        <div
          ref={mobileLogContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-2 cursor-pointer"
          onClick={handleLogClick}
        >
          {combatLog.length === 0 && !typingEntry && !inCombat ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-600 text-center text-sm">
                {narrative.length === 0 ? '冒險即將開始...' : ''}
              </p>
            </div>
          ) : (
            <>
              {/* 已完成的 log */}
              {combatLog.map((entry) => (
                <CombatLogEntry key={entry.id} entry={entry} compact />
              ))}
              {/* 正在打字的內容 */}
              {typingEntry && (
                <TypingLogEntry
                  fullText={fullText}
                  charIndex={typingCharIndex}
                  diceResult={typingEntry.diceResult}
                  compact
                />
              )}
            </>
          )}
        </div>

        {/* 選項按鈕（手機版 - 在對話框上方） */}
        {!isReading && availableActions.length > 0 && (
          <div className="bg-gray-800 border-t border-gray-700 p-2">
            <div className="flex flex-wrap gap-1.5 justify-center">
              {availableActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isLoading}
                  className={`py-2 px-3 rounded-lg transition-all text-xs ${
                    inCombat
                      ? 'bg-red-900/50 border border-red-700'
                      : 'bg-gray-700 border border-gray-600'
                  }`}
                >
                  <span className="text-gray-100">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部對話框（手機版 - 固定高度防止跳動） */}
        <div className="min-h-[100px] bg-gray-800 border-t border-gray-700 p-3 safe-area-pb flex items-center justify-center">
          {isLoading ? (
            <Spinner size="sm" />
          ) : isReading && pendingNarrative.length > 0 ? (
            <Typewriter texts={pendingNarrative} speed={50} onComplete={handleReadingComplete} />
          ) : !inCombat && narrative.length === 0 ? (
            <p className="text-gray-500 text-center text-sm">冒險即將開始...</p>
          ) : (
            <p className="text-gray-600 text-xs text-center">— 等待行動 —</p>
          )}
        </div>
      </div>

      {/* 手機版 Bottom Sheet 物品欄 */}
      <BottomSheet
        isOpen={showInventory}
        onClose={() => setShowInventory(false)}
        title="物品欄"
      >
        {!gameState?.player?.inventory || gameState.player.inventory.length === 0 ? (
          <p className="text-gray-500 text-center py-8">空無一物</p>
        ) : (
          <ul className="space-y-2">
            {gameState.player.inventory.map((item) => {
              const isConsumable = item.type === 'consumable' || item.type === 'potion';
              return (
                <li
                  key={item.id}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={isConsumable ? 'text-green-400' : 'text-gray-300'}>
                        {item.name}
                      </span>
                      <span className="text-gray-500 text-sm">x{item.quantity}</span>
                    </div>
                    {isConsumable && (
                      <button
                        onClick={() => {
                          handleAction({
                            id: `use_${item.id}`,
                            type: 'use_item',
                            label: item.name,
                            data: { item_id: item.id }
                          });
                          setShowInventory(false);
                        }}
                        disabled={isLoading}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors disabled:bg-gray-600"
                      >
                        使用
                      </button>
                    )}
                  </div>
                  {/* 物品描述 */}
                  {item.description && (
                    <p className="text-gray-400 text-xs mt-1">{item.description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </BottomSheet>

      {/* Exit Confirm Dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        title="離開遊戲"
        message="確定要離開遊戲嗎？進度已自動儲存。"
        confirmText="離開"
        cancelText="取消"
        onConfirm={confirmExit}
        onCancel={() => setShowExitConfirm(false)}
        variant="warning"
      />

      {/* Game Over Panel */}
      <GameOverPanel
        isOpen={isGameOver}
        onRestart={handleGameOverRestart}
        onReturnToMenu={handleGameOverMenu}
      />
    </div>
  );
}
