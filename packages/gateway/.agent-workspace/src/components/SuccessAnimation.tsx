import { FiCheck } from 'react-icons/fi'

export const SuccessAnimation = () => {
  return (
    <div className="text-center py-10 animate-fade-in">
      {/* 成功图标 */}
      <div className="relative inline-block mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full 
                       flex items-center justify-center shadow-xl shadow-green-200 animate-bounce-subtle">
          <FiCheck className="w-12 h-12 text-white" strokeWidth={3} />
        </div>
        {/* 装饰圆点 */}
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full animate-ping" />
        <div className="absolute -bottom-1 -left-3 w-4 h-4 bg-blue-400 rounded-full animate-pulse" />
        <div className="absolute top-0 -left-4 w-3 h-3 bg-pink-400 rounded-full animate-pulse delay-300" />
      </div>

      <h2 className="text-3xl font-bold text-gray-800 mb-3">🎉 注册成功！</h2>
      <p className="text-gray-500 mb-8 max-w-sm mx-auto leading-relaxed">
        恭喜您完成注册！我们已向您的邮箱发送了一封验证邮件，请查收并完成邮箱验证。
      </p>

      {/* 操作按钮 */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-xs mx-auto">
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          进入首页
        </button>
        <button
          onClick={() => {/* 发送验证码逻辑 */}}
          className="btn-secondary"
        >
          重新发送邮件
        </button>
      </div>
    </div>
  )
}
