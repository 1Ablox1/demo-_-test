<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Search } from '@lucide/vue'
import { useShellJobStore } from '@/stores/shellJob'
import { useFreightStore } from '@/stores/freight'
import { airFromLobCode } from '@/lib/airWorkspace'
import type { LobCode } from '@/lib/lob'

const emit = defineEmits<{ close: [] }>()
const router = useRouter()
const jobStore = useShellJobStore()
const freight = useFreightStore()
const q = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

type Hit = {
  id: string
  jobNo: string
  lob: string
  customer: string
  hawb: string
  mawb: string
  bookingRef?: string
}

const results = computed((): Hit[] => {
  const needle = q.value.trim().toLowerCase()
  const fromFreight: Hit[] = freight.shipments.map((s) => ({
    id: s.id,
    jobNo: s.jobNo,
    lob: s.lob,
    customer: s.customer,
    hawb: s.hawb,
    mawb: s.mawb,
    bookingRef: s.bookingRef,
  }))
  const fromJobs: Hit[] = Object.values(jobStore.JOBS).map((j) => ({
    id: j.id,
    jobNo: j.jobNo,
    lob: j.lob,
    customer: j.customer,
    hawb: j.hawb,
    mawb: '',
  }))
  const byId = new Map<string, Hit>()
  for (const h of [...fromFreight, ...fromJobs]) {
    if (!byId.has(h.id)) byId.set(h.id, h)
  }
  const all = [...byId.values()]
  if (!needle) return all.slice(0, 8)
  return all
    .filter(
      (j) =>
        j.jobNo.toLowerCase().includes(needle) ||
        j.lob.replace('_', ' ').includes(needle) ||
        j.hawb.toLowerCase().includes(needle) ||
        j.mawb.toLowerCase().includes(needle) ||
        (j.bookingRef ?? '').toLowerCase().includes(needle) ||
        j.customer.toLowerCase().includes(needle),
    )
    .slice(0, 12)
})

function go(hit: Hit) {
  emit('close')
  const air = airFromLobCode(hit.lob as LobCode)
  void router.push({
    name: 'shipment',
    params: { shipmentId: hit.id },
    query: air ? { lob: air } : {},
  })
}

onMounted(() => inputRef.value?.focus())
</script>

<template>
  <div
    class="fixed inset-0 z-[300] flex items-start justify-center bg-black/35 pt-[12vh]"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-xl overflow-hidden rounded-[10px] border border-border bg-white shadow-2xl">
      <div class="flex items-center gap-2 border-b border-border px-4 py-3">
        <Search :size="16" :stroke-width="1.75" class="shrink-0 text-muted-foreground" />
        <input
          ref="inputRef"
          v-model="q"
          class="flex-1 border-0 text-[14px] outline-none"
          placeholder="Jump to Job No, Booking Ref, HAWB, MAWB, customer…"
          @keydown.esc="emit('close')"
        />
        <kbd class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
        <kbd class="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          Esc
        </kbd>
      </div>
      <div class="max-h-72 overflow-y-auto p-2">
        <button
          v-for="j in results"
          :key="j.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-primary-tint"
          @click="go(j)"
        >
          <span class="font-mono text-[12px] font-semibold text-foreground">{{ j.jobNo }}</span>
          <span
            v-if="j.bookingRef"
            class="font-mono text-[10px] font-semibold text-teal-800"
          >
            {{ j.bookingRef }}
          </span>
          <span
            class="rounded border border-border px-1 py-px text-[9px] font-semibold uppercase text-muted-foreground"
          >
            {{ j.lob.replace('_', ' ') }}
          </span>
          <span class="truncate text-[12px] text-muted-foreground">{{ j.customer }}</span>
          <span class="ml-auto font-mono text-[11px] text-muted-foreground">{{ j.hawb || j.mawb || '—' }}</span>
        </button>
        <p v-if="!results.length" class="px-3 py-6 text-center text-[13px] text-muted-foreground">
          No matches
        </p>
      </div>
    </div>
  </div>
</template>
