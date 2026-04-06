interface ReviewButtonsProps {
  onAnswer: (correct: boolean) => void
  disabled?: boolean
}

export function ReviewButtons({ onAnswer, disabled }: ReviewButtonsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-lg mx-auto">
      <button
        onClick={() => onAnswer(false)}
        disabled={disabled}
        className="bg-red-600 active:bg-red-700 text-white font-semibold py-4 px-4 rounded-xl text-sm transition-transform active:scale-95 disabled:opacity-40"
      >
        Nochmal
      </button>
      <button
        onClick={() => onAnswer(true)}
        disabled={disabled}
        className="bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-4 px-4 rounded-xl text-sm transition-transform active:scale-95 disabled:opacity-40"
      >
        Gewusst
      </button>
    </div>
  )
}
