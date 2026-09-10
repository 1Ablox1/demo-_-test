<script setup lang="ts">
/**
 * CargoWare OS login — username/password posted to Echo (never WallTech HTML).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { echoAuthMode } from '@/api/echo/authMode'
import { usesEchoReads } from '@/api/config'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const username = ref(
  import.meta.env.VITE_ECHO_LOGIN_USER?.trim() || 'aLice@cargowareos.com',
)
const password = ref(import.meta.env.VITE_ECHO_LOGIN_PASSWORD ?? '')
const showPassword = ref(false)
const showSessionAdvanced = ref(false)
const sessionIdInput = ref('')
const mode = computed(() => echoAuthMode())

const redirectTo = computed(() => {
  const r = String(route.query.redirect || '')
  return r.startsWith('/') ? r : '/dashboard'
})

onMounted(() => {
  void auth.probeEcho()
  if (auth.isAuthenticated) {
    void router.replace(redirectTo.value)
  }
})

async function onLogin() {
  try {
    if (mode.value === 'session' && showSessionAdvanced.value && sessionIdInput.value.trim()) {
      await auth.loginWithSessionId(sessionIdInput.value.trim())
    } else if (mode.value === 'stub') {
      await auth.loginStub(username.value.trim() || 'alice')
    } else {
      await auth.loginWithCredentials(username.value.trim(), password.value)
    }
    await router.replace(redirectTo.value)
  } catch {
    /* store.error */
  }
}

function continueMock() {
  void router.replace(redirectTo.value)
}
</script>

<template>
  <div class="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#E6F9F6_0%,_#F7F8FA_45%,_#EEF1F5_100%)]"
    />
    <div class="relative w-full max-w-[400px]">
      <div class="mb-6 text-center">
        <div class="text-[11px] font-bold uppercase tracking-[0.2em] text-teal-700">CargoWare OS</div>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Sign in</h1>
        <p class="mt-1 text-[13px] text-slate-500">
          Western airfreight · Echo control-plane
        </p>
      </div>

      <form
        class="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)]"
        @submit.prevent="onLogin"
      >
        <div
          class="mb-4 rounded-lg border px-3 py-2 text-[11px]"
          :class="
            auth.echoReachable
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : auth.echoReachable === false
                ? 'border-amber-200 bg-amber-50 text-amber-950'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          "
        >
          <span class="font-semibold">
            Echo
            {{
              auth.echoReachable === null
                ? 'checking…'
                : auth.echoReachable
                  ? 'online'
                  : 'offline — start control-plane :9100'
            }}
          </span>
        </div>

        <label class="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Email / username
          <input
            v-model="username"
            type="text"
            name="username"
            autocomplete="username"
            class="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            placeholder="you@company.com"
          />
        </label>

        <label
          v-if="mode !== 'stub'"
          class="mt-3 block text-[11px] font-semibold uppercase tracking-wide text-slate-500"
        >
          Password
          <div class="relative mt-1.5">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              class="h-10 w-full rounded-lg border border-slate-200 px-3 pr-16 text-[14px] text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              placeholder="••••••••"
            />
            <button
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-teal-700 hover:text-teal-900"
              @click="showPassword = !showPassword"
            >
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <p v-if="mode === 'stub'" class="mt-2 text-[11px] text-slate-400">
          Stub mode — password not sent (Echo <span class="font-mono">stub-mode</span>).
        </p>

        <button
          type="submit"
          class="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-teal-600 text-[14px] font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          :disabled="auth.loading || !username.trim() || (mode === 'password' && !password)"
        >
          {{ auth.loading ? 'Signing in…' : 'Log in' }}
        </button>

        <p
          v-if="auth.error"
          class="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-800"
        >
          {{ auth.error }}
        </p>

        <button
          type="button"
          class="mt-4 w-full text-center text-[11px] font-medium text-slate-400 hover:text-slate-700"
          @click="showSessionAdvanced = !showSessionAdvanced"
        >
          {{ showSessionAdvanced ? 'Hide' : 'Advanced' }} · sessionId
        </button>

        <div v-if="showSessionAdvanced" class="mt-2 space-y-2">
          <input
            v-model="sessionIdInput"
            class="h-9 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-[12px] outline-none focus:border-teal-500"
            placeholder="Paste sessionId"
            autocomplete="off"
          />
          <button
            type="button"
            class="h-9 w-full rounded-lg border border-slate-200 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            :disabled="auth.loading || !sessionIdInput.trim()"
            @click="
              auth.loginWithSessionId(sessionIdInput.trim()).then(() => router.replace(redirectTo))
            "
          >
            Validate sessionId
          </button>
        </div>
      </form>

      <button
        type="button"
        class="mt-4 w-full text-center text-[11px] text-slate-400 hover:text-slate-600"
        @click="continueMock"
      >
        Continue without Echo (MSW)
      </button>

      <p class="mt-6 text-center text-[10px] text-slate-400">
        Mode <span class="font-mono">{{ mode }}</span>
        · API <span class="font-mono">{{ usesEchoReads() ? 'hybrid/live' : 'mock' }}</span>
      </p>
    </div>
  </div>
</template>
