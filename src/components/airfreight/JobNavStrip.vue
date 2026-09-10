<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Lock } from '@lucide/vue'
import { displayJobNo } from '@/lib/jobIdentity'
import { cn } from '@/lib/utils'

export type JobNavPage = 'overview' | 'timeline' | 'quote'
export type JobNavGlow = 'timeline' | null

const props = withDefaults(
  defineProps<{
    shipmentId: number | string
    /** Legacy JOB_NO — prefer over shipmentId display */
    jobNo?: string
    current: JobNavPage
    class?: string
    compact?: boolean
    /** Soft teal ● OS on Timeline; pulse when OS is actively suggesting that tab */
    osSuggest?: boolean
    osPulse?: boolean
    /** Soft glow on a tab (e.g. Next Action hover → Timeline) */
    glowTab?: JobNavGlow
  }>(),
  {
    compact: false,
    osSuggest: true,
    osPulse: false,
    glowTab: null,
  },
)

const { t } = useI18n()
const router = useRouter()

const id = computed(() => String(props.shipmentId))

const breadcrumbJobNo = computed(() =>
  props.jobNo?.trim()
    ? props.jobNo.trim()
    : displayJobNo({ shipmentId: props.shipmentId }),
)

const items = computed(() => [
  {
    id: 'overview' as const,
    label: t('nav.pages.overview'),
    hint: t('nav.pages.overviewHint'),
    locked: false,
    go: () => router.push({ name: 'job-context', params: { shipmentId: id.value } }),
  },
  {
    id: 'timeline' as const,
    label: t('nav.pages.timeline'),
    hint: t('nav.pages.timelineHint'),
    locked: false,
    go: () => router.push({ name: 'job-spine', params: { shipmentId: id.value } }),
  },
])

function goDesk() {
  void router.push({ name: 'my-tasks' })
}

function onTabClick(item: (typeof items.value)[number]) {
  if (item.locked) return
  item.go()
}
</script>

<template>
  <nav
    :class="
      cn(
        'overflow-hidden rounded-[10px] border border-border bg-white',
        compact ? 'mb-0' : 'mb-4',
        props.class,
      )
    "
    :aria-label="t('nav.aria')"
  >
    <div class="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-3 py-2">
      <button
        type="button"
        class="rounded-md px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/5"
        :title="t('nav.pages.deskHint')"
        @click="goDesk"
      >
        ← {{ t('nav.pages.desk') }}
      </button>
      <span class="text-zinc-300">/</span>
      <span class="font-mono text-[12px] font-semibold">{{ breadcrumbJobNo }}</span>
      <span class="hidden text-[11px] text-muted-foreground sm:inline">· {{ t('nav.youAreHere') }}</span>
    </div>

    <div class="grid grid-cols-2">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="group relative flex flex-col items-start border-b border-zinc-100 px-3.5 py-3 text-left transition duration-200 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
        :class="[
          current === item.id
            ? 'bg-white text-teal-900'
            : item.locked
              ? 'bg-white text-zinc-400'
              : 'bg-white text-zinc-700 hover:bg-zinc-50/80',
          glowTab === item.id
            ? 'z-[1] bg-primary/10 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.35)]'
            : '',
        ]"
        :title="item.locked ? t('nav.lockedHint') : item.hint"
        :aria-current="current === item.id ? 'page' : undefined"
        :aria-disabled="item.locked || undefined"
        :disabled="item.locked"
        @click="onTabClick(item)"
      >
        <!-- Active / glow underline -->
        <span
          class="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] transition duration-200"
          :class="{
            'bg-primary': current === item.id && glowTab !== item.id,
            'bg-primary shadow-[0_0_10px_rgba(13,148,136,0.55)]': glowTab === item.id,
            'bg-transparent': current !== item.id && glowTab !== item.id,
          }"
        />

        <span class="flex w-full items-center gap-1.5">
          <span
            class="text-[13px] font-semibold tracking-tight"
            :class="{
              'text-teal-900': current === item.id || glowTab === item.id,
              'text-zinc-400': item.locked && current !== item.id,
              'text-zinc-800': !item.locked && current !== item.id && glowTab !== item.id,
            }"
          >
            {{ item.label }}
          </span>

          <!-- Timeline ● OS -->
          <span
            v-if="item.id === 'timeline' && osSuggest"
            class="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-800"
            :class="
              glowTab === 'timeline' || osPulse
                ? 'bg-primary text-white shadow-sm'
                : 'bg-primary/15 text-teal-800'
            "
          >
            <span
              class="inline-block h-1.5 w-1.5 rounded-full"
              :class="
                glowTab === 'timeline' || osPulse
                  ? 'bg-white animate-os-pulse'
                  : 'bg-primary'
              "
            />
            {{ t('nav.osBadge') }}
          </span>

          <Lock
            v-if="item.locked"
            :size="12"
            :stroke-width="2"
            class="shrink-0 text-zinc-400"
            aria-hidden="true"
          />
        </span>

        <span
          class="mt-0.5 text-[10px] leading-snug"
          :class="item.locked ? 'text-zinc-400' : 'text-muted-foreground'"
        >
          {{ item.hint }}
        </span>
      </button>
    </div>
  </nav>
</template>
