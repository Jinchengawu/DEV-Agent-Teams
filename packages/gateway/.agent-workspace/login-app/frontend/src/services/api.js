const API_BASE_URL = '/api';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('authToken');
  }

  setToken(token) {
    localStorage.setItem('authToken', token);
  }

  removeToken() {
    localStorage.removeItem('authToken');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Request failed',
          errors: data.errors || []
        };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 0,
        message: 'Network error. Please check your connection.',
        errors: []
      };
    }
  }

  async login(email, password) {
    const data = await this.request('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async register(email, password, name) {
    const data = await this.request('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name })
    });

    if (data.success && data.data.token) {
      this.setToken(data.data.token);
    }

    return data;
  }

  async getProfile() {
    return this.request('/me');
  }

  logout() {
    this.removeToken();
  }

  isAuthenticated() {
    return !!this.getToken();
  }
}

// Singleton instance
const apiService = new ApiService();

export default apiService;
export { ApiService };
