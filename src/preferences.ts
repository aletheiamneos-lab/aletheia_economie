import { useCallback, useEffect, useState } from 'react'

const APPEARANCE_STORAGE_KEY = 'economia-appearance-v1'

export type ThemeId = 'navy' | 'graphite' | 'forest' | 'blue-amber' | 'teal-coral' | 'plum-mint'
export type FontId = 'editorial' | 'inter' | 'ibm-plex' | 'source' | 'lora' | 'newsreader' | 'space'

export interface AppearancePreferences {
  theme: ThemeId
  font: FontId
}

export interface ThemeOption {
  id: ThemeId
  name: string
  description: string
  colors: [string, string, string]
}

export interface FontOption {
  id: FontId
  name: string
  description: string
  previewFamily: string
}

export const themeOptions: ThemeOption[] = [
  { id: 'navy', name: 'Slate / Navy Editorial', description: 'Echilibrat și academic', colors: ['#f3f6fa', '#335f91', '#1f2937'] },
  { id: 'graphite', name: 'Stone / Graphite Luxury', description: 'Neutru și sobru', colors: ['#f5f2ed', '#6c5a4b', '#2c2a28'] },
  { id: 'forest', name: 'Forest / Ink Executive', description: 'Profund și natural', colors: ['#f1f5f3', '#35594a', '#1f2b27'] },
  { id: 'blue-amber', name: 'Blue Sage & Amber', description: 'Clar și energic', colors: ['#255b7d', '#d3e3d5', '#e7885d'] },
  { id: 'teal-coral', name: 'Teal Sand & Coral', description: 'Cald și contemporan', colors: ['#216a6a', '#e8e0d3', '#e87a69'] },
  { id: 'plum-mint', name: 'Plum Mint & Gold', description: 'Distinct și rafinat', colors: ['#594364', '#d9e9e1', '#d9a850'] },
]

export const fontOptions: FontOption[] = [
  { id: 'editorial', name: 'Manrope / DM Sans', description: 'Fontul actual', previewFamily: 'Manrope, sans-serif' },
  { id: 'inter', name: 'Inter', description: 'Curat și foarte lizibil', previewFamily: 'Inter, sans-serif' },
  { id: 'ibm-plex', name: 'IBM Plex Sans', description: 'Tehnic și precis', previewFamily: '"IBM Plex Sans", sans-serif' },
  { id: 'source', name: 'Source Serif 4 / Source Sans 3', description: 'Academic editorial', previewFamily: '"Source Serif 4", serif' },
  { id: 'lora', name: 'Lora / Karla', description: 'Elegant și prietenos', previewFamily: 'Lora, serif' },
  { id: 'newsreader', name: 'Newsreader / Work Sans', description: 'Revistă modernă', previewFamily: 'Newsreader, serif' },
  { id: 'space', name: 'Space Grotesk / Inter', description: 'Modern și geometric', previewFamily: '"Space Grotesk", sans-serif' },
]

const defaultAppearance: AppearancePreferences = { theme: 'navy', font: 'editorial' }

function isTheme(value: unknown): value is ThemeId {
  return themeOptions.some((option) => option.id === value)
}

function isFont(value: unknown): value is FontId {
  return fontOptions.some((option) => option.id === value)
}

function loadAppearance(): AppearancePreferences {
  try {
    const stored = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!stored) return defaultAppearance
    const parsed = JSON.parse(stored) as Partial<AppearancePreferences>
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : defaultAppearance.theme,
      font: isFont(parsed.font) ? parsed.font : defaultAppearance.font,
    }
  } catch {
    return defaultAppearance
  }
}

function applyAppearance(preferences: AppearancePreferences) {
  document.documentElement.dataset.theme = preferences.theme
  document.documentElement.dataset.font = preferences.font
}

export function useAppearance() {
  const [preferences, setPreferences] = useState<AppearancePreferences>(loadAppearance)

  useEffect(() => {
    applyAppearance(preferences)
    try {
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(preferences))
    } catch {
      // Preferințele rămân active în sesiune dacă stocarea locală este blocată.
    }
  }, [preferences])

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== APPEARANCE_STORAGE_KEY) return
      setPreferences(loadAppearance())
    }
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('storage', sync)
    }
  }, [])

  const update = useCallback((next: Partial<AppearancePreferences>) => {
    setPreferences((current) => ({ ...current, ...next }))
  }, [])

  const reset = useCallback(() => update(defaultAppearance), [update])

  return {
    preferences,
    setTheme: (theme: ThemeId) => update({ theme }),
    setFont: (font: FontId) => update({ font }),
    reset,
  }
}

export type AppearanceApi = ReturnType<typeof useAppearance>
