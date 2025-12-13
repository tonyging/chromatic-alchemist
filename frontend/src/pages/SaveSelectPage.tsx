import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { formatDateTime } from '../utils/format';
import ConfirmDialog from '../components/ConfirmDialog';

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
  const { saves, loadSaves, loadGame, deleteGame, isLoading, error } = useGame();
  const navigate = useNavigate();

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedIsEmpty, setSelectedIsEmpty] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadSaves();
  }, []);

  const handleSlotClick = (slot: number, isEmpty: boolean) => {
    setSelectedSlot(slot);
    setSelectedIsEmpty(isEmpty);
  };

  const handleNewGame = () => {
    if (!selectedSlot) return;
    navigate('/create', { state: { slot: selectedSlot } });
  };

  const handleLoad = async () => {
    if (!selectedSlot) return;
    await loadGame(selectedSlot);
    navigate('/game');
  };

  const handleDelete = () => {
    if (!selectedSlot) return;
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedSlot) return;
    setShowDeleteConfirm(false);
    await deleteGame(selectedSlot);
    setSelectedSlot(null);
    setSelectedIsEmpty(false);
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
            {selectedIsEmpty ? (
              /* Empty slot - New Game only */
              <button
                onClick={handleNewGame}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500
                           text-white font-semibold rounded transition-colors"
              >
                建立新角色
              </button>
            ) : (
              /* Existing save - Load/Delete/Overwrite */
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
                  onClick={handleNewGame}
                  className="w-full py-2 text-gray-400 hover:text-white"
                >
                  覆蓋為新遊戲
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="刪除存檔"
        message="確定要刪除這個存檔嗎？此操作無法復原。"
        confirmText="刪除"
        cancelText="取消"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
    </div>
  );
}
