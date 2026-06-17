export interface FormData {
  // Step 1: 账号信息
  username: string
  email: string
  password: string
  confirmPassword: string
  
  // Step 2: 个人资料
  nickname: string
  phone: string
  gender: 'male' | 'female' | 'other' | ''
  bio: string
  
  // Step 3: 同意条款
  agreeTerms: boolean
}

export interface FormErrors {
  [key: string]: string | undefined
}

export type Step = 1 | 2 | 3
