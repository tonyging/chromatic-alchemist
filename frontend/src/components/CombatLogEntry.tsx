import type { DiceResult } from '../types';
import { formatDiceResult, getDiceResultClassName, getLogTextClassName } from '../utils/combat';

export interface LogEntry {
  id: number;
  type: 'combat' | 'dice' | 'result' | 'system';
  content: string[];
  diceResult?: DiceResult;
}

interface CombatLogEntryProps {
  entry: LogEntry;
  /** 是否為緊湊模式（手機版用較小的間距） */
  compact?: boolean;
}

/**
 * 戰鬥日誌條目元件 - 顯示已完成的 log 訊息
 */
export default function CombatLogEntry({ entry, compact = false }: CombatLogEntryProps) {
  const textSize = compact ? 'text-xs' : 'text-sm';
  const spacing = compact ? 'space-y-0.5' : 'space-y-1';

  return (
    <div className={spacing}>
      {/* 骰子結果 */}
      {entry.diceResult && (
        <p className={`${textSize} ${getDiceResultClassName(entry.diceResult.result)}`}>
          擲骰 {entry.diceResult.roll}/{entry.diceResult.target} — {formatDiceResult(entry.diceResult.result)}
        </p>
      )}
      {/* 訊息內容 */}
      {entry.content.map((text, i) => (
        <p
          key={i}
          className={`leading-relaxed ${textSize} ${getLogTextClassName(text, compact)}`}
        >
          {text || '\u00A0'}
        </p>
      ))}
    </div>
  );
}
