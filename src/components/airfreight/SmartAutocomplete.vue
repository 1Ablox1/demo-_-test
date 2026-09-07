<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { registerDismissableBranch } from '@/lib/dismissableLayerBranch'
import type { MasterOption, MasterSelection } from '@/mdm/types'
import {
  filterMasters,
  loadRecentValues,
  optionsByValues,
  pushRecentValue,
} from '@/mdm/search'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: MasterSelection
    options: MasterOption[]
    storageKey: string
    frequentValues?: string[]
    preferValues?: string[]
    placeholder?: string
    disabled?: boolean
    showCode?: boolean
    allowCreate?: boolean
    createLabel?: string
    class?: string
  }>(),
  {
    frequentValues: () => [],
    preferValues: () => [],
    placeholder: 'Search…',
    disabled: false,
    showCode: true,
    allowCreate: false,
    createLabel: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [MasterSelection]
  createRequest: [query: string]
}>()

const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const panelEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const open = ref(false)
const query = ref('')
const highlight = ref(0)
const recentTick = ref(0)
const panelStyle = ref<Record<string, string>>({})
let unregisterDismissBranch: (() => void) | null = null

function syncDismissableBranch() {
  unregisterDismissBranch?.()
  unregisterDismissBranch = null
  const panel = panelEl.value
  if (!open.value || !panel) return
  unregisterDismissBranch = registerDismissableBranch(panel)
}

const isPending = computed(() => props.modelValue?.status === 'pending_approval')

const displayText = computed(() => {
  if (open.value) return query.value
  if (!props.modelValue) return ''
  return props.showCode && props.modelValue.value !== props.modelValue.label
    ? `${props.modelValue.label} (${props.modelValue.value})`
    : props.modelValue.label
})

const recentOptions = computed(() => {
  recentTick.value
  return optionsByValues(props.options, loadRecentValues(props.storageKey))
})

const frequentOptions = computed(() => {
  const recentSet = new Set(recentOptions.value.map((o) => o.value))
  return optionsByValues(props.options, props.frequentValues).filter(
    (o) => !recentSet.has(o.value),
  )
})

const searchHits = computed(() => {
  const hits = filterMasters(props.options, query.value)
  if (!props.preferValues.length) return hits
  const prefer = new Set(props.preferValues)
  return [...hits].sort((a, b) => Number(prefer.has(b.value)) - Number(prefer.has(a.value)))
})

const showCreate = computed(
  () => props.allowCreate && query.value.trim().length >= 1 && searchHits.value.length === 0,
)

type ListRow =
  | { type: 'header'; key: string; title: string }
  | { type: 'option'; key: string; option: MasterOption }

function boostPrefer(list: MasterOption[]): MasterOption[] {
  if (!props.preferValues.length) return list
  const prefer = new Set(props.preferValues)
  return [...list].sort((a, b) => Number(prefer.has(b.value)) - Number(prefer.has(a.value)))
}

const rows = computed((): ListRow[] => {
  const out: ListRow[] = []
  const q = query.value.trim()

  if (!q) {
    if (recentOptions.value.length) {
      out.push({ type: 'header', key: 'h-recent', title: t('mdm.recent') })
      for (const o of recentOptions.value) {
        out.push({ type: 'option', key: `r-${o.value}`, option: o })
      }
    }
    if (frequentOptions.value.length) {
      out.push({ type: 'header', key: 'h-freq', title: t('mdm.frequent') })
      for (const o of boostPrefer(frequentOptions.value)) {
        out.push({ type: 'option', key: `f-${o.value}`, option: o })
      }
    }
    if (!out.length) {
      out.push({ type: 'header', key: 'h-all', title: t('mdm.suggestions') })
      for (const o of boostPrefer(props.options).slice(0, 8)) {
        out.push({ type: 'option', key: `s-${o.value}`, option: o })
      }
    }
    return out
  }

  if (searchHits.value.length) {
    out.push({ type: 'header', key: 'h-match', title: t('mdm.matches') })
    for (const o of searchHits.value.slice(0, 12)) {
      out.push({ type: 'option', key: `m-${o.value}`, option: o })
    }
  }
  return out
})

const selectable = computed(() =>
  rows.value.filter((r): r is Extract<ListRow, { type: 'option' }> => r.type === 'option'),
)

watch(rows, () => {
  highlight.value = 0
})

function placePanel() {
  const el = root.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxH = Math.min(288, window.innerHeight - r.bottom - 12)
  panelStyle.value = {
    position: 'fixed',
    top: `${Math.round(r.bottom + 4)}px`,
    left: `${Math.round(r.left)}px`,
    width: `${Math.round(r.width)}px`,
    maxHeight: `${Math.max(120, maxH)}px`,
    zIndex: '100',
  }
}

function openPanel() {
  if (props.disabled) return
  open.value = true
  query.value = props.modelValue?.label ?? ''
  recentTick.value++
  void nextTick(() => {
    placePanel()
    inputEl.value?.select()
  })
}

function closePanel() {
  open.value = false
  query.value = ''
  highlight.value = 0
  syncDismissableBranch()
}

function selectOption(opt: MasterOption) {
  pushRecentValue(props.storageKey, opt.value)
  recentTick.value++
  emit('update:modelValue', {
    label: opt.label,
    value: opt.value,
    kind: opt.kind,
    status: opt.status ?? 'active',
    requestedBy: opt.requestedBy,
    approverSeat: opt.approverSeat,
  })
  closePanel()
}

function clearSelection() {
  emit('update:modelValue', null)
  query.value = ''
  void nextTick(() => inputEl.value?.focus())
  open.value = true
  void nextTick(placePanel)
}

function requestCreate() {
  const q = query.value.trim()
  closePanel()
  emit('createRequest', q)
}

function onKeydown(e: KeyboardEvent) {
  if (!open.value && (e.key === 'ArrowDown' || e.key === 'Enter')) {
    openPanel()
    e.preventDefault()
    return
  }
  if (!open.value) return

  if (e.key === 'Escape') {
    closePanel()
    e.preventDefault()
    return
  }
  if (e.key === 'ArrowDown') {
    highlight.value = Math.min(highlight.value + 1, Math.max(selectable.value.length - 1, 0))
    e.preventDefault()
    return
  }
  if (e.key === 'ArrowUp') {
    highlight.value = Math.max(highlight.value - 1, 0)
    e.preventDefault()
    return
  }
  if (e.key === 'Enter') {
    const hit = selectable.value[highlight.value]
    if (hit) selectOption(hit.option)
    else if (showCreate.value) requestCreate()
    e.preventDefault()
  }
}

function onDocPointer(e: MouseEvent) {
  const t = e.target as Node
  if (root.value?.contains(t) || panelEl.value?.contains(t)) return
  closePanel()
}

watch(open, () => {
  void nextTick(syncDismissableBranch)
})

watch(panelEl, () => {
  void nextTick(syncDismissableBranch)
})

function onReposition() {
  if (open.value) placePanel()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocPointer)
  window.addEventListener('resize', onReposition)
  window.addEventListener('scroll', onReposition, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocPointer)
  window.removeEventListener('resize', onReposition)
  window.removeEventListener('scroll', onReposition, true)
  unregisterDismissBranch?.()
  unregisterDismissBranch = null
})
</script>

<template>
  <div ref="root" :class="cn('relative', props.class)">
    <div
      class="flex h-9 items-stretch overflow-hidden rounded-md border bg-white focus-within:ring-2 focus-within:ring-primary/30"
      :class="[
        disabled ? 'opacity-50' : '',
        isPending ? 'border-amber-300' : 'border-border',
      ]"
    >
      <input
        ref="inputEl"
        type="text"
        class="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="displayText"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        aria-autocomplete="list"
        @focus="openPanel"
        @click="openPanel"
        @input="
          open = true;
          query = ($event.target as HTMLInputElement).value;
          if (modelValue) emit('update:modelValue', null);
          nextTick(placePanel);
        "
        @keydown="onKeydown"
      />
      <button
        v-if="modelValue && !disabled"
        type="button"
        class="px-2 text-xs text-muted-foreground hover:text-foreground"
        :aria-label="t('mdm.clear')"
        @mousedown.prevent="clearSelection"
      >
        ×
      </button>
    </div>

    <div
      v-if="isPending && modelValue"
      class="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-950"
    >
      <span class="rounded bg-amber-200/90 px-1.5 py-0.5 font-semibold tracking-wide">{{
        t('mdm.statusPending')
      }}</span>
      <span class="font-medium">{{ modelValue.label }}</span>
      <span class="text-amber-800/80">
        {{ t('mdm.requestedBy') }} {{ modelValue.requestedBy || '—' }}
        · {{ t('mdm.approver') }} {{ modelValue.approverSeat || 'Finance' }}
      </span>
      <span class="w-full text-amber-800/70">{{ t('mdm.pendingContinueHint') }}</span>
    </div>

    <Teleport to="body">
      <div
        v-if="open"
        ref="panelEl"
        :style="panelStyle"
        class="pointer-events-auto overflow-auto rounded-lg border border-border bg-white py-1 shadow-xl"
        role="listbox"
        data-smart-autocomplete-panel
      >
        <template v-if="rows.length">
          <template v-for="row in rows" :key="row.key">
            <div
              v-if="row.type === 'header'"
              class="px-2.5 pb-0.5 pt-1.5 text-[10px] font-semibold tracking-wide text-muted-foreground"
            >
              {{ row.title }}
            </div>
            <button
              v-else
              type="button"
              role="option"
              class="flex w-full items-start gap-2 px-2.5 py-1.5 text-left text-[13px] hover:bg-muted"
              :class="
                selectable[highlight]?.option.value === row.option.value ? 'bg-muted' : ''
              "
              @mousedown.prevent="selectOption(row.option)"
              @click.prevent="selectOption(row.option)"
              @mouseenter="
                highlight = selectable.findIndex((s) => s.option.value === row.option.value)
              "
            >
              <span class="min-w-0 flex-1">
                <span class="block font-medium text-foreground">{{ row.option.label }}</span>
                <span v-if="row.option.meta" class="block text-[11px] text-muted-foreground">
                  {{ row.option.meta }}
                </span>
              </span>
              <span
                v-if="row.option.status === 'pending_approval'"
                class="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-800"
              >
                {{ t('mdm.statusPendingShort') }}
              </span>
              <span class="shrink-0 font-mono text-[11px] text-muted-foreground">
                {{ row.option.value }}
              </span>
            </button>
          </template>
        </template>
        <div v-else class="px-2.5 py-3 text-[12px] text-muted-foreground">
          {{ t('mdm.noMatches', { q: query }) }}
        </div>

        <div v-if="allowCreate && query.trim()" class="mt-1 border-t border-zinc-100 px-1 py-1">
          <button
            type="button"
            class="flex w-full items-center gap-1.5 rounded-md px-2 py-2 text-left text-[13px] font-medium text-primary hover:bg-primary/5"
            @mousedown.prevent="requestCreate"
          >
            <span class="text-base leading-none">+</span>
            {{ createLabel || t('mdm.createEntity', { name: query.trim() }) }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
