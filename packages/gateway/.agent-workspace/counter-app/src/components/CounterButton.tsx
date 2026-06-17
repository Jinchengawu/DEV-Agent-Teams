interface CounterButtonProps {
  label: string
  onClick: () => void
  variant: 'primary' | 'secondary' | 'outline'
  disabled?: boolean
  shortcut?: string
}

const variantClasses: Record<CounterButtonProps['variant'], string> = {
  primary:
    'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-md shadow-indigo-200 hover:shadow-lg hover:shadow-indigo-200',
  secondary:
    'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 shadow-sm',
  outline:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-500 border-2 border-gray-200 hover:border-gray-300',
}

export function CounterButton({
  label,
  onClick,
  variant,
  disabled = false,
  shortcut,
}: CounterButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative px-6 py-3 rounded-xl font-bold text-base
        transition-all duration-200 ease-out
        hover:scale-[1.03] active:scale-[0.97]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100
        focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2
        min-w-[100px]
        ${variantClasses[variant]}
      `}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="absolute -top-1 -right-1 text-[9px] bg-gray-700 text-white rounded px-1 py-0.5 opacity-60 font-mono">
          {shortcut}
        </span>
      )}
    </button>
  )
}
