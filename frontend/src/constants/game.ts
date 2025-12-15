/**
 * 遊戲常數配置
 * 集中管理所有 magic numbers，方便調整和維護
 */

// ==================== 打字效果 ====================
/** 戰鬥日誌打字速度（毫秒/字元） */
export const TYPING_SPEED = 15;

/** 劇情對話打字速度（毫秒/字元） */
export const NARRATIVE_TYPING_SPEED = 50;

/** 戰鬥日誌最大保留條數 */
export const COMBAT_LOG_MAX_LENGTH = 100;

// ==================== 動畫時長 ====================
/** 戰鬥過渡動畫時長（毫秒） */
export const COMBAT_TRANSITION_DURATION = 1000;

/** 勝利慶祝動畫時長（毫秒） */
export const VICTORY_CELEBRATION_DURATION = 1500;

/** 新手加速提示顯示時長（毫秒） */
export const SPEED_TIP_DURATION = 4000;

/** 新手加速提示延遲顯示時間（毫秒） */
export const SPEED_TIP_DELAY = 1500;

/** 受擊特效持續時間（毫秒） */
export const HIT_EFFECT_DURATION = 500;

// ==================== 門檻值 ====================
/** 低 HP 警告門檻（百分比） */
export const LOW_HP_THRESHOLD = 0.3;

// ==================== 觸覺反饋 ====================
/** 手機版按鈕點擊震動時長（毫秒） */
export const VIBRATE_DURATION = 50;

// ==================== Bottom Sheet ====================
/** 向下拖曳關閉距離（像素） */
export const DRAG_CLOSE_DISTANCE = 100;

// ==================== localStorage Keys ====================
/** 音效開關儲存鍵 */
export const STORAGE_KEY_SOUND_ENABLED = 'sound_enabled';

/** 戰鬥加速提示已顯示標記 */
export const STORAGE_KEY_COMBAT_TIP_SEEN = 'combat_speed_tip_seen';
