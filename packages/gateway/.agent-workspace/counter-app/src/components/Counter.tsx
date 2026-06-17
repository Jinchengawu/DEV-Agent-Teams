import { useState, useCallback, useEffect, useRef } from 'react'
import { CounterButton } from './CounterButton'
import { StepSelector } from './StepSelector'
import { CountHistory } from './CountHistory'

/** 历史记录项 */
interface HistoryItem {
  value: number
  timestamp: number
}

export function Counter() {
  const [count, setCount] = useState(0)
  const [step, setStep] = useState(1)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [animate, setAnimate] = useState(false)
  const [minLimit] = useState(-999)
  const [maxLimit] = useState(999)
  const countRef = useRef<HTMLDivElement>(null)

  // 触发动画
  const triggerAnimation = useCallback(() => {
    setAnimate(true)
    const timer = setTimeout(() => setAnimate(false), 150)
    return () => clearTimeout(timer)
  }, [])

  // 记录历史
  const addToHistory = useCallback((value: number) => {
    setHistory((prev) => [{ value, timestamp: Date.now() }, ...prev].slice(0, 20))
  }, [])

  // 限制范围
  const clamp = useCallback(
    (value: number) => Math.min(maxLimit, Math.max(minLimit, value)),
    [minLimit, maxLimit],
  )

  const increment = useCallback(() => {
    setCount((c) => {
      const next = clamp(c + step)
      addToHistory(next)
      return next
    })
    triggerAnimation()
  }, [step, clamp, addToHistory, triggerAnimation])

  const decrement = useCallback(() => {
    setCount((c) => {
      const next = clamp(c - step)
      addToHistory(next)
      return next
    })
    triggerAnimation()
  }, [step, clamp, addToHistory, triggerAnimation])

  const reset = useCallback(() => {
    setCount(0)
    addToHistory(0)
    triggerAnimation()
  }, [addToHistory, triggerAnimation])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault()
        increment()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault()
        decrement()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [increment, decrement, reset])

  // 根据计数值决定颜色
  const getCountColor = () => {
    if (count > 0) return 'text-emerald-600'
    if (count < 0) return 'text-rose-600'
    return 'text-indigo-600'
  }

  const isAtMin = count <= minLimit
  const isAtMax = count >= maxLimit

  return (
    <div className="w-full max-w-md animate-fade-in">
      {/* 主卡片 */}
      <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/50 p-8 border border-gray-100">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
            <span className="text-3xl">⚡</span>
            React 计数器
          </h1>
          <p className="text-sm text-gray-400 mt-1">使用方向键或按钮操作</p>
        </div>

        {/* 步长选择器 */}
        <StepSelector step={step} onStepChange={setStep} />

        {/* 计数显示 */}
        <div className="text-center my-8">
          <div
            ref={countRef}
            className={`text-8xl font-extrabold transition-all duration-150 select-none
              ${getCountColor()}
              ${animate ? 'scale-110' : 'scale-100'}
            `}
          >
            {count}
          </div>

          {/* 范围指示器 */}
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
            <span>{minLimit}</span>
            <div className="w-32 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((count - minLimit) / (maxLimit - minLimit)) * 100}%`,
                  background:
                    count > 0
                      ? 'linear-gradient(90deg, #10b981, #34d399)'
                      : count < 0
                        ? 'linear-gradient(90deg, #f43f5e, #fb7185)'
                        : 'linear-gradient(90deg, #6366f1, #818cf8)',
                }}
              />
            </div>
            <span>{maxLimit}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-3 justify-center mb-4">
          <CounterButton
            label={`− ${step}`}
            onClick={decrement}
            variant="secondary"
            disabled={isAtMin}
            shortcut="↓"
          />
          <CounterButton
            label="重置"
            onClick={reset}
            variant="outline"
            shortcut="R"
          />
          <CounterButton
            label={`+ ${step}`}
            onClick={increment}
            variant="primary"
            disabled={isAtMax}
            shortcut="↑"
          />
        </div>

        {/* 快捷键提示 */}
        <div className="text-center">
          <p className="text-xs text-gray-300">
            快捷键：
            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[10px] mx-0.5">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[10px] mx-0.5">
              ↓
            </kbd>
            增减 &nbsp;
            <kbd className="px-1.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-gray-500 font-mono text-[10px] mx-0.5">
              R
            </kbd>
            重置
          </p>
        </div>
      </div>

      {/* 历史记录 */}
      <CountHistory history={history} onClear={clearHistory} />
    </div>
  )
}
