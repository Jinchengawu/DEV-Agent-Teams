import { useState, useCallback, useEffect } from 'react';
import apiService from '../services/api';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(apiService.isAuthenticated());

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.login(email, password);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Login failed';
      const errors = err.errors || [];
      setError({ message: errorMessage, errors });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email, password, name) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.register(email, password, name);
      setUser(response.data.user);
      setIsAuthenticated(true);
      return response;
    } catch (err) {
      const errorMessage = err.message || 'Registration failed';
      const errors = err.errors || [];
      setError({ message: errorMessage, errors });
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    apiService.logout();
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    setLoading(true);
    try {
      const response = await apiService.getProfile();
      setUser(response.data);
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchProfile();
    }
  }, [isAuthenticated, user, fetchProfile]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    clearError,
    fetchProfile
  };
};

export default useAuth;
