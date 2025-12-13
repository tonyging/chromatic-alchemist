import type { CombatInfo } from '../types';

interface CombatPanelProps {
  combatInfo: CombatInfo;
  narrative: string[];
  onContinue: () => void;
}

export default function CombatPanel({ combatInfo, narrative, onContinue }: CombatPanelProps) {
  const hpPercent = (combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100;

  return (
    <div className="w-[672px] space-y-4">
      {/* 敵人資訊卡 */}
      <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-bold text-red-400">{combatInfo.enemy_name}</h3>
          <span className="text-red-300 text-sm">迴避: {combatInfo.enemy_evasion}%</span>
        </div>

        {/* HP 條 */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>HP</span>
            <span>{combatInfo.enemy_hp}/{combatInfo.enemy_max_hp}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>

        {/* 敵人能力 */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-gray-800/50 p-2 rounded">
            <span className="text-gray-500">攻擊</span>
            <p className="text-gray-300">{combatInfo.enemy_attack}</p>
          </div>
          <div className="bg-gray-800/50 p-2 rounded">
            <span className="text-gray-500">弱點</span>
            <p className="text-amber-400">{combatInfo.enemy_weakness}</p>
          </div>
        </div>
      </div>

      {/* 戰鬥敘事 */}
      {narrative.length > 0 && (
        <div
          className="bg-gray-800/80 border border-gray-600 rounded-lg p-4 cursor-pointer"
          onClick={onContinue}
        >
          {narrative.map((text, i) => (
            <p key={i} className="text-gray-100 leading-relaxed mb-2 last:mb-0">
              {text}
            </p>
          ))}
        </div>
      )}

      {/* 教學提示 */}
      {combatInfo.tutorial_text && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-amber-300 text-sm">{combatInfo.tutorial_text}</p>
        </div>
      )}
    </div>
  );
}
