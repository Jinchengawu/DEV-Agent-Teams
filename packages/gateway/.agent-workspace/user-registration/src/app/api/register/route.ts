import { NextRequest } from 'next/server';
import { RegisterRequest, User } from '@/types';
import { validateRegistration } from '@/lib/validation';
import {
  createdResponse,
  validationErrorResponse,
  conflictResponse,
  serverErrorResponse,
} from '@/lib/api-response';

// 模拟数据库存储
const users: User[] = [];

// 生成唯一 ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 简单密码哈希（实际项目中应使用 bcrypt）
function hashPassword(password: string): string {
  // 这里仅做演示，实际应该使用 bcrypt 或 argon2
  return Buffer.from(password).toString('base64');
}

// 检查用户名是否已存在
function isUsernameExists(username: string): boolean {
  return users.some(
    (user) => user.username.toLowerCase() === username.toLowerCase()
  );
}

// 检查邮箱是否已存在
function isEmailExists(email: string): boolean {
  return users.some(
    (user) => user.email.toLowerCase() === email.toLowerCase()
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. 解析请求体
    const body: RegisterRequest = await request.json();

    // 2. 输入验证
    const validation = validateRegistration({
      username: body.username,
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword,
      phone: body.phone,
    });

    // 如果验证失败，返回验证错误
    if (!validation.isValid) {
      return validationErrorResponse(validation.errors);
    }

    // 3. 检查用户名是否已存在
    if (isUsernameExists(body.username)) {
      return conflictResponse('该用户名已被注册');
    }

    // 4. 检查邮箱是否已存在
    if (isEmailExists(body.email)) {
      return conflictResponse('该邮箱已被注册');
    }

    // 5. 创建新用户
    const newUser: User = {
      id: generateId(),
      username: body.username.trim(),
      email: body.email.trim().toLowerCase(),
      password: hashPassword(body.password),
      phone: body.phone?.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 6. 保存到数据库（这里使用内存模拟）
    users.push(newUser);

    // 7. 返回成功响应（不包含密码）
    return createdResponse(
      {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.createdAt.toISOString(),
      },
      '用户注册成功'
    );
  } catch (error) {
    // 8. 错误处理
    console.error('注册错误:', error);

    // JSON 解析错误
    if (error instanceof SyntaxError) {
      return serverErrorResponse('请求数据格式错误');
    }

    // 其他服务器错误
    return serverErrorResponse();
  }
}

// 可选：获取所有用户（仅用于调试）
export async function GET() {
  return Response.json({
    success: true,
    data: users.map(({ password, ...user }) => user),
  });
}
