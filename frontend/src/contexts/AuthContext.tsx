
import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { buildApiUrl, API_CONFIG } from '@/config/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  quota_limit: number;
  quota_used: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.ME), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
      } else {
        localStorage.removeItem('token');
        setToken(null);
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user, token } = data.data;
        setUser(user);
        setToken(token);
        localStorage.setItem('token', token);
        toast({ title: 'Đăng nhập thành công', description: 'Chào mừng bạn trở lại!' });
        return true;
      } else {
        toast({ 
          title: 'Đăng nhập thất bại', 
          description: data.message || 'Email hoặc mật khẩu không đúng',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      toast({ 
        title: 'Lỗi kết nối', 
        description: 'Không thể kết nối đến máy chủ',
        variant: 'destructive'
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    toast({ title: 'Đã đăng xuất', description: 'Hẹn gặp lại bạn!' });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isLoading,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
