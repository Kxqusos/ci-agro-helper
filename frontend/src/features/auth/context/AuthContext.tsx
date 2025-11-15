'use client'
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, LoginData, RegisterData, AuthContextType } from '../types';
import { authApi } from '../services/authApi';
import { tokenService } from '../services/tokenService';
import { ApiError } from '@/lib/apiClient';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start with true for initial session check
  const router = useRouter();

  /**
   * Restore session on mount by checking for existing token
   */
  useEffect(() => {
    const restoreSession = async () => {
      const token = tokenService.getAccessToken();

      // No token, no session to restore
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to fetch user profile with existing token
        const userData = await authApi.getMe();
        setUser(userData);
        tokenService.setUser(userData);
      } catch (error) {
        // Token is invalid or expired
        if (error instanceof ApiError) {
          console.warn(
            `[Auth] Session restoration failed: ${error.code} (Request ID: ${error.requestId})`
          );

          // Clear invalid tokens
          if (error.status === 401 || error.code === 'auth.invalid_token') {
            tokenService.clear();
            setUser(null);
          }
        } else {
          console.error('[Auth] Unexpected error during session restoration:', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  /**
   * Login user with email and password
   */
  const login = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(data);

      // Save tokens
      tokenService.setAccessToken(result.accessToken);
      if (result.refreshToken) {
        tokenService.setRefreshToken(result.refreshToken);
      }

      // Save user data
      setUser(result.user);
      tokenService.setUser(result.user);
    } catch (error) {
      // Handle and log errors
      if (error instanceof ApiError) {
        console.error(
          `[Auth] Login failed: ${error.code} - ${typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)} (Request ID: ${error.requestId})`
        );
      }
      throw error; // Re-throw for UI to handle
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Register new user and automatically log in
   */
  const register = async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await authApi.register(data);

      // Save tokens
      tokenService.setAccessToken(result.accessToken);
      if (result.refreshToken) {
        tokenService.setRefreshToken(result.refreshToken);
      }

      // Save user data
      setUser(result.user);
      tokenService.setUser(result.user);
    } catch (error) {
      // Handle and log errors
      if (error instanceof ApiError) {
        console.error(
          `[Auth] Registration failed: ${error.code} - ${typeof error.detail === 'string' ? error.detail : JSON.stringify(error.detail)} (Request ID: ${error.requestId})`
        );
      }
      throw error; // Re-throw for UI to handle
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout user and clear session
   */
  const logout = () => {
    setUser(null);
    tokenService.clear();
    authApi.logout().catch(console.error);

    // Redirect to auth page
    router.push('/auth');
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

/**
 * Hook to access auth context
 *
 * @throws Error if used outside AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};