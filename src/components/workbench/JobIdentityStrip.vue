<script setup lang="ts">
import {
  formatHouseBill,
  formatMasterBill,
  houseBillLabel,
  masterBillLabel,
} from '@/lib/shellJobIdentity'
import type { SpineLobPrefix } from '@/types/spineLob'

defineProps<{
  lobPrefix: SpineLobPrefix
  jobNo: string
  masterBill?: string | null
  houseBill?: string | null
}>()
</script>

<template>
  <div class="space-y-2">
    <!-- Identity 1: Job number — never merged with bills -->
    <div class="flex flex-wrap items-center gap-2">
      <span
        class="os-badge text-[10px]!"
        :class="
          lobPrefix === 'AI' || lobPrefix === 'AE'
            ? 'os-badge--teal'
            : lobPrefix === 'OI' || lobPrefix === 'OE'
              ? 'os-badge--slate'
              : 'os-badge--amber'
        "
      >
        {{ lobPrefix }}
      </span>
      <span class="font-mono text-[13px] font-bold text-foreground">{{ jobNo }}</span>
    </div>

    <!-- Identities 2 & 3: structurally decoupled master / house -->
    <div class="grid grid-cols-2 gap-3 rounded-md bg-muted/60 p-2.5">
      <div>
        <span class="os-micro-label mb-1">{{ masterBillLabel(lobPrefix) }}</span>
        <span class="block font-mono text-[11px] font-semibold text-foreground">
          {{ formatMasterBill(masterBill) }}
        </span>
      </div>
      <div>
        <span class="os-micro-label mb-1">{{ houseBillLabel(lobPrefix) }}</span>
        <span class="block font-mono text-[11px] font-semibold text-foreground">
          {{ formatHouseBill(houseBill) }}
        </span>
      </div>
    </div>
  </div>
</template>
