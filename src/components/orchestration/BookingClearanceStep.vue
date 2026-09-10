<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ChevronDown } from '@lucide/vue'
import SmartAutocomplete from '@/components/airfreight/SmartAutocomplete.vue'
import type { BookingDraft } from '@/types/bookingWizard'
import type { AuBiosecurityRisk, AuFreightTerm } from '@/types/auAirImport'
import type { MasterSelection } from '@/mdm/types'
import { useMastersStore } from '@/stores/masters'

const props = defineProps<{
  draft: BookingDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: BookingDraft]
  jump: [id: 'shipment' | 'billing']
}>()

const masters = useMastersStore()

onMounted(() => {
  void masters.ensureEchoCatalog()
})

/** Progressive disclosure levels — essentials first. */
const showOps = ref(false)
const showValuation = ref(false)

function patchClearance(partial: Partial<BookingDraft['clearance']>) {
  emit('update:draft', {
    ...props.draft,
    clearance: { ...props.draft.clearance, ...partial },
  })
}

function patchHs(value: string) {
  emit('update:draft', {
    ...props.draft,
    hsCode: value,
    clearance: { ...props.draft.clearance, commodityHs: value },
  })
}

const abnOk = computed(() => /^\d{11}$/.test(props.draft.clearance.ownerAbn.replace(/\s/g, '')))
const daffNeedsPermit = computed(
  () =>
    props.draft.clearance.biosecurityRisk === 'permit_required' ||
    props.draft.clearance.biosecurityRisk === 'daff_review',
)

const countrySel = computed({
  get: (): MasterSelection => {
    const v = props.draft.clearance.countryOfOrigin
    if (!v) return null
    const hit = masters.countries.find((c) => c.value === v || c.label === v)
    return hit
      ? { label: hit.label, value: hit.value, kind: 'country', status: 'active' }
      : { label: v, value: v, kind: 'country', status: 'active' }
  },
  set: (sel) => patchClearance({ countryOfOrigin: sel?.value ?? '' }),
})

const freightOptions: { value: AuFreightTerm; label: string }[] = [
  { value: '', label: 'Select…' },
  { value: 'prepaid', label: 'Prepaid' },
  { value: 'collect', label: 'Collect' },
]

const daffOptions: { value: AuBiosecurityRisk; label: string }[] = [
  { value: '', label: 'Select…' },
  { value: 'none', label: 'None — standard' },
  { value: 'daff_review', label: 'DAFF review' },
  { value: 'permit_required', label: 'Permit required' },
]
</script>

<template>
  <div class="space-y-4">
    <div>
      <h2 class="text-[18px] font-bold text-slate-900">Clearance handoff</h2>
      <p class="mt-1 text-[13px] text-slate-500">
        Australian Air Import operate fields for the next desk — ABN, broker, origin, DAFF.
        <span class="font-medium text-slate-700">Not an N10 form</span> (filing stays in Ctrl‑X).
      </p>
    </div>

    <!-- RACI strip — who works this gate -->
    <div
      class="grid gap-2 rounded-xl border border-teal-100 bg-teal-50/50 p-3 sm:grid-cols-3"
      role="group"
      aria-label="RACI for clearance"
    >
      <div>
        <div class="text-[9px] font-bold uppercase tracking-wider text-teal-800/70">R · Working</div>
        <div class="mt-0.5 text-[12px] font-semibold text-slate-900">
          {{ draft.clearance.responsibleSeat }}
        </div>
        <div class="text-[10px] text-slate-500">Capture ABN · broker · DAFF</div>
      </div>
      <div>
        <div class="text-[9px] font-bold uppercase tracking-wider text-violet-800/70">A · Accountable</div>
        <div class="mt-0.5 text-[12px] font-semibold text-slate-900">
          {{ draft.clearance.accountableSeat }}
        </div>
        <div class="text-[10px] text-slate-500">Stamp / release clearance hold</div>
      </div>
      <div>
        <div class="text-[9px] font-bold uppercase tracking-wider text-slate-500">Consulted</div>
        <div class="mt-0.5 text-[12px] font-semibold text-slate-900">
          Customs Broker — Tom Walsh
        </div>
        <div class="text-[10px] text-slate-500">ICS / broker ref when needed</div>
      </div>
    </div>
    <p class="mt-2 text-[11px] text-slate-600">
      <span class="font-semibold text-slate-800">Next:</span>
      {{ draft.clearance.nextTask }}
    </p>

    <!-- Level 1 — essentials always visible -->
    <section class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <h3 class="text-[12px] font-bold uppercase tracking-wider text-slate-500">
          1 · Essentials
        </h3>
        <span
          class="rounded-full px-2 py-0.5 text-[10px] font-semibold"
          :class="abnOk ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'"
        >
          {{ abnOk ? 'ABN ready' : 'ABN needed' }}
        </span>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-[12px] font-medium text-slate-700">
          Owner ABN
          <input
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.ownerAbn"
            placeholder="11 digits"
            inputmode="numeric"
            maxlength="14"
            @input="
              patchClearance({
                ownerAbn: ($event.target as HTMLInputElement).value.replace(/[^\d]/g, '').slice(0, 11),
              })
            "
          />
        </label>
        <label class="block text-[12px] font-medium text-slate-700">
          Customs broker ref
          <input
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.brokerRef"
            placeholder="Broker / ICS client"
            @input="patchClearance({ brokerRef: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <label class="block text-[12px] font-medium text-slate-700 sm:col-span-2">
          Country of origin
          <SmartAutocomplete
            v-model="countrySel"
            class="mt-1"
            storage-key="book-clearance-country"
            :options="masters.countries"
            :frequent-values="masters.frequentCountryValues"
            placeholder="ISO country"
          />
        </label>
        <p
          v-if="draft.customsBroker || draft.customsRequired || draft.hsCode"
          class="sm:col-span-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-[11px] text-slate-600"
        >
          <span class="font-semibold text-slate-800">From Shipment:</span>
          <span v-if="draft.customsRequired">
            customs {{ draft.customsRequired === 'Y' ? 'required' : 'not required' }}
          </span>
          <span v-if="draft.customsBroker">
            · broker {{ draft.customsBroker }}
          </span>
          <span v-if="draft.hsCode" class="font-mono"> · HS {{ draft.hsCode }}</span>
        </p>
      </div>
    </section>

    <!-- Level 2 — ops / DAFF (disclosed on demand) -->
    <section class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
        @click="showOps = !showOps"
      >
        <div>
          <h3 class="text-[12px] font-bold uppercase tracking-wider text-slate-500">
            2 · Ops &amp; biosecurity
          </h3>
          <p class="mt-0.5 text-[11px] text-slate-400">
            HS hint · freight term · DAFF risk — open when needed
          </p>
        </div>
        <ChevronDown
          :size="16"
          class="shrink-0 text-slate-400 transition"
          :class="showOps ? 'rotate-180' : ''"
        />
      </button>
      <div v-if="showOps" class="grid gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
        <label class="block text-[12px] font-medium text-slate-700">
          HS / tariff hint
          <input
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.commodityHs || draft.hsCode"
            placeholder="Broker validates"
            @input="patchHs(($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="block text-[12px] font-medium text-slate-700">
          Freight term
          <select
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.freightTerm"
            @change="
              patchClearance({
                freightTerm: ($event.target as HTMLSelectElement).value as AuFreightTerm,
              })
            "
          >
            <option v-for="o in freightOptions" :key="o.value || 'empty'" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label class="block text-[12px] font-medium text-slate-700">
          DAFF / biosecurity
          <select
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.biosecurityRisk"
            @change="
              patchClearance({
                biosecurityRisk: ($event.target as HTMLSelectElement).value as AuBiosecurityRisk,
              })
            "
          >
            <option v-for="o in daffOptions" :key="o.value || 'empty'" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
        <label v-if="daffNeedsPermit" class="block text-[12px] font-medium text-slate-700">
          Permit / treatment hint
          <input
            class="mt-1 h-9 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 text-[13px] outline-none focus:border-amber-400"
            :value="draft.clearance.permitHint"
            placeholder="Permit # or treatment note"
            @input="patchClearance({ permitHint: ($event.target as HTMLInputElement).value })"
          />
        </label>
      </div>
    </section>

    <!-- Level 3 — valuation hints (advanced, not N10) -->
    <section class="overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50"
        @click="showValuation = !showValuation"
      >
        <div>
          <h3 class="text-[12px] font-bold uppercase tracking-wider text-slate-500">
            3 · Valuation hints
          </h3>
          <p class="mt-0.5 text-[11px] text-slate-400">
            Duty / GST estimates only — not N10 Section C
          </p>
        </div>
        <ChevronDown
          :size="16"
          class="shrink-0 text-slate-400 transition"
          :class="showValuation ? 'rotate-180' : ''"
        />
      </button>
      <div v-if="showValuation" class="grid gap-3 border-t border-slate-100 px-4 py-3 sm:grid-cols-2">
        <label class="block text-[12px] font-medium text-slate-700">
          Duty (est.)
          <input
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.dutyAmountEst"
            placeholder="AUD"
            @input="patchClearance({ dutyAmountEst: ($event.target as HTMLInputElement).value })"
          />
        </label>
        <label class="block text-[12px] font-medium text-slate-700">
          GST (est.)
          <input
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-[13px] outline-none focus:border-slate-500"
            :value="draft.clearance.gstAmountEst"
            placeholder="AUD"
            @input="patchClearance({ gstAmountEst: ($event.target as HTMLInputElement).value })"
          />
        </label>
      </div>
    </section>

    <p class="text-[11px] text-slate-400">
      Missing detail? Continue — deepen on
      <button type="button" class="font-semibold text-teal-700 hover:underline" @click="emit('jump', 'shipment')">
        Job
      </button>
      after create.
    </p>
  </div>
</template>
