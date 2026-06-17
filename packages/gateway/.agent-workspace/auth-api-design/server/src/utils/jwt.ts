import jwt from 'jsonwebtoken';
import { JwtPayload, AuthTokens } from '../types';

// In production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export function generateTokens(userId: string, email: string, role: string): AuthTokens {
  const accessPayload: JwtPayload = {
    userId,
    email,
    role,
    type: 'access',
  };

  const refreshPayload: JwtPayload = {
    userId,
    email,
    role,
    type: 'refresh',
  };

  const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(refreshPayload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return payload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

export function generateResetToken(): string {
  return jwt.sign({ type: 'reset' }, JWT_SECRET, { expiresIn: '1h' });
}

export function verifyResetToken(token: string): boolean {
  try {
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}
