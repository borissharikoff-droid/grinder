export const MOTION = {
  easing: [0.16, 1, 0.3, 1] as const,
  easingSoft: [0.22, 1, 0.36, 1] as const,
  duration: {
    fast: 0.18,
    base: 0.24,
    slow: 0.34,
    verySlow: 0.4,
  },
  stagger: {
    tight: 0.02,
    normal: 0.06,
    loose: 0.1,
  },
  spring: {
    soft: { type: 'spring' as const, damping: 22, stiffness: 260 },
    pop: { type: 'spring' as const, damping: 18, stiffness: 300 },
  },
  entry: {
    subtle: { opacity: 0, y: 4 },
    standard: { opacity: 0, y: 6 },
    prominent: { opacity: 0, y: 12 },
  },
  page: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
  },
  subPage: {
    initial: { opacity: 0, x: 8 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 },
  },
  interactive: {
    hover: { scale: 1.03 },
    tap: { scale: 0.97 },
  },
}

export const MOTION_VARIANTS = {
  fadeInUp: {
    initial: MOTION.entry.standard,
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -6 },
    transition: { duration: MOTION.duration.base, ease: MOTION.easing },
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: MOTION.duration.fast, ease: MOTION.easing },
  },
}

