import type { Player } from '../types';
import { LOW_HP_THRESHOLD } from '../constants/game';

interface PlayerStatsCardProps {
  player: Player;
  /** 是否為緊湊模式（手機版用較小的間距） */
  compact?: boolean;
  /** 玩家受擊特效 */
  playerHit?: boolean;
  /** 退出遊戲按鈕（選用，桌面版顯示） */
  onExit?: () => void;
}

/**
 * 玩家狀態卡片元件
 * 顯示玩家 HP/MP、屬性、金幣
 */
export default function PlayerStatsCard({ player, compact = false, playerHit = false, onExit }: PlayerStatsCardProps) {
  const isLowHp = player.hp / player.max_hp <= LOW_HP_THRESHOLD;

  return (
    <div className={`flex flex-col transition-all duration-300 h-full
      ${isLowHp && !compact ? 'border-l-4 border-red-500 animate-pulse' : ''}
      ${playerHit ? 'bg-red-900/50 animate-hit-shake' : ''}`}>
      <div className={compact ? 'flex-1' : 'flex-1 p-3 lg:p-4 flex flex-col'}>
        <h2 className={`font-bold mb-2 transition-colors ${
          compact ? 'text-sm' : 'text-base lg:text-lg'
        } ${
          playerHit ? 'text-red-400' : 'text-amber-400'
        }`}>
          {player.name}
        </h2>

        {/* HP/MP Bars */}
        <div className="space-y-2 mb-3">
          <div>
            <div className={`flex justify-between text-xs mb-1 ${
              isLowHp ? 'text-red-400' : 'text-gray-400'
            }`}>
              <span>HP</span>
              <span>{player.hp}/{player.max_hp}</span>
            </div>
            <div className={`h-2 bg-gray-700 rounded-full overflow-hidden ${
              playerHit ? 'animate-pulse' : ''
            }`}>
              <div
                className={`h-full transition-all duration-300 ${
                  isLowHp ? 'bg-red-600 animate-pulse' : 'bg-red-500'
                }`}
                style={{ width: `${(player.hp / player.max_hp) * 100}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>MP</span>
              <span>{player.mp}/{player.max_mp}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${(player.mp / player.max_mp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        {!compact && (
          <>
            <div className="grid grid-cols-2 gap-1 text-xs mb-2">
              <div className="bg-gray-700/50 p-1.5 rounded">
                <span className="text-gray-400">力</span>
                <span className="float-right">{player.stats.strength}</span>
              </div>
              <div className="bg-gray-700/50 p-1.5 rounded">
                <span className="text-gray-400">敏</span>
                <span className="float-right">{player.stats.dexterity}</span>
              </div>
              <div className="bg-gray-700/50 p-1.5 rounded">
                <span className="text-gray-400">智</span>
                <span className="float-right">{player.stats.intelligence}</span>
              </div>
              <div className="bg-gray-700/50 p-1.5 rounded">
                <span className="text-gray-400">感</span>
                <span className="float-right">{player.stats.perception}</span>
              </div>
            </div>

            {/* Gold */}
            <div className="bg-amber-900/30 p-1.5 rounded text-center text-sm">
              <span className="text-amber-400">{player.gold} G</span>
            </div>
          </>
        )}
      </div>

      {/* Exit Button（桌面版） */}
      {onExit && !compact && (
        <button
          onClick={onExit}
          className="mt-auto py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm mx-3 lg:mx-4 mb-3 lg:mb-4
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900
                     transition-all"
        >
          離開遊戲
        </button>
      )}
    </div>
  );
}
