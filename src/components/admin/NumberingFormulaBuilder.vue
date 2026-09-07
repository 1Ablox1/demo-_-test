<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { GripVertical, Sparkles } from '@lucide/vue'
import { previewNumbering, updateNumberingPolicy } from '@/api/client'
import type { NumberingPolicy } from '@/mdm/numberingTypes'

export type TokenChip = { id: string; label: string; isSep?: boolean; token?: string }

const props = defineProps<{
  policy: NumberingPolicy | null
}>()

const emit = defineEmits<{
  dirty: []
  saved: []
}>()

const { t } = useI18n()

const PALETTE = [
  { actionId: 'office', labelKey: 'adminStudio.formula.addOffice', chip: (): TokenChip => ({ id: `office-${Date.now()}`, label: 'Office: SYD', token: '{OFFICE}' }) },
  { actionId: 'yy', labelKey: 'adminStudio.formula.addYy', chip: (): TokenChip => ({ id: `yy-${Date.now()}`, label: 'YY', token: '{YEAR}' }) },
  { actionId: 'mm', labelKey: 'adminStudio.formula.addMm', chip: (): TokenChip => ({ id: `mm-${Date.now()}`, label: 'MM', token: '{MONTH}' }) },
  { actionId: 'seq', labelKey: 'adminStudio.formula.addSeq', chip: (): TokenChip => ({ id: `seq-${Date.now()}`, label: 'Seq: 5-Digit', token: '{SEQ}' }) },
  { actionId: 'prefix', labelKey: 'adminStudio.formula.addPrefix', chip: (): TokenChip => ({ id: `pfx-${Date.now()}`, label: 'Custom Prefix', token: 'EXP' }) },
  { actionId: 'sep', labelKey: 'adminStudio.formula.addSep', chip: (): TokenChip => ({ id: `sep-${Date.now()}`, label: '-', isSep: true }) },
]

const DEFAULT_TOKENS: TokenChip[] = [
  { id: 'office', label: 'Office: SYD', token: '{OFFICE}' },
  { id: 'sep1', label: '-', isSep: true },
  { id: 'yy', label: 'YY', token: '{YEAR}' },
  { id: 'mm', label: 'MM', token: '{MONTH}' },
  { id: 'sep2', label: '-', isSep: true },
  { id: 'seq', label: 'Seq: 5-Digit', token: '{SEQ}' },
]

const tokens = ref<TokenChip[]>([...DEFAULT_TOKENS])
const dragIdx = ref<number | null>(null)
const apiPreview = ref('')

function parseTemplate(template: string): TokenChip[] {
  if (!template.trim()) return [...DEFAULT_TOKENS]
  const parts = template.split(/(\{OFFICE\}|\{COMPANY\}|\{YEAR\}|\{MONTH\}|\{DAY\}|\{SEQ\}|[-_/])/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part === '-') return { id: `sep-${i}`, label: '-', isSep: true }
    if (part === '{OFFICE}') return { id: `office-${i}`, label: 'Office: SYD', token: '{OFFICE}' }
    if (part === '{YEAR}') return { id: `yy-${i}`, label: 'YY', token: '{YEAR}' }
    if (part === '{MONTH}') return { id: `mm-${i}`, label: 'MM', token: '{MONTH}' }
    if (part === '{DAY}') return { id: `dd-${i}`, label: 'DD', token: '{DAY}' }
    if (part === '{SEQ}') return { id: `seq-${i}`, label: 'Seq: 5-Digit', token: '{SEQ}' }
    if (part === '{COMPANY}') return { id: `co-${i}`, label: 'Company', token: '{COMPANY}' }
    return { id: `lit-${i}`, label: part, token: part }
  })
}

watch(
  () => props.policy?.template,
  (tpl) => {
    if (tpl) tokens.value = parseTemplate(tpl)
  },
  { immediate: true },
)

function tokensToTemplate(list: TokenChip[]): string {
  return list
    .map((chip) => {
      if (chip.isSep) return chip.label
      if (chip.token) return chip.token
      return chip.label
    })
    .join('')
}

function buildLocalPreview(list: TokenChip[]): string {
  const d = new Date()
  const yy = String(d.getFullYear()).slice(-2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return list
    .map((chip) => {
      if (chip.isSep) return chip.label
      if (chip.token === '{OFFICE}' || chip.label.startsWith('Office')) return 'SYD'
      if (chip.token === '{YEAR}' || chip.label === 'YY') return yy
      if (chip.token === '{MONTH}' || chip.label === 'MM') return mm
      if (chip.token === '{DAY}' || chip.label === 'DD') return String(d.getDate()).padStart(2, '0')
      if (chip.token === '{SEQ}' || chip.label.startsWith('Seq')) return '00043'
      if (chip.label.startsWith('Custom')) return 'EXP'
      if (chip.token && chip.token.startsWith('{')) return chip.token.replace(/[{}]/g, '')
      return chip.label
    })
    .join('')
}

const localPreview = computed(() => buildLocalPreview(tokens.value))

async function refreshApiPreview() {
  if (!props.policy) return
  try {
    const res = await previewNumbering({
      type: 'SHIPMENT',
      officeId: props.policy.officeId,
      template: tokensToTemplate(tokens.value),
      mode: props.policy.mode,
    })
    apiPreview.value = res.number
  } catch {
    apiPreview.value = ''
  }
}

watch(tokens, () => void refreshApiPreview(), { deep: true, immediate: true })

function removeToken(id: string) {
  tokens.value = tokens.value.filter((t) => t.id !== id)
  emit('dirty')
}

function addToken(actionId: string) {
  const action = PALETTE.find((p) => p.actionId === actionId)
  if (!action) return
  tokens.value = [...tokens.value, action.chip()]
  emit('dirty')
}

function onDragStart(idx: number) {
  dragIdx.value = idx
}

function handleDrop(toIdx: number) {
  if (dragIdx.value === null || dragIdx.value === toIdx) return
  const next = [...tokens.value]
  const [moved] = next.splice(dragIdx.value, 1)
  next.splice(toIdx, 0, moved)
  tokens.value = next
  dragIdx.value = null
  emit('dirty')
}

async function save(): Promise<boolean> {
  if (!props.policy) return false
  await updateNumberingPolicy(props.policy.id, {
    template: tokensToTemplate(tokens.value),
    mode: props.policy.mode,
  })
  emit('saved')
  await refreshApiPreview()
  return true
}

defineExpose({ save, reset: () => { if (props.policy?.template) tokens.value = parseTemplate(props.policy.template) } })
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
    <div
      class="flex items-start justify-between border-b border-[#E2E8F0] px-6 pb-3.5 pt-[18px]"
    >
      <div>
        <div class="text-sm font-semibold tracking-tight text-[#0F172A]">
          {{ t('adminStudio.formula.title') }}
        </div>
        <div class="mt-0.5 max-w-lg text-xs text-[#64748B]">
          {{ t('adminStudio.formula.subtitle') }}
        </div>
      </div>
      <span
        class="inline-flex items-center gap-1.5 rounded-full border border-[#CCFBF1] bg-[#F0FDFA] px-2.5 py-0.5 text-[11px] font-semibold text-[#0D9488]"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-[#0D9488]" />
        {{ t('adminStudio.formula.activeRule') }}
      </span>
    </div>

    <div class="px-6 py-5">
      <div class="mb-3.5 flex flex-wrap items-center gap-1.5">
        <span
          class="mr-1 text-[11px] font-semibold uppercase tracking-wider text-[#64748B]"
        >
          {{ t('adminStudio.formula.addToken') }}
        </span>
        <button
          v-for="action in PALETTE"
          :key="action.actionId"
          type="button"
          class="inline-flex h-7 items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2.5 font-mono text-[11px] font-medium text-[#334155] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-[#0D9488] hover:text-[#0D9488]"
          @click="addToken(action.actionId)"
        >
          {{ t(action.labelKey) }}
        </button>
      </div>

      <div
        class="flex min-h-[52px] flex-wrap items-center gap-1.5 rounded-lg border-[1.5px] border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-3 py-2"
        @dragover.prevent
        @drop.prevent="handleDrop(tokens.length)"
      >
        <span v-if="!tokens.length" class="font-mono text-xs text-[#94A3B8]">
          {{ t('adminStudio.formula.dropHint') }}
        </span>
        <div
          v-for="(chip, i) in tokens"
          :key="chip.id"
          draggable="true"
          class="inline-flex h-8 cursor-grab select-none items-center gap-1 rounded-md border border-[#CBD5E1] bg-white px-2 shadow-[0_1px_2px_rgba(0,0,0,0.04)] active:cursor-grabbing"
          :class="chip.isSep ? 'px-2.5' : 'pl-1.5'"
          @dragstart="onDragStart(i)"
          @dragover.prevent
          @drop.prevent.stop="handleDrop(i)"
        >
          <GripVertical
            v-if="!chip.isSep"
            :size="12"
            :stroke-width="1.75"
            class="shrink-0 text-[#334155] opacity-40"
            aria-hidden="true"
          />
          <span
            class="font-mono text-[11px] font-medium"
            :class="chip.isSep ? 'text-[#64748B]' : 'text-[#0F172A]'"
          >
            {{ chip.label }}
          </span>
          <button
            v-if="!chip.isSep"
            type="button"
            class="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-sm text-[11px] leading-none text-[#94A3B8] hover:text-[#64748B]"
            @click.stop="removeToken(chip.id)"
          >
            ×
          </button>
        </div>
      </div>

      <div
        class="mt-3 flex items-center justify-between rounded-lg bg-[#0F172A] px-[18px] py-3"
      >
        <div class="flex items-center gap-2">
          <Sparkles class="h-3.5 w-3.5 text-[#94A3B8]" :stroke-width="1.75" />
          <span class="text-[11px] tracking-wide text-[#94A3B8]">
            {{ t('adminStudio.formula.liveOutput') }}
          </span>
        </div>
        <span class="font-mono text-xl font-bold tracking-wide text-[#2DD4BF]">
          {{ apiPreview || localPreview }}
        </span>
      </div>
    </div>
  </div>
</template>
