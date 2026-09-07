import { computed, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MilestoneId } from '@/os/types'
import type { OsGate, OsTask } from '@/os/types'
import { useAllowedActions } from '@/composables/useAllowedActions'
import {
  canApproveChargesOnJob,
  canConvertQuoteToBooking,
  canCreateQuote,
  canAccrueCharges,
  canEditOperationalJob,
  canEditQuoteForm,
  canInitializeBooking,
  canIssueInvoice,
  canOpenCreateJobModal,
  canSendQuote,
  isJobWorkspaceReadOnly,
  isSalesHandoffReadOnly,
  isQuoteReadOnlySeat,
  readOnlySeatLabel,
  type LifecyclePermissionContext,
} from '@/lib/rolePermissions'
import { useAdminConfigStore } from '@/stores/adminConfig'
import { useTasksStore } from '@/stores/tasks'

function lifecycleCtx(
  milestone: MilestoneId,
  tasks: OsTask[],
  gates?: OsGate[],
): LifecyclePermissionContext {
  return { milestoneId: milestone, tasks, gates }
}

/** Acting-seat permissions — desk + create flows (no job context). */
export function useSeatPermissions() {
  const tasks = useTasksStore()
  const admin = useAdminConfigStore()
  const { locale } = useI18n()

  const role = computed(() => tasks.role)
  const localeKey = computed(() => (locale.value.startsWith('zh') ? 'zh' : 'en') as 'en' | 'zh')
  const enforce = computed(() => admin.raciEnforce)

  return {
    role,
    raciEnforce: enforce,
    canCreateQuote: computed(() => canCreateQuote(role.value)),
    canConvertQuote: computed(() => canConvertQuoteToBooking(role.value)),
    canInitializeBooking: computed(() => canInitializeBooking(role.value)),
    canOpenCreateJob: computed(() => canOpenCreateJobModal(role.value)),
    canEditQuote: computed(() => canEditQuoteForm(role.value)),
    canSendQuote: computed(() => canSendQuote(role.value)),
    isQuoteReadOnly: computed(() => isQuoteReadOnlySeat(role.value)),
    readOnlyLabel: computed(() => readOnlySeatLabel(role.value, localeKey.value, 'quote')),
    canApproveCharges: computed(() => canApproveChargesOnJob(role.value)),
    canIssueInvoice: computed(() => canIssueInvoice(role.value)),
  }
}

/** Job-scoped permissions — control-plane allowedActions first, raciCompiler fallback. */
export function useJobPermissions(options: {
  milestone: Ref<MilestoneId | null | undefined>
  tasks: Ref<OsTask[] | undefined>
  gates?: Ref<OsGate[] | undefined>
}) {
  const tasksStore = useTasksStore()
  const admin = useAdminConfigStore()
  const allowed = useAllowedActions()
  const { locale } = useI18n()

  const role = computed(() => tasksStore.role)
  const milestone = computed(() => options.milestone.value ?? 'quote')
  const taskList = computed(() => options.tasks.value ?? [])
  const gateList = computed(() => options.gates?.value ?? [])
  const localeKey = computed(() => (locale.value.startsWith('zh') ? 'zh' : 'en') as 'en' | 'zh')

  const ctx = computed(() => lifecycleCtx(milestone.value, taskList.value, gateList.value))

  function gate(capability: boolean): boolean {
    if (!admin.raciEnforce) return true
    return capability
  }

  return {
    role,
    milestone,
    ctx,
    allowedActionsSource: allowed.source,
    fromControlPlane: allowed.fromControlPlane,
    raciEnforce: computed(() => admin.raciEnforce),
    isQuotePhase: computed(() => milestone.value === 'quote'),
    canEditQuote: computed(() =>
      gate(
        allowed.isAllowed('edit_quote', () => canEditQuoteForm(role.value, ctx.value)),
      ),
    ),
    canConvertQuote: computed(() =>
      gate(
        allowed.isAllowed('convert_quote', () =>
          canConvertQuoteToBooking(role.value, ctx.value),
        ),
      ),
    ),
    canEditOperationalJob: computed(() =>
      gate(canEditOperationalJob(role.value, milestone.value, ctx.value)),
    ),
    isSalesHandoffReadOnly: computed(() =>
      isSalesHandoffReadOnly(role.value, milestone.value, ctx.value),
    ),
    isWorkspaceReadOnly: computed(() =>
      isJobWorkspaceReadOnly(role.value, milestone.value, ctx.value),
    ),
    readOnlyLabel: computed(() =>
      readOnlySeatLabel(role.value, localeKey.value, milestone.value, ctx.value),
    ),
    canAccrueCharges: computed(() =>
      gate(
        allowed.isAllowed('accrue', () =>
          canAccrueCharges(role.value, milestone.value, ctx.value),
        ),
      ),
    ),
    canApproveCharges: computed(() =>
      gate(
        allowed.isAllowed('approve_charges', () =>
          canApproveChargesOnJob(role.value, ctx.value),
        ),
      ),
    ),
    canIssueInvoice: computed(() =>
      gate(
        allowed.isAllowed('issue_invoice', () => canIssueInvoice(role.value)),
      ),
    ),
    convertBlockReason: computed(() => allowed.reason('convert_quote')),
    accrueBlockReason: computed(() => allowed.reason('accrue')),
    approveBlockReason: computed(() => allowed.reason('approve_charges')),
  }
}
