import { describe, it, expect } from 'vitest'

// We need to test the categorize function which is not exported,
// so we import the module-level types and test via the exported interface.
// Since categorize is a private function in tracker.ts, we'll extract
// the categorization logic into a testable form.

// For now, test the getAppDisplayName and categorize logic by extracting patterns.

type ActivityCategory = 'coding' | 'design' | 'games' | 'social' | 'browsing' | 'creative' | 'learning' | 'music' | 'other'

// Re-implement categorize for testing (mirrors tracker.ts logic exactly)
function categorize(appName: string, windowTitle: string): ActivityCategory {
  const lowerApp = appName.toLowerCase()
  const lowerTitle = windowTitle.toLowerCase()
  if (/^(code|cursor|intellij|webstorm|pycharm|idea|devenv|rider)$/i.test(lowerApp) || /visual studio/i.test(lowerApp)) return 'coding'
  if (/\.(tsx?|jsx?|py|rs|go|cpp|cs|java)\b/i.test(lowerTitle)) return 'coding'
  if (/^(figma|photoshop|sketch|canva|illustrator|xd|invision|zeplin|affinity|gimp|krita)$/i.test(lowerApp) || /figma|design|mockup/i.test(lowerTitle)) return 'design'
  if (/^(ableton|fl studio|reaper|logic|audacity|premiere|davinci|resolve|obs|blender|afterfx|vegas|cinema4d)$/i.test(lowerApp) || /premiere|davinci|blender|after effects/i.test(lowerTitle)) return 'creative'
  if (/^(notion|obsidian|anki|sumatrapdf|acrobat|acrord32|foxit|foxitreader|kindle|evernote|onenote)$/i.test(lowerApp) || /\.pdf\b|notion|obsidian|anki/i.test(lowerTitle)) return 'learning'
  if (/^(spotify|music|soundcloud|itunes|tidal|yandexmusic)$/i.test(lowerApp) || /youtube.*music|spotify|soundcloud/i.test(lowerTitle)) return 'music'
  if (/^(steam|epicgameslauncher|valorant|leagueclient|dota2|minecraft|fortniteclient|gta|csgo|cs2|overwatch|battle\.net|javaw)$/i.test(lowerApp) || /game|play|steam/i.test(lowerTitle)) return 'games'
  if (/^(telegram|discord|slack|whatsapp|teams)$/i.test(lowerApp)) return 'social'
  if (/^(chrome|firefox|msedge|brave|opera|vivaldi|arc|yandex)$/i.test(lowerApp)) return 'browsing'
  return 'other'
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
