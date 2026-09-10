import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './locales'
import { router } from './router'
import { bindTenantToMarketPacks, useTenantAdminStore } from '@/stores/tenantAdmin'
import { useMarketPackStore } from '@/stores/marketPacks'
import { useThemeStore } from '@/stores/theme'
import { shouldStartMsw } from '@/api/client'
import { usesEchoReads } from '@/api/config'
import { useAuthStore } from '@/stores/auth'
import { ModuleRegistry, AllCommunityModule, provideGlobalGridOptions } from 'ag-grid-community'
import './style.css'

// AG Grid v33+: CSS file themes require theme: 'legacy' (error #239)
ModuleRegistry.registerModules([AllCommunityModule])
provideGlobalGridOptions({ theme: 'legacy' })

async function prepareMocks() {
  if (!shouldStartMsw()) return
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}

async function bootstrap() {
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)

  await prepareMocks()

  if (usesEchoReads()) {
    const auth = useAuthStore()
    try {
      await auth.ensureSession()
    } catch (err) {
      // Echo down — still mount; hybrid falls back to MSW where wired
      console.warn('[bootstrap] Echo session unavailable; continuing without control-plane auth', err)
    }
  }

  const tenant = useTenantAdminStore()
  bindTenantToMarketPacks(tenant, useMarketPackStore())
  useThemeStore()
  i18n.global.locale.value = tenant.defaultLocale
  app.use(router)
  app.use(i18n)
  app.mount('#app')
}

void bootstrap()
