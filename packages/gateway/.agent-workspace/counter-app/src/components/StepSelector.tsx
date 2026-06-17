interface StepSelectorProps {
  step: number
  onStepChange: (step: number) => void
}

const steps = [1, 5, 10, 50]

export function StepSelector({ step, onStepChange }: StepSelectorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-sm text-gray-400 font-medium mr-1">步长</span>
      {steps.map((s) => (
        <button
          key={s}
          onClick={() => onStepChange(s)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-semibold
            transition-all duration-200 ease-out
            focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-1
            ${
              step === s
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105'
                : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 hover:scale-[1.03]'
            }
          `}
        >
          {s}
        </button>
      ))}
    </div>
  )
}
