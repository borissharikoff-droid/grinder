// Web Audio API sound effects — no external files needed

let audioCtx: AudioContext | null = null

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function getVolume(): number {
  try {
    const v = localStorage.getItem('grinder_sound_volume')
    return v !== null ? parseFloat(v) : 0.5
  } catch {
    return 0.5
  }
}

function isMuted(): boolean {
  try {
    return localStorage.getItem('grinder_sound_muted') === 'true'
  } catch {
    return false
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gainVal?: number) {
  if (isMuted()) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const vol = gainVal ?? getVolume()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, ctx.currentTime)
  gain.gain.setValueAtTime(vol * 0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

export function playClickSound() {
  if (isMuted()) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const vol = getVolume()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05)
  gain.gain.setValueAtTime(vol * 0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
}

/** Softer, short click for tab / nav — satisfying and subtle */
export function playTabSound() {
  if (isMuted()) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const vol = getVolume() * 0.4
  osc.type = 'sine'
  osc.frequency.setValueAtTime(520, ctx.currentTime)
  gain.gain.setValueAtTime(vol * 0.12, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.05)
}

export function playSessionStartSound() {
  if (isMuted()) return
  const vol = getVolume()
  // Ascending three-note chime
  playTone(523, 0.2, 'sine', vol)    // C5
  setTimeout(() => playTone(659, 0.2, 'sine', vol), 100)   // E5
  setTimeout(() => playTone(784, 0.35, 'sine', vol), 200)  // G5
}

export function playSessionStopSound() {
  if (isMuted()) return
  const vol = getVolume()
  // Descending two notes
  playTone(784, 0.25, 'sine', vol)   // G5
  setTimeout(() => playTone(523, 0.4, 'sine', vol), 150)   // C5
}

export function playSessionCompleteSound() {
  if (isMuted()) return
  const vol = getVolume()
  // Victory fanfare — ascending arpeggio
  const notes = [523, 659, 784, 1047] // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', vol), i * 120)
  })
}

export function playAchievementSound() {
  if (isMuted()) return
  const vol = getVolume()
  // Sparkly achievement sound
  const notes = [880, 1109, 1319, 1568, 1760] // A5 C#6 E6 G6 A6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', vol), i * 80)
  })
}

export function playPauseSound() {
  if (isMuted()) return
  playTone(440, 0.15, 'sine')
}

export function playResumeSound() {
  if (isMuted()) return
  const vol = getVolume()
  playTone(440, 0.1, 'sine', vol)
  setTimeout(() => playTone(554, 0.15, 'sine', vol), 80)
}

export function setSoundVolume(volume: number) {
  localStorage.setItem('grinder_sound_volume', String(Math.max(0, Math.min(1, volume))))
}

export function setSoundMuted(muted: boolean) {
  localStorage.setItem('grinder_sound_muted', String(muted))
}

export function getSoundSettings(): { volume: number; muted: boolean } {
  return { volume: getVolume(), muted: isMuted() }
}
