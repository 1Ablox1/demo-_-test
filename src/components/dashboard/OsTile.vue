<script setup lang="ts">
import { Plus, GripVertical } from '@lucide/vue'
import type { TileSize } from '@/stores/dashboard'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    size?: TileSize
    accent?: 'default' | 'critical' | 'warn' | 'calm'
    pulse?: boolean
    expanded?: boolean
    expandable?: boolean
    clickable?: boolean
    /** Fill parent free-canvas shell (absolute positioned). */
    free?: boolean
    /** Show grip for free drag. */
    draggable?: boolean
  }>(),
  {
    size: 'md',
    accent: 'default',
    pulse: false,
    expanded: false,
    expandable: false,
    clickable: true,
    free: false,
    draggable: false,
  },
)

const emit = defineEmits<{
  click: []
  expand: []
  dragStart: [e: PointerEvent]
}>()

const accentBorder: Record<string, string> = {
  default: 'border-border',
  critical: 'border-destructive/40',
  warn: 'border-warning/50',
  calm: 'border-primary/30',
}
</script>

<template>
  <article
    class="os-tile group relative flex flex-col overflow-hidden rounded-[10px] border bg-card transition-[border-color,background,box-shadow] duration-200"
    :class="[
      free ? 'h-full w-full' : '',
      accentBorder[accent],
      pulse ? 'os-tile-pulse' : '',
      clickable && !free ? 'cursor-pointer hover:border-primary/50 hover:bg-primary-tint/20' : '',
      free && clickable ? 'hover:border-primary/40' : '',
      expanded ? 'ring-1 ring-primary/30' : '',
    ]"
    @click="clickable ? emit('click') : undefined"
  >
    <header class="flex items-start justify-between gap-2 px-3 pt-3 sm:px-4 sm:pt-3.5">
      <div class="flex min-w-0 flex-1 items-start gap-1">
        <button
          v-if="draggable"
          type="button"
          class="os-tile-drag mt-0.5 flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to move this block"
          title="Drag to move"
          @pointerdown.stop="emit('dragStart', $event)"
          @click.stop
        >
          <GripVertical :size="14" :stroke-width="2" aria-hidden="true" />
        </button>
        <div class="min-w-0">
          <h3 class="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {{ title }}
          </h3>
          <p v-if="subtitle" class="mt-0.5 truncate text-[10px] text-muted-foreground/80">
            {{ subtitle }}
          </p>
        </div>
      </div>
      <button
        v-if="expandable"
        type="button"
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:border-primary hover:bg-primary-tint hover:text-primary"
        :class="expanded ? 'border-primary bg-primary-tint text-primary' : ''"
        :aria-expanded="expanded"
        aria-label="Show more details"
        @click.stop="emit('expand')"
      >
        <Plus :size="14" :stroke-width="2" aria-hidden="true" />
      </button>
    </header>

    <div class="flex min-h-0 flex-1 flex-col overflow-auto px-3 pb-3 pt-1 sm:px-4 sm:pb-3.5">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="shrink-0 border-t border-border/80 px-4 py-2">
      <slot name="footer" />
    </footer>
  </article>
</template>
