import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  type ReactNode
} from 'react';
import type { User, LoginForm } from '../types';
import { authApi } from '../services/api';

// 狀態型別
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Action 型別
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' };

// Context 型別
interface AuthContextType extends AuthState {
  login: (form: LoginForm) => Promise<void>;
  register: (form: LoginForm) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    case 'AUTH_SUCCESS':
      return {
        user: action.payload,
        isLoading: false,
        isAuthenticated: true
      };
    case 'AUTH_FAILURE':
      return {
        user: null,
        isLoading: false,
        isAuthenticated: false
      };
    case 'LOGOUT':
      return {
        user: null,
        isLoading: false,
        isAuthenticated: false
      };
  }
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
};

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 初始化：檢查現有 token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      dispatch({ type: 'AUTH_FAILURE' });
      return;
    }

    authApi.getMe()
      .then((user) => dispatch({ type: 'AUTH_SUCCESS', payload: user }))
      .catch(() => {
        localStorage.removeItem('token');
        dispatch({ type: 'AUTH_FAILURE' });
      });
  }, []);

  const login = async (form: LoginForm) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { access_token } = await authApi.login(form);
      localStorage.setItem('token', access_token);
      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const register = async (form: LoginForm) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const { access_token } = await authApi.register(form);
      localStorage.setItem('token', access_token);
      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
