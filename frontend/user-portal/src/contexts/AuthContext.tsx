import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  teamId: string;
  role?: 'owner' | 'admin' | 'member' | 'viewer';
  emailVerified?: boolean;
  emailVerifiedAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  sendLoginCode: (email: string) => Promise<{ message: string; code?: string }>;
  loginWithCode: (email: string, code: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const { data } = await api.get('/api/v1/users/me');
      // 检查缓存中的用户ID与新获取的是否一致
      const cachedUserId = localStorage.getItem('cachedUserId');
      if (cachedUserId && cachedUserId !== data.id) {
        // 用户ID不同，说明切换了账户，清除缓存
        queryClient.clear();
      }
      // 保存当前用户ID和teamId到 localStorage
      localStorage.setItem('cachedUserId', data.id);
      if (data.teamId) {
        localStorage.setItem('teamId', data.teamId);
      }
      setUser(data);
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('cachedUserId');
      localStorage.removeItem('teamId');
      setToken(null);
      queryClient.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // 登录前清除旧的缓存数据，确保不会看到其他账户的数据
    queryClient.clear();

    const { data } = await api.post('/api/v1/auth/login', { email, password });
    localStorage.setItem('token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user?.teamId) {
      localStorage.setItem('teamId', data.user.teamId);
    }
    setToken(data.accessToken);
    setUser(data.user);
  };

  const sendLoginCode = async (email: string): Promise<{ message: string; code?: string }> => {
    const { data } = await api.post('/api/v1/auth/send-login-code', { email });
    return data;
  };

  const loginWithCode = async (email: string, code: string) => {
    // 登录前清除旧的缓存数据
    queryClient.clear();

    const { data } = await api.post('/api/v1/auth/verify-login-code', { email, code });
    localStorage.setItem('token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user?.teamId) {
      localStorage.setItem('teamId', data.user.teamId);
    }
    setToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/api/v1/auth/register', { name, email, password });
    localStorage.setItem('token', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    if (data.user?.teamId) {
      localStorage.setItem('teamId', data.user.teamId);
    }
    setToken(data.accessToken);
    setUser(data.user);
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('cachedUserId');
    localStorage.removeItem('teamId');
    setToken(null);
    setUser(null);
    // 清除所有 React Query 缓存，确保切换账户时不会看到旧数据
    queryClient.clear();
    // 强制导航到登录页面
    navigate('/login', { replace: true });
  }, [queryClient, navigate]);

  const updateUser = (data: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...data });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        sendLoginCode,
        loginWithCode,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
