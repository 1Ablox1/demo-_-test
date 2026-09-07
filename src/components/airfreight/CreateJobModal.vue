<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSeatPermissions } from '@/composables/useSeatPermissions'
import {
  CREATE_JOB_LOB_OPTIONS,
  EXECUTION_TYPE_OPTIONS,
  routeForCreateJob,
  type CreateJobLobPrefix,
  type CreateJobRouteTarget,
  type ExecutionType,
} from '@/lib/createJobIntent'

const props = defineProps<{ open: boolean }>()

const emit = defineEmits<{
  close: []
  submit: [target: CreateJobRouteTarget]
}>()

const { t } = useI18n()
const { canCreateQuote, canInitializeBooking } = useSeatPermissions()

const executionOptions = computed(() =>
  EXECUTION_TYPE_OPTIONS.filter((type) => {
    if (type.value === 'quote') return canCreateQuote.value
    if (type.value === 'booking') return canInitializeBooking.value
    return false
  }),
)

const selectedType = ref<ExecutionType | ''>('')
const selectedLob = ref<CreateJobLobPrefix | ''>('')

const submitLabel = computed(() => {
  if (selectedType.value === 'quote') return t('createJob.submitQuote')
  if (selectedType.value === 'booking') return t('createJob.submitBooking')
  return t('createJob.submitContinue')
})

watch(
  () => props.open,
  (open) => {
    if (!open) {
      selectedType.value = ''
      selectedLob.value = ''
      return
    }
    selectedType.value = canCreateQuote.value ? 'quote' : 'booking'
    selectedLob.value = 'AI'
  },
)

function onOpenChange(v: boolean) {
  if (!v) emit('close')
}

function handleSubmit() {
  if (!selectedType.value || !selectedLob.value) return
  emit(
    'submit',
    routeForCreateJob({
      executionType: selectedType.value,
      lobPrefix: selectedLob.value,
    }),
  )
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <DialogContent
      class="flex max-h-[min(90vh,720px)] w-[min(92vw,672px)] max-w-2xl flex-col gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 shadow-xl sm:max-w-2xl"
      :show-close-button="false"
    >
      <header class="flex shrink-0 items-start justify-between gap-4 border-b border-border bg-muted/40 px-5 py-4">
        <div class="min-w-0 flex-1 pr-2">
          <DialogTitle class="text-[15px] font-bold leading-snug tracking-tight">
            {{ t('createJob.title') }}
          </DialogTitle>
          <DialogDescription class="mt-1 text-[12px] leading-relaxed">
            {{ t('createJob.subtitle') }}
          </DialogDescription>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          class="shrink-0 text-muted-foreground hover:text-foreground"
          :aria-label="t('createJob.cancel')"
          @click="emit('close')"
        >
          <X :size="18" />
        </Button>
      </header>

      <div class="flex min-h-0 flex-1 flex-col md:flex-row">
        <section class="flex min-h-0 flex-1 flex-col border-b border-border p-5 md:border-b-0 md:border-r md:p-6">
          <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {{ t('createJob.stepExecution') }}
          </p>
          <div class="flex min-h-0 flex-1 flex-col gap-2">
            <label
              v-for="type in executionOptions"
              :key="type.value"
              class="flex flex-1 cursor-pointer flex-col rounded-lg border p-3 transition-colors"
              :class="
                selectedType === type.value
                  ? 'border-primary bg-primary-tint/40'
                  : 'border-border hover:bg-muted/50'
              "
            >
              <div class="flex items-center gap-2">
                <input
                  v-model="selectedType"
                  type="radio"
                  :value="type.value"
                  class="size-3.5 shrink-0 accent-primary"
                />
                <span class="text-[13px] font-bold text-foreground">{{ type.label }}</span>
              </div>
              <span class="ml-[22px] mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {{ type.desc }}
              </span>
            </label>
          </div>
        </section>

        <section class="flex min-h-0 flex-1 flex-col p-5 md:p-6">
          <p class="mb-3 text-[10px] font-bold uppercase tracking-[0.07em] text-muted-foreground">
            {{ t('createJob.stepLob') }}
          </p>
          <div class="flex flex-col gap-1.5">
            <label
              v-for="lob in CREATE_JOB_LOB_OPTIONS"
              :key="lob.prefix"
              class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
              :class="
                selectedLob === lob.prefix
                  ? 'border-primary bg-primary-tint/40'
                  : 'border-border hover:bg-muted/50'
              "
            >
              <input
                v-model="selectedLob"
                type="radio"
                :value="lob.prefix"
                class="size-3.5 shrink-0 accent-primary"
              />
              <span
                class="shrink-0 rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-foreground"
              >
                {{ lob.prefix }}
              </span>
              <span class="min-w-0 flex-1 text-[13px] font-medium text-foreground">
                {{ lob.label }}
              </span>
            </label>
          </div>
        </section>
      </div>

      <footer class="flex shrink-0 justify-end gap-2 border-t border-border bg-muted/40 px-4 py-3">
        <Button type="button" variant="ghost" size="sm" class="text-muted-foreground" @click="emit('close')">
          {{ t('createJob.cancel') }}
        </Button>
        <Button
          type="button"
          size="sm"
          class="font-bold"
          :disabled="!selectedType || !selectedLob"
          @click="handleSubmit"
        >
          {{ submitLabel }}
        </Button>
      </footer>
    </DialogContent>
  </Dialog>
</template>
