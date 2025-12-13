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
  Background
} from '../types';
import { gameApi } from '../services/api';

// UI 狀態
interface GameUIState {
  saves: SaveSlot[];
  currentSlot: number | null;
  gameState: GameState | null;
  narrative: string[];
  isLoading: boolean;
  error: string | null;
}

// Action 型別
type GameAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SAVES'; payload: SaveSlot[] }
  | { type: 'SET_GAME'; payload: { slot: number; state: GameState } }
  | { type: 'CLEAR_GAME' }
  | { type: 'APPEND_NARRATIVE'; payload: string[] }
  | { type: 'UPDATE_STATE'; payload: Partial<GameState> };

// Context 型別
interface GameContextType extends GameUIState {
  loadSaves: () => Promise<void>;
  startNewGame: (slot: number, name: string, bg: Background) => Promise<void>;
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
        gameState: action.payload.state,
        narrative: [],
        isLoading: false,
        error: null,
      };
    case 'CLEAR_GAME':
      return {
        ...state,
        currentSlot: null,
        gameState: null,
        narrative: []
      };
    case 'APPEND_NARRATIVE':
      return {
        ...state,
        narrative: [...state.narrative, ...action.payload]
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
  isLoading: false,
  error: null,
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
    background: Background
  ) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const gameState = await gameApi.createNew(slot, name, background);
      dispatch({ type: 'SET_GAME', payload: { slot, state: gameState } });
    } catch {
      dispatch({ type: 'SET_ERROR', payload: '無法建立新遊戲' });
    }
  };

  const loadGame = async (slot: number) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const gameState = await gameApi.loadSave(slot);
      dispatch({ type: 'SET_GAME', payload: { slot, state: gameState } });
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

    if (response.stateChanges) {
      dispatch({ type: 'UPDATE_STATE', payload: response.stateChanges });
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
