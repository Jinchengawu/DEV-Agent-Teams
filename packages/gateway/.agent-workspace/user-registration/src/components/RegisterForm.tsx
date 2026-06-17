'use client';

import React, { useState } from 'react';
import { RegisterResponse, ValidationError } from '@/types';
import { validateRegistration } from '@/lib/validation';

interface FormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

export default function RegisterForm() {
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [serverErrors, setServerErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 处理输入变化
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // 清除该字段的错误
    setErrors((prev) => prev.filter((error) => error.field !== name));
    setServerErrors((prev) => prev.filter((error) => error.field !== name));
  };

  // 获取字段错误
  const getFieldError = (field: string): string | undefined => {
    const clientError = errors.find((e) => e.field === field);
    const serverError = serverErrors.find((e) => e.field === field);
    return clientError?.message || serverError?.message;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setServerErrors([]);

    // 客户端验证
    const validation = validateRegistration(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsLoading(true);

    try {
      // 调用 API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const result: RegisterResponse = await response.json();

      if (result.success) {
        setSuccessMessage(result.message);
        // 清空表单
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
          phone: '',
        });
        setErrors([]);
      } else {
        // 显示服务器返回的错误
        if (result.errors) {
          setServerErrors(result.errors);
        } else {
          setServerErrors([{ field: 'general', message: result.message }]);
        }
      }
    } catch (error) {
      console.error('请求错误:', error);
      setServerErrors([{ field: 'general', message: '网络错误，请稍后重试' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* 头部 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">创建账号</h1>
            <p className="text-gray-600">加入我们，开始您的旅程</p>
          </div>

          {/* 成功消息 */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700">{successMessage}</span>
              </div>
            </div>
          )}

          {/* 通用错误 */}
          {getFieldError('general') && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700">{getFieldError('general')}</span>
              </div>
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名 */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                用户名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  getFieldError('username') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入用户名"
                disabled={isLoading}
              />
              {getFieldError('username') && (
                <p className="mt-1 text-sm text-red-500">{getFieldError('username')}</p>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                邮箱 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  getFieldError('email') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入邮箱"
                disabled={isLoading}
              />
              {getFieldError('email') && (
                <p className="mt-1 text-sm text-red-500">{getFieldError('email')}</p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  getFieldError('password') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入密码"
                disabled={isLoading}
              />
              {getFieldError('password') && (
                <p className="mt-1 text-sm text-red-500">{getFieldError('password')}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                至少 8 位，包含大小写字母、数字和特殊字符
              </p>
            </div>

            {/* 确认密码 */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                确认密码 <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  getFieldError('confirmPassword') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请再次输入密码"
                disabled={isLoading}
              />
              {getFieldError('confirmPassword') && (
                <p className="mt-1 text-sm text-red-500">{getFieldError('confirmPassword')}</p>
              )}
            </div>

            {/* 手机号（可选） */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                手机号 <span className="text-gray-400">（可选）</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  getFieldError('phone') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="请输入手机号"
                disabled={isLoading}
              />
              {getFieldError('phone') && (
                <p className="mt-1 text-sm text-red-500">{getFieldError('phone')}</p>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  注册中...
                </span>
              ) : (
                '注册'
              )}
            </button>
          </form>

          {/* 底部链接 */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              已有账号？{' '}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                立即登录
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
