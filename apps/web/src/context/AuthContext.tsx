import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { UserWithRole } from '@dinepilot/types';
import { RegisterInput, LoginInput } from '@dinepilot/validation';

interface AuthContextType {
  user: UserWithRole | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<any>;
  register: (input: RegisterInput) => Promise<any>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      setIsLoading(true);
      const res = await authApi.getMe();
      setUser(res.user || null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (input: LoginInput) => {
    const res = await authApi.login(input);
    setUser(res.user);
    return res.user;
  };

  const register = async (input: RegisterInput) => {
    const res = await authApi.register(input);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        refetchUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
