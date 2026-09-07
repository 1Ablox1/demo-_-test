<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { FileText, X } from '@lucide/vue'
import BookingIcon from '@/components/icons/BookingIcon.vue'
import { BOOKING_QUOTES } from '@/data/bookingQuotes'
import {
  BOOKING_LOB_CATALOG,
  filterBookingLobs,
  groupBookingLobs,
  type BookingLobOption,
} from '@/data/bookingLobCatalog'
import { airLabel, isAirDirection } from '@/lib/airWorkspace'
import type {
  BookingEntryPath,
  BookingFileStructure,
} from '@/types/bookingWizard'
import type { SpineLobPrefix } from '@/types/spineLob'

export interface StartBookingResult {
  entryPath: BookingEntryPath
  lobPrefix: SpineLobPrefix
  structure: BookingFileStructure
  quoteId: string | null
  lobCode: string
}

export interface StartBookingPrefills {
  entryPath?: BookingEntryPath
  lobPrefix?: SpineLobPrefix
}

const props = defineProps<{
  open: boolean
  prefills?: StartBookingPrefills | null
}>()
const emit = defineEmits<{
  close: []
  start: [result: StartBookingResult]
}>()

const phase = ref<1 | 2 | 3>(1)
const entryPath = ref<BookingEntryPath | ''>('')
const quoteId = ref<string | null>(null)
const lobQuery = ref('')
const selectedLob = ref<BookingLobOption | null>(null)
const structure = ref<BookingFileStructure>('direct')

/** Mode already set by Air Import / Air Export workspace — skip mode pick. */
const lobLocked = computed(() => !!props.prefills?.lobPrefix)

const lockedAirLabel = computed(() => {
  const p = props.prefills?.lobPrefix
  if (p && isAirDirection(p)) return airLabel(p)
  return props.prefills?.lobPrefix ?? ''
})

const quotesForContext = computed(() => {
  const locked = props.prefills?.lobPrefix
  if (!locked) return BOOKING_QUOTES
  return BOOKING_QUOTES.filter((q) => q.lobPrefix === locked)
})

const lobGroups = computed(() => {
  if (lobLocked.value) return []
  return groupBookingLobs(filterBookingLobs(lobQuery.value))
})

const stepLabels = computed(() => {
  if (lobLocked.value) {
    return entryPath.value === 'from_quote'
      ? (['Intent', 'Quote', 'Structure'] as const)
      : (['Intent', 'Structure'] as const)
  }
  return ['Intent', 'Mode', 'Structure'] as const
})

function resolveLob(prefix?: SpineLobPrefix): BookingLobOption | null {
  if (!prefix) return null
  return BOOKING_LOB_CATALOG.find((l) => l.prefix === prefix && l.spineReady) ?? null
}

function applyPrefills() {
  phase.value = 1
  entryPath.value = ''
  quoteId.value = null
  lobQuery.value = ''
  selectedLob.value = null
  structure.value = 'direct'

  const p = props.prefills
  if (!p) return

  if (p.lobPrefix) {
    selectedLob.value = resolveLob(p.lobPrefix)
  }

  if (p.entryPath) {
    entryPath.value = p.entryPath
    advanceAfterIntent()
  }
}

/** After intent is known: skip Mode when LOB is workspace-locked. */
function advanceAfterIntent() {
  if (!entryPath.value) return

  if (lobLocked.value && selectedLob.value) {
    if (entryPath.value === 'from_quote') {
      const match = quotesForContext.value.find((q) => q.lobPrefix === selectedLob.value!.prefix)
      quoteId.value = match?.id ?? null
      phase.value = 2
      return
    }
    phase.value = 3
    return
  }

  phase.value = 2
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    applyPrefills()
  },
)

watch(entryPath, (p) => {
  if (p === 'direct') quoteId.value = null
})

function close() {
  emit('close')
}

function pickPath(path: BookingEntryPath) {
  entryPath.value = path
  if (lobLocked.value && !selectedLob.value) {
    selectedLob.value = resolveLob(props.prefills?.lobPrefix)
  }
  advanceAfterIntent()
}

function pickLob(lob: BookingLobOption) {
  if (!lob.spineReady || lobLocked.value) return
  selectedLob.value = lob
  if (entryPath.value === 'from_quote') {
    const match = BOOKING_QUOTES.find((q) => q.lobPrefix === lob.prefix)
    quoteId.value = match?.id ?? null
  }
}

function goStructure() {
  if (!selectedLob.value) return
  if (entryPath.value === 'from_quote' && !quoteId.value) return
  phase.value = 3
}

function goBack() {
  if (phase.value === 1) {
    close()
    return
  }
  if (lobLocked.value) {
    if (phase.value === 3 && entryPath.value === 'direct') {
      phase.value = 1
      return
    }
    if (phase.value === 3 && entryPath.value === 'from_quote') {
      phase.value = 2
      return
    }
    if (phase.value === 2) {
      phase.value = 1
      return
    }
  }
  phase.value = (phase.value - 1) as 1 | 2 | 3
}

function submit() {
  if (!entryPath.value || !selectedLob.value) return
  if (entryPath.value === 'from_quote' && !quoteId.value) return
  emit('start', {
    entryPath: entryPath.value,
    lobPrefix: selectedLob.value.prefix,
    structure: structure.value,
    quoteId: entryPath.value === 'from_quote' ? quoteId.value : null,
    lobCode: selectedLob.value.code,
  })
}

function phaseChipActive(index: number): boolean {
  if (lobLocked.value && entryPath.value !== 'from_quote') {
    // Intent (0) · Structure (1) — map phase 1→0, phase 3→1
    if (index === 0) return phase.value >= 1
    return phase.value >= 3
  }
  return phase.value >= index + 1
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      @click.self="close"
    >
      <div
        class="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-booking-title"
      >
        <header class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 id="start-booking-title" class="text-[15px] font-bold text-slate-900">
              Start booking
              <span v-if="lobLocked" class="ml-1.5 font-mono text-[12px] font-semibold text-teal-700">
                · {{ lockedAirLabel || prefills?.lobPrefix }}
              </span>
            </h2>
            <p class="mt-0.5 text-[12px] text-slate-500">
              <template v-if="lobLocked">
                Mode is fixed by this workspace — pick intent and file structure only.
              </template>
              <template v-else>
                One create path — intent → mode → structure → wizard
              </template>
            </p>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
            @click="close"
          >
            <X :size="18" />
          </button>
        </header>

        <div class="flex items-center gap-2 border-b border-slate-100 px-5 py-2.5 text-[11px] font-semibold">
          <template v-for="(label, index) in stepLabels" :key="label">
            <span v-if="index > 0" class="text-slate-300">/</span>
            <span :class="phaseChipActive(index) ? 'text-slate-800' : 'text-slate-400'">
              {{ index + 1 }} {{ label }}
            </span>
          </template>
        </div>

        <div class="flex-1 overflow-y-auto p-5">
          <!-- Phase 1: Quote vs Direct -->
          <div v-if="phase === 1" class="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              class="flex flex-col rounded-xl border p-4 text-left transition hover:border-slate-400"
              :class="
                entryPath === 'from_quote'
                  ? 'border-slate-800 bg-slate-50'
                  : 'border-slate-200'
              "
              @click="pickPath('from_quote')"
            >
              <FileText :size="20" class="mb-2 text-slate-800" />
              <span class="text-[14px] font-bold text-slate-900">From quote</span>
              <span class="mt-1 text-[12px] leading-relaxed text-slate-500">
                Convert an accepted offer. Parties, route, and sell rates inherit into the job.
              </span>
            </button>
            <button
              type="button"
              class="flex flex-col rounded-xl border p-4 text-left transition hover:border-slate-400"
              :class="
                entryPath === 'direct' ? 'border-slate-800 bg-slate-50' : 'border-slate-200'
              "
              @click="pickPath('direct')"
            >
              <BookingIcon :size="20" tone="dark" class="mb-2" />
              <span class="text-[14px] font-bold text-slate-900">Direct booking</span>
              <span class="mt-1 text-[12px] leading-relaxed text-slate-500">
                Skip commercial quote. Open an operational file with charge templates for this mode.
              </span>
            </button>
          </div>

          <!-- Phase 2: quotes only (air locked) OR mode (+ quote) when unlocked -->
          <div v-else-if="phase === 2" class="space-y-4">
            <div v-if="entryPath === 'from_quote'">
              <label class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Select quote
                <span v-if="lobLocked" class="ml-1 font-semibold normal-case tracking-normal text-teal-700">
                  ({{ lockedAirLabel || prefills?.lobPrefix }} only)
                </span>
              </label>
              <div class="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-slate-100 p-1">
                <button
                  v-for="q in quotesForContext"
                  :key="q.id"
                  type="button"
                  class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-[12px] transition"
                  :class="
                    quoteId === q.id
                      ? 'border-slate-800 bg-slate-50'
                      : 'border-transparent hover:bg-slate-50'
                  "
                  @click="
                    quoteId = q.id;
                    if (!lobLocked) {
                      selectedLob =
                        filterBookingLobs(q.lobPrefix).find((l) => l.prefix === q.lobPrefix && l.spineReady) ??
                        null
                    }
                  "
                >
                  <span>
                    <span class="font-mono font-bold text-slate-800">{{ q.quoteNo }}</span>
                    <span class="ml-2 text-slate-600">{{ q.customer }}</span>
                  </span>
                  <span class="font-mono text-[11px] text-slate-400">{{ q.route }}</span>
                </button>
                <p
                  v-if="!quotesForContext.length"
                  class="px-3 py-6 text-center text-[12px] text-slate-400"
                >
                  No quotes for this mode.
                </p>
              </div>
            </div>

            <!-- Mode picker — only when not already in an Air workspace -->
            <div v-if="!lobLocked">
              <label class="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Mode
              </label>
              <input
                v-model="lobQuery"
                type="search"
                placeholder="Search mode — air, ocean, rail, parcel…"
                class="mb-3 h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-slate-500"
              />
              <div class="max-h-56 space-y-3 overflow-y-auto">
                <div v-for="g in lobGroups" :key="g.mode">
                  <div class="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {{ g.mode }}
                  </div>
                  <div class="space-y-1">
                    <button
                      v-for="lob in g.items"
                      :key="lob.code"
                      type="button"
                      class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition"
                      :class="[
                        !lob.spineReady
                          ? 'cursor-not-allowed border-slate-100 opacity-45'
                          : selectedLob?.code === lob.code
                            ? 'border-slate-800 bg-slate-50'
                            : 'border-slate-200 hover:bg-slate-50',
                      ]"
                      :disabled="!lob.spineReady"
                      @click="pickLob(lob)"
                    >
                      <span class="flex items-center gap-2">
                        <span
                          class="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold"
                          >{{ lob.code }}</span
                        >
                        <span class="text-[13px] font-medium text-slate-800">{{ lob.label }}</span>
                      </span>
                      <span
                        v-if="!lob.spineReady"
                        class="text-[10px] font-semibold text-slate-400"
                        >Soon</span
                      >
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Phase 3: Structure -->
          <div v-else class="space-y-3">
            <p v-if="lobLocked && selectedLob" class="rounded-lg border border-teal-100 bg-teal-50/80 px-3 py-2 text-[12px] text-teal-900">
              Booking as
              <span class="font-mono font-bold">{{ selectedLob.code }}</span>
              · {{ selectedLob.label }}
              <span class="text-teal-700"> (from workspace)</span>
            </p>
            <p class="text-[13px] text-slate-500">
              Same as CargoWise operate type — this decides whether a Consolidation step appears.
            </p>
            <label
              v-for="opt in [
                {
                  value: 'direct' as const,
                  title: 'Direct',
                  desc: 'One file holds both master & house refs. Consol later via Split on Shipments.',
                },
                {
                  value: 'console' as const,
                  title: 'Consolidation',
                  desc: 'Master MBL + multiple houses. Houses inherit MBL / flight from master.',
                },
                {
                  value: 'back_to_back' as const,
                  title: 'Back-to-back',
                  desc: 'Master + exactly one house — agent-style cover.',
                },
              ]"
              :key="opt.value"
              class="flex cursor-pointer flex-col rounded-xl border p-3 transition"
              :class="
                structure === opt.value
                  ? 'border-slate-800 bg-slate-50'
                  : 'border-slate-200 hover:bg-slate-50'
              "
            >
              <div class="flex items-center gap-2">
                <input v-model="structure" type="radio" :value="opt.value" class="text-slate-800" />
                <span class="text-[13px] font-bold text-slate-900">{{ opt.title }}</span>
              </div>
              <span class="ml-5 mt-1 text-[12px] text-slate-500">{{ opt.desc }}</span>
            </label>
          </div>
        </div>

        <footer class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            class="h-8 rounded-md px-3 text-[12px] font-medium text-slate-500 hover:text-slate-800"
            @click="goBack"
          >
            {{ phase > 1 ? 'Back' : 'Cancel' }}
          </button>
          <button
            v-if="phase === 2"
            type="button"
            class="h-8 rounded-md bg-slate-800 px-4 text-[12px] font-bold text-white disabled:opacity-40"
            :disabled="
              !selectedLob || (entryPath === 'from_quote' && !quoteId)
            "
            @click="goStructure"
          >
            Continue
          </button>
          <button
            v-else-if="phase === 3"
            type="button"
            class="h-8 rounded-md bg-slate-800 px-4 text-[12px] font-bold text-white"
            @click="submit"
          >
            Open wizard
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>
