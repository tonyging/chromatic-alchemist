import { useState, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** 觸發方式：hover 或 click（手機用） */
  trigger?: 'hover' | 'click';
  /** 位置：上方或下方 */
  position?: 'top' | 'bottom';
}

/**
 * 輕量級 Tooltip 元件
 * 電腦版 hover 觸發，手機版可以用 click 觸發
 */
export default function Tooltip({
  content,
  children,
  trigger = 'hover',
  position = 'top',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const showTooltip = () => setIsVisible(true);
  const hideTooltip = () => setIsVisible(false);
  const toggleTooltip = () => setIsVisible((prev) => !prev);

  const positionClass = position === 'top'
    ? 'bottom-full mb-2'
    : 'top-full mt-2';

  return (
    <div
      className="relative inline-block"
      onMouseEnter={trigger === 'hover' ? showTooltip : undefined}
      onMouseLeave={trigger === 'hover' ? hideTooltip : undefined}
      onClick={trigger === 'click' ? toggleTooltip : undefined}
    >
      {children}
      {isVisible && content && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 ${positionClass} z-50
                      bg-gray-900 border border-gray-600 rounded-lg px-3 py-2
                      text-xs text-gray-200 whitespace-nowrap shadow-lg
                      animate-fade-in`}
        >
          {content}
          {/* 小三角形指示器 */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900
                        border-gray-600 rotate-45
                        ${position === 'top'
                          ? 'top-full -mt-1 border-r border-b'
                          : 'bottom-full -mb-1 border-l border-t'
                        }`}
          />
        </div>
      )}
    </div>
  );
}
