const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const authRoutes = require('../src/routes/auth');

// Clear users before each test
beforeEach(() => {
  authRoutes.clearUsers();
});

describe('Auth API', () => {
  // ==================== Health Check ====================
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  // ==================== Login Tests ====================
  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Seed a test user
      const hashedPassword = await bcrypt.hash('password123', 10);
      authRoutes.users.set('test@example.com', {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      });
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User'
      });
    });

    it('should fail with invalid password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should fail with non-existent email', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].field).toBe('email');
    });

    it('should fail with short password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: '123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors[0].field).toBe('password');
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });

    it('should return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      const token = res.body.data.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
      
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.id).toBe('1');
    });
  });

  // ==================== Register Tests ====================
  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.name).toBe('New User');
    });

    it('should fail with duplicate email', async () => {
      // Register first user
      await request(app)
        .post('/api/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
          name: 'First User'
        });

      // Try to register with same email
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
          name: 'Second User'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('User with this email already exists');
    });

    it('should fail with invalid email format', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Test User'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should fail with short password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'user@example.com',
          password: '12345',
          name: 'Test User'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail with empty name', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'user@example.com',
          password: 'password123',
          name: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should store password as hash (not plaintext)', async () => {
      await request(app)
        .post('/api/register')
        .send({
          email: 'hashtest@example.com',
          password: 'mypassword',
          name: 'Hash Test'
        });

      const user = authRoutes.users.get('hashtest@example.com');
      expect(user.password).not.toBe('mypassword');
      
      const isValid = await bcrypt.compare('mypassword', user.password);
      expect(isValid).toBe(true);
    });
  });

  // ==================== Protected Route Tests ====================
  describe('GET /api/me', () => {
    let token;
    let testUser;

    beforeEach(async () => {
      testUser = {
        email: 'protected@example.com',
        password: 'password123',
        name: 'Protected User'
      };

      // Register and get token
      const regRes = await request(app)
        .post('/api/register')
        .send(testUser);
      token = regRes.body.data.token;
    });

    it('should return user data with valid token', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.name).toBe(testUser.name);
    });

    it('should fail without token', async () => {
      const res = await request(app).get('/api/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Access token required');
    });

    it('should fail with invalid token', async () => {
      const res = await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid or expired token');
    });

    it('should fail with expired token', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: '1', email: testUser.email },
        process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await request(app)
        .get('/api/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ==================== Input Sanitization Tests ====================
  describe('Input Sanitization', () => {
    it('should sanitize email to lowercase', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      authRoutes.users.set('test@example.com', {
        id: '1',
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Test User'
      });

      const res = await request(app)
        .post('/api/login')
        .send({
          email: 'TEST@EXAMPLE.COM',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should handle special characters in password', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          email: 'special@example.com',
          password: 'P@ssw0rd!#$%',
          name: 'Special User'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
