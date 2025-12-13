// 遊戲核心型別定義

// 背景職業
export type Background = 'warrior' | 'herbalist' | 'mage';

// 屬性值
export interface Stats {
  strength: number;     // 力量
  agility: number;      // 敏捷
  intelligence: number; // 智力
  perception: number;   // 感知
}

// 玩家角色
export interface Player {
  name: string;
  background: Background;
  stats: Stats;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gold: number;
  inventory: InventoryItem[];
  equipment: Equipment;
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

// 裝備
export interface Equipment {
  weapon: InventoryItem | null;
  armor: InventoryItem | null;
  accessory: InventoryItem | null;
}

// 遊戲狀態
export interface GameState {
  player: Player;
  currentChapter: number;
  currentScene: string;
  flags: Record<string, boolean>;
  questProgress: Record<string, number>;
}

// 存檔資訊
export interface SaveSlot {
  slot: number;
  isEmpty: boolean;
  characterName?: string;
  chapter?: number;
  playTime?: number;
  updatedAt?: string;
}

// 動作請求
export interface ActionRequest {
  actionType: string;
  params?: Record<string, unknown>;
}

// 動作回應
export interface ActionResponse {
  success: boolean;
  narrative: string[];
  choices?: Choice[];
  combatLog?: string[];
  stateChanges?: Partial<GameState>;
  error?: string;
}

// 選項
export interface Choice {
  id: string;
  text: string;
  requiresCheck?: {
    stat: keyof Stats;
    difficulty: Difficulty;
  };
}

// 難度
export type Difficulty = 'easy' | 'normal' | 'hard' | 'extreme';

// 使用者
export interface User {
  id: number;
  email: string;
  createdAt: string;
}

// 認證回應
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}

// 登入/註冊表單
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm extends LoginForm {
  confirmPassword: string;
}

// API 錯誤
export interface ApiError {
  detail: string;
}
