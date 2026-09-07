<script setup lang="ts">
import { Check, CircleAlert, Lock } from '@lucide/vue'

export type SpineNodeType = 'done' | 'current' | 'exception' | 'pending' | 'locked' | 'gate'

defineProps<{
  type: SpineNodeType
}>()
</script>

<template>
  <span
    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
    :class="{
      'border-[1.5px] border-emerald-600 bg-emerald-100': type === 'done',
      'border-2 border-primary bg-primary-tint': type === 'current',
      'border-[1.5px] border-amber-300 bg-amber-100/80': type === 'exception',
      'border-[1.5px] border-indigo-400 bg-indigo-50': type === 'gate',
      'border-[1.5px] border-dashed border-zinc-300 bg-zinc-50': type === 'pending',
      'border-[1.5px] border-red-200 bg-red-50': type === 'locked',
    }"
  >
    <Check
      v-if="type === 'done'"
      :size="12"
      :stroke-width="1.75"
      class="text-emerald-600"
      aria-hidden="true"
    />
    <span
      v-else-if="type === 'current'"
      class="h-2.5 w-2.5 rounded-full bg-primary animate-os-pulse"
    />
    <CircleAlert
      v-else-if="type === 'exception'"
      :size="12"
      :stroke-width="1.75"
      class="text-amber-700"
      aria-hidden="true"
    />
    <Lock
      v-else-if="type === 'gate'"
      :size="11"
      :stroke-width="1.75"
      class="text-indigo-500"
      aria-hidden="true"
    />
    <span v-else class="h-2 w-2 rounded-full bg-zinc-300" />
  </span>
</template>
