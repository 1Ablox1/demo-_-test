import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  buildOsSearchIndex,
  filterOsSearchIndex,
  type OsSearchEntry,
} from '@/lib/searchIndex'

const RECENT_KEY = 'os-search-recent'

function loadRecent(): number[] {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []
  } catch {
    return []
  }
}

function saveRecent(ids: number[]) {
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 5)))
}

export const useOsSearchStore = defineStore('osSearch', () => {
  const open = ref(false)
  const query = ref('')
  /** Inline Needs You filter — same matching rules as palette */
  const deskFilter = ref('')

  const index = computed(() => buildOsSearchIndex())

  const results = computed(() => filterOsSearchIndex(index.value, query.value))

  const recentEntries = computed(() => {
    const ids = loadRecent()
    return ids
      .map((id) => index.value.find((e) => e.shipmentId === id))
      .filter(Boolean) as OsSearchEntry[]
  })

  function openPalette(initialQuery = '') {
    open.value = true
    if (initialQuery) query.value = initialQuery
  }

  function closePalette() {
    open.value = false
    query.value = ''
  }

  function togglePalette() {
    if (open.value) closePalette()
    else openPalette()
  }

  function recordRecent(shipmentId: number) {
    const next = [shipmentId, ...loadRecent().filter((id) => id !== shipmentId)].slice(0, 5)
    saveRecent(next)
  }

  return {
    open,
    query,
    deskFilter,
    index,
    results,
    recentEntries,
    openPalette,
    closePalette,
    togglePalette,
    recordRecent,
  }
})
