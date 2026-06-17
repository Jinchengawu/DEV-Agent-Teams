import { useState, useCallback } from 'react'

// ============================================================
// 类型定义
// ============================================================
interface CounterProps {
  /** 初始值 */
  initialValue?: number
  /** 步长（每次增减的幅度） */
  step?: number
  /** 最小值 */
  min?: number
  /** 最大值 */
  max?: number
  /** 值变化时的回调 */
  onChange?: (value: number) => void
  /** 自定义类名 */
  className?: string
}

// ============================================================
// Counter 组件
// ============================================================
function Counter({
  initialValue = 0,
  step = 1,
  min = -Infinity,
  max = Infinity,
  onChange,
  className = '',
}: CounterProps) {
  const [count, setCount] = useState(initialValue)

  // ---- 操作方法 ----
  const increment = useCallback(() => {
    setCount((prev) => {
      const next = Math.min(prev + step, max)
      onChange?.(next)
      return next
    })
  }, [step, max, onChange])

  const decrement = useCallback(() => {
    setCount((prev) => {
      const next = Math.max(prev - step, min)
      onChange?.(next)
      return next
    })
  }, [step, min, onChange])

  const reset = useCallback(() => {
    setCount(initialValue)
    onChange?.(initialValue)
  }, [initialValue, onChange])

  // ---- 状态计算 ----
  const isAtMax = count >= max
  const isAtMin = count <= min
  const isAtInitial = count === initialValue

  // ---- 按钮样式 ----
  const btnBase =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none'

  const btnPrimary = `${btnBase} bg-indigo-500 text-white hover:bg-indigo-600 active:bg-indigo-700 focus:ring-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-500`

  const btnDanger = `${btnBase} bg-rose-500 text-white hover:bg-rose-600 active:bg-rose-700 focus:ring-rose-400 disabled:opacity-40 disabled:cursor-not-allowed`

  return (
    <div
      className={`inline-flex flex-col items-center gap-6 rounded-2xl bg-white p-8 shadow-xl ring-1 ring-gray-200 ${className}`}
    >
      {/* 标题 */}
      <h2 className="text-lg font-bold tracking-tight text-gray-700">
        ⚛️ React Counter
      </h2>

      {/* 数值显示 */}
      <div className="flex items-center justify-center">
        <span
          className={`text-7xl font-extrabold tabular-nums transition-colors duration-300 ${
            count > 0
              ? 'text-indigo-600'
              : count < 0
                ? 'text-rose-500'
                : 'text-gray-800'
          }`}
        >
          {count}
        </span>
      </div>

      {/* 进度条：直观显示当前值在 min~max 范围中的位置 */}
      {isFinite(min) && isFinite(max) && max !== min && (
        <div className="w-full">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
              style={{
                width: `${((count - min) / (max - min)) * 100}%`,
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-gray-400">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      )}

      {/* 增减按钮 */}
      <div className="flex items-center gap-3">
        <button
          className={btnPrimary}
          onClick={decrement}
          disabled={isAtMin}
          aria-label="减少"
        >
          − {step}
        </button>

        <button
          className={btnDanger}
          onClick={reset}
          disabled={isAtInitial}
          aria-label="重置"
        >
          ↺ 重置
        </button>

        <button
          className={btnPrimary}
          onClick={increment}
          disabled={isAtMax}
          aria-label="增加"
        >
          + {step}
        </button>
      </div>

      {/* 信息提示 */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-400">
        {step !== 1 && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            步长: {step}
          </span>
        )}
        {isFinite(min) && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            最小: {min}
          </span>
        )}
        {isFinite(max) && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5">
            最大: {max}
          </span>
        )}
      </div>
    </div>
  )
}

export default Counter
