// 用户接口
export interface IUser {
  id: string;
  email: string;
  username: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

// 注册请求
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 认证响应
export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: Omit<IUser, 'password'>;
    token: string;
  };
  errors?: string[];
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

// 扩展 Express Request
export interface AuthenticatedRequest extends Express.Request {
  user?: JwtPayload;
}
