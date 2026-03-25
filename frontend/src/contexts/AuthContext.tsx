/**
 * 认证上下文
 * 用于在整个应用中共享认证状态
 */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState } from '../types';

const TOKEN_KEY = 'access_token';

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string, inviteCode: string, realName?: string, department?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAuthHeader: () => Record<string, string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // 获取存储的 token
  const getStoredToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  };

  // 存储 token
  const setStoredToken = (token: string) => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  // 清除 token
  const clearStoredToken = () => {
    localStorage.removeItem(TOKEN_KEY);
  };

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async (token: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const user = await response.json();
        return user;
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }, []);

  // 初始化：检查是否已登录
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (token) {
        const user = await fetchCurrentUser(token);
        if (user) {
          setState({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      }
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    initAuth();
  }, [fetchCurrentUser]);

  // 登录
  const login = useCallback(async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setStoredToken(data.access_token);
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      } else {
        return { success: false, error: data.detail || '登录失败' };
      }
    } catch (error) {
      return { success: false, error: '网络错误' };
    }
  }, []);

  // 注册
  const register = useCallback(async (username: string, email: string, password: string, inviteCode: string, realName?: string, department?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, invite_code: inviteCode, real_name: realName, department }),
      });

      const data = await response.json();

      if (response.ok) {
        // 注册成功后自动登录
        return await login(username, password);
      } else {
        return { success: false, error: data.detail || '注册失败' };
      }
    } catch (error) {
      return { success: false, error: '网络错误' };
    }
  }, [login]);

  // 登出
  const logout = useCallback(async () => {
    try {
      const token = getStoredToken();
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('登出失败:', error);
    }

    clearStoredToken();
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // 获取认证头
  const getAuthHeader = useCallback((): Record<string, string> => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    getAuthHeader,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};