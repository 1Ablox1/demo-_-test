import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { i18n } from './locales'
import { router } from './router'
import './style.css'

async function prepareMocks() {
  if (import.meta.env.VITE_API_MODE !== 'mock') return
  const { worker } = await import('./mocks/browser')
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
  })
}

async function bootstrap() {
  await prepareMocks()

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(i18n)
  app.mount('#app')
}

void bootstrap()
