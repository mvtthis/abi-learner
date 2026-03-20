interface OnboardingSlideProps {
  title: string
  description: string
  icon: string
  children?: React.ReactNode
}

export function OnboardingSlide({
  title,
  description,
  icon,
  children,
}: OnboardingSlideProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <span className="text-6xl mb-6">{icon}</span>
      <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
      <p className="text-zinc-400 text-base max-w-sm leading-relaxed">
        {description}
      </p>
      {children && <div className="mt-8 w-full max-w-sm">{children}</div>}
    </div>
  )
}
