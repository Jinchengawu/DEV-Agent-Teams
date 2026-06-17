// 用户注册请求数据
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

// 用户注册响应数据
export interface RegisterResponse {
  success: boolean;
  message: string;
  data?: {
    id: string;
    username: string;
    email: string;
    createdAt: string;
  };
  errors?: ValidationError[];
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
}

// API 错误响应
export interface ApiError {
  success: false;
  message: string;
  errors?: ValidationError[];
  statusCode: number;
}

// 用户数据（模拟数据库）
export interface User {
  id: string;
  username: string;
  email: string;
  password: string; // 实际应该存储哈希后的密码
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}
