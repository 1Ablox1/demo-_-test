import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Left-click drag horizontally to pan AG Grid scroll viewports.
 * Pointer capture starts only after a real drag threshold so double-click
 * on rows still reaches AG Grid / native dblclick.
 */
export function useHorizontalDragScroll(rootRef: Ref<HTMLElement | null>) {
  const didDrag = ref(false)

  let attached: HTMLElement | null = null
  let pending = false
  let dragging = false
  let startX = 0
  let startY = 0
  let startScroll = 0
  let pointerId: number | null = null
  const DRAG_THRESHOLD_PX = 10

  function getViewport(root: HTMLElement): HTMLElement | null {
    return (
      (root.querySelector('.ag-center-cols-viewport') as HTMLElement | null) ??
      (root.querySelector('.ag-body-viewport') as HTMLElement | null) ??
      (root.querySelector('.ag-body-horizontal-scroll-viewport') as HTMLElement | null)
    )
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return
    const root = attached
    if (!root) return
    const target = e.target as HTMLElement | null
    if (!target) return
    // Keep column header drag-reorder / sort / controls intact
    if (
      target.closest(
        '.ag-header-cell, .ag-header, .ag-floating-top, input, button, a, select, textarea, [data-row-action]',
      )
    ) {
      return
    }
    const viewport = getViewport(root)
    if (!viewport) return

    // Arm only — do NOT capture yet (capture breaks double-click)
    pending = true
    dragging = false
    didDrag.value = false
    pointerId = e.pointerId
    startX = e.clientX
    startY = e.clientY
    startScroll = viewport.scrollLeft
  }

  function onPointerMove(e: PointerEvent) {
    if (!pending && !dragging) return
    if (pointerId != null && e.pointerId !== pointerId) return
    if (!attached) return
    const viewport = getViewport(attached)
    if (!viewport) return

    const dx = e.clientX - startX
    const dy = e.clientY - startY

    if (!dragging) {
      // Prefer vertical intent / tiny jitter → leave for click / dblclick
      if (Math.abs(dx) < DRAG_THRESHOLD_PX) return
      if (Math.abs(dx) < Math.abs(dy)) {
        pending = false
        return
      }
      dragging = true
      pending = false
      didDrag.value = true
      attached.classList.add('is-h-dragging')
      try {
        attached.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    viewport.scrollLeft = startScroll - dx
    const hScroll = attached.querySelector(
      '.ag-body-horizontal-scroll-viewport',
    ) as HTMLElement | null
    if (hScroll && hScroll !== viewport) hScroll.scrollLeft = viewport.scrollLeft
  }

  function onPointerUp(e: PointerEvent) {
    if (pointerId != null && e.pointerId !== pointerId) return
    const wasDragging = dragging
    pending = false
    dragging = false
    pointerId = null
    attached?.classList.remove('is-h-dragging')
    try {
      attached?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    if (wasDragging) {
      didDrag.value = true
      window.setTimeout(() => {
        didDrag.value = false
      }, 120)
    } else {
      didDrag.value = false
    }
  }

  function attach(el: HTMLElement | null) {
    detach()
    if (!el) return
    attached = el
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    el.classList.add('h-drag-scroll')
  }

  function detach() {
    if (!attached) return
    attached.removeEventListener('pointerdown', onPointerDown)
    attached.removeEventListener('pointermove', onPointerMove)
    attached.removeEventListener('pointerup', onPointerUp)
    attached.removeEventListener('pointercancel', onPointerUp)
    attached.classList.remove('h-drag-scroll', 'is-h-dragging')
    attached = null
    pending = false
    dragging = false
    pointerId = null
  }

  function bindFromRoot() {
    attach(rootRef.value)
  }

  onBeforeUnmount(detach)

  return { didDrag, bindFromRoot, attach, detach }
}
