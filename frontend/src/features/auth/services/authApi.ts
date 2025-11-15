import { apiClient } from '@/lib/apiClient';
import { LoginData, RegisterData, AuthResponse, User } from '../types';

/**
 * Authentication API service
 *
 * Provides methods for user authentication, registration, and profile management
 * All requests go through BFF routes (/api/auth/*) which proxy to the auth service
 */
export const authApi = {
  /**
   * Login user with email and password
   *
   * @param data - Login credentials (email, password)
   * @returns AuthResponse with tokens and user data
   */
  async login(data: LoginData): Promise<AuthResponse> {
    return apiClient.post<LoginData, AuthResponse>('/auth/login', data, {
      skipAuth: true,
    });
  },

  /**
   * Register new user
   *
   * @param data - Registration data (name, email, password)
   * @returns AuthResponse with tokens and user data (automatically logs in)
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    return apiClient.post<RegisterData, AuthResponse>('/auth/register', data, {
      skipAuth: true,
    });
  },

  /**
   * Get current user profile
   *
   * @returns User profile data
   * @throws ApiError with status 401 if token is invalid
   */
  async getMe(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  /**
   * Refresh access token using refresh token
   *
   * @param refreshToken - Refresh token
   * @returns New tokens (access and refresh)
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expireIn: number }> {
    return apiClient.post<{ refreshToken: string }, { accessToken: string; refreshToken?: string; expireIn: number }>(
      '/auth/refresh',
      { refreshToken },
      { skipAuth: true }
    );
  },

  /**
   * Logout user (client-side only, clears tokens)
   */
  async logout(): Promise<void> {
    // Client-side logout - just clear tokens
    // Backend doesn't have a logout endpoint since JWT tokens are stateless
    return Promise.resolve();
  },
};