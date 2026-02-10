import { describe, it, expect } from 'vitest'
import { categorizeMultiple } from '../main/tracker'

/** Helper: get first (primary) category from categorizeMultiple */
function categorize(appName: string, windowTitle: string): string {
  return categorizeMultiple(appName, windowTitle)[0]
}

describe('categorize', () => {
  // Coding
  it('categorizes VS Code as coding', () => {
    expect(categorize('Code', '')).toBe('coding')
  })

  it('categorizes Cursor as coding', () => {
    expect(categorize('Cursor', '')).toBe('coding')
  })

  it('categorizes IntelliJ IDEA as coding', () => {
    expect(categorize('idea', '')).toBe('coding')
  })

  it('categorizes by file extension in title', () => {
    expect(categorize('notepad', 'main.tsx - Notepad')).toBe('coding')
    expect(categorize('notepad', 'script.py - Notepad')).toBe('coding')
    expect(categorize('notepad', 'lib.rs - Editor')).toBe('coding')
  })

  it('categorizes Visual Studio as coding', () => {
    expect(categorize('devenv', '')).toBe('coding')
  })

  // Design
  it('categorizes Figma as design', () => {
    expect(categorize('figma', '')).toBe('design')
  })

  it('categorizes Photoshop as design', () => {
    expect(categorize('Photoshop', '')).toBe('design')
  })

  // Creative
  it('categorizes Blender as creative', () => {
    expect(categorize('blender', '')).toBe('creative')
  })

  it('categorizes OBS as creative', () => {
    expect(categorize('obs', '')).toBe('creative')
  })

  // Learning
  it('categorizes Notion as learning', () => {
    expect(categorize('Notion', '')).toBe('learning')
  })

  it('categorizes Obsidian as learning', () => {
    expect(categorize('Obsidian', '')).toBe('learning')
  })

  it('categorizes PDF files as learning', () => {
    expect(categorize('chrome', 'document.pdf - Chrome')).toBe('learning')
  })

  // Music
  it('categorizes Spotify as music', () => {
    expect(categorize('Spotify', '')).toBe('music')
  })

  // Games
  it('categorizes Steam as games', () => {
    expect(categorize('steam', '')).toBe('games')
  })

  it('categorizes Dota 2 as games', () => {
    expect(categorize('dota2', '')).toBe('games')
  })

  it('categorizes CS2 as games', () => {
    expect(categorize('cs2', '')).toBe('games')
  })

  it('categorizes by game in title', () => {
    expect(categorize('javaw', 'Minecraft Game Window')).toBe('games')
  })

  // Social
  it('categorizes Discord as social', () => {
    expect(categorize('Discord', '')).toBe('social')
  })

  it('categorizes Telegram as social', () => {
    expect(categorize('Telegram', '')).toBe('social')
  })

  // Browsing
  it('categorizes Chrome as browsing', () => {
    expect(categorize('chrome', '')).toBe('browsing')
  })

  it('categorizes Firefox as browsing', () => {
    expect(categorize('firefox', '')).toBe('browsing')
  })

  it('categorizes Edge as browsing', () => {
    expect(categorize('msedge', '')).toBe('browsing')
  })

  // Other
  it('categorizes unknown apps as other', () => {
    expect(categorize('randomapp', '')).toBe('other')
  })

  it('categorizes explorer as other (not browsing)', () => {
    expect(categorize('explorer', '')).toBe('other')
  })
})

describe('categorizeMultiple', () => {
  it('returns multiple categories for music in browser', () => {
    const cats = categorizeMultiple('chrome', 'Spotify - Web Player')
    expect(cats).toContain('music')
  })

  it('returns music + learning for podcast on music site', () => {
    const cats = categorizeMultiple('chrome', 'подкаст - Spotify')
    expect(cats).toContain('music')
    expect(cats).toContain('learning')
  })

  it('strips .exe suffix from app name', () => {
    expect(categorize('Code.exe', '')).toBe('coding')
    expect(categorize('Discord.exe', '')).toBe('social')
  })
})
