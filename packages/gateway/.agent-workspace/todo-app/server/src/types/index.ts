// Todo 数据类型定义
export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

// 创建 Todo 请求
export interface CreateTodoRequest {
  title: string;
  description?: string;
}

// 更新 Todo 请求
export interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}

// API 响应
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 列表响应
export interface ListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
}
