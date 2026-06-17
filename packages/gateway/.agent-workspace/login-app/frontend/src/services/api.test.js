import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiService } from './api';

describe('ApiService', () => {
  let apiService;

  beforeEach(() => {
    apiService = new ApiService();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ==================== Token Management ====================
  describe('Token Management', () => {
    it('should return null when no token is stored', () => {
      expect(apiService.getToken()).toBeNull();
    });

    it('should store and retrieve token', () => {
      apiService.setToken('test-token-123');
      expect(apiService.getToken()).toBe('test-token-123');
    });

    it('should remove token', () => {
      apiService.setToken('test-token-123');
      apiService.removeToken();
      expect(apiService.getToken()).toBeNull();
    });

    it('should detect authenticated state', () => {
      expect(apiService.isAuthenticated()).toBe(false);
      apiService.setToken('test-token');
      expect(apiService.isAuthenticated()).toBe(true);
    });
  });

  // ==================== Login ====================
  describe('login', () => {
    it('should login successfully and store token', async () => {
      const mockResponse = {
        success: true,
        message: 'Login successful',
        data: {
          token: 'jwt-token-123',
          user: { id: '1', email: 'test@example.com', name: 'Test User' }
        }
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data.token).toBe('jwt-token-123');
      expect(apiService.getToken()).toBe('jwt-token-123');
    });

    it('should throw error on invalid credentials', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid email or password'
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(apiService.login('test@example.com', 'wrongpass')).rejects.toEqual({
        status: 401,
        message: 'Invalid email or password',
        errors: []
      });
    });

    it('should throw validation error on invalid input', async () => {
      const mockResponse = {
        success: false,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }]
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(apiService.login('invalid', 'password')).rejects.toEqual({
        status: 400,
        message: 'Validation failed',
        errors: [{ field: 'email', message: 'Invalid email' }]
      });
    });

    it('should handle network errors', async () => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(apiService.login('test@example.com', 'password')).rejects.toEqual({
        status: 0,
        message: 'Network error. Please check your connection.',
        errors: []
      });
    });

    it('should not store token on failed login', async () => {
      const mockResponse = {
        success: false,
        message: 'Invalid credentials'
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse)
      });

      try {
        await apiService.login('test@example.com', 'wrongpass');
      } catch (e) {
        // Expected
      }

      expect(apiService.getToken()).toBeNull();
    });
  });

  // ==================== Register ====================
  describe('register', () => {
    it('should register successfully and store token', async () => {
      const mockResponse = {
        success: true,
        message: 'Registration successful',
        data: {
          token: 'new-user-token',
          user: { id: '2', email: 'new@example.com', name: 'New User' }
        }
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await apiService.register('new@example.com', 'password123', 'New User');

      expect(result.success).toBe(true);
      expect(apiService.getToken()).toBe('new-user-token');
    });

    it('should throw error on duplicate email', async () => {
      const mockResponse = {
        success: false,
        message: 'User with this email already exists'
      };

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve(mockResponse)
      });

      await expect(apiService.register('existing@example.com', 'pass123', 'User')).rejects.toEqual({
        status: 409,
        message: 'User with this email already exists',
        errors: []
      });
    });
  });

  // ==================== Request Headers ====================
  describe('Request Headers', () => {
    it('should include Authorization header when token exists', async () => {
      apiService.setToken('my-token');
      
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await apiService.getProfile();

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-token'
          })
        })
      );
    });

    it('should not include Authorization header when no token', async () => {
      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} })
      });

      await apiService.getProfile();

      const callArgs = global.fetch.mock.calls[0][1];
      expect(callArgs.headers['Authorization']).toBeUndefined();
    });
  });

  // ==================== Logout ====================
  describe('logout', () => {
    it('should remove token on logout', () => {
      apiService.setToken('some-token');
      apiService.logout();
      expect(apiService.getToken()).toBeNull();
      expect(apiService.isAuthenticated()).toBe(false);
    });
  });

  // ==================== Profile ====================
  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockProfile = {
        success: true,
        data: { id: '1', email: 'test@example.com', name: 'Test User' }
      };

      apiService.setToken('valid-token');

      vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProfile)
      });

      const result = await apiService.getProfile();

      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@example.com');
    });
  });
});
