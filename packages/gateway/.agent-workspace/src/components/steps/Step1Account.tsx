import { FormData, FormErrors } from '../../types'
import { FormInput } from '../FormInput'
import { FiUser, FiMail, FiLock } from 'react-icons/fi'

interface Step1Props {
  data: FormData
  errors: FormErrors
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const Step1Account = ({ data, errors, onChange }: Step1Props) => {
  return (
    <div className="animate-slide-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">创建账号</h2>
      <p className="text-gray-500 mb-6">请填写基本账号信息</p>

      <FormInput
        label="用户名"
        name="username"
        value={data.username}
        onChange={onChange}
        placeholder="请输入用户名 (3-20个字符)"
        error={errors.username}
        icon={FiUser}
        required
      />

      <FormInput
        label="邮箱"
        type="email"
        name="email"
        value={data.email}
        onChange={onChange}
        placeholder="example@email.com"
        error={errors.email}
        icon={FiMail}
        required
      />

      <FormInput
        label="密码"
        type="password"
        name="password"
        value={data.password}
        onChange={onChange}
        placeholder="至少8位，包含大小写字母和数字"
        error={errors.password}
        icon={FiLock}
        required
      />

      <FormInput
        label="确认密码"
        type="password"
        name="confirmPassword"
        value={data.confirmPassword}
        onChange={onChange}
        placeholder="请再次输入密码"
        error={errors.confirmPassword}
        icon={FiLock}
        required
      />

      {/* 密码强度指示器 */}
      {data.password && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">密码强度</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((level) => {
              const strength = getPasswordStrength(data.password)
              return (
                <div
                  key={level}
                  className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                    level <= strength
                      ? strength <= 1
                        ? 'bg-red-400'
                        : strength <= 2
                        ? 'bg-orange-400'
                        : strength <= 3
                        ? 'bg-yellow-400'
                        : 'bg-green-400'
                      : 'bg-gray-200'
                  }`}
                />
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {getPasswordStrengthText(getPasswordStrength(data.password))}
          </p>
        </div>
      )}
    </div>
  )
}

function getPasswordStrength(password: string): number {
  let strength = 0
  if (password.length >= 8) strength++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++
  return strength
}

function getPasswordStrengthText(strength: number): string {
  const texts = ['', '弱 - 请增加密码复杂度', '一般 - 建议添加特殊字符', '良好', '强 - 非常安全！']
  return texts[strength] || ''
}
