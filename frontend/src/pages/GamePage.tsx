import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import Typewriter from '../components/Typewriter';
import ConfirmDialog from '../components/ConfirmDialog';
import GameOverPanel from '../components/GameOverPanel';
import type { DiceResult } from '../types';

interface LogEntry {
  id: number;
  type: 'combat' | 'dice' | 'result' | 'system';
  content: string[];
  diceResult?: DiceResult;
}

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

  // 判斷文字是否為純劇情（不含戰鬥/系統訊息）
  const isNarrativeText = (texts: string[]): boolean => {
    const systemPatterns = [
      '獲得', '失去', '傷害', 'HP', 'MP', '經驗', '金幣',
      '【', '】', '攻擊', '防禦', '迴避', '命中', '擲骰'
    ];
    return !texts.some(text =>
      systemPatterns.some(pattern => text.includes(pattern))
    );
  };

  // 待打字的訊息佇列
  const [pendingEntries, setPendingEntries] = useState<LogEntry[]>([]);

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
          diceResult: lastDiceResult || undefined,
        };
        setPendingEntries(prev => [...prev, entry]);
        setLastDiceResult(null);
      } else {
        // 純劇情用 Typewriter
        setPendingNarrative(newTexts);
        setIsReading(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // 滾動到 log 底部（電腦版和手機版）
  useEffect(() => {
    // 當有正在打字的內容或新增完成的 log 時滾動
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
      if (mobileLogContainerRef.current) {
        mobileLogContainerRef.current.scrollTop = mobileLogContainerRef.current.scrollHeight;
      }
    }, 0);
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
        setTimeout(() => setEnemyHit(false), 300);
      }
      // 玩家受擊特效（HP 減少時）
      const newPlayerHp = response.state_changes?.player_hp;
      if (typeof newPlayerHp === 'number' &&
          gameState?.player?.hp !== undefined &&
          newPlayerHp < gameState.player.hp) {
        setPlayerHit(true);
        setTimeout(() => setPlayerHit(false), 300);
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
              <div className={`border rounded-lg p-2 lg:p-3 transition-all duration-150 ${
                enemyHit
                  ? 'bg-red-600/60 border-red-400 animate-pulse'
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
          <div className={`flex-1 p-3 lg:p-4 flex flex-col transition-all duration-150 ${
            playerHit ? 'bg-red-900/40' : ''
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
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>HP</span>
                      <span>{gameState.player.hp}/{gameState.player.max_hp}</span>
                    </div>
                    <div className={`h-2 bg-gray-700 rounded-full overflow-hidden ${
                      playerHit ? 'animate-pulse' : ''
                    }`}>
                      <div
                        className="h-full bg-red-500 transition-all"
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
                  <div key={entry.id} className="space-y-1">
                    {entry.diceResult && (
                      <p className={`text-sm ${
                        entry.diceResult.result === 'success' || entry.diceResult.result === 'critical_success'
                          ? 'text-green-400'
                          : entry.diceResult.result === 'critical_failure'
                            ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        擲骰 {entry.diceResult.roll}/{entry.diceResult.target} — {
                          entry.diceResult.result === 'success' ? '成功' :
                          entry.diceResult.result === 'critical_success' ? '大成功！' :
                          entry.diceResult.result === 'failure' ? '失敗' : '大失敗...'
                        }
                      </p>
                    )}
                    {entry.content.map((text, i) => (
                      <p
                        key={i}
                        className={`leading-relaxed text-sm ${
                          text === '' ? 'h-2' :
                          text.startsWith('【') ? 'text-amber-400 font-semibold' :
                          text.includes('傷害') ? 'text-red-300' :
                          text.includes('HP:') ? 'text-gray-500 text-xs' :
                          text.includes('獲得') ? 'text-green-400' :
                          'text-gray-200'
                        }`}
                      >
                        {text || '\u00A0'}
                      </p>
                    ))}
                  </div>
                ))}
                {/* 正在打字的內容 */}
                {typingEntry && (
                  <div className="space-y-1">
                    {typingEntry.diceResult && (
                      <p className={`text-sm ${
                        typingEntry.diceResult.result === 'success' || typingEntry.diceResult.result === 'critical_success'
                          ? 'text-green-400'
                          : typingEntry.diceResult.result === 'critical_failure'
                            ? 'text-red-400'
                            : 'text-gray-400'
                      }`}>
                        擲骰 {typingEntry.diceResult.roll}/{typingEntry.diceResult.target} — {
                          typingEntry.diceResult.result === 'success' ? '成功' :
                          typingEntry.diceResult.result === 'critical_success' ? '大成功！' :
                          typingEntry.diceResult.result === 'failure' ? '失敗' : '大失敗...'
                        }
                      </p>
                    )}
                    {/* 打字中的文字 */}
                    {(() => {
                      const displayedText = fullText.slice(0, typingCharIndex);
                      const lines = displayedText.split('\n');
                      return lines.map((text, i) => (
                        <p
                          key={i}
                          className={`leading-relaxed text-sm ${
                            text === '' ? 'h-2' :
                            text.startsWith('【') ? 'text-amber-400 font-semibold' :
                            text.includes('傷害') ? 'text-red-300' :
                            text.includes('HP:') ? 'text-gray-500 text-xs' :
                            text.includes('獲得') ? 'text-green-400' :
                            'text-gray-200'
                          }`}
                        >
                          {text || '\u00A0'}
                          {i === lines.length - 1 && typingCharIndex < fullText.length && (
                            <span className="animate-pulse text-amber-400">▌</span>
                          )}
                        </p>
                      ));
                    })()}
                  </div>
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
                <p className="text-gray-500 animate-pulse">...</p>
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
                  {gameState.player.inventory.map((item, i) => {
                    const isConsumable = item.type === 'consumable' || item.type === 'potion';
                    return (
                      <li key={i}>
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
                          <div className="flex justify-between p-1.5 text-gray-400">
                            <span className="truncate">{item.name}</span>
                            <span className="text-gray-600 ml-1">x{item.quantity}</span>
                          </div>
                        )}
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
              <div className={`flex-1 transition-all duration-150 ${playerHit ? 'bg-red-900/40' : ''}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-amber-400 font-bold text-sm truncate">{gameState.player.name}</span>
                  <span className="text-amber-400/60 text-xs">{gameState.player.gold} G</span>
                </div>
                <div className="space-y-1">
                  {/* HP */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-6">HP</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-red-500 transition-all ${playerHit ? 'animate-pulse' : ''}`}
                        style={{ width: `${(gameState.player.hp / gameState.player.max_hp) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 w-12 text-right">
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
            {/* 右上按鈕：選單 + 背包（垂直排列） */}
            <div className="flex flex-col items-center gap-0.5 shrink-0">
              {/* 選單按鈕 */}
              <button
                onClick={handleExit}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* 背包按鈕 */}
              <button
                onClick={() => setShowInventory(true)}
                className="p-1.5 text-gray-400 hover:text-amber-400 transition-colors relative"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                {/* 物品數量徽章 */}
                {gameState?.player?.inventory && gameState.player.inventory.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-amber-500 text-gray-900 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {gameState.player.inventory.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 敵人狀態（戰鬥時獨立一列） */}
        {inCombat && (
          <div className={`bg-gray-800 px-2 py-1.5 border-b border-gray-700 transition-all duration-150 ${
            enemyHit ? 'bg-red-600/40' : ''
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
                <div key={entry.id} className="space-y-0.5">
                  {entry.diceResult && (
                    <p className={`text-xs ${
                      entry.diceResult.result === 'success' || entry.diceResult.result === 'critical_success'
                        ? 'text-green-400'
                        : entry.diceResult.result === 'critical_failure'
                          ? 'text-red-400'
                          : 'text-gray-400'
                    }`}>
                      擲骰 {entry.diceResult.roll}/{entry.diceResult.target} — {
                        entry.diceResult.result === 'success' ? '成功' :
                        entry.diceResult.result === 'critical_success' ? '大成功！' :
                        entry.diceResult.result === 'failure' ? '失敗' : '大失敗...'
                      }
                    </p>
                  )}
                  {entry.content.map((text, i) => (
                    <p key={i} className={`leading-relaxed text-xs ${
                      text === '' ? 'h-1' :
                      text.startsWith('【') ? 'text-amber-400 font-semibold' :
                      text.includes('傷害') ? 'text-red-300' :
                      text.includes('獲得') ? 'text-green-400' :
                      'text-gray-200'
                    }`}>
                      {text || '\u00A0'}
                    </p>
                  ))}
                </div>
              ))}
              {/* 正在打字的內容 */}
              {typingEntry && (
                <div className="space-y-0.5">
                  {typingEntry.diceResult && (
                    <p className={`text-xs ${
                      typingEntry.diceResult.result === 'success' || typingEntry.diceResult.result === 'critical_success'
                        ? 'text-green-400'
                        : typingEntry.diceResult.result === 'critical_failure'
                          ? 'text-red-400'
                          : 'text-gray-400'
                    }`}>
                      擲骰 {typingEntry.diceResult.roll}/{typingEntry.diceResult.target} — {
                        typingEntry.diceResult.result === 'success' ? '成功' :
                        typingEntry.diceResult.result === 'critical_success' ? '大成功！' :
                        typingEntry.diceResult.result === 'failure' ? '失敗' : '大失敗...'
                      }
                    </p>
                  )}
                  {(() => {
                    const displayedText = fullText.slice(0, typingCharIndex);
                    const lines = displayedText.split('\n');
                    return lines.map((text, i) => (
                      <p
                        key={i}
                        className={`leading-relaxed text-xs ${
                          text === '' ? 'h-1' :
                          text.startsWith('【') ? 'text-amber-400 font-semibold' :
                          text.includes('傷害') ? 'text-red-300' :
                          text.includes('獲得') ? 'text-green-400' :
                          'text-gray-200'
                        }`}
                      >
                        {text || '\u00A0'}
                        {i === lines.length - 1 && typingCharIndex < fullText.length && (
                          <span className="animate-pulse text-amber-400">▌</span>
                        )}
                      </p>
                    ));
                  })()}
                </div>
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
        <div className="min-h-20 bg-gray-800 border-t border-gray-700 p-3 safe-area-pb">
          <div className="h-full flex items-center justify-center">
            {isLoading ? (
              <p className="text-gray-500 animate-pulse text-sm">...</p>
            ) : isReading && pendingNarrative.length > 0 ? (
              <Typewriter texts={pendingNarrative} speed={50} onComplete={handleReadingComplete} />
            ) : !inCombat && narrative.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">冒險即將開始...</p>
            ) : (
              <p className="text-gray-600 text-xs">— 等待行動 —</p>
            )}
          </div>
        </div>
      </div>

      {/* 手機版 Bottom Sheet 物品欄 */}
      {showInventory && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* 半透明遮罩 */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowInventory(false)}
          />
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up safe-area-pb">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-gray-700">
              <h3 className="text-amber-400 font-bold">物品欄</h3>
              <button
                onClick={() => setShowInventory(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* 物品列表 */}
            <div className="flex-1 overflow-y-auto p-3">
              {!gameState?.player?.inventory || gameState.player.inventory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">空無一物</p>
              ) : (
                <ul className="space-y-2">
                  {gameState.player.inventory.map((item, i) => {
                    const isConsumable = item.type === 'consumable' || item.type === 'potion';
                    return (
                      <li
                        key={i}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                      >
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
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

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
