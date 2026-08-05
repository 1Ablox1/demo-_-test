# Airfreight Western UI

Vue 3 trial app for the Western Air Freight workbench.  
Stack: Vite · Vue 3 · TypeScript · Tailwind v4 · Pinia · vue-i18n · MSW · ofetch.

## Screens (this pass)

| Route | Screen |
|-------|--------|
| `/my-tasks` | L1 Needs You (Smart Workbench) |
| `/jobs/:shipmentId` | L2 Job Context |

- L1 **Review** / Workboard click → L2  
- Data via **MSW** (`VITE_API_MODE=mock`)  
- Roles: Sales / Ops / Finance / Admin  
- Packs: GLOBAL + US / AU  

## Scripts

```bash
npm install
npm run dev
npm run build
```

## Env

```env
VITE_API_MODE=mock
VITE_API_BASE_URL=/api
```

Handlers: `src/mocks/handlers/index.ts`  
Fixtures: `src/mocks/fixtures/tasks.ts`, `src/mocks/fixtures/jobs.ts`
