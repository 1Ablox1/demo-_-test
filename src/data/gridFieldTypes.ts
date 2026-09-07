/** Shared list-grid field shape (Jobs + Consoles). */

export type GridFieldGroup =
  | 'identity'
  | 'parties'
  | 'agents'
  | 'awb'
  | 'route'
  | 'dates'
  | 'cargo'
  | 'money'
  | 'ops'
  | 'org'
  | 'au'
  | 'custom'

export type GridLob = 'AI' | 'AE' | 'ALL'

export type GridValueSource = 'row' | 'extras' | 'auImport'

export interface GridField {
  id: string
  label: string
  group: GridFieldGroup
  defaultVisible: boolean
  columnable: boolean
  searchable: boolean
  sortable: boolean
  field: string
  valueSource?: GridValueSource
  mono?: boolean
  width?: number
  searchHint?: string
  searchType?: 'text' | 'select'
  searchOptions?: { value: string; label: string }[]
  lobs?: GridLob[]
}

export type GridFieldGroupMeta = { id: GridFieldGroup; label: string }

export function matchesGridLob(field: GridField, lobKey: string): boolean {
  const lob = lobKey === 'AE' || lobKey === 'AI' ? lobKey : 'ALL'
  const scopes = field.lobs ?? ['ALL']
  return scopes.includes('ALL') || scopes.includes(lob as GridLob)
}

export function gridFieldFactory(
  partial: Omit<GridField, 'columnable' | 'sortable' | 'defaultVisible' | 'searchable'> &
    Partial<Pick<GridField, 'columnable' | 'sortable' | 'defaultVisible' | 'searchable'>>,
): GridField {
  return {
    columnable: false,
    sortable: false,
    defaultVisible: false,
    searchable: true,
    lobs: ['ALL'],
    ...partial,
  }
}
