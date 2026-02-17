/**
 * Generate a Windows taskbar overlay icon (badge) for unread message count.
 * Uses sharp to create a small PNG with red circle + white number.
 */
import { nativeImage } from 'electron'

const SIZE = 16
type SharpFn = (input: Buffer) => { png: () => { toBuffer: () => Promise<Buffer> } }
let sharpLoader: Promise<SharpFn | null> | null = null

function loadSharp(): Promise<SharpFn | null> {
  if (!sharpLoader) {
    sharpLoader = import('sharp')
      .then((mod: unknown) => {
        const resolved = (mod as { default?: SharpFn }).default ?? (mod as SharpFn)
        return resolved
      })
      .catch(() => null)
  }
  return sharpLoader ?? Promise.resolve(null)
}

export async function createBadgeImage(count: number): Promise<Electron.NativeImage | null> {
  if (count <= 0) return null
  const text = count > 99 ? '99+' : String(count)
  const fontSize = text.length <= 2 ? 11 : 9

  const svg = `
<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2 - 1}" fill="#e74c3c"/>
  <text x="50%" y="50%" font-size="${fontSize}" font-family="Arial,sans-serif" font-weight="bold"
        fill="white" text-anchor="middle" dominant-baseline="central">${text}</text>
</svg>`

  try {
    const sharp = await loadSharp()
    if (!sharp) return null
    const buffer = await sharp(Buffer.from(svg))
      .png()
      .toBuffer()
    return nativeImage.createFromBuffer(buffer)
  } catch {
    return null
  }
}
