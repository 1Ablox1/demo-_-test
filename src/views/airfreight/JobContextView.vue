<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import JobClearanceGatePanel from '@/components/airfreight/job/JobClearanceGatePanel.vue'
import JobDisclosureAccordions from '@/components/airfreight/job/JobDisclosureAccordions.vue'
import JobHostFactsEssentials from '@/components/airfreight/job/JobHostFactsEssentials.vue'
import JobLocalFrameStrip from '@/components/airfreight/job/JobLocalFrameStrip.vue'
import JobOpsTruthStrip from '@/components/airfreight/job/JobOpsTruthStrip.vue'
import JobQuoteStageBanner from '@/components/airfreight/job/JobQuoteStageBanner.vue'
import JobSalesHandoffBanner from '@/components/airfreight/job/JobSalesHandoffBanner.vue'
import { useJobPermissions } from '@/composables/useSeatPermissions'
import { QUOTE_STAGE_SHIPMENT_ID } from '@/lib/createJobIntent'
import { showHostFactsEssentials } from '@/lib/hostFacts'
import { useJobStore } from '@/stores/job'
import { useLifecycleStore } from '@/stores/lifecycle'

const store = useJobStore()
const life = useLifecycleStore()
const { t } = useI18n()

const job = computed(() => store.job)
const showEssentials = computed(() => (job.value ? showHostFactsEssentials(job.value) : false))

const milestone = computed(() => life.lifecycle?.currentMilestoneId)
const perms = useJobPermissions({
  milestone,
  tasks: computed(() => life.lifecycle?.tasks ?? []),
  gates: computed(() => life.lifecycle?.gates ?? []),
})

const isQuoteStage = computed(
  () =>
    perms.isQuotePhase.value ||
    job.value?.shipmentId === QUOTE_STAGE_SHIPMENT_ID,
)
</script>

<template>
  <div v-if="!job" class="text-sm text-muted-foreground">{{ t('jobContext.loading') }}</div>

  <div v-else class="flex flex-col gap-3">
    <JobQuoteStageBanner
      v-if="isQuoteStage"
      :shipment-id="job.shipmentId"
      :lob="job.lob"
    />
    <JobSalesHandoffBanner
      v-else-if="perms.isSalesHandoffReadOnly.value"
      :read-only-label="perms.readOnlyLabel.value"
    />
    <JobLocalFrameStrip :job="job" />
    <JobClearanceGatePanel :shipment-id="job.shipmentId" />
    <JobHostFactsEssentials v-if="showEssentials" :job="job" />
    <JobOpsTruthStrip :job="job" />
    <p class="text-[11px] text-muted-foreground">{{ t('jobContext.chunks.hint') }}</p>
    <JobDisclosureAccordions :job="job" />
  </div>
</template>
