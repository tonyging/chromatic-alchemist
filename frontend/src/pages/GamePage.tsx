import { useNavigate } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';

export default function GamePage() {
  const { gameState, narrative, exitGame, isLoading } = useGame();
  const navigate = useNavigate();

  const handleExit = () => {
    if (confirm('確定要離開遊戲嗎？進度已自動儲存。')) {
      exitGame();
      navigate('/');
    }
  };

  if (!gameState) {
    navigate('/');
    return null;
  }

  const { player } = gameState;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar - Player Status */}
      <aside className="w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-xl font-bold text-amber-400 mb-4">
          {player.name}
        </h2>

        {/* HP/MP Bars */}
        <div className="space-y-2 mb-4">
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>HP</span>
              <span>{player.hp}/{player.maxHp}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all"
                style={{ width: `${(player.hp / player.maxHp) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1">
              <span>MP</span>
              <span>{player.mp}/{player.maxMp}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${(player.mp / player.maxMp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
          <div className="bg-gray-700/50 p-2 rounded">
            <span className="text-gray-400">力量</span>
            <span className="float-right">{player.stats.strength}</span>
          </div>
          <div className="bg-gray-700/50 p-2 rounded">
            <span className="text-gray-400">敏捷</span>
            <span className="float-right">{player.stats.agility}</span>
          </div>
          <div className="bg-gray-700/50 p-2 rounded">
            <span className="text-gray-400">智力</span>
            <span className="float-right">{player.stats.intelligence}</span>
          </div>
          <div className="bg-gray-700/50 p-2 rounded">
            <span className="text-gray-400">感知</span>
            <span className="float-right">{player.stats.perception}</span>
          </div>
        </div>

        {/* Gold */}
        <div className="bg-amber-900/30 p-2 rounded text-center mb-4">
          <span className="text-amber-400">{player.gold} G</span>
        </div>

        {/* Exit Button */}
        <button
          onClick={handleExit}
          className="mt-auto py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300"
        >
          離開遊戲
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {/* Narrative Display */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            {narrative.length === 0 ? (
              <p className="text-gray-500 text-center">
                冒險即將開始...
              </p>
            ) : (
              narrative.map((text, i) => (
                <p key={i} className="text-gray-200 leading-relaxed">
                  {text}
                </p>
              ))
            )}
            {isLoading && (
              <p className="text-gray-500 animate-pulse">...</p>
            )}
          </div>
        </div>

        {/* Action Area */}
        <div className="bg-gray-800 p-4 border-t border-gray-700">
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-500 text-center text-sm">
              [ 遊戲引擎開發中 - 選項將顯示於此 ]
            </p>
          </div>
        </div>
      </main>

      {/* Inventory Panel (placeholder) */}
      <aside className="w-64 bg-gray-800 p-4 border-l border-gray-700">
        <h3 className="text-lg font-semibold text-gray-300 mb-4">物品欄</h3>
        <div className="text-gray-500 text-sm">
          {player.inventory.length === 0 ? (
            <p>空無一物</p>
          ) : (
            <ul className="space-y-1">
              {player.inventory.map((item, i) => (
                <li key={i} className="flex justify-between">
                  <span>{item.name}</span>
                  <span className="text-gray-600">×{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
