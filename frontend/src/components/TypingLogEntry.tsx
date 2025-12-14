import type { DiceResult } from '../types';
import { formatDiceResult, getDiceResultClassName, getLogTextClassName } from '../utils/combat';

interface TypingLogEntryProps {
  /** 完整文字（已用 \n 連接） */
  fullText: string;
  /** 目前顯示到第幾個字元 */
  charIndex: number;
  /** 骰子結果（可選） */
  diceResult?: DiceResult;
  /** 是否為緊湊模式（手機版用較小的間距） */
  compact?: boolean;
}

/**
 * 打字中的日誌條目元件 - 顯示正在打字的 log 訊息
 */
export default function TypingLogEntry({ fullText, charIndex, diceResult, compact = false }: TypingLogEntryProps) {
  const textSize = compact ? 'text-xs' : 'text-sm';
  const spacing = compact ? 'space-y-0.5' : 'space-y-1';
  const isTyping = charIndex < fullText.length;

  const displayedText = fullText.slice(0, charIndex);
  const lines = displayedText.split('\n');

  return (
    <div className={spacing}>
      {/* 骰子結果 */}
      {diceResult && (
        <p className={`${textSize} ${getDiceResultClassName(diceResult.result)}`}>
          擲骰 {diceResult.roll}/{diceResult.target} — {formatDiceResult(diceResult.result)}
        </p>
      )}
      {/* 打字中的文字 */}
      {lines.map((text, i) => (
        <p
          key={i}
          className={`leading-relaxed ${textSize} ${getLogTextClassName(text, compact)}`}
        >
          {text || '\u00A0'}
          {/* 最後一行顯示游標 */}
          {i === lines.length - 1 && isTyping && (
            <span className="animate-pulse text-amber-400">▌</span>
          )}
        </p>
      ))}
    </div>
  );
}
