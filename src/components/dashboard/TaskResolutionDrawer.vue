<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ExternalLink } from '@lucide/vue'
import CompactTextarea from '@/components/ui/CompactTextarea.vue'
import JobIdentityStrip from '@/components/workbench/JobIdentityStrip.vue'
import ExecutionStickyHeader from '@/components/execution/ExecutionStickyHeader.vue'
import { deskCtaLabel } from '@/lib/actionLabels'
import { mockLegacyRequest } from '@/lib/tableRowActions'
import type { WorkbenchJob } from '@/data/workbench'

const props = defineProps<{
  job: WorkbenchJob | null
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  openJob: [jobId: string]
  toast: [message: string, kind?: 'success' | 'info' | 'warn']
}>()

const note = ref('')
const baselineNote = ref('')
const saving = ref(false)
const submitting = ref(false)

const dirty = computed(() => note.value !== baselineNote.value)

const entityTag = computed(() => {
  if (!props.job) return ''
  return `${props.job.jobType || 'JOB'} · ${props.job.jobNo}`.toUpperCase()
})

watch(
  () => [props.open, props.job?.id] as const,
  () => {
    note.value = ''
    baselineNote.value = ''
  },
)

function requestClose() {
  if (dirty.value && !window.confirm('Unsaved changes — discard and close?')) return
  emit('close')
}

async function saveDraft() {
  if (!props.job || saving.value || submitting.value) return
  saving.value = true
  const result = await mockLegacyRequest(
    { jobId: props.job.jobId, note: note.value, mode: 'draft' as const },
    320,
  )
  saving.value = false
  if (!result.ok) {
    emit('toast', result.message, 'warn')
    return
  }
  baselineNote.value = note.value
  emit('toast', 'Draft saved (legacy PATCH mock)', 'success')
}

async function saveSubmit() {
  if (!props.job || saving.value || submitting.value) return
  if (!note.value.trim()) {
    emit('toast', 'Add a resolution note before Save & Submit', 'warn')
    return
  }
  submitting.value = true
  const result = await mockLegacyRequest(
    {
      jobId: props.job.jobId,
      note: note.value,
      mode: 'submit' as const,
      action: deskCtaLabel(props.job),
    },
    520,
  )
  submitting.value = false
  if (!result.ok) {
    emit('toast', result.message, 'warn')
    return
  }
  baselineNote.value = note.value
  emit('toast', `${deskCtaLabel(props.job)} · submitted to legacy API`, 'success')
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (!props.open) return
  if (e.key === 'Escape') {
    e.preventDefault()
    requestClose()
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    void saveDraft()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && job"
      class="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-[1px]"
      @click="requestClose"
    />
    <aside
      v-if="open && job"
      class="os-task-drawer"
      role="dialog"
      aria-modal="true"
      aria-label="Resolve exception"
    >
      <ExecutionStickyHeader
        :entity-tag="entityTag"
        :title="job.title"
        :dirty="dirty"
        :saving="saving"
        :submitting="submitting"
        @cancel="requestClose"
        @save-draft="saveDraft"
        @save-submit="saveSubmit"
      />

      <div class="min-h-0 flex-1 overflow-y-auto p-4 space-y-4">
        <JobIdentityStrip
          :lob-prefix="job.lobPrefix"
          :job-no="job.jobNo"
          :master-bill="job.masterBill"
          :house-bill="job.houseBill"
        />

        <div>
          <div class="os-micro-label">Exception</div>
          <p class="text-[14px] font-bold text-foreground">{{ job.title }}</p>
          <p class="mt-2 rounded-md border border-border bg-muted/40 p-3 text-[12px] leading-relaxed text-muted-foreground">
            {{ job.why }}
          </p>
        </div>

        <dl class="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <dt class="os-micro-label">Customer</dt>
            <dd class="font-medium text-foreground">{{ job.customer }}</dd>
          </div>
          <div>
            <dt class="os-micro-label">Route</dt>
            <dd class="font-mono text-foreground">{{ job.route }}</dd>
          </div>
          <div>
            <dt class="os-micro-label">Responsible</dt>
            <dd>{{ job.responsible }}</dd>
          </div>
          <div>
            <dt class="os-micro-label">Accountable</dt>
            <dd>{{ job.accountable }}</dd>
          </div>
        </dl>

        <CompactTextarea
          v-model="note"
          label="Resolution note"
          hint="Required for Save & Submit · Cmd/Ctrl+S saves draft"
          :rows="3"
        />
      </div>

      <footer class="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          class="flex h-8 items-center gap-1 rounded-md border border-border px-3 text-[12px] font-medium hover:bg-muted"
          @click="emit('openJob', job.jobId)"
        >
          Open job
          <ExternalLink :size="12" />
        </button>
        <span class="flex-1 text-[10px] text-muted-foreground">Esc closes · Cmd/Ctrl+S draft</span>
      </footer>
    </aside>
  </Teleport>
</template>

<style scoped>
.os-task-drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 61;
  display: flex;
  flex-direction: column;
  width: min(800px, 100vw);
  height: 100vh;
  border-left: 1px solid var(--color-border);
  background: var(--color-card);
  box-shadow: -8px 0 32px rgb(15 23 42 / 0.12);
}
</style>
