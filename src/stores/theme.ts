import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type AppTheme = 'light' | 'dark' | 'warm'

const STORAGE_KEY = 'cargoware-os-theme'

export const THEME_OPTIONS: { id: AppTheme; labelKey: string }[] = [
  { id: 'light', labelKey: 'shell.theme.light' },
  { id: 'dark', labelKey: 'shell.theme.dark' },
  { id: 'warm', labelKey: 'shell.theme.warm' },
]

function readStoredTheme(): AppTheme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'warm') return raw
  } catch {
    /* ignore */
  }
  return 'light'
}

export function applyAppTheme(theme: AppTheme) {
  const root = document.documentElement
  root.classList.remove('dark', 'warm')
  root.dataset.theme = theme
  if (theme === 'dark') root.classList.add('dark')
  if (theme === 'warm') root.classList.add('warm')
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<AppTheme>(readStoredTheme())

  function setTheme(next: AppTheme) {
    theme.value = next
    applyAppTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }

  watch(theme, (t) => applyAppTheme(t), { immediate: true })

  return { theme, setTheme }
})
