import { onBeforeUnmount, ref, type Ref } from 'vue'

/**
 * Left-click drag horizontally to pan AG Grid (and similar) scroll viewports.
 * Skips header cells so column reorder still works.
 */
export function useHorizontalDragScroll(rootRef: Ref<HTMLElement | null>) {
  const didDrag = ref(false)

  let attached: HTMLElement | null = null
  let dragging = false
  let startX = 0
  let startScroll = 0
  let moved = false

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
    // Keep column header drag-reorder / sort intact
    if (target.closest('.ag-header-cell, .ag-header, .ag-floating-top, input, button, a, select, textarea')) {
      return
    }
    const viewport = getViewport(root)
    if (!viewport) return

    dragging = true
    moved = false
    didDrag.value = false
    startX = e.clientX
    startScroll = viewport.scrollLeft
    root.classList.add('is-h-dragging')
    try {
      root.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!dragging || !attached) return
    const viewport = getViewport(attached)
    if (!viewport) return
    const dx = e.clientX - startX
    if (Math.abs(dx) > 3) {
      moved = true
      didDrag.value = true
    }
    viewport.scrollLeft = startScroll - dx
    // Keep linked horizontal scrollbars in sync when present
    const hScroll = attached.querySelector(
      '.ag-body-horizontal-scroll-viewport',
    ) as HTMLElement | null
    if (hScroll && hScroll !== viewport) hScroll.scrollLeft = viewport.scrollLeft
  }

  function onPointerUp(e: PointerEvent) {
    if (!dragging) return
    dragging = false
    attached?.classList.remove('is-h-dragging')
    try {
      attached?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    // Keep didDrag through the following click so row-open is skipped
    if (moved) {
      didDrag.value = true
      window.setTimeout(() => {
        didDrag.value = false
      }, 80)
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
    dragging = false
  }

  function bindFromRoot() {
    attach(rootRef.value)
  }

  onBeforeUnmount(detach)

  return { didDrag, bindFromRoot, attach, detach }
}
