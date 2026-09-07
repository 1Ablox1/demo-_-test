<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronDown, ChevronRight, Search, X } from '@lucide/vue'
import type { GridField, GridFieldGroup, GridFieldGroupMeta } from '@/data/gridFieldTypes'

const props = defineProps<{
  open: boolean
  modelValue: string[]
  fields: GridField[]
  groups: GridFieldGroupMeta[]
  subtitle?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [ids: string[]]
  close: []
}>()

const query = ref('')
const local = ref<string[]>([])
const expanded = ref<Set<GridFieldGroup>>(new Set())

watch(
  () => props.open,
  (open) => {
    if (open) {
      local.value = [...props.modelValue]
      query.value = ''
      expanded.value = new Set()
    }
  },
)

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return props.fields.filter((f) => {
    if (!q) return true
    return (
      f.label.toLowerCase().includes(q) ||
      f.id.toLowerCase().includes(q) ||
      f.group.toLowerCase().includes(q)
    )
  })
})

const grouped = computed(() =>
  props.groups
    .map((g) => ({
      ...g,
      fields: filtered.value.filter((f) => f.group === g.id),
    }))
    .filter((g) => g.fields.length),
)

const searching = computed(() => query.value.trim().length > 0)
const auCount = computed(() => props.fields.filter((f) => f.group === 'au').length)

function isOpen(id: GridFieldGroup): boolean {
  return searching.value || expanded.value.has(id)
}

function toggleGroup(id: GridFieldGroup) {
  if (searching.value) return
  const next = new Set(expanded.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expanded.value = next
}

function expandAll() {
  expanded.value = new Set(grouped.value.map((g) => g.id))
}

function collapseAll() {
  expanded.value = new Set()
  query.value = ''
}

function toggle(id: string) {
  if (local.value.includes(id)) {
    if (local.value.length <= 1) return
    local.value = local.value.filter((x) => x !== id)
  } else {
    local.value = [...local.value, id]
  }
}

function selectAllInGroup(ids: string[]) {
  const set = new Set(local.value)
  for (const id of ids) set.add(id)
  local.value = [...set]
}

function unselectAllInGroup(ids: string[]) {
  const remove = new Set(ids)
  const next = local.value.filter((id) => !remove.has(id))
  // Keep at least one column visible overall
  if (!next.length) {
    const fallback = props.fields.find((f) => f.defaultVisible)?.id ?? props.fields[0]?.id
    local.value = fallback ? [fallback] : local.value
    return
  }
  local.value = next
}

function groupSelectedCount(ids: string[]): number {
  return ids.filter((id) => local.value.includes(id)).length
}

function apply() {
  emit('update:modelValue', [...local.value])
  emit('close')
}

function resetDefaults() {
  local.value = props.fields.filter((f) => f.defaultVisible).map((f) => f.id)
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh]"
      @click.self="emit('close')"
    >
      <div class="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 class="text-[15px] font-bold text-slate-900">Columns</h2>
            <p class="text-[11px] text-slate-500">
              {{ subtitle || `Add or hide fields · ${fields.length} available` }}
              <template v-if="auCount"> · {{ auCount }} AU</template>
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
            @click="emit('close')"
          >
            <X :size="16" />
          </button>
        </header>

        <div class="relative border-b border-slate-100 px-4 py-2">
          <Search :size="14" class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            v-model="query"
            type="search"
            placeholder="Search fields…"
            class="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] outline-none focus:border-teal-500"
          />
        </div>

        <div class="flex items-center justify-end gap-2 border-b border-slate-100 px-4 py-1.5">
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

        <div class="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          <section
            v-for="g in grouped"
            :key="g.id"
            class="overflow-hidden rounded-lg border border-slate-200"
          >
            <div class="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-3 py-1.5">
              <button
                type="button"
                class="flex flex-1 items-center gap-2 text-left hover:opacity-80"
                :aria-expanded="isOpen(g.id)"
                @click="toggleGroup(g.id)"
              >
                <ChevronDown v-if="isOpen(g.id)" :size="16" class="shrink-0 text-slate-600" />
                <ChevronRight v-else :size="16" class="shrink-0 text-slate-600" />
                <span class="text-[12px] font-bold uppercase tracking-wide text-slate-800">
                  {{ g.label }}
                </span>
                <span class="font-mono text-[11px] font-semibold text-slate-500">
                  ({{ groupSelectedCount(g.fields.map((f) => f.id)) }}/{{ g.fields.length }})
                </span>
                <span
                  v-if="g.id === 'au'"
                  class="rounded bg-amber-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800"
                >AU</span>
              </button>
              <button
                type="button"
                class="shrink-0 text-[10px] font-semibold text-teal-700 hover:underline"
                @click.stop="selectAllInGroup(g.fields.map((f) => f.id)); if (!isOpen(g.id)) toggleGroup(g.id)"
              >
                Select all
              </button>
              <span class="text-slate-300">·</span>
              <button
                type="button"
                class="shrink-0 text-[10px] font-semibold text-slate-500 hover:underline"
                @click.stop="unselectAllInGroup(g.fields.map((f) => f.id))"
              >
                Unselect all
              </button>
            </div>

            <div v-show="isOpen(g.id)" class="space-y-1 bg-white p-2">
              <label
                v-for="f in g.fields"
                :key="f.id"
                class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  class="rounded border-slate-300 text-teal-700"
                  :checked="local.includes(f.id)"
                  @change="toggle(f.id)"
                />
                <span class="text-[13px] font-medium text-slate-800">{{ f.label }}</span>
                <span v-if="f.defaultVisible" class="ml-auto text-[10px] text-slate-400">Default</span>
                <span
                  v-else-if="g.id === 'au'"
                  class="ml-auto rounded bg-amber-50 px-1.5 text-[9px] font-semibold uppercase tracking-wide text-amber-800"
                >AU</span>
                <span v-else class="ml-auto text-[10px] text-slate-300">Optional</span>
              </label>
            </div>
          </section>
        </div>

        <footer class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            class="text-[12px] font-medium text-slate-600 hover:underline"
            @click="resetDefaults"
          >
            Reset defaults
          </button>
          <button
            type="button"
            class="h-9 rounded-md bg-teal-700 px-4 text-[12px] font-semibold text-white"
            @click="apply"
          >
            Apply columns
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
