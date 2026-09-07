<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { Copy, MoreHorizontal, Pencil, Trash2 } from '@lucide/vue'

export type TableContextAction = 'edit' | 'copy' | 'duplicate' | 'delete'

const props = defineProps<{
  open: boolean
  x: number
  y: number
  /** When false, Delete Line is disabled (non-Draft). */
  canDelete?: boolean
  entityLabel?: string
}>()

const emit = defineEmits<{
  close: []
  action: [action: TableContextAction]
}>()

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) emit('close')
}

function onDocDown(e: MouseEvent) {
  if (!props.open) return
  const t = e.target as HTMLElement | null
  if (t?.closest?.('[data-table-ctx-menu]')) return
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      window.addEventListener('keydown', onKey)
      window.addEventListener('mousedown', onDocDown, true)
    } else {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDocDown, true)
    }
  },
)

onMounted(() => {
  if (props.open) {
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDocDown, true)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('mousedown', onDocDown, true)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      data-table-ctx-menu
      class="fixed z-[220] min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
      :style="{ left: `${x}px`, top: `${y}px` }"
      role="menu"
      @click.stop
    >
      <p
        v-if="entityLabel"
        class="truncate border-b border-slate-100 px-3 py-1.5 font-mono text-[10px] text-slate-400"
      >
        {{ entityLabel }}
      </p>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-800 hover:bg-teal-50"
        role="menuitem"
        @click="emit('action', 'edit')"
      >
        <Pencil :size="13" class="text-slate-500" />
        Edit Record
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-800 hover:bg-teal-50"
        role="menuitem"
        @click="emit('action', 'copy')"
      >
        <Copy :size="13" class="text-slate-500" />
        Copy Job ID / HAWB
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-slate-800 hover:bg-teal-50"
        role="menuitem"
        @click="emit('action', 'duplicate')"
      >
        <MoreHorizontal :size="13" class="text-slate-500" />
        Duplicate Row / Line
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium hover:bg-red-50"
        :class="canDelete ? 'text-red-700' : 'cursor-not-allowed text-slate-300'"
        role="menuitem"
        :disabled="!canDelete"
        :title="canDelete ? 'Delete draft line' : 'Delete only when status is Draft'"
        @click="canDelete && emit('action', 'delete')"
      >
        <Trash2 :size="13" />
        Delete Line
      </button>
    </div>
  </Teleport>
</template>
