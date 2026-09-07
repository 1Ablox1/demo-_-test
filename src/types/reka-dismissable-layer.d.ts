/** Reka-ui dismissable layer singleton — shared with Dialog/Sheet for outside-click branches. */
declare module 'reka-dismissable-context' {
  import type { Reactive } from 'vue'

  export const context: Reactive<{
    layersRoot: Set<HTMLElement>
    layersWithOutsidePointerEventsDisabled: Set<HTMLElement>
    originalBodyPointerEvents: string | undefined
    branches: Set<HTMLElement>
  }>
}
