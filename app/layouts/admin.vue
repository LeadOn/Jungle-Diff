<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRuntimeConfig } from '#app'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { applyTheme, isDarkTheme } from '~/utils/theme'

/**
 * Chrome of the admin space ("JungleDiff Admin v2"): its own header, with the "Admin" chip and a way
 * back to the site, and no crew search or mobile bar. The theme toggle is kept, like on every page.
 */
const config = useRuntimeConfig()
const authStore = useAuthStore()
const playerStore = usePlayerStore()
const isDark = ref(false)

const profileRequest = new AbortController()

onMounted(() => {
  isDark.value = isDarkTheme()
  playerStore.fetchCurrentPlayer(false, profileRequest.signal)
})

onBeforeUnmount(() => profileRequest.abort())

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
  <div class="relative min-h-screen overflow-x-clip">
    <header class="sticky top-0 z-50 border-b border-line bg-header backdrop-blur-[12px]">
      <div class="mx-auto flex h-14 max-w-[1280px] items-center gap-3 px-4 md:px-6 rail:px-8">
        <NuxtLink to="/" aria-label="JungleDiff, accueil" class="flex shrink-0 items-center gap-2 text-ink no-underline">
          <img src="~/assets/img/JungleDiff_Logo.png" alt="" class="size-[30px] object-contain">
          <b class="hidden font-wide text-[18px] font-[780] tracking-[-0.035em] md:inline">JungleDiff</b>
        </NuxtLink>
        <span class="inline-flex h-6 items-center rounded-1 bg-ink px-2 type-label text-paper">Admin</span>

        <span class="flex-1" />

        <button
          type="button"
          :aria-label="isDark ? 'Passer au thème clair' : 'Passer au thème sombre'"
          :title="isDark ? 'Thème clair' : 'Thème sombre'"
          class="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-2 text-ink-2 transition-colors duration-120 ease-out hover:bg-neutral-soft hover:text-ink"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-4" />
        </button>

        <NuxtLink
          to="/"
          aria-label="Retour au site"
          class="inline-flex h-9 shrink-0 items-center gap-2 rounded-2 border border-line-strong bg-surface px-2.5 text-sm font-semibold text-ink no-underline transition-colors duration-120 ease-out hover:border-ink-3 hover:bg-raised md:px-[14px]"
        >
          <Icon name="lucide:arrow-left" class="size-4 shrink-0" />
          <span class="hidden md:inline">Retour au site</span>
        </NuxtLink>

        <ClientOnly>
          <NuxtLink
            to="/settings"
            title="Paramètres du compte"
            class="inline-flex h-9 shrink-0 items-center gap-2 rounded-2 border border-line bg-surface pl-[3px] pr-[3px] text-[13px] font-[620] text-ink no-underline transition-colors duration-120 ease-out hover:border-line-strong md:pr-2.5"
          >
            <span class="flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gold text-xs font-bold text-on-tier shadow-[0_0_0_1px_var(--line)]">
              <UiAppImage v-if="avatarUrl" :src="avatarUrl" alt="" class="size-full object-cover" />
              <span v-else>{{ avatarInitial }}</span>
            </span>
            <span class="hidden max-w-[150px] truncate md:inline">{{ profileLabel }}</span>
          </NuxtLink>
          <template #fallback>
            <UiSkeleton class="h-9 w-9 rounded-2 md:w-28" />
          </template>
        </ClientOnly>
      </div>
    </header>

    <main class="mx-auto max-w-[1280px] px-4 pt-7 md:px-6 md:pt-9 rail:px-8">
      <slot />
    </main>

    <footer class="mt-14 border-t border-line">
      <div class="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-5 gap-y-2.5 px-4 pb-7 pt-[18px] text-[13px] text-ink-3 md:px-6 rail:px-8">
        <span class="font-mono text-xs font-medium tabular-nums">JungleDiff · Administration · v{{ config.public.appVersion }}</span>
        <span>Créé en France par <a href="https://www.valentinvirot.fr" target="_blank" rel="noopener noreferrer" class="font-semibold text-ink no-underline hover:underline">LeadOn</a></span>
      </div>
    </footer>
  </div>
</template>
