// 遊戲核心型別定義
// 注意：所有 API 相關欄位使用 snake_case 以匹配後端

// 背景職業
export type Background = 'warrior' | 'herbalist' | 'mage';

// 屬性值
export interface Stats {
  strength: number;
  dexterity: number;
  intelligence: number;
  perception: number;
}

// 裝備欄位
export interface EquipmentSlots {
  weapon: string | null;
  armor: string | null;
  accessory1: string | null;
  accessory2: string | null;
}

// 玩家角色
export interface Player {
  name: string;
  background: Background;
  stats: Stats;
  hp: number;
  max_hp: number;
  mp: number;
  max_mp: number;
  gold: number;
  inventory: InventoryItem[];
  equipment: EquipmentSlots;
  recipes: string[];
  choices: Record<string, unknown>;
}

// 物品
export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  quantity: number;
  description?: string;
}

export type ItemType =
  | 'weapon'
  | 'armor'
  | 'consumable'
  | 'material'
  | 'key_item';

// 戰鬥狀態
export interface CombatState {
  enemy_id: string;
  enemy_hp: number;
  enemy_max_hp: number;
  turn: number;
  player_buffs: Record<string, unknown>[];
  enemy_buffs: Record<string, unknown>[];
}

// 遊戲狀態
export interface GameState {
  chapter: string;
  scene: string;
  player: Player;
  flags: Record<string, unknown>;
  combat: CombatState | null;
}

// 存檔資訊
export interface SaveSlot {
  slot: number;
  character_name: string | null;
  chapter: string | null;
  updated_at: string | null;
  is_empty: boolean;
}

// 動作請求
export interface ActionRequest {
  action_type: string;
  action_data?: Record<string, unknown>;
}

// 戰鬥場景資訊
export interface CombatInfo {
  enemy_name: string;
  enemy_hp: number;
  enemy_max_hp: number;
  enemy_evasion: number;
  enemy_attack: string;
  enemy_weakness: string;
  tutorial_text?: string;
}

// 場景類型
export type SceneType = 'narrative' | 'combat';

// 動作回應
export interface ActionResponse {
  success: boolean;
  message: string;
  narrative: string[];
  game_state: GameState | null;
  available_actions: Record<string, unknown>[];
  dice_result: Record<string, unknown> | null;
  scene_type?: SceneType | null;
  combat_info?: CombatInfo | null;
}

// 難度
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

// 使用者
export interface User {
  id: number;
  email: string;
  created_at: string;
}

// 認證回應
export interface AuthResponse {
  access_token: string;
  token_type: string;
}

// 登入/註冊表單
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  confirm_password: string;
}

// API 錯誤
export interface ApiError {
  detail: string;
}
