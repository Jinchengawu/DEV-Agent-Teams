import { useState, useCallback } from 'react';
import { AuthState, LoginRequest, LoginResponse } from '../../../shared/types';

const API_BASE = '/api';

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
  });

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: LoginResponse = await response.json();

      if (data.success && data.token && data.user) {
        localStorage.setItem('token', data.token);
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          loading: false,
          error: null,
        });
        return true;
      } else {
        setAuthState((prev) => ({
          ...prev,
          loading: false,
          error: data.error || 'Login failed',
        }));
        return false;
      }
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        loading: false,
        error: 'Network error. Please try again.',
      }));
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });
  }, []);

  const verifyToken = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success && data.user) {
        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token,
          loading: false,
          error: null,
        });
        return true;
      } else {
        localStorage.removeItem('token');
        return false;
      }
    } catch {
      localStorage.removeItem('token');
      return false;
    }
  }, []);

  const clearError = useCallback(() => {
    setAuthState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    verifyToken,
    clearError,
  };
};
