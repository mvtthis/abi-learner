interface ReviewButtonsProps {
  onAnswer: (quality: number) => void
  disabled?: boolean
}

const buttons = [
  { label: 'Nochmal', quality: 1, color: 'bg-red-600 active:bg-red-700', sublabel: '< 1 min' },
  { label: 'Schwer', quality: 3, color: 'bg-orange-600 active:bg-orange-700', sublabel: '' },
  { label: 'Gut', quality: 4, color: 'bg-emerald-600 active:bg-emerald-700', sublabel: '' },
  { label: 'Easy', quality: 5, color: 'bg-blue-600 active:bg-blue-700', sublabel: '' },
]

export function ReviewButtons({ onAnswer, disabled }: ReviewButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 w-full max-w-lg mx-auto">
      {buttons.map((btn) => (
        <button
          key={btn.quality}
          onClick={() => onAnswer(btn.quality)}
          disabled={disabled}
          className={`${btn.color} text-white font-semibold py-4 px-2 rounded-xl text-sm transition-transform active:scale-95 disabled:opacity-40 flex flex-col items-center gap-0.5`}
        >
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  )
}
