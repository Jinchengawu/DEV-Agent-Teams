import { FormData, FormErrors } from '../../types'
import { FiUser, FiMail, FiPhone, FiFileText } from 'react-icons/fi'

interface Step3Props {
  data: FormData
  errors: FormErrors
  onAgreeChange: (agree: boolean) => void
}

export const Step3Confirm = ({ data, errors, onAgreeChange }: Step3Props) => {
  const genderMap: Record<string, string> = {
    male: '男 👨',
    female: '女 👩',
    other: '其他 🧑',
    '': '未设置',
  }

  return (
    <div className="animate-slide-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">确认信息</h2>
      <p className="text-gray-500 mb-6">请确认以下注册信息无误</p>

      {/* 信息卡片 */}
      <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-2xl p-5 mb-6 space-y-4">
        <h3 className="font-semibold text-primary-700 text-lg mb-3">📋 注册信息摘要</h3>
        
        <InfoRow icon={FiUser} label="用户名" value={data.username} />
        <InfoRow icon={FiMail} label="邮箱" value={data.email} />
        <InfoRow icon={FiUser} label="昵称" value={data.nickname} />
        <InfoRow icon={FiPhone} label="手机号" value={data.phone || '未填写'} />
        <InfoRow icon={FiUser} label="性别" value={genderMap[data.gender]} />
        {data.bio && <InfoRow icon={FiFileText} label="简介" value={data.bio} />}
      </div>

      {/* 同意条款 */}
      <div className="mb-4">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={data.agreeTerms}
              onChange={(e) => onAgreeChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-5 h-5 border-2 border-gray-300 rounded-md 
                          peer-checked:border-primary-500 peer-checked:bg-primary-500
                          transition-all duration-200 flex items-center justify-center
                          group-hover:border-primary-400">
              {data.agreeTerms && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-gray-600 leading-relaxed">
            我已阅读并同意{' '}
            <a href="#" className="text-primary-600 hover:underline font-medium">
              《用户服务协议》
            </a>{' '}
            和{' '}
            <a href="#" className="text-primary-600 hover:underline font-medium">
              《隐私政策》
            </a>
          </span>
        </label>
        {errors.agreeTerms && <p className="error-text">{errors.agreeTerms}</p>}
      </div>
    </div>
  )
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}

const InfoRow = ({ icon: Icon, label, value }: InfoRowProps) => (
  <div className="flex items-center gap-3">
    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
      <Icon className="w-4 h-4 text-primary-500" />
    </div>
    <div className="flex-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  </div>
)
