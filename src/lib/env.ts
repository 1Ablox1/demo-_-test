import type { BackendEnv } from '@/types/tenant'

export const DEFAULT_BACKEND_ENV: BackendEnv = 'h5-stage-db'

export const BACKEND_ENV_OPTIONS: { id: BackendEnv; label: string; hint: string }[] = [
  {
    id: 'h5-stage-db',
    label: 'h5-stage-db',
    hint: 'Legacy H5 stage datasource — default for this mock',
  },
  {
    id: 'h5-prod-db',
    label: 'h5-prod-db',
    hint: 'Legacy H5 production datasource (read-only in mock)',
  },
  {
    id: 'mock-local',
    label: 'mock-local',
    hint: 'In-memory shell fixtures only',
  },
]
