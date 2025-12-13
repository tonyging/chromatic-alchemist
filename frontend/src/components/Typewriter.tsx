import { useState, useEffect, useCallback } from 'react';

interface TypewriterProps {
  texts: string[];
  speed?: number;
  onComplete?: () => void;
}

export default function Typewriter({ texts, speed = 25, onComplete }: TypewriterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [isTypingDone, setIsTypingDone] = useState(false);

  // 過濾空行
  const validTexts = texts.filter(t => t.trim() !== '');

  useEffect(() => {
    setCurrentIndex(0);
    setCurrentChar(0);
    setIsTypingDone(false);
  }, [texts]);

  const currentText = validTexts[currentIndex] || '';

  // 打字效果
  useEffect(() => {
    if (currentIndex >= validTexts.length) return;
    if (currentChar >= currentText.length) {
      setIsTypingDone(true);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentChar(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [validTexts, currentIndex, currentChar, currentText, speed]);

  // 點擊處理
  const handleClick = useCallback(() => {
    if (!isTypingDone) {
      // 還在打字中，直接顯示完整文字
      setCurrentChar(currentText.length);
      setIsTypingDone(true);
    } else {
      // 打字完成，進入下一段
      if (currentIndex < validTexts.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setCurrentChar(0);
        setIsTypingDone(false);
      } else {
        // 全部完成
        onComplete?.();
      }
    }
  }, [isTypingDone, currentText.length, currentIndex, validTexts.length, onComplete]);

  // 鍵盤事件
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClick]);

  if (validTexts.length === 0) return null;

  const displayText = currentText.slice(0, currentChar);

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer select-none flex items-center justify-center w-full"
    >
      <div className="w-[672px] bg-gray-800/80 border border-gray-600 rounded-lg p-6 shadow-lg flex flex-col">
        {/* 文字區 */}
        <div className="min-h-[80px] flex items-center">
          <p className="text-gray-100 text-lg leading-relaxed">
            {displayText}
            {!isTypingDone && <span className="animate-pulse text-amber-400">▌</span>}
          </p>
        </div>

        {/* 提示區 - 固定高度，用 opacity 控制顯示 */}
        <p className={`text-gray-500 text-sm text-right transition-opacity duration-200 ${
          isTypingDone ? 'opacity-100' : 'opacity-0'
        }`}>
          [ 點擊或按 Enter 繼續 ]
        </p>

        {/* 進度指示 */}
        <div className="flex justify-center gap-1 mt-3">
          {validTexts.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentIndex ? 'bg-amber-400' : i < currentIndex ? 'bg-gray-500' : 'bg-gray-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
