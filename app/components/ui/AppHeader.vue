<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { isAuthenticated, user, login, logout } = useAuth()
const isMobileMenuOpen = ref(false)
const isLight = ref(false)

onMounted(() => {
  const saved = localStorage.getItem('theme')
  if (saved === 'light') {
    isLight.value = true
    document.documentElement.classList.add('light')
  }
})

const toggleTheme = () => {
  isLight.value = !isLight.value
  if (isLight.value) {
    document.documentElement.classList.add('light')
    localStorage.setItem('theme', 'light')
  } else {
    document.documentElement.classList.remove('light')
    localStorage.setItem('theme', 'dark')
  }
}
</script>

<template>
  <header class="w-full flex items-center justify-between px-6 py-4 md:px-8 md:py-5 max-w-[1400px] mx-auto relative z-50 animate-fade-in-up" style="animation-delay: 0ms;">
    <!-- Logo -->
    <NuxtLink to="/" class="flex items-center gap-2 w-auto md:w-[200px]" @click="isMobileMenuOpen = false">
      <div class="w-8 h-8 flex items-center justify-center">
        <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Logo" class="w-full h-full object-contain drop-shadow-sm" />
      </div>
      <span class="font-extrabold text-lg md:text-[22px] tracking-tight text-text-main">JungleDiff</span>
    </NuxtLink>

    <!-- Desktop Navigation -->
    <nav class="hidden md:flex items-center bg-surface-base/70 backdrop-blur-md p-1 rounded-full border border-border-base shadow-sm">
      <NuxtLink to="/" class="nav-link">Ladder</NuxtLink>
      <NuxtLink to="/records" class="nav-link opacity-50 pointer-events-none">Records</NuxtLink>
      <NuxtLink to="/duel" class="nav-link opacity-50 pointer-events-none">Duel</NuxtLink>
      <NuxtLink to="/champions" class="nav-link opacity-50 pointer-events-none">Champions</NuxtLink>
      <NuxtLink to="/recap" class="nav-link opacity-50 pointer-events-none">Récap</NuxtLink>
    </nav>

    <!-- Right Actions -->
    <div class="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-[200px]">
      <!-- Theme toggle button -->
      <button @click="toggleTheme" class="hidden md:flex w-9 h-9 items-center justify-center rounded-xl bg-surface-base shadow-sm border border-border-base text-text-sec hover:bg-surface-high transition-colors cursor-pointer">
        <svg v-if="isLight" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      </button>

      <!-- User Profile Pill -->
      <button v-if="isAuthenticated" class="flex items-center gap-2 pl-1 pr-3 py-1 bg-surface-base shadow-sm border border-border-base rounded-full cursor-pointer hover:bg-surface-high transition-colors h-9" @click="logout()">
        <div class="w-7 h-7 rounded-full bg-brand-gold text-brand-gold-text flex items-center justify-center text-xs font-bold">
          {{ (user as any)?.profile?.preferred_username?.charAt(0).toUpperCase() || 'V' }}
        </div>
        <span class="text-[13px] font-bold text-text-main hidden sm:block">
          {{ (user as any)?.profile?.preferred_username || 'Valentin' }}
        </span>
      </button>
      <button v-else class="flex items-center gap-2 px-4 py-1.5 bg-brand-gold text-brand-gold-text shadow-sm rounded-full cursor-pointer hover:opacity-90 transition-opacity h-9" @click="login()">
        <span class="text-[13px] font-bold">Se connecter</span>
      </button>

      <!-- Mobile Menu Toggle -->
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-surface-base shadow-sm border border-border-base text-text-sec hover:bg-surface-high transition-colors cursor-pointer ml-1">
        <svg v-if="!isMobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </header>

  <div v-if="isMobileMenuOpen" class="md:hidden fixed inset-0 top-[72px] bg-bg-base/95 backdrop-blur-md z-40 px-6 py-8 flex flex-col gap-4 border-t border-border-base">
    <NuxtLink to="/" class="mobile-nav-link" @click="isMobileMenuOpen = false">Ladder</NuxtLink>
    <NuxtLink to="/records" class="mobile-nav-link opacity-50 pointer-events-none" @click="isMobileMenuOpen = false">Records</NuxtLink>
    <NuxtLink to="/duel" class="mobile-nav-link opacity-50 pointer-events-none" @click="isMobileMenuOpen = false">Duel</NuxtLink>
    <NuxtLink to="/champions" class="mobile-nav-link opacity-50 pointer-events-none" @click="isMobileMenuOpen = false">Champions</NuxtLink>
    <NuxtLink to="/recap" class="mobile-nav-link opacity-50 pointer-events-none" @click="isMobileMenuOpen = false">Récap</NuxtLink>
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
