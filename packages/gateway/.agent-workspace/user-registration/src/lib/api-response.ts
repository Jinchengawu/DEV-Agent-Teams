import { NextResponse } from 'next/server';
import { RegisterResponse, ValidationError } from '@/types';

// 成功响应
export function successResponse<T>(
  data: T,
  message: string = '操作成功',
  statusCode: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    } as RegisterResponse,
    { status: statusCode }
  );
}

// 创建成功响应（201）
export function createdResponse<T>(data: T, message: string = '创建成功'): NextResponse {
  return successResponse(data, message, 201);
}

// 错误响应
export function errorResponse(
  message: string,
  statusCode: number = 400,
  errors?: ValidationError[]
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      message,
      errors,
    },
    { status: statusCode }
  );
}

// 验证错误响应（400）
export function validationErrorResponse(errors: ValidationError[]): NextResponse {
  return errorResponse('输入验证失败', 400, errors);
}

// 未授权响应（401）
export function unauthorizedResponse(message: string = '未授权'): NextResponse {
  return errorResponse(message, 401);
}

// 禁止响应（403）
export function forbiddenResponse(message: string = '禁止访问'): NextResponse {
  return errorResponse(message, 403);
}

// 未找到响应（404）
export function notFoundResponse(message: string = '资源未找到'): NextResponse {
  return errorResponse(message, 404);
}

// 冲突响应（409）
export function conflictResponse(message: string = '资源冲突'): NextResponse {
  return errorResponse(message, 409);
}

// 服务器错误响应（500）
export function serverErrorResponse(message: string = '服务器内部错误'): NextResponse {
  return errorResponse(message, 500);
}
