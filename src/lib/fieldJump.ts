/** Sticky header stack + scroll spotlight for shipment form field jumps. */

export const FIELD_SPOTLIGHT_CLASS = 'field-spotlight-active'
export const FIELD_SPOTLIGHT_DURATION_MS = 1800

const SPOTLIGHT_TIMERS = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>()

/** Sum heights of marked sticky regions (AppShell, handoff spine, job banners). */
export function measureStickyOffset(): number {
  let total = 0
  try {
    document.querySelectorAll('[data-sticky-region]').forEach((node) => {
      const el = node as HTMLElement
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return
      total += el.getBoundingClientRect().height
    })
  } catch {
    /* ignore */
  }
  return total
}

function getScrollParent(element: HTMLElement): HTMLElement {
  let parent = element.parentElement
  while (parent) {
    const { overflowY } = getComputedStyle(parent)
    // Prefer any scrollable container — do not require overflow yet (layout may lag)
    if (/(auto|scroll|overlay)/.test(overflowY)) {
      return parent
    }
    parent = parent.parentElement
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement
}

export interface FieldJumpOptions {
  behavior?: ScrollBehavior
  extraOffset?: number
  focus?: boolean
  root?: ParentNode
}

/** Scroll element into view inside its scroll parent (safe fallback to native). */
export function scrollIntoViewCentered(
  element: HTMLElement,
  options: FieldJumpOptions = {},
): void {
  try {
    const behavior = options.behavior ?? 'smooth'
    const stickyOffset = measureStickyOffset() + (options.extraOffset ?? 0)
    const scrollParent = getScrollParent(element)

    const elRect = element.getBoundingClientRect()
    const parentRect = scrollParent.getBoundingClientRect()

    const elementTopRelative = elRect.top - parentRect.top + scrollParent.scrollTop
    const targetScrollTop =
      elementTopRelative - stickyOffset - Math.min(parentRect.height, 480) * 0.15

    if (typeof scrollParent.scrollTo === 'function') {
      scrollParent.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior,
      })
      return
    }
  } catch {
    /* fall through */
  }
  try {
    element.scrollIntoView({ behavior: options.behavior ?? 'smooth', block: 'nearest' })
  } catch {
    /* ignore */
  }
}

function findFocusable(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>(
    'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])',
  )
}

/** Apply transient spotlight + optional focus after scroll settles. */
export function applyFieldSpotlight(
  wrapper: HTMLElement,
  options: Pick<FieldJumpOptions, 'focus'> = {},
): void {
  try {
    const prev = SPOTLIGHT_TIMERS.get(wrapper)
    if (prev) clearTimeout(prev)

    wrapper.classList.remove(FIELD_SPOTLIGHT_CLASS)
    void wrapper.offsetWidth
    wrapper.classList.add(FIELD_SPOTLIGHT_CLASS)

    const timer = setTimeout(() => {
      wrapper.classList.remove(FIELD_SPOTLIGHT_CLASS)
      SPOTLIGHT_TIMERS.delete(wrapper)
    }, FIELD_SPOTLIGHT_DURATION_MS)
    SPOTLIGHT_TIMERS.set(wrapper, timer)

    if (options.focus !== false) {
      findFocusable(wrapper)?.focus({ preventScroll: true })
    }
  } catch {
    /* ignore */
  }
}

export function resolveFieldWrapper(
  fieldKey: string,
  root: ParentNode = document,
): HTMLElement | null {
  try {
    return root.querySelector<HTMLElement>(`[data-field-key="${fieldKey}"]`)
  } catch {
    return null
  }
}

export function jumpToFieldElement(
  wrapper: HTMLElement,
  options: FieldJumpOptions = {},
): void {
  scrollIntoViewCentered(wrapper, options)
  const delay = options.behavior === 'smooth' ? 420 : 0
  window.setTimeout(() => applyFieldSpotlight(wrapper, options), delay)
}

export function jumpToFieldKey(fieldKey: string, options: FieldJumpOptions = {}): boolean {
  const root = options.root ?? document
  const wrapper = resolveFieldWrapper(fieldKey, root)
  if (!wrapper) return false
  jumpToFieldElement(wrapper, options)
  return true
}

export function jumpToSectionElement(
  section: HTMLElement,
  options: FieldJumpOptions = {},
): void {
  scrollIntoViewCentered(section, options)
}
