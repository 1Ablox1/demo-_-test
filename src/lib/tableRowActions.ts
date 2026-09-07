/** Shared helpers for list row actions (Jobs + Exception Desk). */

export async function copyText(text: string): Promise<boolean> {
  const value = text.trim()
  if (!value) return false
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = value
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch {
      return false
    }
  }
}

/** Simulate legacy REST latency for Save Draft / Save & Submit. */
export function mockLegacyRequest<T>(payload: T, ms = 420): Promise<{ ok: true; payload: T } | { ok: false; message: string }> {
  return new Promise((resolve) => {
    window.setTimeout(() => {
      // Demo validation: empty jobNo fails
      if (
        payload &&
        typeof payload === 'object' &&
        'jobNo' in payload &&
        !(payload as { jobNo?: string }).jobNo
      ) {
        resolve({ ok: false, message: 'Legacy API rejected payload — Job No required.' })
        return
      }
      resolve({ ok: true, payload })
    }, ms)
  })
}

export function isDraftStatus(status: string | undefined | null): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return s === 'draft' || s === 'pending'
}

/** Pinned hover action column HTML for AG Grid (data attributes for click routing). */
export function rowActionsCellHtml(rowId: string): string {
  return `<div class="os-row-actions" data-row-id="${rowId}">
    <button type="button" class="os-row-action" data-row-action="edit" title="Quick Edit" aria-label="Quick Edit">✎</button>
    <button type="button" class="os-row-action" data-row-action="copy" title="Copy codes" aria-label="Copy">⧉</button>
    <button type="button" class="os-row-action" data-row-action="more" title="More actions" aria-label="More">···</button>
  </div>`
}
