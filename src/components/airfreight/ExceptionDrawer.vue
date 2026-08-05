<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ActingRole, HoldType } from '@/api/types'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    role: ActingRole
    shipmentId?: string
    /** Freight hold type — defaults to customs */
    holdType?: HoldType
  }>(),
  { holdType: 'customs' },
)

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

/** Internal engine code — tooltip only, never primary UI */
const INTERNAL_BLOCK = 'GATE_OPEN'

const canAct = computed(() => props.role === 'operations' || props.role === 'finance')

const holdLabel = computed(() => t(`exception.holdType.${props.holdType}`))

const primaryAction = computed(() => {
  if (props.holdType === 'customs') return t('exception.markCustomsFiled')
  return t('exception.clearHold')
})

const checklists: Record<HoldType, { item: string; met: boolean }[]> = {
  customs: [
    { item: 'AWB issued and confirmed', met: true },
    { item: 'Commercial invoice uploaded', met: true },
    { item: 'Packing list uploaded', met: true },
    { item: 'Customs declaration filed', met: false },
    { item: 'Certificate of Origin provided', met: false },
  ],
  docs: [
    { item: 'Booking confirmation on file', met: true },
    { item: 'Commercial invoice uploaded', met: true },
    { item: 'Packing list uploaded', met: false },
    { item: 'Certificate of Origin provided', met: false },
  ],
  invoice: [
    { item: 'Charges entered', met: true },
    { item: 'Cost lines matched', met: true },
    { item: 'Finance approval on charges', met: false },
    { item: 'Invoice draft ready', met: false },
  ],
}

const checklist = computed(() => checklists[props.holdType])
</script>

<template>
  <Teleport to="body">
    <template v-if="open">
      <div class="fixed inset-0 z-[200] bg-black/10" @click="emit('close')" />
      <aside
        class="fixed bottom-0 right-0 top-[52px] z-[201] flex w-[400px] flex-col overflow-y-auto border-l border-border bg-white shadow-[-4px_0_28px_rgba(0,0,0,0.08)]"
      >
        <div class="flex shrink-0 items-start justify-between border-b border-border px-5 py-4">
          <div>
            <div class="text-sm font-semibold" :title="INTERNAL_BLOCK">
              {{ holdLabel }}
            </div>
            <div class="mt-0.5 text-xs text-muted-foreground">
              {{ t('myTasks.fields.jobNo') }}
              <span class="font-mono">AF-{{ shipmentId ?? '—' }}</span>
            </div>
          </div>
          <button
            type="button"
            class="text-xl leading-none text-muted-foreground"
            @click="emit('close')"
          >
            ×
          </button>
        </div>

        <div class="flex-1 px-5 py-4">
          <div
            v-if="!canAct"
            class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5"
          >
            <div class="text-[13px] font-semibold text-amber-900">
              {{ t('exception.cannotAct', { role: t(`myTasks.roles.${role}`), hold: holdLabel }) }}
            </div>
            <div class="mt-1 text-xs leading-relaxed text-amber-700">
              {{ t('exception.needsOpsOrFinance') }}
            </div>
          </div>

          <div class="mb-4 flex items-center gap-2">
            <Badge variant="gate" :title="INTERNAL_BLOCK">{{ holdLabel }}</Badge>
          </div>

          <div class="mb-5">
            <div class="mb-2.5 text-[11px] font-semibold tracking-wide text-zinc-700">
              {{ t('exception.checklist') }}
            </div>
            <div
              v-for="(c, i) in checklist"
              :key="i"
              class="flex items-center gap-2 border-b border-zinc-50 py-1.5 text-xs"
            >
              <span :class="c.met ? 'text-emerald-600' : 'text-zinc-300'">{{
                c.met ? '✓' : '○'
              }}</span>
              <span :class="c.met ? 'text-zinc-700' : 'font-medium text-amber-600'">{{
                c.item
              }}</span>
            </div>
          </div>

          <div class="mb-4 rounded-lg border border-border bg-zinc-50 px-3.5 py-3">
            <div class="mb-2.5 text-[10px] font-semibold tracking-wide text-muted-foreground">
              {{ t('exception.holdOwner') }}
            </div>
            <div class="flex items-center gap-2.5">
              <Badge variant="raciA" class="h-[22px] w-[22px] justify-center px-0">A</Badge>
              <div>
                <div class="text-[13px] font-semibold">S. Chen</div>
                <div class="text-[11px] text-muted-foreground">Senior Operations Manager</div>
              </div>
            </div>
          </div>

          <p class="text-[13px] leading-relaxed text-zinc-700">
            <span class="font-semibold">{{ t('exception.suggested') }}: </span>
            {{ t(`exception.suggestedBody.${holdType}`) }}
          </p>
        </div>

        <div class="flex shrink-0 gap-2 border-t border-border px-5 py-3.5">
          <Button variant="outline" @click="emit('close')">{{ t('exception.close') }}</Button>
          <Button v-if="canAct" @click="emit('close')">{{ primaryAction }}</Button>
          <Button v-else variant="ghost" @click="emit('close')">{{ t('exception.notify') }}</Button>
        </div>
      </aside>
    </template>
  </Teleport>
</template>
