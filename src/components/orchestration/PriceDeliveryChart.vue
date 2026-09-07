<script setup lang="ts">
import { computed } from 'vue'
import {
  PRICE_CURVE_POINTS,
  TRANSPORT_MODES,
  type TransportModeId,
  type TransportModeOption,
} from '@/data/orchestrationModes'

const props = defineProps<{
  selectedId: TransportModeId
}>()

const selected = computed(() => TRANSPORT_MODES.find((m) => m.id === props.selectedId)!)

/** Chart box: days 0–32 → x, price 400–2600 → y (inverted). */
const W = 420
const H = 200
const PAD = { l: 44, r: 16, t: 28, b: 36 }

function xOf(days: number) {
  return PAD.l + ((days - 1) / 30) * (W - PAD.l - PAD.r)
}
function yOf(price: number) {
  const min = 400
  const max = 2600
  const t = (price - min) / (max - min)
  return PAD.t + (1 - t) * (H - PAD.t - PAD.b)
}

const pathD = computed(() => {
  const pts = PRICE_CURVE_POINTS.map((p) => `${xOf(p.days)},${yOf(p.price)}`)
  return `M ${pts.join(' L ')}`
})

const selectedPt = computed(() => ({
  x: xOf(selected.value.deliveryDaysMid),
  y: yOf(selected.value.estimatedCost),
}))

const cheapest = computed(() => TRANSPORT_MODES.reduce((a, b) => (a.estimatedCost < b.estimatedCost ? a : b)))
const fastest = computed(() =>
  TRANSPORT_MODES.reduce((a, b) => (a.deliveryDaysMid < b.deliveryDaysMid ? a : b)),
)

function tip(m: TransportModeOption) {
  return `${m.label}: $${m.estimatedCost.toLocaleString()} · ${m.deliveryLabel}`
}
</script>

<template>
  <div class="orch-chart-panel">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-[13px] font-bold text-slate-800">Price vs. Delivery Time</h3>
      <span class="text-[10px] font-medium uppercase tracking-wider text-slate-400">
        AUD · mock bands
      </span>
    </div>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="w-full"
      role="img"
      :aria-label="tip(selected)"
    >
      <!-- grid -->
      <line
        v-for="p in [800, 1400, 2000]"
        :key="p"
        :x1="PAD.l"
        :x2="W - PAD.r"
        :y1="yOf(p)"
        :y2="yOf(p)"
        stroke="#E2E8F0"
        stroke-dasharray="4 4"
      />
      <path :d="pathD" fill="none" stroke="#FDBA74" stroke-width="2.5" stroke-linecap="round" />
      <!-- mode dots -->
      <g v-for="m in TRANSPORT_MODES" :key="m.id">
        <circle
          :cx="xOf(m.deliveryDaysMid)"
          :cy="yOf(m.estimatedCost)"
          :r="m.id === selectedId ? 8 : 4.5"
          :fill="m.id === selectedId ? 'var(--orch-accent)' : '#94A3B8'"
          :stroke="m.id === selectedId ? '#fff' : 'none'"
          :stroke-width="m.id === selectedId ? 2 : 0"
        >
          <title>{{ tip(m) }}</title>
        </circle>
      </g>
      <!-- selected callout -->
      <g :transform="`translate(${selectedPt.x}, ${selectedPt.y - 18})`">
        <rect
          x="-52"
          y="-22"
          width="104"
          height="22"
          rx="6"
          fill="var(--orch-accent)"
        />
        <text
          text-anchor="middle"
          y="-6"
          fill="#fff"
          font-size="10"
          font-weight="700"
          font-family="ui-monospace, monospace"
        >
          ${{ selected.estimatedCost.toLocaleString() }} / {{ selected.deliveryLabel }}
        </text>
      </g>
      <!-- axis labels -->
      <text :x="PAD.l" :y="H - 8" fill="#94A3B8" font-size="9">1–2 Days</text>
      <text :x="W / 2 - 20" :y="H - 8" fill="#94A3B8" font-size="9">5–7 Days</text>
      <text :x="W - PAD.r - 40" :y="H - 8" fill="#94A3B8" font-size="9">15+ Days</text>
      <text :x="8" :y="yOf(2400) + 3" fill="#94A3B8" font-size="9">$2.4k</text>
      <text :x="8" :y="yOf(500) + 3" fill="#94A3B8" font-size="9">$0.5k</text>
      <!-- cheapest / fastest tags -->
      <text
        :x="xOf(cheapest.deliveryDaysMid)"
        :y="yOf(cheapest.estimatedCost) + 18"
        text-anchor="middle"
        fill="#059669"
        font-size="9"
        font-weight="700"
      >
        Cheapest
      </text>
      <text
        :x="xOf(fastest.deliveryDaysMid)"
        :y="yOf(fastest.estimatedCost) - 28"
        text-anchor="middle"
        fill="var(--orch-accent)"
        font-size="9"
        font-weight="700"
      >
        Fastest
      </text>
    </svg>
  </div>
</template>
