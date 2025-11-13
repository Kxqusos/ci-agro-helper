'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginData, RegisterData, AuthContextType } from '../types';
import { authApi } from '../services/authApi';
import { tokenService } from '../services/tokenService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(data);
      setUser(result.user);
      tokenService.setToken(result.token);
      tokenService.setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await authApi.register(data);
      setUser(result.user);
      tokenService.setToken(result.token);
      tokenService.setUser(result.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    tokenService.clear();
    authApi.logout().catch(console.error);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('аааыыыы');
  }
  return context;
};