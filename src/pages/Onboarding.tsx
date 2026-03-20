import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { saveSetting } from '@/lib/db'
import { OnboardingSlide } from '@/components/OnboardingSlide'

const slides = [
  {
    icon: '🧠',
    title: 'Willkommen bei Abi-Learner',
    description:
      'Lerne smarter für dein Abitur — mit wissenschaftlich bewiesener Spaced Repetition.',
  },
  {
    icon: '🃏',
    title: "So funktioniert's",
    description:
      'Dir wird eine Frage gezeigt. Überleg dir die Antwort, dann deck sie auf. Bewerte ehrlich, wie gut du es wusstest — die App zeigt dir schwierige Karten öfter.',
  },
  {
    icon: '📚',
    title: 'Starte mit fertigen Decks',
    description:
      'Wir haben Kartensets für jedes Abi-Fach vorbereitet. Importiere .txt-Dateien oder nutze die Deck-Bibliothek.',
  },
  {
    icon: '⏱️',
    title: 'Jeden Tag ein bisschen',
    description:
      'Schon 10-15 Minuten am Tag reichen. Die App sagt dir, welche Karten fällig sind.',
  },
]

interface OnboardingProps {
  onComplete?: () => void
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const navigate = useNavigate()

  const finish = async () => {
    await saveSetting('onboarding_complete', true)
    onComplete?.()
    navigate('/', { replace: true })
  }

  const isLast = currentSlide === slides.length - 1

  return (
    <div className="min-h-dvh bg-black flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4">
        <button onClick={finish} className="text-xs text-zinc-500 hover:text-white">
          Überspringen
        </button>
      </div>

      {/* Slide */}
      <div className="flex-1">
        <OnboardingSlide {...slides[currentSlide]} />
      </div>

      {/* Navigation */}
      <div className="p-6 pb-8 space-y-4">
        {/* Dots */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <span
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentSlide ? 'bg-blue-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => {
            if (isLast) {
              finish()
            } else {
              setCurrentSlide((s) => s + 1)
            }
          }}
          className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-500"
        >
          {isLast ? "Los geht's" : 'Weiter'}
        </button>
      </div>
    </div>
  )
}
