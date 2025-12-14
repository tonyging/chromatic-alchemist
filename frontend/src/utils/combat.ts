import type { DiceResult } from '../types';

/**
 * 格式化骰子結果為中文顯示
 */
export function formatDiceResult(result: DiceResult['result']): string {
  switch (result) {
    case 'critical_success':
      return '大成功！';
    case 'success':
      return '成功';
    case 'failure':
      return '失敗';
    case 'critical_failure':
      return '大失敗...';
    default:
      return result;
  }
}

/**
 * 根據骰子結果取得對應的 CSS class
 */
export function getDiceResultClassName(result: DiceResult['result']): string {
  switch (result) {
    case 'critical_success':
      return 'text-green-400 font-bold animate-critical-success';
    case 'success':
      return 'text-green-400';
    case 'critical_failure':
      return 'text-red-400 font-bold animate-critical-failure';
    case 'failure':
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * 根據文字內容取得對應的 CSS class（用於 log 訊息著色）
 */
export function getLogTextClassName(text: string, compact = false): string {
  if (text === '') {
    return compact ? 'h-1' : 'h-2';
  }
  if (text.startsWith('【')) {
    return 'text-amber-400 font-semibold';
  }
  if (text.includes('傷害')) {
    return 'text-red-300';
  }
  if (text.includes('HP:')) {
    return 'text-gray-500 text-xs';
  }
  if (text.includes('獲得')) {
    return 'text-green-400';
  }
  return 'text-gray-200';
}

/**
 * 判斷文字是否為純劇情（不含戰鬥/系統訊息）
 */
const SYSTEM_PATTERNS = [
  '獲得', '失去', '傷害', 'HP', 'MP', '經驗', '金幣',
  '【', '】', '攻擊', '防禦', '迴避', '命中', '擲骰'
];

export function isNarrativeText(texts: string[]): boolean {
  return !texts.some(text =>
    SYSTEM_PATTERNS.some(pattern => text.includes(pattern))
  );
}

/**
 * 根據弱點類型返回對應的顏色類別
 */
export function getWeaknessColorClass(weakness: string): string {
  const lower = weakness.toLowerCase();
  if (lower.includes('紅') || lower.includes('red') || lower.includes('火') || lower.includes('力量')) {
    return 'text-red-400';
  }
  if (lower.includes('藍') || lower.includes('blue') || lower.includes('冰') || lower.includes('智慧')) {
    return 'text-blue-400';
  }
  if (lower.includes('綠') || lower.includes('green') || lower.includes('毒') || lower.includes('生命')) {
    return 'text-green-400';
  }
  return 'text-amber-400'; // 預設金色
}

/**
 * 根據弱點類型返回對應的光效圓點（用於視覺標示）
 */
export function getWeaknessIndicator(weakness: string): string {
  const lower = weakness.toLowerCase();
  if (lower.includes('紅') || lower.includes('red') || lower.includes('火') || lower.includes('力量')) {
    return '🔴';
  }
  if (lower.includes('藍') || lower.includes('blue') || lower.includes('冰') || lower.includes('智慧')) {
    return '🔵';
  }
  if (lower.includes('綠') || lower.includes('green') || lower.includes('毒') || lower.includes('生命')) {
    return '🟢';
  }
  return '⚪'; // 預設白色
}
