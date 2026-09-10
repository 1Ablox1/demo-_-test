/**
 * Echo auth modes:
 * - password: OS-branded login → POST { username, password } (Echo → WallTech Auth)
 * - stub:     Alice username only (empty password) when Echo stub-mode
 * - session:  paste / SSO ?sessionId= → POST { sessionId }
 */
export type EchoAuthMode = 'password' | 'stub' | 'session'

export function echoAuthMode(): EchoAuthMode {
  const raw = (import.meta.env.VITE_ECHO_AUTH_MODE as string | undefined)?.trim().toLowerCase()
  if (raw === 'session' || raw === 'sso') return 'session'
  if (raw === 'stub' || raw === 'alice') return 'stub'
  // Default: branded username/password against Echo
  return 'password'
}

export const ECHO_SESSION_STORAGE_KEY = 'cw.os.echo.session'
