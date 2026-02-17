import { FRAMES } from '../../lib/cosmetics'

interface AvatarWithFrameProps {
  avatar: string
  frameId?: string | null
  sizeClass: string
  textClass: string
  roundedClass?: string
  ringInsetClass?: string
  ringOpacity?: number
  className?: string
  title?: string
}

export function AvatarWithFrame({
  avatar,
  frameId,
  sizeClass,
  textClass,
  roundedClass = 'rounded-full',
  ringInsetClass = '-inset-1',
  ringOpacity = 0.7,
  className,
  title,
}: AvatarWithFrameProps) {
  const frame = FRAMES.find((entry) => entry.id === frameId)
  return (
    <div className={`relative shrink-0 ${className ?? ''}`} title={title}>
      {frame && (
        <div
          className={`absolute ${ringInsetClass} ${roundedClass}`}
          style={{ background: frame.gradient, opacity: ringOpacity }}
        />
      )}
      <div
        className={`relative ${sizeClass} ${roundedClass} flex items-center justify-center bg-discord-darker ${
          frame ? 'border-2' : 'border border-white/10'
        }`}
        style={frame ? { borderColor: frame.color } : undefined}
      >
        <span className={textClass}>{avatar}</span>
      </div>
    </div>
  )
}
