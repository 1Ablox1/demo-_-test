# Mock stack (until Echo wires real services)

Simulates the production layering doctrine:

```
UI (Vue) → /api/os/* only
  → os-control-plane (mock-stack/control-plane)
    → cargoware ACL adapter (mock-stack/adapter)
      → legacy CargoWare fixtures (mock-stack/legacy)
```

## Layout

| Path | Role |
|------|------|
| `runtime.ts` | In-memory SoR for lifecycle, charges, invoice, numbering overlays |
| `control-plane/index.ts` | Desk, job context, lifecycle, money, guidance chips, numbering admin |
| `adapter/cargowareAdapter.ts` | ACL — MDM search/create, assign job numbers, MAWB allocate |
| `adapter/audit.ts` | Ring buffer of adapter calls (`GET /api/os/_debug/adapter-log`) |
| `legacy/booking.ts` | Mock air export job record patched by numbering |
| `legacy/mdm.ts` | Mock partner search + draft/approve |

## MSW handlers

`src/mocks/handlers/os.ts` — canonical `/api/os/*` routes.

`legacyAliasHandlers` — thin aliases for `/api/my-tasks` and `/api/jobs/*` (migration shim).

## Echo handoff checklist

1. Replace MSW with real BFF proxying to `os-control-plane` service
2. Swap `cargowareAdapter` impl to HTTP calls (Zuul → booking/mdm/sys)
3. Keep UI on `/api/os/*` — no direct legacy URLs in Vue
4. `GET /api/os/health` should report real adapter + legacy connectivity
5. Guidance chips stay suggest-only; worker toggles from Admin Studio → query params today, tenant config later

## Debug

- Health: `GET /api/os/health`
- Adapter audit: `GET /api/os/_debug/adapter-log`
