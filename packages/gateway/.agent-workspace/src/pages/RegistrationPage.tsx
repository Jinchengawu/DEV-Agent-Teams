import { useState, useCallback } from 'react'
import { FormData, FormErrors, Step } from '../types'
import { useFormValidation } from '../hooks/useFormValidation'
import { StepIndicator } from '../components/StepIndicator'
import { Step1Account } from '../components/steps/Step1Account'
import { Step2Profile } from '../components/steps/Step2Profile'
import { Step3Confirm } from '../components/steps/Step3Confirm'
import { SuccessAnimation } from '../components/SuccessAnimation'
import { FiArrowLeft, FiArrowRight, FiSend } from 'react-icons/fi'

const initialFormData: FormData = {
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  nickname: '',
  phone: '',
  gender: '',
  bio: '',
  agreeTerms: false,
}

export const RegistrationPage = () => {
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { validateStep1, validateStep2, validateStep3 } = useFormValidation()

  // 处理输入变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target
      const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value

      setFormData((prev) => ({ ...prev, [name]: newValue }))

      // 清除对应字段的错误
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }))
      }
    },
    [errors]
  )

  // 处理同意条款
  const handleAgreeChange = useCallback((agree: boolean) => {
    setFormData((prev) => ({ ...prev, agreeTerms: agree }))
    setErrors((prev) => ({ ...prev, agreeTerms: undefined }))
  }, [])

  // 验证当前步骤
  const validateCurrentStep = (): boolean => {
    let stepErrors: FormErrors = {}

    switch (currentStep) {
      case 1:
        stepErrors = validateStep1(formData)
        break
      case 2:
        stepErrors = validateStep2(formData)
        break
      case 3:
        stepErrors = validateStep3(formData)
        break
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  // 下一步
  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 3) as Step)
    }
  }

  // 上一步
  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step)
    setErrors({})
  }

  // 提交注册
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return

    setIsSubmitting(true)

    // 模拟API调用
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 这里可以对接后端API
    console.log('注册数据:', {
      username: formData.username,
      email: formData.email,
      nickname: formData.nickname,
      phone: formData.phone,
      gender: formData.gender,
      bio: formData.bio,
    })

    setIsSubmitting(false)
    setIsSubmitted(true)
  }

  // 渲染当前步骤
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Account data={formData} errors={errors} onChange={handleChange} />
      case 2:
        return <Step2Profile data={formData} errors={errors} onChange={handleChange} />
      case 3:
        return <Step3Confirm data={formData} errors={errors} onAgreeChange={handleAgreeChange} />
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
          <SuccessAnimation />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg shadow-primary-200 mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">欢迎加入我们</h1>
        </div>

        {/* 主表单卡片 */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8">
          {/* 步骤指示器 */}
          <StepIndicator currentStep={currentStep} />

          {/* 表单内容 */}
          {renderCurrentStep()}

          {/* 按钮区域 */}
          <div className="flex gap-3 mt-8">
            {currentStep > 1 && (
              <button type="button" onClick={handlePrev} className="btn-secondary flex items-center justify-center gap-2">
                <FiArrowLeft className="w-4 h-4" />
                上一步
              </button>
            )}

            {currentStep < 3 ? (
              <button type="button" onClick={handleNext} className="btn-primary flex items-center justify-center gap-2 flex-1">
                下一步
                <FiArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="btn-primary flex items-center justify-center gap-2 flex-1 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    注册中...
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4" />
                    完成注册
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* 底部登录链接 */}
        <p className="text-center mt-6 text-sm text-gray-500 animate-fade-in">
          已有账号？{' '}
          <a href="#" className="text-primary-600 font-medium hover:underline">
            立即登录
          </a>
        </p>
      </div>
    </div>
  )
}
