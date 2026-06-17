import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../types';

// In-memory database (replace with actual database in production)
const users: Map<string, User> = new Map();
const emailIndex: Map<string, string> = new Map();
const usernameIndex: Map<string, string> = new Map();

const SALT_ROUNDS = 10;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// Initialize with a default admin user
async function initializeDefaultUser() {
  const hashedPassword = await bcrypt.hash('Admin123', SALT_ROUNDS);
  const adminUser: User = {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@example.com',
    password: hashedPassword,
    avatar: null,
    role: 'admin',
    createdAt: new Date(),
    lastLoginAt: null,
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    loginAttempts: 0,
    lockUntil: null,
  };

  users.set(adminUser.id, adminUser);
  emailIndex.set(adminUser.email, adminUser.id);
  usernameIndex.set(adminUser.username, adminUser.id);
}

initializeDefaultUser();

export async function findByEmail(email: string): Promise<User | undefined> {
  const userId = emailIndex.get(email);
  if (!userId) return undefined;
  return users.get(userId);
}

export async function findByUsername(username: string): Promise<User | undefined> {
  const userId = usernameIndex.get(username);
  if (!userId) return undefined;
  return users.get(userId);
}

export async function findById(id: string): Promise<User | undefined> {
  return users.get(id);
}

export async function createUser(
  username: string,
  email: string,
  password: string
): Promise<User> {
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  const newUser: User = {
    id: uuidv4(),
    username,
    email,
    password: hashedPassword,
    avatar: null,
    role: 'user',
    createdAt: new Date(),
    lastLoginAt: null,
    refreshToken: null,
    resetPasswordToken: null,
    resetPasswordExpires: null,
    loginAttempts: 0,
    lockUntil: null,
  };

  users.set(newUser.id, newUser);
  emailIndex.set(email, newUser.id);
  usernameIndex.set(username, newUser.id);

  return newUser;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function updatePassword(userId: string, newPassword: string): Promise<boolean> {
  const user = users.get(userId);
  if (!user) return false;

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  return true;
}

export async function updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
  const user = users.get(userId);
  if (user) {
    user.refreshToken = refreshToken;
  }
}

export async function updateLastLogin(userId: string): Promise<void> {
  const user = users.get(userId);
  if (user) {
    user.lastLoginAt = new Date();
  }
}

export async function incrementLoginAttempts(userId: string): Promise<boolean> {
  const user = users.get(userId);
  if (!user) return false;

  user.loginAttempts += 1;

  if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    user.lockUntil = new Date(Date.now() + LOCK_TIME);
    return true; // Account is now locked
  }
  return false;
}

export async function resetLoginAttempts(userId: string): Promise<void> {
  const user = users.get(userId);
  if (user) {
    user.loginAttempts = 0;
    user.lockUntil = null;
  }
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  const user = users.get(userId);
  if (!user) return false;

  if (user.lockUntil && user.lockUntil > new Date()) {
    return true;
  }

  if (user.lockUntil && user.lockUntil <= new Date()) {
    user.loginAttempts = 0;
    user.lockUntil = null;
  }

  return false;
}

export async function setResetPasswordToken(userId: string, token: string): Promise<void> {
  const user = users.get(userId);
  if (user) {
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  }
}

export async function findByResetToken(token: string): Promise<User | undefined> {
  for (const user of users.values()) {
    if (
      user.resetPasswordToken === token &&
      user.resetPasswordExpires &&
      user.resetPasswordExpires > new Date()
    ) {
      return user;
    }
  }
  return undefined;
}

export async function clearResetToken(userId: string): Promise<void> {
  const user = users.get(userId);
  if (user) {
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
  }
}

export async function updateProfile(
  userId: string,
  updates: { username?: string; avatar?: string }
): Promise<User | undefined> {
  const user = users.get(userId);
  if (!user) return undefined;

  if (updates.username) {
    // Remove old username index
    usernameIndex.delete(user.username);
    user.username = updates.username;
    usernameIndex.set(updates.username, userId);
  }

  if (updates.avatar !== undefined) {
    user.avatar = updates.avatar;
  }

  return user;
}
