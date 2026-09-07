<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import SmartAutocomplete from '@/components/airfreight/SmartAutocomplete.vue'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

/** Maps to legacy partner type flags (customer / shipper / agent )  not full Info tabs */
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
  (open) => {
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
  },
)

function roleChecked(role: string) {
  return partnerRoles.value.includes(role)
}

function setRole(role: string, checked: boolean | 'indeterminate') {
  const on = checked === true
  if (on) {
    if (!partnerRoles.value.includes(role)) {
      partnerRoles.value = [...partnerRoles.value, role]
    }
    return
  }
  if (partnerRoles.value.length === 1) return
  partnerRoles.value = partnerRoles.value.filter((r) => r !== role)
}

function onOpenChange(next: boolean) {
  if (!next) emit('close')
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
  <Sheet :open="open" @update:open="onOpenChange">
    <SheetContent side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
      <SheetHeader class="border-b border-border px-4 py-3.5 text-left">
        <SheetTitle>{{ t('mdm.quickCreateTitle') }}</SheetTitle>
        <SheetDescription>{{ t('mdm.quickCreateSub') }}</SheetDescription>
      </SheetHeader>

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
            <div class="h-px flex-1 bg-border" />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.companyName') }} *</Label>
            <Input v-model="companyName" class="h-9" />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.country') }} *</Label>
            <SmartAutocomplete
              v-model="country"
              storage-key="country"
              :options="masterCountries"
              :frequent-values="frequentCountryValues"
              :placeholder="t('mdm.searchCountry')"
            />
          </div>

          <div class="space-y-1.5">
            <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.partnerRoles') }} *</Label>
            <p class="text-[11px] text-muted-foreground">{{ t('mdm.fields.partnerRolesHint') }}</p>
            <div class="mt-1 flex flex-col gap-2">
              <label
                v-for="role in ROLE_OPTIONS"
                :key="role"
                class="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2.5 py-2 text-[12px] hover:bg-muted/40"
              >
                <Checkbox
                  :model-value="roleChecked(role)"
                  @update:model-value="(v) => setRole(role, v)"
                />
                {{ t(`mdm.roles.${role}`) }}
              </label>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-1.5">
              <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.contactName') }} *</Label>
              <Input v-model="contactName" class="h-9" />
            </div>
            <div class="space-y-1.5">
              <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.contactEmail') }} *</Label>
              <Input
                v-model="contactEmail"
                type="email"
                class="h-9"
                :aria-invalid="Boolean(contactEmail && !emailOk)"
              />
              <span v-if="contactEmail && !emailOk" class="text-[10px] text-destructive">
                {{ t('mdm.emailInvalid') }}
              </span>
            </div>
          </div>

          <div class="space-y-1.5">
            <Label class="text-[12px] text-zinc-700">{{ t('mdm.fields.creditControl') }} *</Label>
            <p class="text-[11px] text-muted-foreground">{{ t('mdm.fields.creditControlHint') }}</p>
            <div class="mt-2 space-y-1.5">
              <button
                v-for="mode in (['hold_finance', 'cash_only', 'request_terms'] as const)"
                :key="mode"
                type="button"
                class="flex w-full cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left hover:bg-muted/40"
                :class="
                  creditMode === mode
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border'
                "
                @click="creditMode = mode"
              >
                <span
                  class="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border border-input"
                  :class="creditMode === mode ? 'border-primary' : ''"
                >
                  <span
                    v-if="creditMode === mode"
                    class="size-2 rounded-full bg-primary"
                  />
                </span>
                <span>
                  <span class="block text-[12px] font-semibold text-zinc-800">{{
                    t(`mdm.creditMode.${mode}`)
                  }}</span>
                  <span class="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{{
                    t(`mdm.creditMode.${mode}Desc`)
                  }}</span>
                </span>
              </button>
            </div>
          </div>
        </section>

        <Button
          type="button"
          variant="outline"
          class="h-auto w-full justify-between border-dashed px-3 py-2 text-[12px] font-medium"
          @click="showOptional = !showOptional"
        >
          <span>{{ showOptional ? t('mdm.hideOptional') : t('mdm.showOptional') }}</span>
          <ChevronUp v-if="showOptional" :size="14" :stroke-width="2" aria-hidden="true" />
          <ChevronDown v-else :size="14" :stroke-width="2" aria-hidden="true" />
        </Button>

        <div
          v-if="showOptional"
          class="space-y-3 rounded-lg border border-dashed border-border bg-muted/30 p-3"
        >
          <div class="text-[10px] font-semibold tracking-wide text-muted-foreground">
            {{ t('mdm.sectionOptional') }}
          </div>
          <p class="text-[11px] text-muted-foreground">{{ t('mdm.optionalHint') }}</p>

          <div class="space-y-1.5">
            <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.contactPhone') }}</Label>
            <Input v-model="contactPhone" class="h-9 bg-background" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.address') }}</Label>
            <Input v-model="address" class="h-9 bg-background" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.city') }}</Label>
            <Input v-model="city" class="h-9 bg-background" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.taxId') }}</Label>
            <Input v-model="taxId" class="h-9 bg-background" />
          </div>
          <div class="space-y-1.5">
            <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.salesOwner') }}</Label>
            <Input
              v-model="salesOwner"
              class="h-9 bg-background"
              :placeholder="t('mdm.fields.salesOwnerPh')"
            />
          </div>

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
              <div class="space-y-1.5">
                <Label class="text-[12px] text-muted-foreground">{{ t('mdm.fields.creditLimit') }}</Label>
                <Input v-model="creditLimit" class="h-9 bg-background" placeholder="0" />
              </div>
              <div class="space-y-1.5">
                <Label class="text-[12px] text-muted-foreground">{{
                  t('mdm.fields.creditCurrency')
                }}</Label>
                <Select v-model="creditCurrency">
                  <SelectTrigger class="h-9 w-full bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                    <SelectItem value="CNY">CNY</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-1.5 sm:col-span-2">
                <Label class="text-[12px] text-muted-foreground">{{
                  t('mdm.fields.paymentTerms')
                }}</Label>
                <Input
                  v-model="paymentTermsDays"
                  class="h-9 bg-background"
                  :placeholder="t('mdm.fields.paymentTermsPh')"
                />
              </div>
            </div>
            <p class="mt-2 text-[11px] text-muted-foreground">{{ t('mdm.creditDeepHint') }}</p>
          </div>
        </div>
      </div>

      <SheetFooter class="flex-row flex-wrap items-center gap-2 border-t border-border px-4 py-3 sm:space-x-0">
        <Button :disabled="!canSubmit" @click="submit">{{ t('mdm.createAndContinue') }}</Button>
        <Button variant="outline" @click="emit('close')">{{ t('mdm.cancel') }}</Button>
        <Badge variant="raciA" class="ml-auto">A  Finance</Badge>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
