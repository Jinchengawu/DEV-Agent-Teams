import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  describe('login', () => {
    it('handles successful login', async () => {
      const mockResponse = {
        success: true,
        token: 'test-token-123',
        user: { id: '1', email: 'user@example.com', name: 'John Doe' },
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: boolean = false;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'user@example.com',
          password: 'password123',
        });
      });

      expect(loginResult).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockResponse.user);
      expect(result.current.token).toBe('test-token-123');
      expect(result.current.error).toBeNull();
      expect(localStorage.getItem('token')).toBe('test-token-123');
    });

    it('handles failed login', async () => {
      const mockResponse = {
        success: false,
        error: 'Invalid email or password',
      };

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      });

      const { result } = renderHook(() => useAuth());

      let loginResult: boolean = true;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'user@example.com',
          password: 'wrongpassword',
        });
      });

      expect(loginResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBe('Invalid email or password');
    });

    it('handles network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth());

      let loginResult: boolean = true;
      await act(async () => {
        loginResult = await result.current.login({
          email: 'user@example.com',
          password: 'password123',
        });
      });

      expect(loginResult).toBe(false);
      expect(result.current.error).toBe('Network error. Please try again.');
    });

    it('sets loading state during login', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetch.mockReturnValueOnce({
        json: () => promise,
      });

      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.login({ email: 'user@example.com', password: 'password123' });
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, token: 'token', user: { id: '1' } });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears auth state on logout', async () => {
      // First login
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            token: 'test-token',
            user: { id: '1', email: 'test@example.com', name: 'Test' },
          }),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'password123' });
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('verifyToken', () => {
    it('verifies valid token from localStorage', async () => {
      localStorage.setItem('token', 'valid-token');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: true,
            user: { id: '1', email: 'test@example.com', name: 'Test User' },
            token: 'valid-token',
          }),
      });

      const { result } = renderHook(() => useAuth());

      let verifyResult: boolean = false;
      await act(async () => {
        verifyResult = await result.current.verifyToken();
      });

      expect(verifyResult).toBe(true);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    it('returns false when no token exists', async () => {
      const { result } = renderHook(() => useAuth());

      let verifyResult: boolean = true;
      await act(async () => {
        verifyResult = await result.current.verifyToken();
      });

      expect(verifyResult).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('removes invalid token', async () => {
      localStorage.setItem('token', 'invalid-token');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            success: false,
            error: 'Invalid token',
          }),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.verifyToken();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(localStorage.getItem('token')).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears the error state', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'Some error' }),
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.login({ email: 'test@example.com', password: 'wrong' });
      });

      expect(result.current.error).toBe('Some error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
