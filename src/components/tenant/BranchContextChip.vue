<script setup lang="ts">
import { computed } from 'vue'
import { MapPin } from '@lucide/vue'
import { useTenantStore } from '@/stores/tenant'

const props = withDefaults(
  defineProps<{
    /** Compact single-line chip vs slightly richer strip */
    dense?: boolean
  }>(),
  { dense: true },
)

const tenant = useTenantStore()

const ctx = computed(() => tenant.activeContext)

const label = computed(() => {
  const c = ctx.value
  const hq = c.isHq ? ' · HQ' : ''
  return `${c.officeCode}${hq} · ${c.countryCode} · ${c.currency} · ${c.packId}`
})
</script>

<template>
  <div
    class="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground"
    :title="`${ctx.branchName} · ${ctx.timezone} · home ${ctx.homeCurrency} (HQ ${ctx.hqCountryCode})`"
  >
    <MapPin :size="12" class="shrink-0 text-teal-700" />
    <span class="font-medium text-foreground">{{ label }}</span>
    <span v-if="!dense" class="hidden text-slate-400 sm:inline">
      · {{ ctx.branchName }}
    </span>
  </div>
</template>
