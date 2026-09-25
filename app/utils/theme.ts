/**
 * UI theme.
 *
 * Design system convention (v7): light is the default (the `:root` tokens), and the `.dark` class on
 * `<html>` switches to the dark palette. Any code that needs to know the theme goes through here
 * rather than testing a class by hand — testing a class the app never sets is exactly what once left
 * the rank chart stuck on the wrong palette.
 */
export type Theme = 'dark' | 'light'

export const DARK_CLASS = 'dark'
export const THEME_STORAGE_KEY = 'theme'

export const isDarkTheme = (): boolean =>
  typeof document !== 'undefined' && document.documentElement.classList.contains(DARK_CLASS)

export const isLightTheme = (): boolean => !isDarkTheme()

export const currentTheme = (): Theme => (isDarkTheme() ? 'dark' : 'light')

export const applyTheme = (theme: Theme): void => {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle(DARK_CLASS, theme === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private mode or storage denied: the theme still applies for the current session.
  }
}

export const storedTheme = (): Theme | null => {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}
