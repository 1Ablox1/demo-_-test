<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ClipboardList } from '@lucide/vue'
import type { JobContext } from '@/api/types'
import {
  airlineDisplay,
  formatHostFactDate,
  formatHostFactValue,
  hostFactsPending,
} from '@/lib/hostFacts'
import { displayJobNo } from '@/lib/jobIdentity'
import { Badge } from '@/components/ui/badge'

const props = defineProps<{
  job: JobContext
}>()

const { t } = useI18n()

const pending = computed(() => hostFactsPending(props.job))
const facts = computed(() => props.job.hostFacts)

const fields = computed(() => {
  const f = facts.value
  if (!f) return []
  return [
    { key: 'incoTerm', label: t('jobContext.hostFacts.incoTerm'), value: formatHostFactValue(f.incoTerm), mono: true },
    { key: 'airline', label: t('jobContext.hostFacts.airline'), value: airlineDisplay(f), mono: true },
    { key: 'loadingPort', label: t('jobContext.hostFacts.loadingPort'), value: formatHostFactValue(f.loadingPort), mono: true },
    { key: 'dischargingPort', label: t('jobContext.hostFacts.dischargingPort'), value: formatHostFactValue(f.dischargingPort), mono: true },
    { key: 'destinationPort', label: t('jobContext.hostFacts.destinationPort'), value: formatHostFactValue(f.destinationPort), mono: true },
    { key: 'firstArrivalDate', label: t('jobContext.hostFacts.firstArrival'), value: formatHostFactDate(f.firstArrivalDate), mono: true },
    {
      key: 'marksAndNumbers',
      label: t('jobContext.hostFacts.marks'),
      value: formatHostFactValue(f.marksAndNumbers),
      mono: false,
      wide: true,
    },
  ]
})

const jobLabel = computed(() =>
  displayJobNo({
    identity: props.job.identity,
    lob: props.job.lob,
    shipmentId: props.job.shipmentId,
  }),
)
</script>

<template>
  <article
    class="overflow-hidden rounded-[10px] border border-border bg-card shadow-sm"
    aria-label="Job host facts essentials"
  >
    <header class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <div class="flex min-w-0 items-center gap-2">
        <ClipboardList
          :size="14"
          :stroke-width="1.75"
          class="shrink-0 text-primary"
          aria-hidden="true"
        />
        <h2 class="text-[13px] font-semibold text-foreground">
          {{ t('jobContext.hostFacts.title') }}
        </h2>
        <span class="font-mono text-[12px] font-semibold text-primary">{{ jobLabel }}</span>
        <Badge v-if="job.lob === 'AI'" variant="pack" class="h-5 rounded-md px-1.5 text-[10px]">
          {{ t('jobContext.hostFacts.lobAi') }}
        </Badge>
      </div>
      <span class="text-[10px] text-muted-foreground">{{ t('jobContext.hostFacts.readOnly') }}</span>
    </header>

    <div v-if="pending" class="px-4 py-6 text-center">
      <p class="text-sm text-muted-foreground">{{ t('jobContext.hostFacts.pendingSync') }}</p>
    </div>

    <dl
      v-else
      class="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-3.5 sm:grid-cols-2"
      aria-label="Essential host fields"
    >
      <template v-for="field in fields" :key="field.key">
        <div :class="field.wide ? 'col-span-2' : ''">
          <dt class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {{ field.label }}
          </dt>
          <dd
            class="mt-0.5 text-[12px] font-medium text-foreground"
            :class="[
              field.mono ? 'font-mono' : '',
              field.wide ? 'line-clamp-2' : '',
            ]"
            :title="field.wide ? field.value : undefined"
          >
            {{ field.value }}
          </dd>
        </div>
      </template>
    </dl>
  </article>
</template>
