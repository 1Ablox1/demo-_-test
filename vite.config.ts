import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const echoTarget = env.VITE_ECHO_PROXY_TARGET || 'http://127.0.0.1:9100'

  return {
    plugins: [vue(), tailwindcss()],
    // Windows: bind IPv4 so http://localhost:5173 works (Vite otherwise may listen on ::1 only)
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: {
        '/api/echo': {
          target: echoTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/echo/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        'reka-dismissable-context': fileURLToPath(
          new URL('./node_modules/reka-ui/dist/DismissableLayer/context.js', import.meta.url),
        ),
      },
    },
  }
})