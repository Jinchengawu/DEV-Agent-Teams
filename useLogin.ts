import { useState } from 'react';

interface UseLoginOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function useLogin({ onSuccess, onError }: UseLoginOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      // --- 替换为你的真实 API 调用 ---
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '登录失败，请检查邮箱和密码');
      }

      const data = await response.json();
      // 保存 token（示例）
      if (credentials.rememberMe) {
        localStorage.setItem('token', data.token);
      } else {
        sessionStorage.setItem('token', data.token);
      }

      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '网络异常，请稍后重试';
      setError(message);
      onError?.(message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return { login, isLoading, error, clearError };
}
