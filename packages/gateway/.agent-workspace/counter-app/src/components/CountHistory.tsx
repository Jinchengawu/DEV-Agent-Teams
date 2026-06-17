interface HistoryItem {
  value: number
  timestamp: number
}

interface CountHistoryProps {
  history: HistoryItem[]
  onClear: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function getValueColor(value: number): string {
  if (value > 0) return 'text-emerald-600 bg-emerald-50'
  if (value < 0) return 'text-rose-600 bg-rose-50'
  return 'text-gray-500 bg-gray-50'
}

export function CountHistory({ history, onClear }: CountHistoryProps) {
  if (history.length === 0) return null

  return (
    <div className="mt-4 bg-white rounded-2xl shadow-lg shadow-indigo-100/30 border border-gray-100 overflow-hidden animate-slide-up">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
          <span>📋</span>
          操作历史
          <span className="text-xs text-gray-400 font-normal">({history.length})</span>
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-rose-500 transition-colors duration-200 px-2 py-1 rounded hover:bg-rose-50"
        >
          清空
        </button>
      </div>

      {/* 列表 */}
      <div className="max-h-48 overflow-y-auto">
        {history.map((item, index) => (
          <div
            key={item.timestamp + index}
            className={`
              flex items-center justify-between px-5 py-2.5
              border-b border-gray-50 last:border-0
              hover:bg-gray-50/50 transition-colors duration-150
              ${index === 0 ? 'animate-fade-in' : ''}
            `}
          >
            <span
              className={`text-sm font-bold px-2.5 py-0.5 rounded-md ${getValueColor(item.value)}`}
            >
              {item.value}
            </span>
            <span className="text-xs text-gray-300 font-mono">
              {formatTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
