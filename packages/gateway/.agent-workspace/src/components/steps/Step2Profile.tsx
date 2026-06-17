import { FormData, FormErrors } from '../../types'
import { FormInput } from '../FormInput'
import { FiUser, FiPhone } from 'react-icons/fi'

interface Step2Props {
  data: FormData
  errors: FormErrors
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void
}

export const Step2Profile = ({ data, errors, onChange }: Step2Props) => {
  return (
    <div className="animate-slide-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">个人资料</h2>
      <p className="text-gray-500 mb-6">完善您的个人信息（带 * 为必填）</p>

      <FormInput
        label="昵称"
        name="nickname"
        value={data.nickname}
        onChange={onChange}
        placeholder="您希望被怎么称呼？"
        error={errors.nickname}
        icon={FiUser}
        required
      />

      <FormInput
        label="手机号"
        type="tel"
        name="phone"
        value={data.phone}
        onChange={onChange}
        placeholder="请输入手机号（选填）"
        error={errors.phone}
        icon={FiPhone}
      />

      {/* 性别选择 */}
      <div className="mb-4">
        <label className="label">性别</label>
        <div className="flex gap-3">
          {[
            { value: 'male', label: '男', emoji: '👨' },
            { value: 'female', label: '女', emoji: '👩' },
            { value: 'other', label: '其他', emoji: '🧑' },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                data.gender === option.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <input
                type="radio"
                name="gender"
                value={option.value}
                checked={data.gender === option.value}
                onChange={onChange}
                className="sr-only"
              />
              <span className="text-lg">{option.emoji}</span>
              <span className="font-medium">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 个人简介 */}
      <div className="mb-4">
        <label htmlFor="bio" className="label">
          个人简介
        </label>
        <textarea
          id="bio"
          name="bio"
          value={data.bio}
          onChange={onChange}
          placeholder="介绍一下自己吧...（选填，最多200字）"
          rows={3}
          maxLength={200}
          className="input-field resize-none"
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{data.bio.length}/200</p>
      </div>
    </div>
  )
}
