import { defineStore } from 'pinia'
import { ref } from 'vue'

export type AdminNavId =
  | 'builder'
  | 'tenant'
  | 'market'
  | 'users'
  | 'seats'
  | 'numbering'
  | 'catalogs'
  | 'partners'
  | 'mdm-setup'
  | 'rulebook'
  | 'digital'

export const useAdminStore = defineStore('admin', () => {
  const activeNav = ref<AdminNavId>('tenant')
  /** @deprecated use useMarketPackStore — kept for any leftover callers */
  const packs = ref([
    { id: 'GLOBAL', desc: 'IATA · CASS · MAWB/HAWB', sop: 'v2.4.1', active: true },
    { id: 'US', desc: 'CBP · ACE · AES/EEI', sop: 'v1.8.0', active: true },
    { id: 'AU', desc: 'GST · ICS · biosecurity clearance', sop: 'v1.3.2', active: true },
  ])
  const seats = ref([
    { seat: 'Sales', r: 'Quote · Margin', a: '—' },
    { seat: 'Operations', r: 'Booking · AWB · Docs', a: 'Customs gates' },
    { seat: 'Finance', r: 'Invoice', a: 'Charges · Approve · Post' },
    { seat: 'Admin', r: 'Config', a: 'Packs · Numbering · Seats' },
  ])
  const autoGates = ref(true)
  const raciEnforce = ref(true)
  const marginAlerts = ref(true)
  const workers = ref({
    quoteAssist: true,
    gateWatch: true,
    marginGuard: true,
    chargeDraft: true,
  })
  /** Job number policies keyed by LOB — prefix is mandatory and LOB-specific. */
  const numberingPolicies = ref([
    { lob: 'Air Export', prefix: 'AE', formula: 'AE-{YY}{MM}-{Seq5}', preview: 'AE-2608-00043' },
    { lob: 'Air Import', prefix: 'AI', formula: 'AI-{YY}{MM}-{Seq5}', preview: 'AI-2608-00012' },
    { lob: 'Sea Export', prefix: 'SE', formula: 'SE-{YY}{MM}-{Seq5}', preview: 'SE-2608-00007' },
    { lob: 'Sea Import', prefix: 'SI', formula: 'SI-{YY}{MM}-{Seq5}', preview: 'SI-2608-00019' },
    { lob: 'Road Export', prefix: 'RE', formula: 'RE-{YY}{MM}-{Seq5}', preview: 'RE-2608-00003' },
    { lob: 'Road Import', prefix: 'RI', formula: 'RI-{YY}{MM}-{Seq5}', preview: 'RI-2608-00005' },
  ])
  const numberingSelected = ref(0)

  function setNav(id: AdminNavId) {
    activeNav.value = id
  }

  return {
    activeNav,
    packs,
    seats,
    autoGates,
    raciEnforce,
    marginAlerts,
    workers,
    numberingPolicies,
    numberingSelected,
    setNav,
  }
})
