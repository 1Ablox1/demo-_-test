<script setup lang="ts">
import { computed, onMounted } from 'vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import SmartAutocomplete from '@/components/airfreight/SmartAutocomplete.vue'
import BookingInheritBar from '@/components/orchestration/BookingInheritBar.vue'
import { flashesForStep } from '@/lib/bookingInherit'
import { operateTypeLabel } from '@/lib/splitBooking'
import type { MasterKind, MasterOption, MasterSelection } from '@/mdm/types'
import { useMastersStore } from '@/stores/masters'
import type {
  BookingDraft,
  BookingFileStructure,
  BookingWizardStepId,
} from '@/types/bookingWizard'
import { operateTypeFromStructure } from '@/types/bookingWizard'
import { spineLobMeta } from '@/types/spineLob'

const props = defineProps<{
  draft: BookingDraft
}>()

const emit = defineEmits<{
  'update:draft': [draft: BookingDraft]
  jump: [stepId: BookingWizardStepId]
}>()

const masters = useMastersStore()
const flashes = computed(() => flashesForStep(props.draft, 'shipment'))
const lob = computed(() => spineLobMeta(props.draft.lobPrefix))
const operateLabel = computed(() =>
  operateTypeLabel(operateTypeFromStructure(props.draft.structure)),
)

const structureOptions: { value: BookingFileStructure; label: string; hint: string }[] = [
  { value: 'direct', label: 'Direct', hint: 'Single file' },
  { value: 'console', label: 'Console', hint: 'Master + houses' },
  { value: 'back_to_back', label: 'Back-to-back', hint: '1:1 master/house' },
]

const customsOptions: { value: '' | 'Y' | 'N'; label: string }[] = [
  { value: '', label: 'Select…' },
  { value: 'Y', label: 'Yes — customs required' },
  { value: 'N', label: 'No' },
]

const paymentFallback: MasterOption[] = [
  { kind: 'payment_term', label: 'Prepaid (PP)', value: 'PP', status: 'active' },
  { kind: 'payment_term', label: 'Collect (CC)', value: 'CC', status: 'active' },
]

const paymentOptions = computed(() =>
  masters.paymentTerms.length ? masters.paymentTerms : paymentFallback,
)

onMounted(() => {
  void masters.ensureEchoCatalog()
})

function patch(partial: Partial<BookingDraft>) {
  emit('update:draft', { ...props.draft, ...partial })
}

function setStr(key: keyof BookingDraft, value: string | number) {
  patch({ [key]: String(value) } as Partial<BookingDraft>)
}

function setStructure(structure: BookingFileStructure) {
  const next: Partial<BookingDraft> = { structure }
  if (structure === 'back_to_back') {
    next.houseCount = 1
    next.houseCustomers = [props.draft.customer || props.draft.houseCustomers[0] || '']
  } else if (structure === 'console' && props.draft.houseCount < 2) {
    next.houseCount = 2
    next.houseCustomers = [
      props.draft.houseCustomers[0] || props.draft.customer || '',
      props.draft.houseCustomers[1] || '',
    ]
  }
  patch(next)
}

function toSelection(
  label: string,
  value: string,
  kind: MasterKind,
  list: MasterOption[],
): MasterSelection {
  if (!label && !value) return null
  const hit =
    list.find((x) => x.value === value) ||
    list.find((x) => x.label === label) ||
    list.find((x) => x.value === label)
  if (hit) {
    return {
      label: hit.label,
      value: hit.value,
      kind: hit.kind,
      status: hit.status ?? 'active',
    }
  }
  if (!label && !value) return null
  return {
    label: label || value,
    value: value || label,
    kind,
    status: 'active',
  }
}

function applyPick(
  sel: MasterSelection,
  labelKey: keyof BookingDraft,
  valueKey: keyof BookingDraft,
) {
  patch({
    [labelKey]: sel?.label ?? '',
    [valueKey]: sel?.value ?? '',
  } as Partial<BookingDraft>)
}

const customerSel = computed({
  get: () =>
    toSelection(props.draft.customer, props.draft.customerId, 'customer', masters.customers),
  set: (sel) => applyPick(sel, 'customer', 'customerId'),
})
const shipperSel = computed({
  get: () =>
    toSelection(
      props.draft.shipper,
      props.draft.shipperId,
      'shipper',
      masters.partyOptions('shipper', masters.shippers),
    ),
  set: (sel) => applyPick(sel, 'shipper', 'shipperId'),
})
const consigneeSel = computed({
  get: () =>
    toSelection(
      props.draft.consignee,
      props.draft.consigneeId,
      'consignee',
      masters.partyOptions('consignee', masters.consignees),
    ),
  set: (sel) => applyPick(sel, 'consignee', 'consigneeId'),
})
const notifySel = computed({
  get: () =>
    toSelection(
      props.draft.notifyParty,
      props.draft.notifyPartyId,
      'notify',
      masters.partyOptions('notify', masters.notifyParties),
    ),
  set: (sel) => applyPick(sel, 'notifyParty', 'notifyPartyId'),
})
const bookingAgentSel = computed({
  get: () =>
    toSelection(
      props.draft.bookingAgent,
      props.draft.bookingAgentId,
      'agent',
      masters.partyOptions('bookingAgent', masters.bookingAgents),
    ),
  set: (sel) => applyPick(sel, 'bookingAgent', 'bookingAgentId'),
})
const nominatedAgentSel = computed({
  get: () =>
    toSelection(
      props.draft.nominatedAgent,
      props.draft.nominatedAgentId,
      'agent',
      masters.partyOptions('agent', masters.agents),
    ),
  set: (sel) => applyPick(sel, 'nominatedAgent', 'nominatedAgentId'),
})
const customsBrokerSel = computed({
  get: () =>
    toSelection(
      props.draft.customsBroker,
      props.draft.customsBrokerId,
      'agent',
      masters.partyOptions('customsBroker', masters.brokers),
    ),
  set: (sel) => applyPick(sel, 'customsBroker', 'customsBrokerId'),
})
const airlineSel = computed({
  get: () =>
    toSelection(props.draft.airline, props.draft.airlineId, 'airline', masters.airlines),
  set: (sel) => applyPick(sel, 'airline', 'airlineId'),
})
const originSel = computed({
  get: () =>
    toSelection(props.draft.origin, props.draft.originCode, 'airport', masters.airports),
  set: (sel) => {
    patch({
      origin: sel?.value || sel?.label || '',
      originCode: sel?.value ?? '',
    })
  },
})
const destSel = computed({
  get: () =>
    toSelection(
      props.draft.destination,
      props.draft.destinationCode,
      'airport',
      masters.airports,
    ),
  set: (sel) => {
    patch({
      destination: sel?.value || sel?.label || '',
      destinationCode: sel?.value ?? '',
    })
  },
})
const packingSel = computed({
  get: () =>
    toSelection(
      props.draft.packing,
      props.draft.packingCode,
      'packing',
      masters.packingOptions,
    ),
  set: (sel) => applyPick(sel, 'packing', 'packingCode'),
})
const cargoTypeSel = computed({
  get: () =>
    toSelection(
      props.draft.cargoType,
      props.draft.cargoTypeCode,
      'cargo_type',
      masters.cargoTypes,
    ),
  set: (sel) => applyPick(sel, 'cargoType', 'cargoTypeCode'),
})
const incoSel = computed({
  get: () =>
    toSelection(props.draft.incoTerm, props.draft.incoTerm, 'incoterm', masters.incoterms),
  set: (sel) => patch({ incoTerm: sel?.value ?? '' }),
})
const freightSel = computed({
  get: () =>
    toSelection(
      props.draft.freightTerm,
      props.draft.freightTerm,
      'freight_term',
      masters.freightTerms,
    ),
  set: (sel) => patch({ freightTerm: sel?.value ?? '' }),
})
const paymentHblSel = computed({
  get: () =>
    toSelection(
      props.draft.paymentTermHbl,
      props.draft.paymentTermHbl,
      'payment_term',
      paymentOptions.value,
    ),
  set: (sel) => patch({ paymentTermHbl: sel?.value ?? '' }),
})
const paymentMblSel = computed({
  get: () =>
    toSelection(
      props.draft.paymentTermMbl,
      props.draft.paymentTermMbl,
      'payment_term',
      paymentOptions.value,
    ),
  set: (sel) => patch({ paymentTermMbl: sel?.value ?? '' }),
})
const opOfficeSel = computed({
  get: () =>
    toSelection(props.draft.opOffice, props.draft.opOfficeId, 'office', masters.offices),
  set: (sel) => {
    const depts = masters.departmentsForOffice(sel)
    const keepDept =
      props.draft.opDepartmentId &&
      depts.some((d) => d.value === props.draft.opDepartmentId)
    patch({
      opOffice: sel?.label ?? '',
      opOfficeId: sel?.value ?? '',
      ...(keepDept ? {} : { opDepartment: '', opDepartmentId: '' }),
    })
  },
})
const opDeptSel = computed({
  get: () =>
    toSelection(
      props.draft.opDepartment,
      props.draft.opDepartmentId,
      'department',
      masters.departmentsForOffice(
        toSelection(props.draft.opOffice, props.draft.opOfficeId, 'office', masters.offices),
      ),
    ),
  set: (sel) => applyPick(sel, 'opDepartment', 'opDepartmentId'),
})
const opSel = computed({
  get: () => toSelection(props.draft.op, props.draft.opId, 'user', masters.opsUsers),
  set: (sel) => applyPick(sel, 'op', 'opId'),
})
const salesSel = computed({
  get: () => toSelection(props.draft.sales, props.draft.salesId, 'user', masters.salesUsers),
  set: (sel) => applyPick(sel, 'sales', 'salesId'),
})

const deptOptions = computed(() =>
  masters.departmentsForOffice(
    toSelection(props.draft.opOffice, props.draft.opOfficeId, 'office', masters.offices),
  ),
)

function onHsCode(value: string | number) {
  const hs = String(value)
  patch({
    hsCode: hs,
    clearance: {
      ...props.draft.clearance,
      commodityHs: hs || props.draft.clearance.commodityHs,
    },
  })
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-[18px] font-bold text-slate-900">Shipment details</h2>
        <p class="mt-1 text-[13px] text-slate-500">
          Core create fields for
          <span class="font-mono font-semibold text-slate-700">{{ lob.prefix }}</span>
          · {{ lob.label }}. KEEP set + Priority A Echo Form Display.
        </p>
      </div>
      <span
        v-if="masters.loading"
        class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600"
      >
        Loading stage MDM…
      </span>
      <span
        v-else-if="masters.catalogLoaded"
        class="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-800"
      >
        Stage MDM ready
      </span>
    </div>

    <BookingInheritBar :flashes="flashes" @jump="emit('jump', $event)" />

    <!-- Operate type (Echo operateType) -->
    <section class="space-y-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Operate type
        </h3>
        <span class="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700">
          {{ operateLabel }}
        </span>
      </div>
      <div class="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        <button
          v-for="opt in structureOptions"
          :key="opt.value"
          type="button"
          class="rounded-md px-3 py-1.5 text-left text-[12px] font-medium"
          :class="
            draft.structure === opt.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          "
          @click="setStructure(opt.value)"
        >
          <span class="block">{{ opt.label }}</span>
          <span class="block text-[10px] font-normal text-slate-400">{{ opt.hint }}</span>
        </button>
      </div>
    </section>

    <!-- Source -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Freight canvassing type
      </h3>
      <div class="flex gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit">
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-[12px] font-medium"
          :class="draft.cargoSource === 'SC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
          @click="patch({ cargoSource: 'SC' })"
        >
          SC · Sales
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-1.5 text-[12px] font-medium"
          :class="draft.cargoSource === 'NC' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'"
          @click="patch({ cargoSource: 'NC' })"
        >
          NC · Nominated
        </button>
      </div>
    </section>

    <!-- Parties -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parties</h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-[11px] font-medium text-slate-600 sm:col-span-2">
          Customer <span class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="customerSel"
            class="mt-1"
            storage-key="book-customer"
            :options="masters.partyOptions('customer', masters.customers)"
            :frequent-values="masters.frequentCustomerValues"
            placeholder="Search customer"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Shipper
          <SmartAutocomplete
            v-model="shipperSel"
            class="mt-1"
            storage-key="book-shipper"
            :options="masters.partyOptions('shipper', masters.shippers)"
            placeholder="Search shipper"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Consignee
          <SmartAutocomplete
            v-model="consigneeSel"
            class="mt-1"
            storage-key="book-consignee"
            :options="masters.partyOptions('consignee', masters.consignees)"
            placeholder="Search consignee"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Notify party
          <SmartAutocomplete
            v-model="notifySel"
            class="mt-1"
            storage-key="book-notify"
            :options="masters.partyOptions('notify', masters.notifyParties)"
            placeholder="Search notify"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Airline
          <SmartAutocomplete
            v-model="airlineSel"
            class="mt-1"
            storage-key="book-airline"
            :options="masters.airlines"
            placeholder="Search airline / carrier"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Customs broker
          <SmartAutocomplete
            v-model="customsBrokerSel"
            class="mt-1"
            storage-key="book-customs-broker"
            :options="masters.partyOptions('customsBroker', masters.brokers)"
            placeholder="Search customs broker"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Booking agent
          <SmartAutocomplete
            v-model="bookingAgentSel"
            class="mt-1"
            storage-key="book-booking-agent"
            :options="masters.partyOptions('bookingAgent', masters.bookingAgents)"
            placeholder="Search booking agent"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Designated agent
          <span v-if="draft.cargoSource === 'NC'" class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="nominatedAgentSel"
            class="mt-1"
            storage-key="book-nominated"
            :options="masters.partyOptions('agent', masters.agents)"
            placeholder="Required when NC"
          />
        </label>
      </div>
    </section>

    <!-- Route & flight -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Route, flight &amp; schedule
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-[11px] font-medium text-slate-600">
          Port of loading <span class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="originSel"
            class="mt-1"
            storage-key="book-origin"
            :options="masters.airports"
            :frequent-values="masters.frequentAirportValues"
            placeholder="IATA airport"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Port of discharge <span class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="destSel"
            class="mt-1"
            storage-key="book-dest"
            :options="masters.airports"
            :frequent-values="masters.frequentAirportValues"
            placeholder="IATA airport"
          />
        </label>
        <CompactField
          :model-value="draft.voyageFlight"
          label="Flight no."
          mono
          hint="e.g. QF128"
          @update:model-value="setStr('voyageFlight', $event)"
        />
        <CompactField
          :model-value="draft.vessel"
          label="Aircraft / vessel"
          hint="Optional for air"
          @update:model-value="setStr('vessel', $event)"
        />
        <CompactField
          :model-value="draft.etd"
          label="ETD"
          type="date"
          @update:model-value="setStr('etd', $event)"
        />
        <CompactField
          :model-value="draft.eta"
          label="ETA"
          type="date"
          @update:model-value="setStr('eta', $event)"
        />
      </div>
    </section>

    <!-- Cargo & AWB -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Cargo &amp; AWB
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <CompactField
          :model-value="draft.pieces"
          label="Actual pcs"
          mono
          @update:model-value="setStr('pieces', $event)"
        />
        <CompactField
          :model-value="draft.weightKg"
          label="Actual gross weight"
          mono
          @update:model-value="setStr('weightKg', $event)"
        />
        <CompactField
          :model-value="draft.volumeCbm"
          label="Actual volume"
          mono
          @update:model-value="setStr('volumeCbm', $event)"
        />
        <CompactField
          :model-value="draft.chargeWeight"
          label="Chargeable weight"
          mono
          @update:model-value="setStr('chargeWeight', $event)"
        />
        <label class="block text-[11px] font-medium text-slate-600">
          Packing
          <SmartAutocomplete
            v-model="packingSel"
            class="mt-1"
            storage-key="book-packing"
            :options="masters.packingOptions"
            placeholder="Packing type"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Cargo type
          <SmartAutocomplete
            v-model="cargoTypeSel"
            class="mt-1"
            storage-key="book-cargo-type"
            :options="masters.cargoTypes"
            placeholder="Cargo type"
          />
        </label>
        <CompactField
          class="sm:col-span-2"
          :model-value="draft.commodity"
          label="Commodity"
          @update:model-value="setStr('commodity', $event)"
        />
        <CompactField
          :model-value="draft.hsCode"
          label="HS code"
          mono
          hint="Synced to Clearance"
          @update:model-value="onHsCode"
        />
        <label class="block text-[11px] font-medium text-slate-600">
          Customs required
          <select
            class="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] outline-none focus:border-slate-500"
            :value="draft.customsRequired"
            @change="
              patch({
                customsRequired: ($event.target as HTMLSelectElement).value as '' | 'Y' | 'N',
              })
            "
          >
            <option v-for="o in customsOptions" :key="o.value || 'empty'" :value="o.value">
              {{ o.label }}
            </option>
          </select>
        </label>
        <CompactField
          :model-value="draft.hawb"
          label="HAWB No."
          mono
          hint="House or direct"
          @update:model-value="setStr('hawb', $event)"
        />
        <CompactField
          :model-value="draft.mawb"
          label="MAWB No."
          mono
          hint="Master — houses inherit later"
          @update:model-value="setStr('mawb', $event)"
        />
      </div>
    </section>

    <!-- Terms -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Freight &amp; trade terms
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-[11px] font-medium text-slate-600">
          Trade terms (Incoterm)
          <SmartAutocomplete
            v-model="incoSel"
            class="mt-1"
            storage-key="book-inco"
            :options="masters.incoterms"
            placeholder="EXW / FOB / CIP…"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Freight terms
          <SmartAutocomplete
            v-model="freightSel"
            class="mt-1"
            storage-key="book-freight"
            :options="masters.freightTerms"
            placeholder="Delivery / freight term"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          HAWB freight terms
          <SmartAutocomplete
            v-model="paymentHblSel"
            class="mt-1"
            storage-key="book-payment-hbl"
            :options="paymentOptions"
            placeholder="PP / CC"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          MAWB freight terms
          <SmartAutocomplete
            v-model="paymentMblSel"
            class="mt-1"
            storage-key="book-payment-mbl"
            :options="paymentOptions"
            placeholder="PP / CC"
          />
        </label>
      </div>
    </section>

    <!-- Org -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Ops &amp; sales
      </h3>
      <div class="grid gap-3 sm:grid-cols-2">
        <label class="block text-[11px] font-medium text-slate-600">
          Ops branch
          <SmartAutocomplete
            v-model="opOfficeSel"
            class="mt-1"
            storage-key="book-op-office"
            :options="masters.offices"
            placeholder="Operation office"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Ops department <span class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="opDeptSel"
            class="mt-1"
            storage-key="book-op-dept"
            :options="deptOptions"
            placeholder="Operations department"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Operator
          <SmartAutocomplete
            v-model="opSel"
            class="mt-1"
            storage-key="book-op-user"
            :options="masters.opsUsers"
            placeholder="Ops user"
          />
        </label>
        <label class="block text-[11px] font-medium text-slate-600">
          Sales
          <span v-if="draft.cargoSource === 'SC'" class="text-rose-600">*</span>
          <SmartAutocomplete
            v-model="salesSel"
            class="mt-1"
            storage-key="book-sales"
            :options="masters.salesUsers"
            placeholder="Sales user"
          />
        </label>
      </div>
    </section>

    <!-- Remarks -->
    <section class="space-y-2">
      <h3 class="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Remarks &amp; special requirements
      </h3>
      <div class="grid gap-3">
        <CompactTextarea
          :model-value="draft.notes"
          label="Remarks"
          :rows="3"
          hint="Internal / ops remarks"
          @update:model-value="setStr('notes', $event)"
        />
        <CompactTextarea
          :model-value="draft.specialReqs"
          label="Special requirements"
          :rows="2"
          hint="Handling, temperature, docs…"
          @update:model-value="setStr('specialReqs', $event)"
        />
      </div>
    </section>
  </div>
</template>
