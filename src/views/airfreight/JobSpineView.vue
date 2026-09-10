<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import JobLocalFrameStrip from '@/components/airfreight/job/JobLocalFrameStrip.vue'
import JobMgtTimeline from '@/components/airfreight/job/JobMgtTimeline.vue'
import JobOpsTruthStrip from '@/components/airfreight/job/JobOpsTruthStrip.vue'
import { operateChargesLocation } from '@/lib/jobMoneyNav'
import type { MilestoneId } from '@/os/types'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'

const route = useRoute()
const router = useRouter()
const life = useLifecycleStore()
const jobStore = useJobStore()
const { t } = useI18n()

const shipmentId = computed(() => Number(route.params.shipmentId))
const selected = ref<MilestoneId>('documents')
const job = computed(() => jobStore.job)

watch(
  () => life.lifecycle?.currentMilestoneId,
  (id) => {
    if (id) selected.value = id
  },
  { immediate: true },
)

function onSelectMilestone(id: MilestoneId) {
  selected.value = id
  if (id === 'charges' || id === 'invoice') {
    void router.push(operateChargesLocation(shipmentId.value))
  }
}

async function onClearGate(gateId: string) {
  await life.clearGate(gateId)
}
</script>

<template>
  <div v-if="life.loading && !life.lifecycle" class="text-sm text-[#64748B]">
    {{ t('spine.loadingLife') }}
  </div>

  <div
    v-else-if="life.error && !life.lifecycle"
    class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
  >
    {{ life.error }}
  </div>

  <div v-else class="flex flex-col gap-3">
    <JobLocalFrameStrip v-if="job" :job="job" />
    <JobOpsTruthStrip v-if="job" :job="job" />

    <div
      v-if="life.moneyBlock?.blocked"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-950"
    >
      <div class="font-semibold">{{ t('spine.gateBlocksMoney') }}</div>
      <div class="mt-0.5 text-xs">{{ life.moneyBlock.message }}</div>
    </div>

    <JobMgtTimeline
      v-if="life.milestones.length"
      :milestones="life.milestones"
      :gates="life.openGates"
      :job="job"
      :current-milestone-id="life.lifecycle?.currentMilestoneId"
      @clear-gate="onClearGate"
      @select-milestone="onSelectMilestone"
    />
  </div>
</template>
