<script setup lang="ts">
import { Search } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useOsSearchStore } from '@/stores/osSearch'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    compact?: boolean
    class?: string
  }>(),
  { compact: false },
)

const search = useOsSearchStore()
const { t } = useI18n()

const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'flex h-8 w-full items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 text-left text-[12px] text-muted-foreground transition hover:border-primary/30 hover:bg-muted',
        compact && 'min-w-0',
        !compact && 'min-w-0',
        props.class,
      )
    "
    :aria-label="t('shell.searchPlaceholder')"
    @click="search.openPalette()"
  >
    <Search :size="14" :stroke-width="1.75" class="shrink-0" aria-hidden="true" />
    <span class="truncate">{{ t('shell.searchPlaceholder') }}</span>
    <kbd
      class="ml-auto shrink-0 rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
    >
      {{ isMac ? '⌘K' : 'Ctrl+K' }}
    </kbd>
  </button>
</template>
