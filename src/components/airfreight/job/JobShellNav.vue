<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Lock, User } from '@lucide/vue'
import type { ActingRole, MarketPack } from '@/api/types'
import { Badge } from '@/components/ui/badge'

export type JobShellTab = 'overview' | 'timeline' | 'charges' | 'invoice'

const props = defineProps<{
  shipmentId: number | string
  jobNo: string
  hawb: string | null
  pack?: MarketPack
  activePacks?: MarketPack[]
  current: JobShellTab
  gpAmount: string
  gpPct: string
  seat: ActingRole
  chargesLocked?: boolean
  invoiceLocked?: boolean
  osPulse?: boolean
}>()

const { t } = useI18n()
const router = useRouter()
const id = computed(() => String(props.shipmentId))
const seatLabel = computed(() => t(`myTasks.roles.${props.seat}`))

const packChips = computed(() => {
  if (props.activePacks?.length) return props.activePacks
  if (!props.pack || props.pack === 'GLOBAL') return ['GLOBAL'] as MarketPack[]
  return ['GLOBAL', props.pack] as MarketPack[]
})

const tabs = computed(() => [
  { id: 'overview' as const, label: 'Overview', locked: false, name: 'job-context' as const },
  { id: 'timeline' as const, label: 'Timeline', locked: false, name: 'job-spine' as const, mgt: true },
  {
    id: 'charges' as const,
    label: 'Charges',
    locked: Boolean(props.chargesLocked),
    name: 'job-charges' as const,
    lockHint: 'Locked while AU clearance is held — complete checklist + stamp on Overview first.',
  },
  {
    id: 'invoice' as const,
    label: 'Invoice',
    locked: Boolean(props.invoiceLocked),
    name: 'job-invoice' as const,
    lockHint: 'Locked until clearance Cleared (and usually after Charges Accrue + Finance approve).',
  },
])

function goTab(tab: (typeof tabs.value)[number]) {
  void router.push({ name: tab.name, params: { shipmentId: id.value } })
}
</script>

<template>
  <aside
    class="flex w-[220px] shrink-0 flex-col border-r border-border bg-card"
    :aria-label="t('nav.aria')"
  >
    <div class="border-b border-border px-4 py-4">
      <p class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {{ t('nav.youAreHere') }}
      </p>
      <p class="mt-1 font-mono text-sm font-bold tracking-tight">{{ jobNo }}</p>
      <p class="mt-0.5 font-mono text-[11px] text-muted-foreground">
        {{ hawb ? `HAWB ${hawb}` : 'HAWB —' }}
      </p>
      <div class="mt-2 flex flex-wrap gap-1">
        <Badge
          v-for="p in packChips"
          :key="p"
          variant="pack"
          class="h-5 rounded-md px-1.5 font-mono text-[9px]"
        >
          {{ p }}
        </Badge>
      </div>
    </div>

    <nav class="flex-1 space-y-0.5 px-2 py-2" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        class="relative flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors"
        :class="[
          current === tab.id
            ? 'bg-primary-tint font-semibold text-primary'
            : tab.locked
              ? 'cursor-pointer font-normal text-muted-foreground/70 hover:bg-muted/60 hover:text-muted-foreground'
              : 'font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        ]"
        :aria-selected="current === tab.id"
        :title="tab.locked ? tab.lockHint : undefined"
        @click="goTab(tab)"
      >
        <span
          v-if="current === tab.id"
          class="absolute -left-2 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary"
        />
        <Lock
          v-if="tab.locked"
          :size="12"
          :stroke-width="1.75"
          class="shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span class="flex-1">{{ tab.label }}</span>
        <span
          v-if="tab.mgt"
          class="rounded-[10px] bg-primary px-1.5 py-px text-[9px] font-bold tracking-wide text-primary-foreground"
        >
          M·G·T
        </span>
        <span
          v-if="tab.mgt && osPulse"
          class="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_0_2px_var(--color-primary-tint)] animate-os-pulse"
        />
      </button>
    </nav>

    <div class="space-y-2 border-t border-border px-4 py-3">
      <span
        class="inline-flex w-full items-center justify-between gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 font-mono text-[11px] font-bold text-emerald-900"
      >
        GP: {{ gpAmount }}
        <span class="rounded-[10px] bg-emerald-900 px-1.5 py-px text-[10px] text-white">{{
          gpPct
        }}</span>
      </span>
      <span
        class="inline-flex w-full items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-[11px] font-semibold"
      >
        <User
          :size="11"
          :stroke-width="1.75"
          class="shrink-0 text-primary"
          aria-hidden="true"
        />
        {{ seatLabel }} Seat
      </span>
    </div>
  </aside>
</template>
