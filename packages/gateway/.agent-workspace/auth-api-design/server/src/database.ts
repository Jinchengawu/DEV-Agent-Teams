import { User } from './types';
import bcrypt from 'bcryptjs';

// 模拟数据库存储
const users: User[] = [];

// 初始化一些测试用户
const initializeUsers = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  users.push(
    {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      username: 'user1',
      email: 'user1@example.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  );
};

// 数据库操作
export const db = {
  // 初始化数据
  initialize: initializeUsers,
  
  // 查找用户 by 用户名
  findByUsername: (username: string): User | undefined => {
    return users.find(user => user.username === username);
  },
  
  // 查找用户 by 邮箱
  findByEmail: (email: string): User | undefined => {
    return users.find(user => user.email === email);
  },
  
  // 查找用户 by ID
  findById: (id: string): User | undefined => {
    return users.find(user => user.id === id);
  },
  
  // 创建用户
  create: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> => {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const newUser: User = {
      id: String(users.length + 1),
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    users.push(newUser);
    return newUser;
  },
  
  // 验证密码
  validatePassword: async (user: User, password: string): Promise<boolean> => {
    return bcrypt.compare(password, user.password);
  },
  
  // 获取所有用户（用于调试）
  getAllUsers: (): Omit<User, 'password'>[] => {
    return users.map(({ password, ...user }) => user);
  }
};