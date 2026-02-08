import { motion } from 'framer-motion'
import { useState } from 'react'

const COLORS = ['#00ff88', '#5865F2', '#ed4245', '#faa61a', '#57F287', '#ff6bff', '#00d4ff', '#ffeb3b']

export function ConfettiEffect() {
  const [pieces] = useState(() =>
    Array.from({ length: 80 }, (_, i) => {
      const angle = (Math.random() * Math.PI * 2)
      const speed = 300 + Math.random() * 500
      return {
        id: i,
        startX: 0,
        startY: 0,
        endX: Math.cos(angle) * speed,
        endY: Math.sin(angle) * speed - 200,
        delay: Math.random() * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 10,
        rotation: Math.random() * 1080 - 540,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      }
    })
  )

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      <div className="absolute top-1/3 left-1/2">
        {pieces.map((p) => (
          <motion.div
            key={p.id}
            initial={{
              x: 0,
              y: 0,
              opacity: 1,
              scale: 0,
            }}
            animate={{
              x: p.endX,
              y: p.endY + 600,
              opacity: [1, 1, 0],
              scale: [0, 1.5, 1],
              rotate: p.rotation,
            }}
            transition={{
              duration: 2.5,
              delay: p.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
              opacity: { times: [0, 0.6, 1] },
              scale: { times: [0, 0.15, 1] },
            }}
            className="absolute"
            style={{
              width: p.size,
              height: p.shape === 'circle' ? p.size : p.size * 0.4,
              backgroundColor: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : '2px',
              boxShadow: `0 0 6px ${p.color}60`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
