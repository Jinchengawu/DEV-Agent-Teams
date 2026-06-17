import bcrypt from 'bcryptjs';
import { IUser } from '../types/auth.types';

// 模拟数据库存储（生产环境应使用 MongoDB/PostgreSQL）
class UserStore {
  private users: Map<string, IUser> = new Map();

  // 创建用户
  async create(userData: Omit<IUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<IUser> {
    const id = this.generateId();
    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    const user: IUser = {
      id,
      ...userData,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(id, user);
    return user;
  }

  // 通过邮箱查找用户
  async findByEmail(email: string): Promise<IUser | null> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return null;
  }

  // 通过用户名查找用户
  async findByUsername(username: string): Promise<IUser | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  // 通过ID查找用户
  async findById(id: string): Promise<IUser | null> {
    return this.users.get(id) || null;
  }

  // 验证密码
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // 生成唯一ID
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const userStore = new UserStore();
