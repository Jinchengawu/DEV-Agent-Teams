import { Request, Response } from 'express';
import { userStore } from '../models/User';
import { tokenUtils } from '../utils/tokenUtils';
import { RegisterRequest, LoginRequest, AuthResponse, JwtPayload } from '../types/auth.types';

export const authController = {
  // 用户注册
  async register(req: Request<{}, {}, RegisterRequest>, res: Response<AuthResponse>) {
    try {
      const { email, username, password, confirmPassword } = req.body;

      // 验证输入
      const errors: string[] = [];

      if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('请输入有效的邮箱地址');
      }

      if (!username || username.length < 3 || username.length > 20) {
        errors.push('用户名长度必须在3-20个字符之间');
      }

      if (!password || password.length < 6) {
        errors.push('密码长度至少6个字符');
      }

      if (password !== confirmPassword) {
        errors.push('两次输入的密码不一致');
      }

      if (errors.length > 0) {
        return res.status(400).json({
          success: false,
          message: '验证失败',
          errors,
        });
      }

      // 检查邮箱是否已存在
      const existingEmail = await userStore.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: '该邮箱已被注册',
        });
      }

      // 检查用户名是否已存在
      const existingUsername = await userStore.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          message: '该用户名已被使用',
        });
      }

      // 创建用户
      const user = await userStore.create({ email, username, password });

      // 生成 token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const token = tokenUtils.generateAccessToken(payload);
      const refreshToken = tokenUtils.generateRefreshToken(payload);

      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user;

      res.status(201).json({
        success: true,
        message: '注册成功',
        data: {
          user: userWithoutPassword,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      console.error('注册错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  },

  // 用户登录
  async login(req: Request<{}, {}, LoginRequest>, res: Response<AuthResponse>) {
    try {
      const { email, password } = req.body;

      // 验证输入
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: '请提供邮箱和密码',
        });
      }

      // 查找用户
      const user = await userStore.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
        });
      }

      // 验证密码
      const isPasswordValid = await userStore.validatePassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '邮箱或密码错误',
        });
      }

      // 生成 token
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const token = tokenUtils.generateAccessToken(payload);
      const refreshToken = tokenUtils.generateRefreshToken(payload);

      // 返回用户信息（不包含密码）
      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        message: '登录成功',
        data: {
          user: userWithoutPassword,
          token,
          refreshToken,
        },
      });
    } catch (error) {
      console.error('登录错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  },

  // 刷新令牌
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '请提供刷新令牌',
        });
      }

      // 验证刷新令牌
      const decoded = tokenUtils.verifyToken(refreshToken);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: '无效或过期的刷新令牌',
        });
      }

      // 验证用户是否存在
      const user = await userStore.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '用户不存在',
        });
      }

      // 生成新的令牌
      const payload: JwtPayload = {
        userId: user.id,
        email: user.email,
        username: user.username,
      };

      const newToken = tokenUtils.generateAccessToken(payload);
      const newRefreshToken = tokenUtils.generateRefreshToken(payload);

      res.json({
        success: true,
        message: '令牌刷新成功',
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      console.error('刷新令牌错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  },

  // 获取当前用户信息
  async getCurrentUser(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: '未授权',
        });
      }

      const user = await userStore.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: '用户不存在',
        });
      }

      const { password: _, ...userWithoutPassword } = user;

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
        },
      });
    } catch (error) {
      console.error('获取用户信息错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  },
};
