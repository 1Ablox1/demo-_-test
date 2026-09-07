/**
 * AG Grid header visibility — column titles must never be clipped mid-word.
 */
import type { ColDef } from 'ag-grid-community'

/** Shared defaultColDef bits for every OS list grid. */
export const GRID_HEADER_DEFAULTS: Pick<ColDef, 'wrapHeaderText' | 'autoHeaderHeight'> = {
  wrapHeaderText: true,
  autoHeaderHeight: true,
}

/** Pixel width needed to show the full header on one line (sort icon + padding). */
export function minWidthForHeader(label: string): number {
  const text = label.trim()
  if (!text) return 48
  // ~7.8px/char at 12px bold + 40px chrome (sort / padding)
  return Math.min(320, Math.max(96, Math.ceil(text.length * 7.8) + 40))
}

/** width + minWidth so the catalog preference never shrinks below the title. */
export function sizeColForHeader(label: string, preferred?: number): { width: number; minWidth: number } {
  const minWidth = minWidthForHeader(label)
  return {
    minWidth,
    width: Math.max(preferred ?? minWidth, minWidth),
  }
}
