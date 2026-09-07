<script setup lang="ts">

import { computed } from 'vue'

import { useI18n } from 'vue-i18n'

import { Globe2, ShieldAlert } from '@lucide/vue'

import type { JobClearanceStatus, JobContext, MarketPack } from '@/api/types'

import { Badge } from '@/components/ui/badge'

import { clearanceBlocksMoney } from '@/lib/moneyGates'



const props = defineProps<{

  job: JobContext

}>()



const { t } = useI18n()



const packs = computed<MarketPack[]>(() => {

  if (props.job.activePacks?.length) return props.job.activePacks

  if (props.job.pack === 'GLOBAL') return ['GLOBAL']

  return ['GLOBAL', props.job.pack]

})



const currency = computed(() => props.job.homeCurrency ?? (props.job.pack === 'US' ? 'USD' : 'AUD'))



const clearance = computed(() => props.job.clearance)



const showClearance = computed(() => {

  const c = clearance.value

  if (!c) return false

  if (c.status === 'not_started' && props.job.pack !== 'AU') return false

  return packs.value.includes('AU') || Boolean(c)

})



function clearanceVariant(status: JobClearanceStatus) {

  if (status === 'held') return 'critical' as const

  if (status === 'in_progress') return 'high' as const

  if (status === 'cleared') return 'normal' as const

  return 'pack' as const

}



const docsHeld = computed(
  () =>
    props.job.compliance.documents === 'warn' ||
    props.job.ops.holdType === 'docs' ||
    (props.job.ops.holdType === 'customs' && clearanceBlocksMoney(clearance.value)),
)

const moneyHeld = computed(
  () =>
    clearanceBlocksMoney(clearance.value) ||
    (props.job.ops.holdType === 'invoice' &&
      props.job.ops.moneyState !== 'charges_approved' &&
      props.job.ops.moneyState !== 'invoiced' &&
      props.job.ops.moneyState !== 'part_invoiced') ||
    (props.job.compliance.invoice === 'warn' &&
      props.job.ops.moneyState !== 'charges_approved' &&
      props.job.ops.moneyState !== 'invoiced'),
)



const checklistPending = computed(() => clearanceBlocksMoney(clearance.value))

</script>



<template>

  <div

    class="flex flex-wrap items-center gap-2 rounded-[10px] border border-border bg-card px-3 py-2 shadow-sm"

  >

    <!-- Pack frame (read-only) -->

    <div class="flex min-w-0 items-center gap-1.5">

      <Globe2 :size="13" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />

      <span class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">

        {{ t('jobContext.localFrame.packs') }}

      </span>

      <Badge

        v-for="p in packs"

        :key="p"

        variant="pack"

        class="h-5 rounded-md px-1.5 font-mono text-[10px]"

      >

        {{ p }}

      </Badge>

      <span class="text-[10px] text-muted-foreground">· {{ currency }}</span>

    </div>



    <div class="hidden h-4 w-px bg-border sm:block" />



    <!-- Clearance chip (AU Local Frame) -->

    <div v-if="showClearance && clearance" class="flex min-w-0 items-center gap-1.5">

      <ShieldAlert

        :size="13"

        :stroke-width="1.75"

        class="shrink-0"

        :class="clearance.status === 'held' ? 'text-amber-600' : 'text-muted-foreground'"

        aria-hidden="true"

      />

      <span class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">

        {{ t('jobContext.localFrame.clearance') }}

      </span>

      <Badge

        :variant="clearanceVariant(clearance.status)"

        class="h-5 rounded-md px-1.5 text-[10px] font-semibold"

        :title="clearance.note ?? clearance.blockers?.map((b) => b.label).join(' · ')"

      >

        {{ t(`jobContext.clearanceStatus.${clearance.status}`) }}

      </Badge>

      <span

        v-if="clearance.blockers?.length && clearance.status === 'held'"

        class="hidden max-w-[180px] truncate text-[10px] text-muted-foreground md:inline"

        :title="clearance.blockers.map((b) => b.label).join(' · ')"

      >

        {{ clearance.blockers[0]?.label }}

      </span>

      <span

        v-if="checklistPending"

        class="text-[10px] font-medium text-amber-700 dark:text-amber-300"

      >

        {{ t('jobContext.clearanceGate.scrollHint') }}

      </span>

    </div>



    <!-- Compact hold chips (only when active) -->

    <template v-if="docsHeld || moneyHeld">

      <div class="hidden h-4 w-px bg-border sm:block" />

      <Badge v-if="docsHeld" variant="gate" class="h-5 rounded-md px-1.5 text-[10px]">

        {{ t('jobContext.localFrame.docsHold') }}

      </Badge>

      <Badge v-if="moneyHeld" variant="high" class="h-5 rounded-md px-1.5 text-[10px]">

        {{ t('jobContext.localFrame.moneyHold') }}

      </Badge>

    </template>

  </div>

</template>

