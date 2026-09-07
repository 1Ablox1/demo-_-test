<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Search } from '@lucide/vue'
import type { OsSearchEntry } from '@/lib/searchIndex'
import { Badge } from '@/components/ui/badge'
import { useOsSearchStore } from '@/stores/osSearch'

const search = useOsSearchStore()
const router = useRouter()
const { t } = useI18n()

const inputRef = ref<HTMLInputElement | null>(null)

const showRecent = computed(() => !search.query.trim() && search.recentEntries.length > 0)

const list = computed(() => {
  if (showRecent.value) return search.recentEntries
  return search.results
})

watch(
  () => search.open,
  (isOpen) => {
    if (isOpen) {
      requestAnimationFrame(() => inputRef.value?.focus())
    }
  },
)

onMounted(() => inputRef.value?.focus())

function lobChip(entry: OsSearchEntry) {
  const raw = entry.lob.replace(/_/g, ' ')
  return raw.length <= 12 ? raw : entry.lob.slice(0, 2)
}

function go(entry: OsSearchEntry) {
  search.recordRecent(entry.shipmentId)
  search.closePalette()
  void router.push({
    name: 'job-context',
    params: { shipmentId: String(entry.shipmentId) },
  })
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    search.closePalette()
  }
  if (e.key === 'Enter' && list.value[0]) {
    e.preventDefault()
    go(list.value[0])
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-[300] flex items-start justify-center bg-black/35 pt-[12vh]"
    role="dialog"
    aria-modal="true"
    :aria-label="t('shell.commandPaletteTitle')"
    @click.self="search.closePalette()"
    @keydown="onKeydown"
  >
    <div class="w-full max-w-xl overflow-hidden rounded-[10px] border border-border bg-card shadow-2xl">
      <div class="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search :size="16" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref="inputRef"
          v-model="search.query"
          class="flex-1 border-0 bg-transparent text-[14px] outline-none"
          :placeholder="t('shell.searchPlaceholder')"
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Esc
        </kbd>
      </div>

      <div v-if="showRecent" class="border-b border-border px-4 py-2">
        <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {{ t('shell.recentSearches') }}
        </p>
      </div>

      <div class="max-h-72 overflow-y-auto p-2">
        <button
          v-for="entry in list"
          :key="entry.shipmentId"
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-primary/5"
          @click="go(entry)"
        >
          <span class="min-w-[108px] font-mono text-[12px] font-semibold text-foreground">
            {{ entry.jobNo }}
          </span>
          <Badge variant="secondary" class="h-5 rounded-md px-1.5 text-[9px] font-semibold uppercase">
            {{ lobChip(entry) }}
          </Badge>
          <span class="min-w-0 flex-1 truncate text-[12px] text-foreground">{{ entry.customer }}</span>
          <span class="hidden truncate text-[11px] text-muted-foreground sm:inline">{{ entry.lane }}</span>
          <span v-if="entry.hawb" class="hidden font-mono text-[10px] text-muted-foreground md:inline">
            {{ entry.hawb }}
          </span>
        </button>
        <p v-if="!list.length" class="px-3 py-6 text-center text-[13px] text-muted-foreground">
          {{ t('shell.noMatches') }}
        </p>
      </div>
    </div>
  </div>
</template>
