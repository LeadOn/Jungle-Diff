<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '~/composables/useAuth'

const { isAuthenticated, user, login, logout } = useAuth()
const isMobileMenuOpen = ref(false)
const isDark = ref(false)

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (import.meta.client) {
    if (isDark.value) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }
}
</script>

<template>
  <header class="w-full flex items-center justify-between px-6 py-4 md:px-8 md:py-5 max-w-[1400px] mx-auto relative z-50">
    <!-- Logo -->
    <NuxtLink to="/" class="flex items-center gap-2 w-auto md:w-[200px]" @click="isMobileMenuOpen = false">
      <div class="w-8 h-8 flex items-center justify-center">
        <img src="~/assets/img/JungleDiff_Logo.png" alt="JungleDiff Logo" class="w-full h-full object-contain drop-shadow-sm" />
      </div>
      <span class="font-extrabold text-lg md:text-[22px] tracking-tight text-gray-900">JungleDiff</span>
    </NuxtLink>

    <!-- Desktop Navigation -->
    <nav class="hidden md:flex items-center bg-white/70 backdrop-blur-md p-1 rounded-full border border-gray-200/50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]">
      <NuxtLink to="/" class="nav-link">Ladder</NuxtLink>
      <NuxtLink to="/records" class="nav-link">Records</NuxtLink>
      <NuxtLink to="/duel" class="nav-link">Duel</NuxtLink>
      <NuxtLink to="/champions" class="nav-link">Champions</NuxtLink>
      <NuxtLink to="/recap" class="nav-link">Récap</NuxtLink>
    </nav>

    <!-- Right Actions -->
    <div class="flex items-center justify-end gap-2 md:gap-3 w-auto md:w-[200px]">
      <!-- Theme toggle button -->
      <button @click="toggleTheme" class="hidden md:flex w-9 h-9 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200/60 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer">
        <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      </button>

      <!-- User Profile Pill -->
      <button v-if="isAuthenticated" class="flex items-center gap-2 pl-1 pr-3 py-1 bg-white shadow-sm border border-gray-200/60 rounded-full cursor-pointer hover:bg-gray-50 transition-colors h-9" @click="logout()">
        <div class="w-7 h-7 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center text-xs font-bold">
          {{ (user as any)?.profile?.preferred_username?.charAt(0).toUpperCase() || 'V' }}
        </div>
        <span class="text-[13px] font-bold text-gray-900 hidden sm:block">
          {{ (user as any)?.profile?.preferred_username || 'Valentin' }}
        </span>
      </button>
      <button v-else class="flex items-center gap-2 px-4 py-1.5 bg-[var(--color-brand)] text-white shadow-sm rounded-full cursor-pointer hover:bg-[var(--color-brand-hover)] transition-colors h-9" @click="login()">
        <span class="text-[13px] font-bold">Se connecter</span>
      </button>

      <!-- Mobile Menu Toggle -->
      <button @click="isMobileMenuOpen = !isMobileMenuOpen" class="md:hidden w-9 h-9 flex items-center justify-center rounded-xl bg-white shadow-sm border border-gray-200/60 text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer ml-1">
        <svg v-if="!isMobileMenuOpen" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  </header>

  <!-- Mobile Menu Overlay -->
  <div v-if="isMobileMenuOpen" class="md:hidden fixed inset-0 top-[72px] bg-[#faf9f6]/95 backdrop-blur-md z-40 px-6 py-8 animate-in fade-in slide-in-from-top-4 duration-200 flex flex-col gap-4 border-t border-gray-200/50">
    <NuxtLink to="/" class="mobile-nav-link" @click="isMobileMenuOpen = false">Ladder</NuxtLink>
    <NuxtLink to="/records" class="mobile-nav-link" @click="isMobileMenuOpen = false">Records</NuxtLink>
    <NuxtLink to="/duel" class="mobile-nav-link" @click="isMobileMenuOpen = false">Duel</NuxtLink>
    <NuxtLink to="/champions" class="mobile-nav-link" @click="isMobileMenuOpen = false">Champions</NuxtLink>
    <NuxtLink to="/recap" class="mobile-nav-link" @click="isMobileMenuOpen = false">Récap</NuxtLink>
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.nav-link {
  @apply px-4 py-1.5 text-sm font-semibold rounded-full text-gray-500 transition-all;
}
.nav-link:hover {
  @apply text-gray-900;
}
.router-link-exact-active.nav-link {
  @apply bg-white shadow-sm text-gray-900;
}

.mobile-nav-link {
  @apply text-2xl font-black text-gray-400 py-2 transition-colors;
}
.router-link-exact-active.mobile-nav-link {
  @apply text-gray-900;
}
</style>
