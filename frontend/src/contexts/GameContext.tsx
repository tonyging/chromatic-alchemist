import {
  createContext,
  useContext,
  useReducer,
  type ReactNode
} from 'react';
import type {
  GameState,
  SaveSlot,
  ActionRequest,
  ActionResponse,
  Background,
  SceneType,
  CombatInfo,
  Stats
} from '../types';
import { gameApi } from '../services/api';

// UI 狀態
interface GameUIState {
  saves: SaveSlot[];
  currentSlot: number | null;
  gameState: GameState | null;
  narrative: string[];
  availableActions: Array<{ id: string; type: string; label: string; data?: Record<string, unknown> }>;
  isLoading: boolean;
  error: string | null;
  sceneType: SceneType | null;
  combatInfo: CombatInfo | null;
}

// Action 型別
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAVES'; payload: SaveSlot[] }
  | { type: 'SET_GAME'; payload: { slot: number; narrative: string[]; actions: GameUIState['availableActions']; gameState?: GameState | null; sceneType?: SceneType | null; combatInfo?: CombatInfo | null } }
  | { type: 'START_NEW_GAME'; payload: { slot: number; narrative: string[]; actions: GameUIState['availableActions']; gameState?: GameState | null; sceneType?: SceneType | null; combatInfo?: CombatInfo | null } }
  | { type: 'CLEAR_GAME' }
  | { type: 'APPEND_NARRATIVE'; payload: string[] }
  | { type: 'SET_ACTIONS'; payload: GameUIState['availableActions'] }
  | { type: 'SET_SCENE'; payload: { sceneType: SceneType | null; combatInfo: CombatInfo | null } }
  | { type: 'UPDATE_STATE'; payload: Partial<GameState> };

// Context 型別
interface GameContextType extends GameUIState {
  loadSaves: () => Promise<void>;
  startNewGame: (slot: number, name: string, bg: Background, stats?: Stats) => Promise<void>;
  loadGame: (slot: number) => Promise<void>;
  deleteGame: (slot: number) => Promise<void>;
  sendAction: (action: ActionRequest) => Promise<ActionResponse>;
  exitGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

// Reducer
function gameReducer(state: GameUIState, action: GameAction): GameUIState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'SET_SAVES':
      return { ...state, saves: action.payload, isLoading: false };
    case 'SET_GAME':
      return {
        ...state,
        currentSlot: action.payload.slot,
        gameState: action.payload.gameState ?? null,
        narrative: action.payload.narrative,
        availableActions: action.payload.actions,
        sceneType: action.payload.sceneType ?? null,
        combatInfo: action.payload.combatInfo ?? null,
        isLoading: false,
        error: null,
      };
    case 'START_NEW_GAME':
      return {
        ...state,
        currentSlot: action.payload.slot,
        gameState: action.payload.gameState ?? null,
        narrative: action.payload.narrative,
        availableActions: action.payload.actions,
        sceneType: action.payload.sceneType ?? null,
        combatInfo: action.payload.combatInfo ?? null,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_GAME':
      return {
        ...state,
        currentSlot: null,
        gameState: null,
        narrative: [],
        availableActions: [],
        sceneType: null,
        combatInfo: null,
      };
    case 'SET_SCENE':
      return {
        ...state,
        sceneType: action.payload.sceneType,
        combatInfo: action.payload.combatInfo,
      };
    case 'APPEND_NARRATIVE':
      return {
        ...state,
        narrative: [...state.narrative, ...action.payload]
      };
    case 'SET_ACTIONS':
      return {
        ...state,
        availableActions: action.payload
      };
    case 'UPDATE_STATE':
      if (!state.gameState) return state;
      return {
        ...state,
        gameState: { ...state.gameState, ...action.payload },
      };
  }
}

const initialState: GameUIState = {
  saves: [],
  currentSlot: null,
  gameState: null,
  narrative: [],
  availableActions: [],
  isLoading: false,
  error: null,
  sceneType: null,
  combatInfo: null,
};

// Provider
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const loadSaves = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const saves = await gameApi.getSaves();
      dispatch({ type: 'SET_SAVES', payload: saves });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '無法載入存檔' });
    }
  };

  const startNewGame = async (
    slot: number,
    name: string,
    background: Background,
    stats?: Stats
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await gameApi.createNew(slot, name, background, stats);
      dispatch({
        type: 'START_NEW_GAME',
        payload: {
          slot,
          narrative: response.narrative,
          actions: response.available_actions as GameUIState['availableActions'],
          gameState: response.game_state,
          sceneType: response.scene_type,
          combatInfo: response.combat_info,
        }
      });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '無法建立新遊戲' });
    }
  };

  const loadGame = async (slot: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await gameApi.loadSave(slot);
      dispatch({
        type: 'SET_GAME',
        payload: {
          slot,
          narrative: response.narrative,
          actions: response.available_actions as GameUIState['availableActions'],
          gameState: response.game_state,
          sceneType: response.scene_type,
          combatInfo: response.combat_info,
        }
      });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '無法載入遊戲' });
    }
  };

  const deleteGame = async (slot: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      await gameApi.deleteSave(slot);
      await loadSaves();
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '無法刪除存檔' });
    }
  };

  const sendAction = async (action: ActionRequest): Promise<ActionResponse> => {
    if (!state.currentSlot) {
      throw new Error('No active game');
    }

    const response = await gameApi.sendAction(state.currentSlot, action);

    if (response.narrative) {
      dispatch({ type: 'APPEND_NARRATIVE', payload: response.narrative });
    }

    if (response.available_actions) {
      dispatch({ type: 'SET_ACTIONS', payload: response.available_actions as GameUIState['availableActions'] });
    }

    if (response.scene_type !== undefined) {
      dispatch({
        type: 'SET_SCENE',
        payload: {
          sceneType: response.scene_type ?? null,
          combatInfo: response.combat_info ?? null,
        }
      });
    }

    // 處理 state_changes 中的玩家狀態更新
    if (state.gameState?.player && response.state_changes) {
      const playerUpdates: Record<string, unknown> = {};

      if (response.state_changes.player_hp !== undefined) {
        playerUpdates.hp = response.state_changes.player_hp;
      }
      if (response.state_changes.player_mp !== undefined) {
        playerUpdates.mp = response.state_changes.player_mp;
      }

      if (Object.keys(playerUpdates).length > 0) {
        dispatch({
          type: 'UPDATE_STATE',
          payload: {
            player: {
              ...state.gameState.player,
              ...playerUpdates,
            }
          }
        });
      }
    } else if (response.game_state) {
      dispatch({ type: 'UPDATE_STATE', payload: response.game_state });
    }

    // 重新載入遊戲狀態以同步 inventory 變更（包括戰利品）
    const needsInventoryRefresh = response.state_changes?.inventory_changed ||
                                  response.state_changes?.drops ||
                                  response.state_changes?.gold_gained;
    if (needsInventoryRefresh && state.currentSlot) {
      const freshState = await gameApi.loadSave(state.currentSlot);
      if (freshState.game_state?.player) {
        dispatch({
          type: 'UPDATE_STATE',
          payload: { player: freshState.game_state.player }
        });
      }
    }

    return response;
  };

  const exitGame = () => {
    dispatch({ type: 'CLEAR_GAME' });
  };

  return (
    <GameContext.Provider value={{
      ...state,
      loadSaves,
      startNewGame,
      loadGame,
      deleteGame,
      sendAction,
      exitGame,
    }}>
      {children}
    </GameContext.Provider>
  );
}

// Hook
export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
