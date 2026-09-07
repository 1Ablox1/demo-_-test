import { computed } from 'vue'
import {
  isLifecycleActionEnabled,
  lifecycleActionReason,
  type LifecycleActionId,
} from '@/lib/allowedActionsBridge'
import { useAdminConfigStore } from '@/stores/adminConfig'
import { useLifecycleStore } from '@/stores/lifecycle'

/**
 * Consume control-plane `allowedActions[]` from lifecycle store.
 * raciCompiler / rolePermissions are fallback only when an action id is missing.
 */
export function useAllowedActions() {
  const life = useLifecycleStore()
  const admin = useAdminConfigStore()

  const actions = computed(() => life.allowedActions)
  const source = computed(() => life.allowedActionsSource)
  const fromControlPlane = computed(() => source.value === 'hybrid')

  function isAllowed(id: LifecycleActionId, fallback: () => boolean): boolean {
    if (!admin.raciEnforce) return fallback()
    return isLifecycleActionEnabled(actions.value, id, fallback)
  }

  function reason(id: LifecycleActionId): string | undefined {
    return lifecycleActionReason(actions.value, id)
  }

  return {
    actions,
    source,
    fromControlPlane,
    raciEnforce: computed(() => admin.raciEnforce),
    isAllowed,
    reason,
  }
}
