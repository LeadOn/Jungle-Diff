<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useRuntimeConfig } from '#app'
import { applyTheme, isLightTheme } from '~/utils/theme'

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const config = useRuntimeConfig()
const isMobileMenuOpen = ref(false)
const isLight = ref(false)

// The current player only feeds the header pill: abort the request if the header goes away before
// the response, rather than leaving a pending state write behind.
const profileRequest = new AbortController()

onMounted(() => {
  // `public/theme-init.js` already set the class before render; here we only mirror the document's
  // actual state into the component.
  isLight.value = isLightTheme()

  if (authStore.isAuthenticated) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  }
})

onBeforeUnmount(() => {
  profileRequest.abort()
  document.body.style.overflow = ''
})

watch(() => authStore.isAuthenticated, (isAuth) => {
  if (isAuth) {
    playerStore.fetchCurrentPlayer(false, profileRequest.signal)
  } else {
    playerStore.setCurrentPlayer(null)
  }
})

watch(isMobileMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
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
  isLight.value = !isLight.value
  applyTheme(isLight.value ? 'light' : 'dark')
}
</script>

<template>
  <header class="w-full flex items-center justify-between px-6 py-4 md:px-8 md:py-5 max-w-[1400px] mx-auto relative z-[60] animate-fade-in-up" style="animation-delay: 0ms;">
    <!-- Logo -->
    <NuxtLink to="/" class="flex items-center gap-2 w-auto md:w-[200px]" @click="isMobileMenuOpen = false">
      <div class="w-8 h-8 flex items-center justify-center">
        <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Logo" class="w-full h-full object-contain drop-shadow-sm" >
      </div>
      <span class="font-extrabold text-lg md:text-[22px] tracking-tight text-text-main">JungleDiff</span>
    </NuxtLink>

    <!-- Desktop Navigation -->
    <nav class="hidden md:flex items-center bg-surface-base/70 backdrop-blur-md p-1 rounded-full border border-border-base shadow-sm">
      <NuxtLink to="/" class="nav-link">Accueil</NuxtLink>
      <NuxtLink to="/stats" class="nav-link">Records</NuxtLink>
    </nav>

    <!-- Right Actions -->
    <div class="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-[200px]">
      <!-- Theme toggle button -->
      <button class="hidden md:flex w-9 h-9 items-center justify-center rounded-xl bg-surface-base shadow-sm border border-border-base text-text-sec hover:bg-surface-high transition-colors cursor-pointer" @click="toggleTheme">
        <Icon v-if="isLight" name="lucide:moon" class="text-[16px]" style="stroke-width: 2.5px;" />
        <Icon v-else name="lucide:sun" class="text-[16px]" style="stroke-width: 2.5px;" />
      </button>

      <!-- User Profile Pill -->
      <ClientOnly>
        <NuxtLink v-if="authStore.isAuthenticated" to="/settings" class="flex items-center gap-2 pl-1 pr-1 sm:pr-3 py-1 bg-surface-base shadow-sm border border-border-base rounded-full cursor-pointer hover:bg-surface-high transition-colors h-9">
          <div class="w-7 h-7 rounded-full bg-brand-gold text-brand-gold-text flex items-center justify-center text-xs font-bold overflow-hidden border border-border-subtle shadow-inner">
            <UiAppImage v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="w-full h-full object-cover" />
            <span v-else>{{ avatarInitial }}</span>
          </div>
          <span class="text-[13px] font-bold text-text-main hidden sm:block truncate max-w-[150px]">
            {{ profileLabel }}
          </span>
        </NuxtLink>
        <button v-else class="flex items-center gap-2 px-4 py-1.5 bg-brand-gold text-brand-gold-text shadow-sm rounded-full cursor-pointer hover:opacity-90 transition-opacity h-9" @click="authStore.login()">
          <span class="text-[13px] font-bold">Se connecter</span>
        </button>
        <template #fallback>
          <div class="w-24 h-9 bg-surface-base rounded-full animate-pulse border border-border-base"/>
        </template>
      </ClientOnly>

      <!-- Mobile Menu Toggle -->
      <button class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface-base shadow-sm border border-border-base text-text-sec hover:bg-surface-high transition-colors cursor-pointer ml-1" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <Icon v-if="!isMobileMenuOpen" name="lucide:menu" class="text-[18px]" style="stroke-width: 2.5px;" />
        <Icon v-else name="lucide:x" class="text-[18px]" style="stroke-width: 2.5px;" />
      </button>
    </div>
  </header>

  <div v-if="isMobileMenuOpen" class="md:hidden fixed inset-0 top-[72px] bg-surface-base z-[55] px-6 py-8 flex flex-col gap-4 border-t border-border-base shadow-xl">
    <NuxtLink to="/" class="mobile-nav-link" @click="isMobileMenuOpen = false">Classement</NuxtLink>
    <NuxtLink to="/stats" class="mobile-nav-link" @click="isMobileMenuOpen = false">Records</NuxtLink>
    
    <div class="mt-auto pt-6 border-t border-border-base flex items-center justify-between">
      <span class="text-sm font-bold text-text-sec">Thème (Clair / Sombre)</span>
      <button class="w-12 h-12 flex items-center justify-center rounded-xl bg-surface-high shadow-sm border border-border-base text-text-sec hover:bg-surface-high transition-colors cursor-pointer" @click="toggleTheme">
        <Icon v-if="isLight" name="lucide:moon" class="text-[20px]" style="stroke-width: 2.5px;" />
        <Icon v-else name="lucide:sun" class="text-[20px]" style="stroke-width: 2.5px;" />
      </button>
    </div>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.nav-link {
  @apply px-4 py-1.5 text-sm font-semibold rounded-full text-text-sec transition-all;
}
.nav-link:hover {
  @apply text-text-main;
}
.router-link-exact-active.nav-link {
  @apply bg-surface-high shadow-sm text-text-main border border-border-subtle;
}

.mobile-nav-link {
  @apply text-2xl font-black text-text-sec py-2 transition-colors;
}
.router-link-exact-active.mobile-nav-link {
  @apply text-text-main;
}
</style>
