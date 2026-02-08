// Web Audio API sound effects — no external files needed

let audioCtx: AudioContext | null = null
let cachedVolume = 0.5
let cachedMuted = false
let settingsLoaded = false

function loadSettings() {
  if (settingsLoaded) return
  settingsLoaded = true
  try {
    const v = localStorage.getItem('grinder_sound_volume')
    if (v !== null) cachedVolume = parseFloat(v)
    cachedMuted = localStorage.getItem('grinder_sound_muted') === 'true'
  } catch { /* ignore */ }
}

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Pre-warm audio context on first user gesture
export function warmUpAudio() {
  try {
    const ctx = getAudioCtx()
    // Create a silent buffer to unlock audio
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.connect(ctx.destination)
    src.start(0)
  } catch { /* ignore */ }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', gainVal?: number) {
  loadSettings()
  if (cachedMuted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const vol = gainVal ?? cachedVolume
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
  loadSettings()
  if (cachedMuted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(800, ctx.currentTime)
  osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05)
  gain.gain.setValueAtTime(cachedVolume * 0.15, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + 0.08)
}

export function playTabSound() {
  loadSettings()
  if (cachedMuted) return
  const ctx = getAudioCtx()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  const vol = cachedVolume * 0.4
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
  loadSettings()
  if (cachedMuted) return
  playTone(523, 0.2, 'sine', cachedVolume)
  setTimeout(() => playTone(659, 0.2, 'sine', cachedVolume), 100)
  setTimeout(() => playTone(784, 0.35, 'sine', cachedVolume), 200)
}

export function playSessionStopSound() {
  loadSettings()
  if (cachedMuted) return
  playTone(784, 0.25, 'sine', cachedVolume)
  setTimeout(() => playTone(523, 0.4, 'sine', cachedVolume), 150)
}

export function playSessionCompleteSound() {
  loadSettings()
  if (cachedMuted) return
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.3, 'sine', cachedVolume), i * 120)
  })
}

export function playAchievementSound() {
  loadSettings()
  if (cachedMuted) return
  const notes = [880, 1109, 1319, 1568, 1760]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, 'triangle', cachedVolume), i * 80)
  })
}

export function playPauseSound() {
  loadSettings()
  if (cachedMuted) return
  playTone(440, 0.15, 'sine')
}

export function playResumeSound() {
  loadSettings()
  if (cachedMuted) return
  playTone(440, 0.1, 'sine', cachedVolume)
  setTimeout(() => playTone(554, 0.15, 'sine', cachedVolume), 80)
}

export function setSoundVolume(volume: number) {
  cachedVolume = Math.max(0, Math.min(1, volume))
  localStorage.setItem('grinder_sound_volume', String(cachedVolume))
}

export function setSoundMuted(muted: boolean) {
  cachedMuted = muted
  localStorage.setItem('grinder_sound_muted', String(muted))
}

export function getSoundSettings(): { volume: number; muted: boolean } {
  loadSettings()
  return { volume: cachedVolume, muted: cachedMuted }
}
