import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index';

describe('Auth API', () => {
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe',
        },
      });
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });

    it('should return 401 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid email or password',
      });
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
      });
      expect(response.body.error).toContain('Invalid email');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: '12345',
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
      });
      expect(response.body.error).toContain('at least 6 characters');
    });

    it('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
      });
    });
  });

  describe('GET /api/auth/verify', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a valid token first
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123',
        });
      validToken = loginResponse.body.token;
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        user: {
          id: '1',
          email: 'user@example.com',
          name: 'John Doe',
        },
      });
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'No token provided',
      });
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token-here')
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Invalid token',
      });
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
      });
      expect(response.body.timestamp).toBeDefined();
    });
  });
});
