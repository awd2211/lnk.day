import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuthService } from '@/lib/api';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
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

  const login = async (email: string, password: string) => {
    const { data } = await adminAuthService.login(email, password);
    localStorage.setItem('console_token', data.accessToken);
    localStorage.setItem('console_admin', JSON.stringify(data.admin));
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
