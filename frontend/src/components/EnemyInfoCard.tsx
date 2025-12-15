import type { CombatInfo } from '../types';
import { getWeaknessColorClass, getWeaknessIndicator } from '../utils/combat';

interface EnemyInfoCardProps {
  combatInfo: CombatInfo;
  /** 敵人受擊特效 */
  enemyHit?: boolean;
  /** 是否為緊湊模式（手機版用較小的間距） */
  compact?: boolean;
}

/**
 * 敵人資訊卡片元件
 * 顯示敵人 HP、迴避、弱點
 */
export default function EnemyInfoCard({ combatInfo, enemyHit = false, compact = false }: EnemyInfoCardProps) {
  const isDead = combatInfo.enemy_hp <= 0;

  if (compact) {
    // 手機版：簡潔版本（單行佈局）
    return (
      <div className={`bg-gray-800 px-2 py-1.5 border-b border-gray-700 transition-all duration-300 ${
        enemyHit ? 'bg-red-600/60 animate-hit-shake' : ''
      }`}>
        <div className="flex items-center justify-between mb-1">
          <span className={`text-sm font-bold ${isDead ? 'text-gray-500 line-through' : 'text-red-400'}`}>
            {combatInfo.enemy_name}
          </span>
          {/* 敵人能力（死亡後隱藏） */}
          {!isDead && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">迴避 {combatInfo.enemy_evasion}%</span>
              <span className={`flex items-center gap-1 ${getWeaknessColorClass(combatInfo.enemy_weakness)}`}>
                <span>{getWeaknessIndicator(combatInfo.enemy_weakness)}</span>
                <span>弱點: {combatInfo.enemy_weakness}</span>
              </span>
            </div>
          )}
        </div>
        {/* HP 條（敵人死亡後隱藏） */}
        {!isDead && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-6">HP</span>
            <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{ width: `${(combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-12 text-right">
              {combatInfo.enemy_hp}/{combatInfo.enemy_max_hp}
            </span>
          </div>
        )}
      </div>
    );
  }

  // 桌面版：完整版本（卡片佈局）
  return (
    <div className="p-3 lg:p-4 border-b border-gray-700 min-h-[160px]">
      <div className={`border rounded-lg p-2 lg:p-3 transition-all duration-300 ${
        enemyHit
          ? 'bg-red-600/70 border-red-400 scale-105 shadow-lg shadow-red-500/50 animate-hit-shake'
          : isDead
            ? 'bg-gray-800/30 border-gray-600'
            : 'bg-red-900/30 border-red-700 shadow-lg'
      }`}>
        <h3 className={`font-bold text-sm lg:text-base mb-2 ${isDead ? 'text-gray-500 line-through' : 'text-red-400'}`}>
          {combatInfo.enemy_name}
        </h3>
        {/* HP 條（敵人死亡後隱藏） */}
        {!isDead && (
          <div className="mb-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{combatInfo.enemy_hp}/{combatInfo.enemy_max_hp}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100}%` }}
              />
            </div>
          </div>
        )}
        {/* 敵人能力（死亡後隱藏） */}
        {!isDead && (
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">迴避</span>
              <span className="text-gray-300">{combatInfo.enemy_evasion}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">弱點</span>
              <span className={`flex items-center gap-1 ${getWeaknessColorClass(combatInfo.enemy_weakness)}`}>
                <span>{getWeaknessIndicator(combatInfo.enemy_weakness)}</span>
                <span>{combatInfo.enemy_weakness}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
