<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Pin, PinOff, Sparkles, X } from '@lucide/vue'
import CompactField from '@/components/ui/CompactField.vue'
import CompactSelect from '@/components/ui/CompactSelect.vue'
import type { GridField, GridFieldGroup, GridFieldGroupMeta } from '@/data/gridFieldTypes'
import {
  loadPinnedCriteriaIds,
  savePinnedCriteriaIds,
  suggestedPinsFor,
} from '@/lib/advancedSearchPins'

const props = defineProps<{
  open: boolean
  modelValue: Record<string, string>
  fields: GridField[]
  groups: GridFieldGroupMeta[]
  examples?: Record<string, string>
  subtitle?: string
  /** e.g. jobs:AI · consoles:AE — scopes saved pins */
  pinsKey: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: Record<string, string>]
  close: []
  apply: []
  clear: []
}>()

function emptyFromFields(fields: GridField[]): Record<string, string> {
  const o: Record<string, string> = {}
  for (const f of fields) o[f.id] = ''
  return o
}

const draft = ref<Record<string, string>>(emptyFromFields(props.fields))
const expanded = ref<Set<GridFieldGroup>>(new Set())
const pinnedIds = ref<string[]>([])
const pinNotice = ref('')

const suggested = computed(() => {
  const allowed = new Set(props.fields.map((f) => f.id))
  return suggestedPinsFor(props.pinsKey).filter((id) => allowed.has(id))
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      draft.value = { ...emptyFromFields(props.fields), ...props.modelValue }
      expanded.value = new Set()
      const allowed = new Set(props.fields.map((f) => f.id))
      const loaded = loadPinnedCriteriaIds(props.pinsKey, suggested.value).filter((id) =>
        allowed.has(id),
      )
      pinnedIds.value = loaded
      pinNotice.value = ''
    }
  },
)

const fieldById = computed(() => {
  const map = new Map<string, GridField>()
  for (const f of props.fields) map.set(f.id, f)
  return map
})

const pinnedFields = computed(() =>
  pinnedIds.value.map((id) => fieldById.value.get(id)).filter((f): f is GridField => !!f),
)

const fieldsByGroup = computed(() => {
  const map = new Map<GridFieldGroup, GridField[]>()
  for (const g of props.groups) map.set(g.id, [])
  for (const field of props.fields) {
    map.get(field.group)?.push(field)
  }
  return props.groups
    .map((g) => ({ ...g, fields: map.get(g.id) ?? [] }))
    .filter((g) => g.fields.length)
})

function exampleFor(field: GridField): string {
  if (field.searchHint) {
    return field.searchHint.startsWith('e.g.') ? field.searchHint : `e.g. ${field.searchHint}`
  }
  return props.examples?.[field.id] ?? `e.g. ${field.label}`
}

function isOpen(id: GridFieldGroup): boolean {
  return expanded.value.has(id)
}

function toggleGroup(id: GridFieldGroup) {
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function expandAll() {
  expanded.value = new Set(fieldsByGroup.value.map((g) => g.id))
}

function collapseAll() {
  expanded.value = new Set()
}

function isPinned(id: string): boolean {
  return pinnedIds.value.includes(id)
}

function persistPins(ids: string[], notice: string) {
  pinnedIds.value = ids
  savePinnedCriteriaIds(props.pinsKey, ids)
  pinNotice.value = notice
  window.setTimeout(() => {
    if (pinNotice.value === notice) pinNotice.value = ''
  }, 1800)
}

function togglePin(id: string) {
  if (isPinned(id)) {
    persistPins(
      pinnedIds.value.filter((x) => x !== id),
      'Pin removed · saved',
    )
  } else {
    persistPins([...pinnedIds.value, id], 'Pinned · saved as your default')
  }
}

function useSuggestedPins() {
  persistPins([...suggested.value], 'Suggested pins applied · saved')
}

function clearPins() {
  persistPins([], 'Pins cleared')
}

function apply() {
  emit('update:modelValue', { ...draft.value })
  emit('apply')
  emit('close')
}

function clearAll() {
  draft.value = emptyFromFields(props.fields)
  emit('update:modelValue', { ...draft.value })
  emit('clear')
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      @click.self="emit('close')"
    >
      <aside
        class="flex h-full w-full max-w-lg flex-col border-l border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-label="Advanced search"
      >
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 class="text-[15px] font-bold text-slate-900">Advanced search</h2>
            <p class="text-[11px] text-slate-500">
              {{ subtitle || `${fields.length} fields` }}
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            aria-label="Close"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </header>

        <div class="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-1.5">
          <p v-if="pinNotice" class="text-[11px] font-medium text-teal-700">{{ pinNotice }}</p>
          <span v-else class="text-[11px] text-slate-400">Pin everyday fields · saved per workspace</span>
          <div class="flex shrink-0 items-center gap-2">
            <button
              type="button"
              class="text-[11px] font-semibold text-teal-700 hover:underline"
              @click="expandAll"
            >
              Expand all
            </button>
            <span class="text-slate-300">·</span>
            <button
              type="button"
              class="text-[11px] font-semibold text-slate-500 hover:underline"
              @click="collapseAll"
            >
              Collapse all
            </button>
          </div>
        </div>

        <div class="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          <!-- Pinned criteria (refined "default selection") -->
          <section class="overflow-hidden rounded-xl border-2 border-teal-200 bg-teal-50/40">
            <div class="flex flex-wrap items-start justify-between gap-2 border-b border-teal-100 px-3 py-2.5">
              <div class="min-w-0">
                <h3 class="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wide text-teal-900">
                  <Pin :size="13" class="text-teal-700" />
                  Pinned criteria
                </h3>
                <p class="mt-0.5 text-[11px] text-teal-800/80">
                  Your everyday filters — always on top. Star fields below to pin them.
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-if="suggested.length"
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md border border-teal-200 bg-white px-2 text-[10px] font-semibold text-teal-800 hover:bg-teal-50"
                  @click="useSuggestedPins"
                >
                  <Sparkles :size="11" />
                  Use suggested
                </button>
                <button
                  v-if="pinnedIds.length"
                  type="button"
                  class="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] font-semibold text-slate-500 hover:bg-white/80"
                  @click="clearPins"
                >
                  <PinOff :size="11" />
                  Clear pins
                </button>
              </div>
            </div>

            <div v-if="pinnedFields.length" class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
              <div v-for="field in pinnedFields" :key="field.id" class="relative">
                <button
                  type="button"
                  class="absolute right-1 top-0 z-10 rounded p-0.5 text-teal-700 hover:bg-teal-100"
                  :title="`Unpin ${field.label}`"
                  @click="togglePin(field.id)"
                >
                  <Pin :size="12" fill="currentColor" />
                </button>
                <CompactSelect
                  v-if="field.searchType === 'select' && field.searchOptions"
                  v-model="draft[field.id]"
                  :label="field.label"
                  hint="Any"
                  :options="field.searchOptions"
                />
                <CompactField
                  v-else
                  v-model="draft[field.id]"
                  :label="field.label"
                  :hint="exampleFor(field)"
                  :mono="field.mono"
                />
              </div>
            </div>

            <div v-else class="px-3 py-6 text-center">
              <p class="text-[12px] font-medium text-slate-600">No pinned fields yet</p>
              <p class="mt-1 text-[11px] text-slate-500">
                Expand a group below and click the pin on fields you use most.
              </p>
              <button
                v-if="suggested.length"
                type="button"
                class="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-teal-700 px-3 text-[11px] font-semibold text-white hover:bg-teal-800"
                @click="useSuggestedPins"
              >
                <Sparkles :size="12" />
                Start with suggested ({{ suggested.length }})
              </button>
            </div>
          </section>

          <p class="px-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            All fields
          </p>

          <section
            v-for="g in fieldsByGroup"
            :key="g.id"
            class="overflow-hidden rounded-lg border border-slate-200"
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 bg-slate-50 px-3 py-2.5 text-left hover:bg-slate-100"
              :aria-expanded="isOpen(g.id)"
              @click="toggleGroup(g.id)"
            >
              <ChevronDown v-if="isOpen(g.id)" :size="16" class="shrink-0 text-slate-600" />
              <ChevronRight v-else :size="16" class="shrink-0 text-slate-600" />
              <span class="text-[12px] font-bold uppercase tracking-wide text-slate-800">
                {{ g.label }}
              </span>
              <span class="font-mono text-[11px] font-semibold text-slate-500">
                ({{ g.fields.length }})
              </span>
            </button>

            <div
              v-show="isOpen(g.id)"
              class="grid grid-cols-1 gap-2 border-t border-slate-100 bg-white p-3 sm:grid-cols-2"
            >
              <div v-for="field in g.fields" :key="field.id" class="relative">
                <button
                  type="button"
                  class="absolute right-1 top-0 z-10 rounded p-0.5 hover:bg-slate-100"
                  :class="isPinned(field.id) ? 'text-teal-700' : 'text-slate-300'"
                  :title="isPinned(field.id) ? 'Unpin from criteria' : 'Pin to top'"
                  @click="togglePin(field.id)"
                >
                  <Pin :size="12" :fill="isPinned(field.id) ? 'currentColor' : 'none'" />
                </button>
                <CompactSelect
                  v-if="field.searchType === 'select' && field.searchOptions"
                  v-model="draft[field.id]"
                  :label="field.label"
                  hint="Any"
                  :options="field.searchOptions"
                />
                <CompactField
                  v-else
                  v-model="draft[field.id]"
                  :label="field.label"
                  :hint="exampleFor(field)"
                  :mono="field.mono"
                />
              </div>
            </div>
          </section>
        </div>

        <footer class="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            class="h-9 rounded-md px-3 text-[12px] font-medium text-slate-600 hover:bg-slate-100"
            @click="clearAll"
          >
            Clear all
          </button>
          <div class="flex gap-2">
            <button
              type="button"
              class="h-9 rounded-md border border-slate-200 px-3 text-[12px] font-medium hover:bg-slate-50"
              @click="emit('close')"
            >
              Cancel
            </button>
            <button
              type="button"
              class="h-9 rounded-md bg-teal-700 px-4 text-[12px] font-semibold text-white hover:bg-teal-800"
              @click="apply"
            >
              Apply search
            </button>
          </div>
        </footer>
      </aside>
    </div>
  </Teleport>
</template>
