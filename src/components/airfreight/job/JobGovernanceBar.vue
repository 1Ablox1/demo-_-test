<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  ArrowRight,
  Clock3,
  Lock,
  MapPin,
  TriangleAlert,
  UserCheck,
} from '@lucide/vue'
import type { JobOwnershipStrip } from '@/lib/jobOwnership'
import { Badge } from '@/components/ui/badge'

defineProps<{
  strip: JobOwnershipStrip
}>()

const { t } = useI18n()
</script>

<template>
  <div
    class="flex min-h-11 shrink-0 flex-wrap items-stretch gap-y-2 border-b border-border bg-muted/40 px-4 py-1.5 sm:px-6"
  >
    <!-- Current node -->
    <div class="flex min-w-[140px] flex-[1.1] items-center gap-1.5 pr-3">
      <MapPin :size="13" :stroke-width="1.75" class="shrink-0 text-primary" aria-hidden="true" />
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {{ t('jobShell.ownership.currentNode') }}
        </div>
        <div class="truncate text-xs font-medium text-foreground">{{ strip.currentNode }}</div>
      </div>
    </div>

    <div class="mx-1 hidden h-6 w-px shrink-0 self-center bg-border sm:block" />

    <!-- Handled by (R) -->
    <div class="flex min-w-[130px] flex-1 items-center gap-1.5 pr-3">
      <UserCheck :size="13" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {{ t('jobShell.ownership.handledBy') }}
        </div>
        <div class="flex min-w-0 items-center gap-1">
          <Badge variant="raciR" class="h-4 w-4 justify-center rounded px-0 text-[9px]">R</Badge>
          <span class="truncate text-xs font-medium text-foreground" :title="strip.handledBy.seat">
            {{ strip.handledBy.name }}
          </span>
          <span class="hidden truncate text-[10px] text-muted-foreground lg:inline">
            · {{ strip.handledBy.seat }}
          </span>
        </div>
      </div>
    </div>

    <div class="mx-1 hidden h-6 w-px shrink-0 self-center bg-border sm:block" />

    <!-- Approve (A) — amber when open -->
    <div class="flex min-w-[130px] flex-1 items-center gap-1.5 pr-3">
      <Lock
        :size="13"
        :stroke-width="1.75"
        class="shrink-0"
        :class="strip.approve ? 'text-amber-600' : 'text-muted-foreground'"
        aria-hidden="true"
      />
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {{ t('jobShell.ownership.approve') }}
        </div>
        <div v-if="strip.approve" class="flex min-w-0 items-center gap-1">
          <Badge variant="raciA" class="h-4 w-4 justify-center rounded px-0 text-[9px]">A</Badge>
          <span
            class="truncate text-xs font-semibold text-amber-800 dark:text-amber-200"
            :title="strip.approve.seat"
          >
            {{ strip.approve.name }}
          </span>
          <span class="hidden truncate text-[10px] text-muted-foreground lg:inline">
            · {{ strip.approve.seat }}
          </span>
        </div>
        <div v-else class="text-xs font-medium text-emerald-700">
          {{ t('jobShell.ownership.approveNone') }}
        </div>
      </div>
    </div>

    <div class="mx-1 hidden h-6 w-px shrink-0 self-center bg-border sm:block" />

    <!-- Waiting on -->
    <div class="flex min-w-[140px] flex-[1.15] items-center gap-1.5 pr-3">
      <TriangleAlert
        :size="13"
        :stroke-width="1.75"
        class="shrink-0"
        :class="strip.waitingOn ? 'text-amber-500' : 'text-muted-foreground'"
        aria-hidden="true"
      />
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {{ t('jobShell.ownership.waitingOn') }}
        </div>
        <div
          v-if="strip.waitingOn"
          class="truncate text-xs font-semibold text-amber-800 dark:text-amber-200"
          :title="strip.waitingOn"
        >
          {{ strip.waitingOn }}
        </div>
        <div v-else class="text-xs font-medium text-emerald-700">
          {{ t('jobShell.ownership.waitingNone') }}
        </div>
      </div>
    </div>

    <div class="mx-1 hidden h-6 w-px shrink-0 self-center bg-border sm:block" />

    <!-- Then next -->
    <div class="flex min-w-[150px] flex-[1.2] items-center gap-1.5 pr-3">
      <ArrowRight :size="13" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
      <div class="min-w-0">
        <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
          {{ t('jobShell.ownership.thenNext') }}
        </div>
        <template v-if="strip.thenNext">
          <div class="truncate text-xs font-medium text-foreground" :title="strip.thenNext.taskTitle">
            {{ strip.thenNext.taskTitle }}
          </div>
          <div class="flex min-w-0 items-center gap-1 text-[10px] text-muted-foreground">
            <Badge
              :variant="strip.thenNext.mark === 'A' ? 'raciA' : 'raciR'"
              class="h-3.5 w-3.5 justify-center rounded px-0 text-[8px]"
            >
              {{ strip.thenNext.mark }}
            </Badge>
            <span class="truncate">
              {{ strip.thenNext.name ?? strip.thenNext.seat }}
              <span v-if="strip.thenNext.name"> · {{ strip.thenNext.seat }}</span>
            </span>
          </div>
        </template>
        <div v-else class="text-xs font-medium text-muted-foreground">
          {{ t('jobShell.ownership.thenNextNone') }}
        </div>
      </div>
    </div>

    <!-- Last action (optional, wide screens) -->
    <template v-if="strip.lastAction">
      <div class="mx-1 hidden h-6 w-px shrink-0 self-center bg-border xl:block" />
      <div class="hidden min-w-[120px] flex-1 items-center gap-1.5 xl:flex">
        <Clock3 :size="13" :stroke-width="1.75" class="shrink-0 text-muted-foreground" aria-hidden="true" />
        <div class="min-w-0">
          <div class="text-[9px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {{ t('jobShell.ownership.lastAction') }}
          </div>
          <div class="truncate text-xs text-muted-foreground" :title="strip.lastAction">
            {{ strip.lastAction }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
