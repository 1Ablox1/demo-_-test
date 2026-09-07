<script setup lang="ts">
import { computed } from 'vue'
import BookingInheritBar from '@/components/orchestration/BookingInheritBar.vue'
import CompactField from '@/components/ui/CompactField.vue'
import { billingTotals, flashesForStep } from '@/lib/bookingInherit'
import type { BookingChargeLine, BookingDraft, BookingWizardStepId } from '@/types/bookingWizard'

const props = defineProps<{
  draft: BookingDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: BookingDraft]
  jump: [stepId: BookingWizardStepId]
}>()

const flashes = computed(() => flashesForStep(props.draft, 'billing'))
const totals = computed(() => billingTotals(props.draft))

function patchCharge(id: string, partial: Partial<BookingChargeLine>) {
  emit('update:draft', {
    ...props.draft,
    charges: props.draft.charges.map((c) => (c.id === id ? { ...c, ...partial } : c)),
  })
}

function setDesc(id: string, value: string | number) {
  patchCharge(id, { description: String(value) })
}

function addManualLine() {
  const id = `chg-m-${Date.now()}`
  emit('update:draft', {
    ...props.draft,
    charges: [
      ...props.draft.charges,
      {
        id,
        code: 'MISC',
        description: 'Manual charge',
        side: 'AR',
        amount: 0,
        currency: 'AUD',
        inheritedFrom: 'manual',
      },
    ],
  })
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[18px] font-bold text-slate-900">Billing</h2>
      <p class="mt-1 text-[13px] text-slate-500">
        Charge draft before Finance accrue / approve on the job desk — same road as CargoWise
        Charges, without leaving Book.
      </p>
    </div>

    <BookingInheritBar :flashes="flashes" @jump="emit('jump', $event)" />

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">AR sell</div>
        <div class="font-mono text-[16px] font-bold text-slate-900">
          ${{ totals.ar.toLocaleString() }}
        </div>
      </div>
      <div class="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">AP buy</div>
        <div class="font-mono text-[16px] font-bold text-slate-900">
          ${{ totals.ap.toLocaleString() }}
        </div>
      </div>
      <div class="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Margin</div>
        <div class="font-mono text-[16px] font-bold text-emerald-800">
          ${{ totals.margin.toLocaleString() }}
        </div>
      </div>
    </div>

    <div class="overflow-hidden rounded-xl border border-slate-200">
      <table class="w-full text-left text-[12px]">
        <thead class="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <tr>
            <th class="px-3 py-2">Code</th>
            <th class="px-3 py-2">Description</th>
            <th class="px-3 py-2">Side</th>
            <th class="px-3 py-2 text-right">Amount</th>
            <th class="px-3 py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="c in draft.charges"
            :key="c.id"
            class="border-t border-slate-100"
          >
            <td class="px-3 py-2 font-mono font-semibold">{{ c.code }}</td>
            <td class="px-3 py-2">
              <CompactField
                :model-value="c.description"
                label=""
                @update:model-value="setDesc(c.id, $event)"
              />
            </td>
            <td class="px-3 py-2">
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-bold"
                :class="c.side === 'AR' ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-800'"
                >{{ c.side }}</span
              >
            </td>
            <td class="px-3 py-2 text-right">
              <input
                type="number"
                class="h-8 w-24 rounded border border-slate-200 px-2 text-right font-mono text-[12px]"
                :value="c.amount"
                @input="
                  patchCharge(c.id, {
                    amount: Number(($event.target as HTMLInputElement).value) || 0,
                  })
                "
              />
            </td>
            <td class="px-3 py-2 text-[11px] text-slate-400">{{ c.inheritedFrom }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <button
      type="button"
      class="text-[12px] font-semibold text-slate-800 hover:underline"
      @click="addManualLine"
    >
      + Add charge line
    </button>
  </div>
</template>
