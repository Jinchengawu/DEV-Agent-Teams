import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { LoginRequest, LoginResponse, User } from '../../../shared/types';

const router = Router();

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Mock user database (replace with real database in production)
const MOCK_USERS: (User & { passwordHash: string })[] = [
  {
    id: '1',
    email: 'user@example.com',
    name: 'John Doe',
    passwordHash: bcrypt.hashSync('password123', 10),
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: bcrypt.hashSync('admin123', 10),
  },
];

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      const response: LoginResponse = {
        success: false,
        error: validationResult.error.errors[0].message,
      };
      return res.status(400).json(response);
    }

    const { email, password } = validationResult.data as LoginRequest;

    // Find user
    const user = MOCK_USERS.find((u) => u.email === email);

    if (!user) {
      const response: LoginResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      return res.status(401).json(response);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      const response: LoginResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      return res.status(401).json(response);
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return success response (exclude password hash)
    const { passwordHash, ...userWithoutPassword } = user;
    const response: LoginResponse = {
      success: true,
      token,
      user: userWithoutPassword,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/verify
router.get('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    const user = MOCK_USERS.find((u) => u.id === decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }

    const { passwordHash, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    next(error);
  }
});

export { router as authRouter };
