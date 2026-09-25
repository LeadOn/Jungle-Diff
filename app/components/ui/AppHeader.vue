<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useRuntimeConfig } from '#app'
import { usePlayerPalette } from '~/composables/usePlayerPalette'
import { applyTheme, isDarkTheme } from '~/utils/theme'

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const config = useRuntimeConfig()
const palette = usePlayerPalette()
const isDark = ref(false)

// Server and first client render agree on the non-Mac label; the Mac one only appears after mount.
const shortcutLabel = ref('Ctrl K')

// The current player only feeds the header pill: abort the request if the header goes away before
// the response, rather than leaving a pending state write behind.
const profileRequest = new AbortController()

onMounted(() => {
  // `public/theme-init.js` already set the class before render; here we only mirror the document's
  // actual state into the component.
  isDark.value = isDarkTheme()

  if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) shortcutLabel.value = '⌘K'

  if (authStore.isAuthenticated) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  }
})

onBeforeUnmount(() => profileRequest.abort())

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  } else {
    playerStore.setCurrentPlayer(null)
  }
})

const avatarUrl = computed(() => {
  const player = playerStore.currentPlayer
  if (!player?.profilePictureUrl) return null
  return `${config.public.gameOnApiUrl}/player/${player.id}/pp`
})

const avatarInitial = computed(() => {
  const source = playerStore.currentPlayer?.nickname || authStore.displayName
  return source?.charAt(0).toUpperCase() || '?'
})

const profileLabel = computed(() =>
  playerStore.currentPlayer?.fullName
  || playerStore.currentPlayer?.nickname
  || authStore.displayName
  || 'Mon profil'
)

const toggleTheme = () => {
  isDark.value = !isDark.value
  applyTheme(isDark.value ? 'dark' : 'light')
}
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-border-base bg-header backdrop-blur-[14px]">
    <div class="mx-auto flex h-[58px] max-w-[1280px] items-center gap-[22px] px-4 md:h-[68px] md:px-8">
      <NuxtLink to="/" aria-label="JungleDiff, accueil" class="group flex shrink-0 items-center gap-2.5">
        <span class="flex size-10 items-center justify-center rounded-xl transition-transform duration-300 ease-spring group-hover:scale-[1.08]">
          <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-8 object-contain">
        </span>
        <span class="text-[21px] font-bold tracking-[-0.03em] text-text-main">JungleDiff</span>
      </NuxtLink>

      <nav aria-label="Navigation principale" class="hidden items-center gap-1.5 md:flex">
        <NuxtLink to="/" class="nav-pill">Accueil</NuxtLink>
        <NuxtLink to="/stats" class="nav-pill">Records</NuxtLink>
      </nav>

      <span class="flex-1" />

      <div class="flex items-center gap-2.5">
        <button
          type="button"
          aria-label="Chercher un joueur du crew"
          class="hidden h-10 w-[260px] cursor-pointer items-center gap-2.5 rounded-full border border-border-base bg-surface-base py-0 pl-3.5 pr-1.5 text-[13.5px] font-medium text-text-sec shadow-card transition-transform duration-200 hover:-translate-x-px hover:-translate-y-px md:flex"
          @click="palette.open()"
        >
          <Icon name="lucide:search" class="size-4 shrink-0" />
          <span class="flex-1 text-left">Chercher un joueur…</span>
          <kbd class="rounded-full bg-surface-high px-2 py-1.5 font-mono text-[11px] font-semibold leading-none text-text-sec">{{ shortcutLabel }}</kbd>
        </button>

        <button
          type="button"
          :aria-label="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
          :title="isDark ? 'Thème clair' : 'Thème sombre'"
          class="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border-base bg-surface-base text-text-sec transition-colors hover:text-text-main"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-[17px]" />
        </button>

        <ClientOnly>
          <NuxtLink
            v-if="authStore.isAuthenticated"
            to="/settings"
            title="Paramètres du compte"
            class="flex h-10 items-center gap-[9px] rounded-full border border-border-base bg-surface-base py-[3px] pl-[3px] pr-[3px] md:pr-3.5"
          >
            <span class="flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-base bg-brand-gold-bright text-[13px] font-bold text-ink">
              <UiAppImage v-if="avatarUrl" :src="avatarUrl" alt="" class="size-full object-cover" />
              <span v-else>{{ avatarInitial }}</span>
            </span>
            <span class="hidden max-w-[150px] truncate text-[13.5px] font-bold text-text-main md:block">{{ profileLabel }}</span>
          </NuxtLink>
          <button
            v-else
            type="button"
            class="flex h-10 cursor-pointer items-center whitespace-nowrap rounded-full border border-border-base bg-brand-gold px-4 text-sm font-bold text-brand-gold-text shadow-card md:px-[18px]"
            @click="authStore.login()"
          >
            Se connecter
          </button>
          <template #fallback>
            <div class="h-10 w-10 animate-pulse rounded-full border border-border-base bg-surface-base md:w-28" />
          </template>
        </ClientOnly>
      </div>
    </div>
  </header>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.nav-pill {
  @apply rounded-full px-3.5 py-[7px] text-sm font-semibold text-text-main transition-colors duration-200 hover:bg-text-main/[0.06];
}

.nav-pill[aria-current='page'] {
  @apply bg-inverse font-bold text-inverse-text hover:bg-inverse;
}
</style>
