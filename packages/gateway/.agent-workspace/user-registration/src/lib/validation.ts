import { ValidationError } from '@/types';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 验证用户名
export function validateUsername(username: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const usernameStr = String(username || '').trim();

  if (!usernameStr) {
    errors.push({ field: 'username', message: '用户名不能为空' });
  } else if (usernameStr.length < 3) {
    errors.push({ field: 'username', message: '用户名至少需要 3 个字符' });
  } else if (usernameStr.length > 20) {
    errors.push({ field: 'username', message: '用户名不能超过 20 个字符' });
  } else if (!/^[a-zA-Z0-9_]+$/.test(usernameStr)) {
    errors.push({ field: 'username', message: '用户名只能包含字母、数字和下划线' });
  }

  return { isValid: errors.length === 0, errors };
}

// 验证邮箱
export function validateEmail(email: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const emailStr = String(email || '').trim();

  if (!emailStr) {
    errors.push({ field: 'email', message: '邮箱不能为空' });
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailStr)) {
      errors.push({ field: 'email', message: '请输入有效的邮箱地址' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// 验证密码强度
export function validatePassword(password: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const passwordStr = String(password || '');

  if (!passwordStr) {
    errors.push({ field: 'password', message: '密码不能为空' });
  } else {
    if (passwordStr.length < 8) {
      errors.push({ field: 'password', message: '密码至少需要 8 个字符' });
    }
    if (passwordStr.length > 50) {
      errors.push({ field: 'password', message: '密码不能超过 50 个字符' });
    }
    if (!/[A-Z]/.test(passwordStr)) {
      errors.push({ field: 'password', message: '密码必须包含至少一个大写字母' });
    }
    if (!/[a-z]/.test(passwordStr)) {
      errors.push({ field: 'password', message: '密码必须包含至少一个小写字母' });
    }
    if (!/[0-9]/.test(passwordStr)) {
      errors.push({ field: 'password', message: '密码必须包含至少一个数字' });
    }
    if (!/[!@#$%^&*]/.test(passwordStr)) {
      errors.push({ field: 'password', message: '密码必须包含至少一个特殊字符 (!@#$%^&*)' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// 验证确认密码
export function validateConfirmPassword(
  password: unknown,
  confirmPassword: unknown
): ValidationResult {
  const errors: ValidationError[] = [];
  const passwordStr = String(password || '');
  const confirmPasswordStr = String(confirmPassword || '');

  if (!confirmPasswordStr) {
    errors.push({ field: 'confirmPassword', message: '请确认密码' });
  } else if (passwordStr !== confirmPasswordStr) {
    errors.push({ field: 'confirmPassword', message: '两次输入的密码不一致' });
  }

  return { isValid: errors.length === 0, errors };
}

// 验证手机号（可选）
export function validatePhone(phone: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const phoneStr = String(phone || '').trim();

  if (phoneStr) {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneStr)) {
      errors.push({ field: 'phone', message: '请输入有效的手机号码' });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// 完整的注册表单验证
export function validateRegistration(data: {
  username: unknown;
  email: unknown;
  password: unknown;
  confirmPassword: unknown;
  phone?: unknown;
}): ValidationResult {
  const allErrors: ValidationError[] = [
    ...validateUsername(data.username).errors,
    ...validateEmail(data.email).errors,
    ...validatePassword(data.password).errors,
    ...validateConfirmPassword(data.password, data.confirmPassword).errors,
    ...validatePhone(data.phone).errors,
  ];

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
  };
}
