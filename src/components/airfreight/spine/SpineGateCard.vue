<script setup lang="ts">
import type { OsGate } from '@/os/types'

const props = defineProps<{
  gate?: OsGate | null
  cleared?: boolean
  detail?: string
  taskCta?: string
  compact?: boolean
}>()

defineEmits<{
  clear: []
}>()

const isCleared = () => props.cleared ?? props.gate?.status === 'cleared'
</script>

<template>
  <div
    class="rounded-lg p-3"
    :class="isCleared() ? 'border border-emerald-200 bg-emerald-50' : 'border border-amber-200 bg-amber-50'"
  >
    <div class="flex items-center justify-between gap-2">
      <span
        class="text-[11px] font-bold uppercase tracking-widest"
        :class="isCleared() ? 'text-emerald-700' : 'text-amber-800'"
      >
        {{ isCleared() ? '✓ Gate Cleared' : '⚠ Gate Hold' }}
      </span>
      <span
        class="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold"
        :class="
          isCleared()
            ? 'border-emerald-200 bg-emerald-100 text-emerald-900'
            : 'border-amber-200 bg-amber-100/80 text-amber-900'
        "
      >
        {{ isCleared() ? 'ALL CHECKS PASS' : 'ACTION REQUIRED' }}
      </span>
    </div>
    <p v-if="gate?.title && !compact" class="mt-1.5 text-[12px] font-semibold text-zinc-800">
      {{ gate.title }}
    </p>
    <p v-if="detail || gate?.trigger" class="mt-1 text-[11px] leading-relaxed text-zinc-700">
      {{ detail ?? gate?.trigger }}
    </p>
    <div
      v-if="!isCleared() && (taskCta || gate)"
      class="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-100/50 p-2.5"
    >
      <span class="mt-0.5 shrink-0 text-[11px] text-amber-800">→</span>
      <span class="text-[11px] font-medium text-amber-900">
        {{ taskCta ?? gate?.output }}
      </span>
    </div>
    <button
      v-if="!isCleared() && gate?.status === 'open'"
      type="button"
      class="mt-2 rounded-md bg-primary px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90"
      @click="$emit('clear')"
    >
      Clear gate
    </button>
  </div>
</template>
