<script setup lang="ts">
import { computed } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-zinc-900 text-white',
        secondary: 'border-zinc-200 bg-zinc-100 text-zinc-700',
        outline: 'border-zinc-200 bg-white text-zinc-700',
        critical: 'border-red-200 bg-red-100 text-red-700',
        high: 'border-amber-200 bg-amber-100 text-amber-700',
        medium: 'border-yellow-200 bg-yellow-100 text-yellow-700',
        normal: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        pack: 'border-zinc-200 bg-zinc-100 text-zinc-700',
        raciR: 'border-primary bg-primary text-white font-bold',
        raciA: 'border-zinc-800 bg-zinc-800 text-white font-bold',
        raciC: 'border-primary bg-primary-tint text-teal-800 font-bold',
        raciI: 'border-zinc-300 bg-zinc-100 text-zinc-500 font-bold',
        gate: 'border-orange-200 bg-orange-50 text-amber-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeVariants = VariantProps<typeof badgeVariants>

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariants['variant']
    class?: string
  }>(),
  {
    variant: 'default',
  },
)

const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class))
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
