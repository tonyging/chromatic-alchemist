import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGame } from '../contexts/GameContext';
import type { Background, Stats } from '../types';

const BACKGROUNDS: { value: Background; label: string; desc: string; bonus: keyof Stats }[] = [
  { value: 'warrior', label: '戰士', desc: '力量 +1', bonus: 'strength' },
  { value: 'herbalist', label: '藥草師', desc: '感知 +1', bonus: 'perception' },
  { value: 'mage', label: '法師學徒', desc: '智力 +1', bonus: 'intelligence' },
];

const STAT_INFO: { key: keyof Stats; label: string; desc: string }[] = [
  { key: 'strength', label: '力量', desc: '近戰傷害、HP' },
  { key: 'dexterity', label: '敏捷', desc: '迴避、先攻' },
  { key: 'intelligence', label: '智力', desc: '魔法威力、MP' },
  { key: 'perception', label: '感知', desc: '探索、調配' },
];

const FREE_POINTS = 5;
const MIN_STAT = 1;
const MAX_STAT = 5;

export default function CharacterCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { startNewGame, isLoading } = useGame();

  const slot = (location.state as { slot?: number })?.slot;

  const [characterName, setCharacterName] = useState('');
  const [background, setBackground] = useState<Background>('warrior');
  const [stats, setStats] = useState<Stats>({
    strength: 1,
    dexterity: 1,
    intelligence: 1,
    perception: 1,
  });

  // 已使用的自由點數 = 總點數 - 4（每項基礎 1）
  const usedFreePoints = (stats.strength - 1) + (stats.dexterity - 1) + (stats.intelligence - 1) + (stats.perception - 1);
  const remainingPoints = FREE_POINTS - usedFreePoints;

  const adjustStat = (key: keyof Stats, delta: number) => {
    const newValue = stats[key] + delta;
    if (newValue < MIN_STAT || newValue > MAX_STAT) return;
    if (delta > 0 && remainingPoints <= 0) return;
    setStats({ ...stats, [key]: newValue });
  };

  const getBonusDisplay = (key: keyof Stats) => {
    const bg = BACKGROUNDS.find(b => b.value === background);
    return bg?.bonus === key ? '+1' : '';
  };

  const getFinalStat = (key: keyof Stats) => {
    const bg = BACKGROUNDS.find(b => b.value === background);
    return stats[key] + (bg?.bonus === key ? 1 : 0);
  };

  const calcHP = () => 20 + getFinalStat('strength') * 2;
  const calcMP = () => 10 + getFinalStat('intelligence') * 2;

  const handleCreate = async () => {
    if (!slot || !characterName.trim() || remainingPoints !== 0) return;
    await startNewGame(slot, characterName.trim(), background, stats);
    navigate('/game');
  };

  if (!slot) {
    navigate('/saves');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">創建角色</h1>
          <button
            onClick={() => navigate('/saves')}
            className="text-gray-400 hover:text-white"
          >
            返回
          </button>
        </div>

        <div className="space-y-6">
          {/* Character Name */}
          <div className="bg-gray-800 rounded-lg p-6">
            <label className="block text-gray-400 text-sm mb-2">角色名稱</label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
                         text-white text-lg focus:outline-none focus:border-amber-500"
              placeholder="輸入角色名稱"
              maxLength={20}
            />
          </div>

          {/* Background Selection */}
          <div className="bg-gray-800 rounded-lg p-6">
            <label className="block text-gray-400 text-sm mb-3">選擇背景</label>
            <div className="grid gap-3">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => setBackground(bg.value)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    background === bg.value
                      ? 'border-amber-500 bg-amber-900/30'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <span className="font-semibold text-lg">{bg.label}</span>
                  <span className="text-amber-400 ml-3">{bg.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Stat Allocation */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-2">
              <label className="text-gray-400 text-sm">分配屬性點數</label>
              <span className={`font-bold ${remainingPoints === 0 ? 'text-green-400' : 'text-amber-400'}`}>
                剩餘點數: {remainingPoints}
              </span>
            </div>
            <p className="text-gray-500 text-xs mb-4">每項屬性最低 1，最高 5</p>

            <div className="space-y-4">
              {STAT_INFO.map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-gray-200 font-medium">{label}</span>
                    <span className="text-gray-500 text-sm ml-2">({desc})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => adjustStat(key, -1)}
                      disabled={stats[key] <= MIN_STAT}
                      className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600
                                 disabled:opacity-30 disabled:cursor-not-allowed
                                 text-lg font-bold"
                    >
                      -
                    </button>

                    <div className="w-20 text-center">
                      <span className="text-xl font-bold text-white">{stats[key]}</span>
                      {getBonusDisplay(key) && (
                        <span className="text-amber-400 ml-1">{getBonusDisplay(key)}</span>
                      )}
                      <span className="text-gray-500 ml-1">= {getFinalStat(key)}</span>
                    </div>

                    <button
                      onClick={() => adjustStat(key, 1)}
                      disabled={stats[key] >= MAX_STAT || remainingPoints <= 0}
                      className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600
                                 disabled:opacity-30 disabled:cursor-not-allowed
                                 text-lg font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Derived Stats Preview */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-red-900/30 rounded-lg p-3">
                  <span className="text-gray-400 text-sm">HP</span>
                  <p className="text-2xl font-bold text-red-400">{calcHP()}</p>
                </div>
                <div className="bg-blue-900/30 rounded-lg p-3">
                  <span className="text-gray-400 text-sm">MP</span>
                  <p className="text-2xl font-bold text-blue-400">{calcMP()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={isLoading || !characterName.trim() || remainingPoints !== 0}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500
                       disabled:bg-gray-600 disabled:cursor-not-allowed
                       text-white text-lg font-bold rounded-lg transition-colors"
          >
            {isLoading ? '建立中...' : '開始冒險'}
          </button>
        </div>
      </div>
    </div>
  );
}
