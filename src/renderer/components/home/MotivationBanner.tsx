import { useState, useEffect } from 'react'

const GREETINGS = [
  { text: 'Time to lock in.', sub: 'Hit GRIND and enter the zone.' },
  { text: "Let's cook.", sub: 'Your grind arc starts now.' },
  { text: 'No cap, just grind.', sub: 'Start the timer, king.' },
  { text: 'Focus diff incoming.', sub: 'Show them what dedication looks like.' },
  { text: 'Grind now, flex later.', sub: "You're built different." },
  { text: 'Consistency > talent.', sub: 'Another day, another W.' },
  { text: "You're here. That's a W.", sub: 'Half the battle is showing up.' },
  { text: 'Main character energy.', sub: 'Time to earn that XP.' },
]

const RUNNING_MESSAGES = [
  'Locked in. No distractions.',
  "You're cooking rn.",
  'Deep work arc activated.',
  'Every second = XP. Keep going.',
  "Don't break the flow.",
  'Sigma grindset: ON.',
  'Focus diff is real.',
  'Built different energy.',
]

export function MotivationBanner({ isRunning }: { isRunning: boolean }) {
  const [msg] = useState(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)])
  const [runMsg, setRunMsg] = useState(() => RUNNING_MESSAGES[Math.floor(Math.random() * RUNNING_MESSAGES.length)])

  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setRunMsg(RUNNING_MESSAGES[Math.floor(Math.random() * RUNNING_MESSAGES.length)])
    }, 15000)
    return () => clearInterval(interval)
  }, [isRunning])

  // Simple CSS crossfade — no AnimatePresence, no sequential exit→enter
  return (
    <div className="relative h-10 flex items-center justify-center">
      {/* Idle message */}
      <div
        className={`text-center transition-opacity duration-150 ${
          isRunning ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'
        }`}
      >
        <p className="text-white text-sm font-medium">{msg.text}</p>
        <p className="text-gray-500 text-xs mt-0.5">{msg.sub}</p>
      </div>
      {/* Running message */}
      <p
        className={`text-xs text-gray-500 font-mono text-center transition-opacity duration-150 ${
          isRunning ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
        }`}
      >
        {runMsg}
      </p>
    </div>
  )
}
