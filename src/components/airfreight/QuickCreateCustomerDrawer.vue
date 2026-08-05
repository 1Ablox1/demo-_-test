<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import SmartAutocomplete from '@/components/ui/SmartAutocomplete.vue'
import type { MasterSelection, QuickCreateCustomerInput } from '@/mdm/types'
import { frequentCountryValues, masterCountries } from '@/mocks/fixtures/masters'

const props = defineProps<{
  open: boolean
  initialName?: string
  requestedBy: string
}>()

const emit = defineEmits<{
  close: []
  created: [payload: QuickCreateCustomerInput]
}>()

const { t } = useI18n()

/** Maps to legacy partner type flags (customer / shipper / agent …) — not full Info tabs */
const ROLE_OPTIONS = [
  'customer',
  'shipper',
  'consignee',
  'booking_agent',
  'oversea_agent',
  'other',
] as const

const companyName = ref('')
const country = ref<MasterSelection>(null)
const partnerRoles = ref<string[]>(['customer'])
const contactName = ref('')
const contactEmail = ref('')
const creditMode = ref<QuickCreateCustomerInput['creditMode']>('hold_finance')

const contactPhone = ref('')
const address = ref('')
const city = ref('')
const taxId = ref('')
const creditLimit = ref('')
const creditCurrency = ref('USD')
const paymentTermsDays = ref('')
const salesOwner = ref('')
const showOptional = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)

const emailOk = computed(() => {
  const e = contactEmail.value.trim()
  return e.includes('@') && e.includes('.')
})

const canSubmit = computed(
  () =>
    Boolean(
      companyName.value.trim() &&
        country.value &&
        partnerRoles.value.length > 0 &&
        contactName.value.trim() &&
        emailOk.value &&
        creditMode.value,
    ),
)

watch(creditMode, (mode) => {
  if (mode === 'request_terms') showOptional.value = true
})

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    companyName.value = props.initialName?.trim() ?? ''
    country.value = null
    partnerRoles.value = ['customer']
    contactName.value = ''
    contactEmail.value = ''
    creditMode.value = 'hold_finance'
    contactPhone.value = ''
    address.value = ''
    city.value = ''
    taxId.value = ''
    creditLimit.value = ''
    creditCurrency.value = 'USD'
    paymentTermsDays.value = ''
    salesOwner.value = ''
    showOptional.value = false
    await nextTick()
    nameInput.value?.focus()
  },
)

function toggleRole(role: string) {
  if (partnerRoles.value.includes(role)) {
    if (partnerRoles.value.length === 1) return
    partnerRoles.value = partnerRoles.value.filter((r) => r !== role)
  } else {
    partnerRoles.value = [...partnerRoles.value, role]
  }
}

function submit() {
  if (!canSubmit.value || !country.value) return
  emit('created', {
    companyName: companyName.value.trim(),
    countryValue: country.value.value,
    countryLabel: country.value.label,
    partnerRoles: [...partnerRoles.value],
    contactName: contactName.value.trim(),
    contactEmail: contactEmail.value.trim(),
    creditMode: creditMode.value,
    contactPhone: contactPhone.value.trim() || undefined,
    address: address.value.trim() || undefined,
    city: city.value.trim() || undefined,
    taxId: taxId.value.trim() || undefined,
    creditLimit: creditLimit.value.trim() || undefined,
    creditCurrency: creditLimit.value.trim() ? creditCurrency.value : undefined,
    paymentTermsDays: paymentTermsDays.value.trim() || undefined,
    salesOwner: salesOwner.value.trim() || undefined,
    requestedBy: props.requestedBy,
  })
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-black/20"
      @click.self="emit('close')"
    >
      <aside
        class="flex h-full w-full max-w-md flex-col border-l border-border bg-white shadow-xl"
        role="dialog"
        :aria-label="t('mdm.quickCreateTitle')"
      >
        <header class="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
          <div>
            <div class="text-sm font-semibold">{{ t('mdm.quickCreateTitle') }}</div>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{{ t('mdm.quickCreateSub') }}</p>
          </div>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground"
            @click="emit('close')"
          >
            ×
          </button>
        </header>

        <div class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div
            class="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] leading-relaxed text-sky-950"
          >
            {{ t('mdm.quickCreateRaci') }}
          </div>

          <section class="space-y-3">
            <div class="flex items-center gap-2">
              <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
                {{ t('mdm.sectionEssential') }}
              </div>
              <div class="h-px flex-1 bg-zinc-100" />
            </div>

          <label class="block text-[12px]">
            <span class="font-medium text-zinc-700">{{ t('mdm.fields.companyName') }} *</span>
            <input
              ref="nameInput"
              v-model="companyName"
              class="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm"
            />
          </label>

          <label class="block text-[12px]">
            <span class="font-medium text-zinc-700">{{ t('mdm.fields.country') }} *</span>
            <SmartAutocomplete
              v-model="country"
              class="mt-1"
              storage-key="country"
              :options="masterCountries"
              :frequent-values="frequentCountryValues"
              :placeholder="t('mdm.searchCountry')"
            />
          </label>

          <div class="block text-[12px]">
            <span class="font-medium text-zinc-700">{{ t('mdm.fields.partnerRoles') }} *</span>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{{ t('mdm.fields.partnerRolesHint') }}</p>
            <div class="mt-2 flex flex-wrap gap-1.5">
              <button
                v-for="role in ROLE_OPTIONS"
                :key="role"
                type="button"
                class="rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition"
                :class="
                  partnerRoles.includes(role)
                    ? 'border-primary bg-primary/10 text-teal-800'
                    : 'border-border bg-white text-muted-foreground hover:bg-muted'
                "
                @click="toggleRole(role)"
              >
                {{ t(`mdm.roles.${role}`) }}
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block text-[12px]">
              <span class="font-medium text-zinc-700">{{ t('mdm.fields.contactName') }} *</span>
              <input
                v-model="contactName"
                class="mt-1 h-9 w-full rounded-md border border-border px-2 text-sm"
              />
            </label>
            <label class="block text-[12px]">
              <span class="font-medium text-zinc-700">{{ t('mdm.fields.contactEmail') }} *</span>
              <input
                v-model="contactEmail"
                type="email"
                class="mt-1 h-9 w-full rounded-md border px-2 text-sm"
                :class="
                  contactEmail && !emailOk ? 'border-red-300 focus:outline-red-300' : 'border-border'
                "
              />
              <span v-if="contactEmail && !emailOk" class="mt-0.5 block text-[10px] text-red-600">
                {{ t('mdm.emailInvalid') }}
              </span>
            </label>
          </div>

          <div class="block text-[12px]">
            <span class="font-medium text-zinc-700">{{ t('mdm.fields.creditControl') }} *</span>
            <p class="mt-0.5 text-[11px] text-muted-foreground">{{ t('mdm.fields.creditControlHint') }}</p>
            <div class="mt-2 space-y-1.5">
              <label
                v-for="mode in (['hold_finance', 'cash_only', 'request_terms'] as const)"
                :key="mode"
                class="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 hover:bg-muted/40"
                :class="creditMode === mode ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'"
              >
                <input v-model="creditMode" type="radio" class="mt-1" :value="mode" />
                <span>
                  <span class="block text-[12px] font-semibold text-zinc-800">{{
                    t(`mdm.creditMode.${mode}`)
                  }}</span>
                  <span class="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{{
                    t(`mdm.creditMode.${mode}Desc`)
                  }}</span>
                </span>
              </label>
            </div>
          </div>
          </section>

          <button
            type="button"
            class="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-left text-[12px] font-medium text-primary hover:bg-primary/5"
            @click="showOptional = !showOptional"
          >
            <span>{{ showOptional ? t('mdm.hideOptional') : t('mdm.showOptional') }}</span>
            <span class="text-muted-foreground">{{ showOptional ? '−' : '+' }}</span>
          </button>

          <div v-if="showOptional" class="space-y-3 rounded-lg border border-dashed border-border bg-zinc-50/50 p-3">
            <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
              {{ t('mdm.sectionOptional') }}
            </div>
            <p class="text-[11px] text-muted-foreground">{{ t('mdm.optionalHint') }}</p>

            <label class="block text-[12px]">
              <span class="text-muted-foreground">{{ t('mdm.fields.contactPhone') }}</span>
              <input
                v-model="contactPhone"
                class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
              />
            </label>
            <label class="block text-[12px]">
              <span class="text-muted-foreground">{{ t('mdm.fields.address') }}</span>
              <input
                v-model="address"
                class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
              />
            </label>
            <label class="block text-[12px]">
              <span class="text-muted-foreground">{{ t('mdm.fields.city') }}</span>
              <input
                v-model="city"
                class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
              />
            </label>
            <label class="block text-[12px]">
              <span class="text-muted-foreground">{{ t('mdm.fields.taxId') }}</span>
              <input
                v-model="taxId"
                class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
              />
            </label>
            <label class="block text-[12px]">
              <span class="text-muted-foreground">{{ t('mdm.fields.salesOwner') }}</span>
              <input
                v-model="salesOwner"
                class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                :placeholder="t('mdm.fields.salesOwnerPh')"
              />
            </label>

            <div
              class="rounded-md border p-3"
              :class="
                creditMode === 'request_terms'
                  ? 'border-amber-200 bg-amber-50/60'
                  : 'border-dashed border-border'
              "
            >
              <div class="mb-2 text-[11px] font-semibold text-zinc-700">{{ t('mdm.fields.creditDeep') }}</div>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="block text-[12px]">
                  <span class="text-muted-foreground">{{ t('mdm.fields.creditLimit') }}</span>
                  <input
                    v-model="creditLimit"
                    class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                    placeholder="0"
                  />
                </label>
                <label class="block text-[12px]">
                  <span class="text-muted-foreground">{{ t('mdm.fields.creditCurrency') }}</span>
                  <select
                    v-model="creditCurrency"
                    class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="AUD">AUD</option>
                    <option value="CNY">CNY</option>
                    <option value="GBP">GBP</option>
                  </select>
                </label>
                <label class="block text-[12px] sm:col-span-2">
                  <span class="text-muted-foreground">{{ t('mdm.fields.paymentTerms') }}</span>
                  <input
                    v-model="paymentTermsDays"
                    class="mt-1 h-9 w-full rounded-md border border-border bg-white px-2 text-sm"
                    :placeholder="t('mdm.fields.paymentTermsPh')"
                  />
                </label>
              </div>
              <p class="mt-2 text-[11px] text-muted-foreground">{{ t('mdm.creditDeepHint') }}</p>
            </div>
          </div>
        </div>

        <footer class="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
          <Button :disabled="!canSubmit" @click="submit">{{ t('mdm.createAndContinue') }}</Button>
          <Button variant="outline" @click="emit('close')">{{ t('mdm.cancel') }}</Button>
          <Badge variant="raciA" class="ml-auto">A · Finance</Badge>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
