import axios, { type AxiosError } from 'axios';
import type {
  AuthResponse,
  LoginForm,
  User,
  SaveSlot,
  GameState,
  ActionRequest,
  ActionResponse,
  Background
} from '../types';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器：自動附加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 回應攔截器：處理 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// 認證 API
export const authApi = {
  register: async (form: LoginForm): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/register', form);
    return data;
  },

  login: async (form: LoginForm): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/auth/login', form);
    return data;
  },

  getMe: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me');
    return data;
  },
};

// 遊戲 API
export const gameApi = {
  getSaves: async (): Promise<SaveSlot[]> => {
    const { data } = await api.get<SaveSlot[]>('/game/saves');
    return data;
  },

  createNew: async (
    slot: number,
    characterName: string,
    background: Background
  ): Promise<GameState> => {
    const { data } = await api.post<GameState>(`/game/saves/${slot}/new`, {
      character_name: characterName,
      background,
    });
    return data;
  },

  loadSave: async (slot: number): Promise<GameState> => {
    const { data } = await api.get<GameState>(`/game/saves/${slot}`);
    return data;
  },

  deleteSave: async (slot: number): Promise<void> => {
    await api.delete(`/game/saves/${slot}`);
  },

  sendAction: async (slot: number, action: ActionRequest): Promise<ActionResponse> => {
    const { data } = await api.post<ActionResponse>(
      `/game/saves/${slot}/action`,
      action
    );
    return data;
  },
};

export default api;
