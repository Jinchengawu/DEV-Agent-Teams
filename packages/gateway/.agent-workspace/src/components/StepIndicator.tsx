import { Step } from '../types'
import { FiUser, FiFileText, FiCheckCircle } from 'react-icons/fi'

interface StepIndicatorProps {
  currentStep: Step
}

const steps = [
  { id: 1, label: '账号信息', icon: FiUser },
  { id: 2, label: '个人资料', icon: FiFileText },
  { id: 3, label: '完成注册', icon: FiCheckCircle },
]

export const StepIndicator = ({ currentStep }: StepIndicatorProps) => {
  return (
    <div className="flex items-center justify-center mb-10">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center">
          {/* 步骤圆圈 */}
          <div className="flex flex-col items-center">
            <div
              className={`step-indicator ${
                currentStep >= step.id
                  ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {currentStep > step.id ? (
                <FiCheckCircle className="w-5 h-5" />
              ) : (
                <step.icon className="w-5 h-5" />
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
                currentStep >= step.id ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>

          {/* 连接线 */}
          {index < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 mb-6 rounded-full transition-colors duration-300 ${
                currentStep > step.id
                  ? 'bg-gradient-to-r from-primary-400 to-primary-500'
                  : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}
