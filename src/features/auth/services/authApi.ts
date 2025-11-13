import { LoginData, RegisterData, AuthResponse } from '../types';

export const authApi = {
  async login(data: LoginData): Promise<AuthResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: {
            id: '1',
            email: data.email,
            name: 'Test User',
            createdAt: new Date().toISOString(),
          },
          token: 'fake-jwt-token',
        });
      }, 1000);
    });
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          user: {
            id: '1',
            email: data.email,
            name: data.name,
            createdAt: new Date().toISOString(),
          },
          token: 'fake-jwt-token',
        });
      }, 1000);
    });
  },

  async logout(): Promise<void> {
    return Promise.resolve();
  }
};