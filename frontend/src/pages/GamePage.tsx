import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import Typewriter from '../components/Typewriter';
import CombatPanel from '../components/CombatPanel';

export default function GamePage() {
  const { gameState, narrative, availableActions, sendAction, exitGame, isLoading, currentSlot, sceneType, combatInfo } = useGame();
  const navigate = useNavigate();
  const [isReading, setIsReading] = useState(false);
  const [pendingNarrative, setPendingNarrative] = useState<string[]>([]);
  const lastNarrativeLength = useRef(0);

  // Redirect if no active game
  useEffect(() => {
    if (!currentSlot) {
      navigate('/');
    }
  }, [currentSlot, navigate]);

  // 偵測新敘事
  useEffect(() => {
    if (narrative.length > lastNarrativeLength.current) {
      const newTexts = narrative.slice(lastNarrativeLength.current);
      setPendingNarrative(newTexts);
      setIsReading(true);
      lastNarrativeLength.current = narrative.length;
    }
  }, [narrative]);

  const handleReadingComplete = () => {
    setPendingNarrative([]);
    setIsReading(false);
  };

  const handleExit = () => {
    if (confirm('確定要離開遊戲嗎？進度已自動儲存。')) {
      exitGame();
      navigate('/');
    }
  };

  const handleAction = async (action: { id: string; type: string; label: string; data?: Record<string, unknown> }) => {
    try {
      await sendAction({
        action_type: action.type,
        action_data: action.data || { choice_id: action.id }
      });
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  // Show loading or redirect if no slot
  if (!currentSlot) {
    return null;
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex overflow-hidden">
      {/* Sidebar - Player Status */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col flex-shrink-0">
        {gameState?.player ? (
          <>
            <h2 className="text-xl font-bold text-amber-400 mb-4">
              {gameState.player.name}
            </h2>

            {/* HP/MP Bars */}
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>HP</span>
                  <span>{gameState.player.hp}/{gameState.player.max_hp}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${(gameState.player.hp / gameState.player.max_hp) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm text-gray-400 mb-1">
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
            <div className="grid grid-cols-2 gap-2 text-sm mb-4">
              <div className="bg-gray-700/50 p-2 rounded">
                <span className="text-gray-400">力量</span>
                <span className="float-right">{gameState.player.stats.strength}</span>
              </div>
              <div className="bg-gray-700/50 p-2 rounded">
                <span className="text-gray-400">敏捷</span>
                <span className="float-right">{gameState.player.stats.dexterity}</span>
              </div>
              <div className="bg-gray-700/50 p-2 rounded">
                <span className="text-gray-400">智力</span>
                <span className="float-right">{gameState.player.stats.intelligence}</span>
              </div>
              <div className="bg-gray-700/50 p-2 rounded">
                <span className="text-gray-400">感知</span>
                <span className="float-right">{gameState.player.stats.perception}</span>
              </div>
            </div>

            {/* Gold */}
            <div className="bg-amber-900/30 p-2 rounded text-center mb-4">
              <span className="text-amber-400">{gameState.player.gold} G</span>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-8">
            載入中...
          </div>
        )}

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="mt-auto py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
        >
          離開遊戲
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* 對話框 / 選項區 */}
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {isLoading ? (
            <p className="text-gray-500 animate-pulse text-xl">...</p>
          ) : sceneType === 'combat' && combatInfo ? (
            /* 戰鬥場景 */
            <>
              <CombatPanel
                combatInfo={combatInfo}
                narrative={pendingNarrative}
                onContinue={handleReadingComplete}
              />
              {/* 戰鬥選項 */}
              {!isReading && availableActions.length > 0 && (
                <div className="w-[672px] space-y-2 mt-4">
                  {availableActions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action)}
                      disabled={isLoading}
                      className="w-full py-3 px-6 bg-red-900/50 hover:bg-red-800/60
                                 text-left rounded-lg transition-all
                                 border border-red-700 hover:border-red-500"
                    >
                      <span className="text-gray-100">{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : isReading && pendingNarrative.length > 0 ? (
            /* 一般敘事場景 - Typewriter */
            <Typewriter
              texts={pendingNarrative}
              speed={50}
              onComplete={handleReadingComplete}
            />
          ) : availableActions.length > 0 ? (
            /* 選項顯示 */
            <div className="max-w-2xl w-full space-y-3">
              {availableActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action)}
                  disabled={isLoading}
                  className="w-full py-4 px-6 bg-gray-800/80 hover:bg-gray-700
                             text-left rounded-lg transition-all
                             border border-gray-600 hover:border-amber-500
                             hover:shadow-lg hover:shadow-amber-500/10"
                >
                  <span className="text-gray-100 text-lg">{action.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center">
              {narrative.length === 0 ? '冒險即將開始...' : '[ 章節結束 ]'}
            </p>
          )}
        </div>
      </main>

      {/* Inventory Panel */}
      <aside className="w-64 bg-gray-800 p-4 border-l border-gray-700 flex-shrink-0 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">物品欄</h3>
        <div className="text-gray-500 text-sm">
          {!gameState?.player?.inventory || gameState.player.inventory.length === 0 ? (
            <p>空無一物</p>
          ) : (
            <ul className="space-y-1">
              {gameState.player.inventory.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-gray-600">x{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
