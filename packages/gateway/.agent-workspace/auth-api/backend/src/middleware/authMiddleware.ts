import { Request, Response, NextFunction } from 'express';
import { tokenUtils } from '../utils/tokenUtils';

// 认证中间件
export const authMiddleware = {
  // 验证 JWT Token
  authenticate(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = tokenUtils.extractTokenFromHeader(authHeader);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: '未提供认证令牌',
        });
      }

      const decoded = tokenUtils.verifyToken(token);
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: '无效或过期的令牌',
        });
      }

      // 将用户信息附加到请求对象
      (req as any).user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '认证失败',
      });
    }
  },

  // 可选认证（不强制要求 token）
  optionalAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      const token = tokenUtils.extractTokenFromHeader(authHeader);

      if (token) {
        const decoded = tokenUtils.verifyToken(token);
        if (decoded) {
          (req as any).user = decoded;
        }
      }

      next();
    } catch (error) {
      next();
    }
  },
};
