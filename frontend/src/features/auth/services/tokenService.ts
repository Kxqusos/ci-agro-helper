// Storage keys
const ACCESS_TOKEN_KEY = 'ACCESS_TOKEN';
const REFRESH_TOKEN_KEY = 'REFRESH_TOKEN';
const TOKEN_KEY = 'auth_token'; // Legacy key for backwards compatibility
const USER_KEY = 'user_data';

export const tokenService = {
  // ===== Access Token Methods =====

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      // First try new key, then fall back to legacy
      return localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    }
    return null;
  },

  /**
   * Set access token in localStorage
   */
  setAccessToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
      // Also set legacy key for backwards compatibility
      localStorage.setItem(TOKEN_KEY, token);
    }
  },

  /**
   * Remove access token from localStorage
   */
  removeAccessToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  // ===== Refresh Token Methods =====

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
  },

  /**
   * Set refresh token in localStorage
   */
  setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    }
  },

  /**
   * Remove refresh token from localStorage
   */
  removeRefreshToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },

  // ===== Legacy Methods (for backwards compatibility) =====

  /**
   * @deprecated Use getAccessToken() instead
   */
  getToken(): string | null {
    return this.getAccessToken();
  },

  /**
   * @deprecated Use setAccessToken() instead
   */
  setToken(token: string): void {
    this.setAccessToken(token);
  },

  /**
   * @deprecated Use removeAccessToken() instead
   */
  removeToken(): void {
    this.removeAccessToken();
  },

  // ===== User Data Methods =====

  getUser(): any {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem(USER_KEY);
      return user ? JSON.parse(user) : null;
    }
    return null;
  },

  setUser(user: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  },

  removeUser(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_KEY);
    }
  },

  // ===== Clear All =====

  /**
   * Clear all authentication data from localStorage
   */
  clear(): void {
    this.removeAccessToken();
    this.removeRefreshToken();
    this.removeUser();
  }
};