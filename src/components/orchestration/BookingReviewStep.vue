<script setup lang="ts">
import { computed } from 'vue'
import { billingTotals } from '@/lib/bookingInherit'
import type { BookingDraft } from '@/types/bookingWizard'
import { spineLobMeta } from '@/types/spineLob'

const props = defineProps<{
  draft: BookingDraft
}>()

const lob = computed(() => spineLobMeta(props.draft.lobPrefix))
const totals = computed(() => billingTotals(props.draft))
const structureLabel = computed(() => {
  if (props.draft.structure === 'console') return 'Consolidation'
  if (props.draft.structure === 'back_to_back') return 'Back-to-back'
  return 'Direct'
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[18px] font-bold text-slate-900">Review & create</h2>
      <p class="mt-1 text-[13px] text-slate-500">
        Creates the OS freight file(s), then opens Shipments or Consolidation for deep edit.
      </p>
    </div>

    <dl class="grid gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-[13px] sm:grid-cols-2">
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entry</dt>
        <dd class="font-semibold">
          {{ draft.entryPath === 'from_quote' ? `From quote ${draft.quoteNo}` : 'Direct booking' }}
        </dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode</dt>
        <dd class="font-mono font-semibold">{{ lob.prefix }} · {{ lob.label }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Structure</dt>
        <dd class="font-semibold">{{ structureLabel }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</dt>
        <dd>{{ draft.customer || '—' }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</dt>
        <dd class="font-mono">{{ draft.origin }} → {{ draft.destination }}</dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cargo</dt>
        <dd class="font-mono">
          {{ draft.pieces || '—' }} pcs · {{ draft.weightKg || '—' }} kg
        </dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Docs</dt>
        <dd class="font-mono text-[12px]">
          H {{ draft.hawb || '—' }} · M {{ draft.masterMawb || draft.mawb || '—' }}
        </dd>
      </div>
      <div>
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing</dt>
        <dd class="font-mono">
          AR ${{ totals.ar.toLocaleString() }} · margin ${{ totals.margin.toLocaleString() }}
        </dd>
      </div>
      <div v-if="draft.structure !== 'direct'" class="sm:col-span-2">
        <dt class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Houses</dt>
        <dd>{{ draft.houseCount }} planned · {{ draft.houseCustomers.filter(Boolean).join(', ') || 'customers TBD' }}</dd>
      </div>
    </dl>
  </div>
</template>
