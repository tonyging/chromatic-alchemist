import { useEffect, useRef } from 'react';

interface GameOverPanelProps {
  isOpen: boolean;
  onRestart: () => void;
  onReturnToMenu: () => void;
}

export default function GameOverPanel({
  isOpen,
  onRestart,
  onReturnToMenu,
}: GameOverPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      panelRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with red tint */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative bg-gray-900 rounded-lg border-2 border-red-800 p-8 max-w-lg w-full mx-4 shadow-2xl text-center"
      >
        {/* Game Over Text */}
        <h2 className="text-4xl font-bold text-red-500 mb-2 tracking-wider">
          GAME OVER
        </h2>
        <p className="text-gray-400 mb-8">你的冒險在此終結...</p>

        {/* Divider */}
        <div className="w-24 h-px bg-red-800 mx-auto mb-8" />

        {/* Options */}
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full py-3 px-6 bg-red-900/60 hover:bg-red-800/70
                       text-gray-100 rounded-lg transition-all
                       border border-red-700 hover:border-red-500
                       hover:shadow-lg hover:shadow-red-500/20"
          >
            重新載入存檔
          </button>

          <button
            onClick={onReturnToMenu}
            className="w-full py-3 px-6 bg-gray-800 hover:bg-gray-700
                       text-gray-300 rounded-lg transition-all
                       border border-gray-600 hover:border-gray-500"
          >
            返回選單
          </button>
        </div>
      </div>
    </div>
  );
}
