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
  <header class="sticky top-0 z-50 border-b border-line bg-header backdrop-blur-[12px]">
    <div class="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:px-6 rail:px-8">
      <NuxtLink to="/" aria-label="JungleDiff, accueil" class="flex shrink-0 items-center gap-2 text-ink no-underline">
        <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-[30px] object-contain">
        <b class="font-wide text-[17px] font-[780] tracking-[-0.035em] md:text-[18px]">JungleDiff</b>
      </NuxtLink>

      <nav aria-label="Navigation principale" class="ml-3 hidden items-center gap-0.5 md:flex">
        <NuxtLink to="/" class="navtab">Accueil</NuxtLink>
        <NuxtLink to="/stats" class="navtab">Records</NuxtLink>
      </nav>

      <span class="flex-1" />

      <button
        type="button"
        aria-label="Chercher un joueur du crew"
        class="hidden h-9 w-[260px] cursor-text items-center gap-2 rounded-2 border border-line bg-sunken pl-2.5 pr-1.5 text-left text-[13px] font-medium text-ink-3 transition-colors duration-120 ease-out hover:border-line-strong md:inline-flex"
        @click="palette.open()"
      >
        <Icon name="lucide:search" class="size-4 shrink-0" />
        <span class="min-w-0 flex-1 truncate">Chercher un joueur…</span>
        <kbd class="inline-flex h-[22px] items-center rounded-1 border border-line bg-surface px-1.5 font-mono text-[11px] font-medium text-ink-2">{{ shortcutLabel }}</kbd>
      </button>

      <button
        type="button"
        :aria-label="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
        :title="isDark ? 'Thème clair' : 'Thème sombre'"
        class="inline-flex size-9 cursor-pointer items-center justify-center rounded-2 text-ink-2 transition-colors duration-120 ease-out hover:bg-neutral-soft hover:text-ink"
        @click="toggleTheme"
      >
        <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-4" />
      </button>

      <ClientOnly>
        <NuxtLink
          v-if="authStore.isAuthenticated"
          to="/settings"
          title="Paramètres du compte"
          class="inline-flex h-9 items-center gap-2 rounded-2 border border-line bg-surface pl-[3px] pr-[3px] text-[13px] font-[620] text-ink no-underline transition-colors duration-120 ease-out hover:border-line-strong md:pr-2.5"
        >
          <span class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold text-xs font-bold text-on-tier shadow-[0_0_0_1px_var(--line)]">
            <UiAppImage v-if="avatarUrl" :src="avatarUrl" alt="" class="size-full object-cover" />
            <span v-else>{{ avatarInitial }}</span>
          </span>
          <span class="hidden max-w-[150px] truncate md:inline">{{ profileLabel }}</span>
        </NuxtLink>
        <UiButton
          v-else
          variant="gold"
          @click="authStore.login()"
        >
          Se connecter
        </UiButton>
        <template #fallback>
          <UiSkeleton class="h-9 w-9 rounded-2 md:w-28" />
        </template>
      </ClientOnly>
    </div>
  </header>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.navtab {
  position: relative;
  padding: 8px 10px;
  font-size: 0.875rem;
  font-weight: 560;
  color: var(--ink-2);
  text-decoration: none;
  border-radius: var(--radius-1);
  transition: background-color 120ms var(--ease-out), color 120ms var(--ease-out);
}

.navtab:hover {
  color: var(--ink);
  background: var(--neutral-soft);
}

.navtab[aria-current='page'] {
  color: var(--ink);
  font-weight: 640;
}

.navtab[aria-current='page']::after {
  content: "";
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: -10px;
  height: 2px;
  background: var(--ink);
}
</style>
