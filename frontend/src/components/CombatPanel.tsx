import type { CombatInfo } from '../types';

interface DiceResult {
  roll: number;
  target: number;
  result: string;
}

interface CombatPanelProps {
  combatInfo: CombatInfo;
  narrative: string[];
  diceResult?: DiceResult | null;
  onContinue: () => void;
}

export default function CombatPanel({ combatInfo, narrative, diceResult, onContinue }: CombatPanelProps) {
  const hpPercent = Math.max(0, (combatInfo.enemy_hp / combatInfo.enemy_max_hp) * 100);
  const isDefeated = combatInfo.enemy_hp <= 0;

  return (
    <div className="w-[672px] space-y-4">
      {/* 敵人資訊卡 */}
      <div className={`border rounded-lg p-4 transition-all ${
        isDefeated
          ? 'bg-gray-800/30 border-gray-600'
          : 'bg-red-900/30 border-red-700'
      }`}>
        <div className="flex justify-between items-center mb-2">
          <h3 className={`text-xl font-bold ${isDefeated ? 'text-gray-500 line-through' : 'text-red-400'}`}>
            {combatInfo.enemy_name}
          </h3>
          <span className="text-red-300 text-sm">迴避: {combatInfo.enemy_evasion}%</span>
        </div>

        {/* HP 條 */}
        <div className="mb-3">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>HP</span>
            <span>{Math.max(0, combatInfo.enemy_hp)}/{combatInfo.enemy_max_hp}</span>
          </div>
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isDefeated ? 'bg-gray-500' : 'bg-red-500'}`}
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

      {/* 骰子結果 */}
      {diceResult && (
        <div className={`border rounded-lg p-3 text-center ${
          diceResult.result === 'success' || diceResult.result === 'critical_success'
            ? 'bg-green-900/30 border-green-700'
            : 'bg-gray-800/50 border-gray-600'
        }`}>
          <div className="flex items-center justify-center gap-4">
            <span className="text-2xl font-bold text-white">{diceResult.roll}</span>
            <span className="text-gray-400">/</span>
            <span className="text-gray-400">{diceResult.target}</span>
            <span className={`px-2 py-1 rounded text-sm ${
              diceResult.result === 'success' ? 'bg-green-700 text-green-100' :
              diceResult.result === 'critical_success' ? 'bg-amber-600 text-amber-100' :
              'bg-gray-700 text-gray-300'
            }`}>
              {diceResult.result === 'success' ? '成功' :
               diceResult.result === 'critical_success' ? '大成功' :
               diceResult.result === 'failure' ? '失敗' : '大失敗'}
            </span>
          </div>
        </div>
      )}

      {/* 戰鬥敘事 */}
      {narrative.length > 0 && (
        <div
          className="bg-gray-800/80 border border-gray-600 rounded-lg p-4 cursor-pointer hover:border-gray-500 transition-colors"
          onClick={onContinue}
        >
          {narrative.map((text, i) => (
            <p
              key={i}
              className={`leading-relaxed mb-2 last:mb-0 ${
                text.startsWith('【') ? 'text-amber-400 font-semibold' :
                text.includes('傷害') ? 'text-red-300' :
                text.includes('HP:') ? 'text-gray-400 text-sm' :
                'text-gray-100'
              }`}
            >
              {text || '\u00A0'}
            </p>
          ))}
          <p className="text-gray-500 text-sm mt-2 text-center">[ 點擊繼續 ]</p>
        </div>
      )}

      {/* 教學提示 */}
      {combatInfo.tutorial_text && !isDefeated && (
        <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3">
          <p className="text-amber-300 text-sm">{combatInfo.tutorial_text}</p>
        </div>
      )}
    </div>
  );
}
