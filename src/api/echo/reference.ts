/**
 * Stage MDM via Echo control-plane → adapter → legacy mdm-service.
 * Maps /os/reference/* into Operational MDM MasterOption picks.
 */
import type { MasterKind, MasterOption } from '@/mdm/types'
import { echoApi } from '@/api/echo/client'
import type { OsResult } from '@/api/echo/types'
import { osResultOk } from '@/api/echo/types'

async function unwrapList<T>(path: string, query?: Record<string, string>): Promise<T[]> {
  const res = await echoApi<OsResult<T[]>>(path, { query })
  if (!osResultOk(res)) {
    throw new Error(res?.message || `Echo reference failed: ${path}`)
  }
  return Array.isArray(res.data) ? res.data : []
}

type RefPort = { code?: string; name?: string; country?: string }
type RefAirline = {
  id?: number
  code?: string
  englishName?: string
  chineseName?: string
  shortName?: string
}
type RefCompany = {
  id?: number
  name?: string
  englishName?: string
  chineseName?: string
  type?: string
  code?: string
  roles?: string[]
}
type RefCurrency = {
  code?: string
  englishName?: string
  chineseName?: string
  name?: string
}
type RefUser = { userId?: number; name?: string; englishName?: string }
type RefOffice = { id?: number; name?: string; code?: string; uuid?: string }
type RefDepartment = { id?: number; name?: string; officeUuid?: string }
type RefCatalog = { code?: string; name?: string }

export type PartyRole =
  | 'customer'
  | 'shipper'
  | 'consignee'
  | 'notify'
  | 'airline'
  | 'agent'
  | 'bookingAgent'
  | 'customsBroker'
  | 'all'

function filterQ(items: MasterOption[], q: string, limit = 40): MasterOption[] {
  const n = q.trim().toLowerCase()
  if (!n) return items.slice(0, limit)
  return items
    .filter(
      (o) =>
        o.label.toLowerCase().includes(n) ||
        o.value.toLowerCase().includes(n) ||
        o.aliases?.some((a) => a.toLowerCase().includes(n)) ||
        o.meta?.toLowerCase().includes(n),
    )
    .slice(0, limit)
}

export function mapEchoPort(p: RefPort): MasterOption | null {
  const code = (p.code ?? '').trim().toUpperCase()
  if (!code) return null
  const name = (p.name ?? '').trim()
  const country = (p.country ?? '').trim().toUpperCase()
  return {
    kind: 'airport',
    label: name ? `${code} · ${name}` : code,
    value: code,
    aliases: name ? [name] : undefined,
    meta: country || undefined,
    status: 'active',
  }
}

export function mapEchoAirline(a: RefAirline): MasterOption | null {
  const code = (a.code ?? a.shortName ?? '').trim()
  const name = (a.englishName || a.chineseName || '').trim()
  const id = a.id != null ? String(a.id) : ''
  const value = code || id
  if (!value) return null
  return {
    kind: 'airline',
    label: name || code || value,
    value,
    aliases: [code, name, id].filter(Boolean) as string[],
    meta: code && name ? code : undefined,
    status: 'active',
  }
}

function companyKind(type?: string, roles?: string[]): MasterKind {
  const t = (type || '').toLowerCase()
  if (t === 'airline' || roles?.includes('airline')) return 'airline'
  if (t === 'shipper' || roles?.includes('shipper')) return 'shipper'
  if (t === 'consignee' || roles?.includes('consignee')) return 'consignee'
  if (t === 'notify' || roles?.includes('notify')) return 'notify'
  if (t === 'agent' || roles?.includes('agent')) return 'agent'
  return 'customer'
}

export function mapEchoCompany(c: RefCompany, forceKind?: MasterKind): MasterOption | null {
  const id = c.id != null ? String(c.id) : ''
  const name = (c.name || c.englishName || c.chineseName || '').trim()
  const code = (c.code ?? '').trim()
  const value = id || code
  if (!value || !name) return null
  const kind = forceKind ?? companyKind(c.type, c.roles)
  const roles = (c.roles ?? []).join('+')
  return {
    kind,
    label: name,
    value,
    aliases: [code, id, ...(c.roles ?? [])].filter(Boolean) as string[],
    meta: roles || c.type || code || id,
    status: 'active',
  }
}

export function mapEchoCurrency(c: RefCurrency): MasterOption | null {
  const code = (c.code ?? '').trim().toUpperCase()
  if (!code) return null
  const name = (c.englishName || c.name || c.chineseName || code).trim()
  return {
    kind: 'currency',
    label: `${code} · ${name}`,
    value: code,
    aliases: [name],
    status: 'active',
  }
}

export function mapEchoUser(u: RefUser): MasterOption | null {
  const id = u.userId != null ? String(u.userId) : ''
  const name = (u.name || u.englishName || '').trim()
  if (!id || !name) return null
  return {
    kind: 'user',
    label: name,
    value: id,
    aliases: [u.englishName, id].filter(Boolean) as string[],
    status: 'active',
  }
}

export function mapEchoOffice(o: RefOffice): MasterOption | null {
  const id = o.id != null ? String(o.id) : ''
  const name = (o.name || '').trim()
  if (!id || !name) return null
  return {
    kind: 'office',
    label: o.code ? `${name} (${o.code})` : name,
    value: id,
    aliases: [o.code, o.uuid, id].filter(Boolean) as string[],
    meta: o.uuid || undefined,
    status: 'active',
  }
}

export function mapEchoDepartment(d: RefDepartment): MasterOption | null {
  const id = d.id != null ? String(d.id) : ''
  const name = (d.name || '').trim()
  if (!id || !name) return null
  return {
    kind: 'department',
    label: name,
    value: id,
    aliases: [id],
    meta: d.officeUuid || undefined,
    status: 'active',
  }
}

export function mapEchoCatalog(row: RefCatalog, kind: MasterKind): MasterOption | null {
  const code = (row.code || '').trim()
  const name = (row.name || code).trim()
  const value = code || name
  if (!value) return null
  return {
    kind,
    label: name === code ? name : `${code} · ${name}`,
    value,
    aliases: [code, name].filter(Boolean) as string[],
    status: 'active',
  }
}

export async function echoFetchPorts(): Promise<MasterOption[]> {
  const rows = await unwrapList<RefPort>('/os/reference/ports')
  return rows.map(mapEchoPort).filter((x): x is MasterOption => !!x)
}

export async function echoFetchAirlines(): Promise<MasterOption[]> {
  const rows = await unwrapList<RefAirline>('/os/reference/airlines')
  return rows.map(mapEchoAirline).filter((x): x is MasterOption => !!x)
}

export async function echoFetchCompanies(): Promise<MasterOption[]> {
  const rows = await unwrapList<RefCompany>('/os/reference/company-cache')
  return rows
    .map((c) =>
      mapEchoCompany({
        ...c,
        name: c.englishName || c.chineseName || c.name,
      }),
    )
    .filter((x): x is MasterOption => !!x)
}

export async function echoFetchCurrencies(): Promise<MasterOption[]> {
  const rows = await unwrapList<RefCurrency>('/os/reference/currencies')
  return rows.map(mapEchoCurrency).filter((x): x is MasterOption => !!x)
}

export async function echoFetchUsers(shape: 'op' | 'sales' | 'csr' | 'doc' = 'op'): Promise<MasterOption[]> {
  const rows = await unwrapList<RefUser>('/os/reference/users', { shape })
  return rows.map(mapEchoUser).filter((x): x is MasterOption => !!x)
}

export async function echoFetchOffices(): Promise<MasterOption[]> {
  const rows = await unwrapList<RefOffice>('/os/reference/offices')
  return rows.map(mapEchoOffice).filter((x): x is MasterOption => !!x)
}

export async function echoFetchDepartments(officeUuid = ''): Promise<MasterOption[]> {
  const query = officeUuid ? { officeUuid } : undefined
  const rows = await unwrapList<RefDepartment>('/os/reference/departments', query)
  return rows.map(mapEchoDepartment).filter((x): x is MasterOption => !!x)
}

export async function echoFetchCatalog(
  name: string,
  kind: MasterKind,
): Promise<MasterOption[]> {
  const rows = await unwrapList<RefCatalog>('/os/reference/catalog', { name })
  return rows.map((r) => mapEchoCatalog(r, kind)).filter((x): x is MasterOption => !!x)
}

export async function echoSearchCompanies(
  q: string,
  type: PartyRole | '' = 'customer',
): Promise<MasterOption[]> {
  const rows = await unwrapList<RefCompany>('/os/reference/companies/search', {
    q: q || '',
    type: type === 'all' ? '' : type,
  })
  const forceKind: MasterKind | undefined =
    type === 'airline'
      ? 'airline'
      : type === 'shipper'
        ? 'shipper'
        : type === 'consignee'
          ? 'consignee'
          : type === 'notify'
            ? 'notify'
            : type === 'agent' || type === 'bookingAgent' || type === 'customsBroker'
              ? 'agent'
              : type === 'customer'
                ? 'customer'
                : undefined
  return rows.map((c) => mapEchoCompany(c, forceKind)).filter((x): x is MasterOption => !!x)
}

export function partiesWithRole(all: MasterOption[], role: PartyRole): MasterOption[] {
  if (role === 'all') return all
  return all.filter((p) => {
    if (p.kind === role) return true
    const meta = (p.meta || '').toLowerCase()
    const aliases = (p.aliases || []).map((a) => a.toLowerCase())
    return meta.includes(role.toLowerCase()) || aliases.includes(role.toLowerCase())
  })
}

/** Countries derived from airport country codes (no separate MDM country list on Echo). */
export function countriesFromAirports(airports: MasterOption[]): MasterOption[] {
  const seen = new Map<string, MasterOption>()
  for (const a of airports) {
    const code = (a.meta ?? '').trim().toUpperCase()
    if (!code || code.length !== 2 || seen.has(code)) continue
    seen.set(code, {
      kind: 'country',
      label: code,
      value: code,
      status: 'active',
    })
  }
  return [...seen.values()].sort((a, b) => a.value.localeCompare(b.value))
}

export type EchoMdmKind =
  | 'customer'
  | 'shipper'
  | 'consignee'
  | 'notify'
  | 'agent'
  | 'airport'
  | 'country'
  | 'airline'
  | 'charge'
  | 'currency'
  | 'user'
  | 'office'
  | 'department'
  | 'incoterm'
  | 'freight_term'
  | 'payment_term'
  | 'packing'
  | 'cargo_type'

/** Search stage MDM. Charge codes have no Echo reference yet → empty. */
export async function echoSearchMdm(kind: EchoMdmKind, q = ''): Promise<MasterOption[]> {
  if (kind === 'charge') return []
  if (kind === 'customer') return echoSearchCompanies(q, 'customer')
  if (kind === 'shipper') return echoSearchCompanies(q, 'shipper')
  if (kind === 'consignee') return echoSearchCompanies(q, 'consignee')
  if (kind === 'notify') return echoSearchCompanies(q, 'notify')
  if (kind === 'agent') return echoSearchCompanies(q, 'agent')
  if (kind === 'airline') {
    if (q.trim()) return echoSearchCompanies(q, 'airline')
    return echoFetchAirlines()
  }
  if (kind === 'airport') return filterQ(await echoFetchPorts(), q)
  if (kind === 'currency') return filterQ(await echoFetchCurrencies(), q)
  if (kind === 'country') return filterQ(countriesFromAirports(await echoFetchPorts()), q)
  if (kind === 'user') return filterQ(await echoFetchUsers('op'), q)
  if (kind === 'office') return filterQ(await echoFetchOffices(), q)
  if (kind === 'department') return filterQ(await echoFetchDepartments(), q)
  if (kind === 'incoterm') return filterQ(await echoFetchCatalog('IncoTerm', 'incoterm'), q)
  if (kind === 'freight_term') return filterQ(await echoFetchCatalog('ShippingTerm', 'freight_term'), q)
  if (kind === 'payment_term') return filterQ(await echoFetchCatalog('PaymentTerm', 'payment_term'), q)
  if (kind === 'packing') return filterQ(await echoFetchCatalog('Packing', 'packing'), q)
  if (kind === 'cargo_type') return filterQ(await echoFetchCatalog('CargoType', 'cargo_type'), q)
  return []
}
