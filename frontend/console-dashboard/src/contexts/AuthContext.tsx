import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuthService } from '@/lib/api';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId?: string;
  roleEntity?: {
    id: string;
    name: string;
    color?: string;
  };
  permissions?: string[]; // 用于前端 UI 权限控制
  twoFactorEnabled?: boolean;
}

interface LoginResult {
  success: boolean;
  requiresTwoFactor?: boolean;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe?: boolean, twoFactorCode?: string) => Promise<LoginResult>;
  loginWithCode: (email: string, code: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('console_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token and load admin data
      const storedAdmin = localStorage.getItem('console_admin');
      if (storedAdmin) {
        setAdmin(JSON.parse(storedAdmin));
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = async (email: string, password: string, rememberMe = false, twoFactorCode?: string): Promise<LoginResult> => {
    const { data } = await adminAuthService.login(email, password, rememberMe, twoFactorCode);

    // 检查是否需要 2FA
    if (data.requiresTwoFactor) {
      return { success: false, requiresTwoFactor: true };
    }

    localStorage.setItem('console_token', data.accessToken);
    localStorage.setItem('console_admin', JSON.stringify(data.admin));
    if (rememberMe) {
      localStorage.setItem('console_remember_me', 'true');
    } else {
      localStorage.removeItem('console_remember_me');
    }
    setToken(data.accessToken);
    setAdmin(data.admin);
    return { success: true };
  };

  const loginWithCode = async (email: string, code: string, rememberMe = false) => {
    const { data } = await adminAuthService.loginWithCode(email, code, rememberMe);
    localStorage.setItem('console_token', data.accessToken);
    localStorage.setItem('console_admin', JSON.stringify(data.admin));
    if (rememberMe) {
      localStorage.setItem('console_remember_me', 'true');
    } else {
      localStorage.removeItem('console_remember_me');
    }
    setToken(data.accessToken);
    setAdmin(data.admin);
  };

  const logout = () => {
    localStorage.removeItem('console_token');
    localStorage.removeItem('console_admin');
    setToken(null);
    setAdmin(null);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isAuthenticated: !!admin,
        login,
        loginWithCode,
        logout,
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

/**
 * 权限检查 hook
 * 用于前端 UI 权限控制（显示/隐藏元素）
 *
 * 注意：前端权限检查仅用于 UI 体验优化，
 * 真正的权限验证在后端服务端进行
 */
export function usePermission() {
  const { admin } = useAuth();
  const permissions = admin?.permissions || [];

  /**
   * 检查是否拥有指定权限
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * 检查是否拥有所有指定权限
   */
  const hasAllPermissions = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.every(p => permissions.includes(p));
  };

  /**
   * 检查是否拥有任意一个指定权限
   */
  const hasAnyPermission = (requiredPermissions: string[]): boolean => {
    return requiredPermissions.some(p => permissions.includes(p));
  };

  /**
   * 检查是否是超级管理员（SUPER_ADMIN 角色）
   */
  const isSuperAdmin = (): boolean => {
    return admin?.role === 'SUPER_ADMIN';
  };

  return {
    permissions,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    isSuperAdmin,
  };
}
