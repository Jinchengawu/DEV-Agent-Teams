import { useState } from 'react'
import Counter from './Counter'

function App() {
  const [lastValue, setLastValue] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-12 px-4">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* 页面标题 */}
        <header className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            React 计数器组件演示
          </h1>
          <p className="mt-2 text-lg text-gray-500">
            一个可复用、支持步长/范围限制的 TypeScript 计数器
          </p>
        </header>

        {/* ========== 示例 1：基础计数器 ========== */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">
            1. 基础计数器
          </h2>
          <p className="text-sm text-gray-400">
            默认配置：步长 1，无范围限制
          </p>
          <div className="flex justify-center">
            <Counter onChange={(v) => setLastValue(v)} />
          </div>
        </section>

        {/* ========== 示例 2：带范围限制 ========== */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">
            2. 带范围限制 (0 ~ 100)
          </h2>
          <p className="text-sm text-gray-400">
            设定最小值和最大值，带进度条可视化
          </p>
          <div className="flex justify-center">
            <Counter initialValue={50} min={0} max={100} step={5} />
          </div>
        </section>

        {/* ========== 示例 3：大步长 ========== */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">
            3. 大步长计数器 (步长 10)
          </h2>
          <p className="text-sm text-gray-400">
            初始值 100，步长 10，范围 -200 ~ 500
          </p>
          <div className="flex justify-center">
            <Counter initialValue={100} step={10} min={-200} max={500} />
          </div>
        </section>

        {/* ========== 示例 4：倒计时 ========== */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-700">
            4. 倒计时模式 (60 → 0)
          </h2>
          <p className="text-sm text-gray-400">
            步长 1，从 60 递减到 0
          </p>
          <div className="flex justify-center">
            <Counter initialValue={60} min={0} max={60} step={1} />
          </div>
        </section>

        {/* 回调值显示 */}
        {lastValue !== null && (
          <div className="fixed bottom-4 right-4 rounded-lg bg-white px-4 py-2 text-sm shadow-lg ring-1 ring-gray-200">
            最新回调值：
            <span className="ml-1 font-bold text-indigo-600">{lastValue}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
