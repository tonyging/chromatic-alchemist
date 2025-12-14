import { useRef, useState, type ReactNode, type TouchEvent } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * 可拖曳關閉的 Bottom Sheet 元件
 * 往下拖曳超過 100px 時關閉
 */
export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startY.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - startY.current;
    // 只允許往下拖
    if (delta > 0) {
      setDragY(delta);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      // 超過 100px 則關閉
      onClose();
    }
    setDragY(0);
  };

  if (!isOpen) return null;

  return (
    <div className="md:hidden fixed inset-0 z-50">
      {/* 半透明遮罩 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl max-h-[60vh] flex flex-col animate-slide-up safe-area-pb"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {/* 拖曳指示條 + Header */}
        <div
          className="cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* 拖曳提示條 */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-600 rounded-full" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-700">
            <h3 className="text-amber-400 font-bold">{title}</h3>
            <button
              onClick={onClose}
              aria-label="關閉"
              className="p-1 text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        {/* 內容 */}
        <div className="flex-1 overflow-y-auto p-3">
          {children}
        </div>
      </div>
    </div>
  );
}
