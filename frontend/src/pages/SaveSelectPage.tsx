import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { formatDateTime } from '../utils/format';
import type { Background } from '../types';

const BACKGROUNDS: { value: Background; label: string; desc: string }[] = [
  { value: 'warrior', label: '戰士', desc: '力量 +1' },
  { value: 'herbalist', label: '藥草師', desc: '感知 +1' },
  { value: 'mage', label: '法師學徒', desc: '智力 +1' },
];

const CHAPTER_NAMES: Record<string, string> = {
  prologue: '序章',
  chapter1: '第一章',
  chapter2: '第二章',
  chapter3: '第三章',
};

function getChapterName(chapter: string | null | undefined): string {
  if (!chapter) return '';
  return CHAPTER_NAMES[chapter] || chapter;
}

export default function SaveSelectPage() {
  const { user, logout } = useAuth();
  const { saves, loadSaves, startNewGame, loadGame, deleteGame, isLoading, error } = useGame();
  const navigate = useNavigate();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [background, setBackground] = useState<Background>('warrior');

  useEffect(() => {
    loadSaves();
  }, []);

  const handleSlotClick = (slot: number, isEmpty: boolean) => {
    setSelectedSlot(slot);
    if (isEmpty) {
      setShowNewGame(true);
    } else {
      setShowNewGame(false);
    }
  };

  const handleStartNew = async () => {
    if (!selectedSlot || !characterName.trim()) return;
    await startNewGame(selectedSlot, characterName.trim(), background);
    navigate('/game');
  };

  const handleLoad = async () => {
    if (!selectedSlot) return;
    await loadGame(selectedSlot);
    navigate('/game');
  };

  const handleDelete = async () => {
    if (!selectedSlot) return;
    if (confirm('確定要刪除這個存檔嗎？')) {
      await deleteGame(selectedSlot);
      setSelectedSlot(null);
      setShowNewGame(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-amber-400">選擇存檔</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button
              onClick={logout}
              className="text-gray-400 hover:text-white text-sm"
            >
              登出
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-300">
            {error}
          </div>
        )}

        {/* Save Slots */}
        <div className="grid gap-4 mb-8">
          {saves.map((save) => (
            <button
              key={save.slot}
              onClick={() => handleSlotClick(save.slot, save.is_empty)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedSlot === save.slot
                  ? 'border-amber-500 bg-gray-800'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">
                  存檔 {save.slot}
                </span>
                {save.is_empty ? (
                  <span className="text-gray-500">空白</span>
                ) : (
                  <span className="text-gray-400 text-sm">
                    {formatDateTime(save.updated_at)}
                  </span>
                )}
              </div>
              {!save.is_empty && (
                <div className="mt-2 text-gray-300">
                  <span className="text-amber-400">{save.character_name}</span>
                  <span className="text-gray-500 ml-2">
                    {getChapterName(save.chapter)}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        {selectedSlot !== null && (
          <div className="bg-gray-800 rounded-lg p-6">
            {showNewGame ? (
              /* New Game Form */
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-amber-400 mb-4">
                  建立新角色
                </h2>

                <div>
                  <label className="block text-gray-400 text-sm mb-1">
                    角色名稱
                  </label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded
                               text-white focus:outline-none focus:border-amber-500"
                    placeholder="輸入角色名稱"
                    maxLength={20}
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    選擇背景
                  </label>
                  <div className="grid gap-2">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.value}
                        onClick={() => setBackground(bg.value)}
                        className={`p-3 rounded border text-left transition-colors ${
                          background === bg.value
                            ? 'border-amber-500 bg-amber-900/30'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <span className="font-semibold">{bg.label}</span>
                        <span className="text-gray-400 ml-2 text-sm">
                          {bg.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleStartNew}
                  disabled={isLoading || !characterName.trim()}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500
                             disabled:bg-gray-600 disabled:cursor-not-allowed
                             text-white font-semibold rounded transition-colors"
                >
                  {isLoading ? '建立中...' : '開始冒險'}
                </button>
              </div>
            ) : (
              /* Load/Delete Options */
              <div className="space-y-4">
                <button
                  onClick={handleLoad}
                  disabled={isLoading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500
                             disabled:bg-gray-600 text-white font-semibold rounded"
                >
                  {isLoading ? '載入中...' : '繼續遊戲'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="w-full py-3 bg-red-800 hover:bg-red-700
                             disabled:bg-gray-600 text-white font-semibold rounded"
                >
                  刪除存檔
                </button>
                <button
                  onClick={() => {
                    setShowNewGame(true);
                  }}
                  className="w-full py-2 text-gray-400 hover:text-white"
                >
                  覆蓋為新遊戲
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
