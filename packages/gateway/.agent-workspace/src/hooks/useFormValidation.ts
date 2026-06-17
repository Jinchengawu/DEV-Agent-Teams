import { FormData, FormErrors } from '../types'

export const useFormValidation = () => {
  const validateStep1 = (data: FormData): FormErrors => {
    const errors: FormErrors = {}

    // 用户名验证
    if (!data.username.trim()) {
      errors.username = '请输入用户名'
    } else if (data.username.length < 3) {
      errors.username = '用户名至少3个字符'
    } else if (data.username.length > 20) {
      errors.username = '用户名不能超过20个字符'
    } else if (!/^[a-zA-Z0-9_]+$/.test(data.username)) {
      errors.username = '用户名只能包含字母、数字和下划线'
    }

    // 邮箱验证
    if (!data.email.trim()) {
      errors.email = '请输入邮箱'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = '请输入有效的邮箱地址'
    }

    // 密码验证
    if (!data.password) {
      errors.password = '请输入密码'
    } else if (data.password.length < 8) {
      errors.password = '密码至少8个字符'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.password = '密码需要包含大小写字母和数字'
    }

    // 确认密码
    if (!data.confirmPassword) {
      errors.confirmPassword = '请确认密码'
    } else if (data.password !== data.confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致'
    }

    return errors
  }

  const validateStep2 = (data: FormData): FormErrors => {
    const errors: FormErrors = {}

    // 昵称验证
    if (!data.nickname.trim()) {
      errors.nickname = '请输入昵称'
    } else if (data.nickname.length > 30) {
      errors.nickname = '昵称不能超过30个字符'
    }

    // 手机号验证（可选，但填了就要验证格式）
    if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
      errors.phone = '请输入有效的手机号'
    }

    return errors
  }

  const validateStep3 = (data: FormData): FormErrors => {
    const errors: FormErrors = {}

    if (!data.agreeTerms) {
      errors.agreeTerms = '请阅读并同意服务条款'
    }

    return errors
  }

  return {
    validateStep1,
    validateStep2,
    validateStep3,
  }
}
