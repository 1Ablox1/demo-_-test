# Echo auth wiring for airfreight-western-ui
# SoT (backend): 01_auth_design.md — OS validates only, never mints sessions.

## Connect UI → Echo

1. Start Echo control-plane on **:9100**
   ```
   cd D:\work\testenv\Echo-cargowareos-backend\cargowareos-backend
   .\run.ps1 start
   ```
2. Western UI `.env.local` (already hybrid):
   - `VITE_API_MODE=hybrid`
   - `VITE_ECHO_BASE_URL=/api/echo` → Vite proxy → `VITE_ECHO_PROXY_TARGET` (default `http://127.0.0.1:9100`)
   - `VITE_ECHO_AUTH_MODE=stub` for Alice, or `session` for WallTech sessionId
3. Restart Vite (`npm run dev`) so env + proxy reload.
4. Open **http://127.0.0.1:5173/login** — Sign in with Echo stub (Alice)
   - or `/?sessionId=<uuid>` after SSO when `VITE_ECHO_AUTH_MODE=session`

## Contracts

| Mode | Login body | Bearer |
|------|------------|--------|
| stub | `{ "username": "alice" }` | `poc-session-alice` (Echo stub) |
| session | `{ "sessionId": "<uuid>" }` | same uuid |

All `/os/*` calls send `Authorization: Bearer <sessionId>`.

Logout: `POST /os/auth/logout` then clear sessionStorage.

## If you see Echo 502

Hybrid falls back to MSW for job context. Fix by bringing Echo up on :9100, then re-login on `/login`.
