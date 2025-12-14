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
      className="cursor-pointer select-none w-full h-full"
    >
      <div className="w-full h-full flex flex-col justify-between py-2 px-4">
        {/* 文字區 */}
        <div className="flex-1 flex items-center">
          <p className="text-gray-100 leading-relaxed">
            {displayText}
            {!isTypingDone && <span className="animate-pulse text-amber-400">▌</span>}
          </p>
        </div>

        {/* 底部：進度 + 提示 */}
        <div className="flex items-center justify-between">
          {/* 進度指示 */}
          <div className="flex gap-1">
            {validTexts.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentIndex ? 'bg-amber-400' : i < currentIndex ? 'bg-gray-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
          {/* 提示區 */}
          <p className={`text-gray-500 text-xs transition-opacity duration-200 ${
            isTypingDone ? 'opacity-100' : 'opacity-0'
          }`}>
            [ 點擊或按 Enter 繼續 ]
          </p>
        </div>
      </div>
    </div>
  );
}
