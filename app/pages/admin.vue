<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { useRoute, useRuntimeConfig } from '#app'
import { useAdminStore } from '~/stores/admin'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { ADMIN_ROLE } from '#shared/utils/admin-access'
import AdminToast from '~/components/admin/AdminToast.vue'

/**
 * The admin space ("JungleDiff Admin v2"): the section rail, and the section itself as a child
 * route. Reserved to signed-in `gameon_admin` holders — enforced by `auth.global.ts` on the server
 * and on the client; the GameOn API checks the role again on every admin route it serves.
 */
definePageMeta({
  layout: 'admin',
  auth: true,
  admin: true,
})

useSeoMeta({
  title: 'Administration',
  description: 'Espace d\'administration de JungleDiff.',
  robots: 'noindex, nofollow',
})

const route = useRoute()
const config = useRuntimeConfig()
const admin = useAdminStore()
const authStore = useAuthStore()
const playerStore = usePlayerStore()

// Re-read on every visit, keeping a list left from a previous one on screen while it reloads.
onMounted(() => admin.fetchAccounts({ silent: admin.loadStatus === 'success' }))

onBeforeUnmount(() => admin.dispose())

const sections = computed(() => [
  { to: '/admin', label: 'Vue d\'ensemble', count: null },
  { to: '/admin/players', label: 'Joueurs', count: admin.loadStatus === 'success' ? admin.counts.crew : null },
  { to: '/admin/games', label: 'Parties', count: null },
  { to: '/admin/coach', label: 'rAImmus', count: null },
])

const currentPath = computed(() => route.path.toLowerCase().replace(/\/+$/, '') || '/')

const signedInAs = computed(() => playerStore.currentPlayer?.nickname || authStore.displayName || '—')
</script>

<template>
  <div>
    <div class="grid items-start gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside class="relative min-w-0 lg:sticky lg:top-[92px]">
        <nav aria-label="Sections d'administration" class="-mx-4 flex gap-1 overflow-x-auto px-4 py-0.5 [scrollbar-width:none] md:-mx-8 md:px-8 lg:mx-0 lg:flex-col lg:p-0 [&::-webkit-scrollbar]:hidden">
          <NuxtLink
            v-for="section in sections"
            :key="section.to"
            :to="section.to"
            class="flex h-[42px] shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-full pl-4 pr-3 text-sm font-bold transition-colors duration-200"
            :class="currentPath === section.to ? 'bg-inverse text-inverse-text' : 'text-text-main hover:bg-text-main/[0.06]'"
          >
            <span>{{ section.label }}</span>
            <span
              v-if="section.count !== null"
              class="inline-flex h-[22px] min-w-6 items-center justify-center rounded-full px-[7px] font-mono text-[11px] font-semibold"
              :class="currentPath === section.to ? 'bg-inverse-text/15 text-inverse-text' : 'bg-surface-sunken text-text-main'"
            >{{ section.count }}</span>
          </NuxtLink>
        </nav>

        <div class="mt-[22px] hidden rounded-[20px] border-[1.5px] border-dashed border-border-dashed p-4 lg:block">
          <div class="text-xs font-semibold text-text-sec">Connecté en tant que</div>
          <ClientOnly>
            <div class="mt-1 truncate text-[15px] font-bold">{{ signedInAs }}</div>
            <template #fallback>
              <div class="mt-1 h-5 w-24 animate-pulse rounded bg-surface-sunken" />
            </template>
          </ClientOnly>
          <div class="mt-2 inline-flex rounded-full bg-brand-gold-soft px-[9px] py-[3px] font-mono text-[11px] font-semibold text-brand-gold">{{ ADMIN_ROLE }}</div>
          <div class="mt-3.5 border-t border-border-subtle pt-3 font-mono text-[11px] text-text-sec">
            Front v{{ config.public.appVersion }}
          </div>
        </div>
      </aside>

      <div class="min-w-0">
        <NuxtPage />
      </div>
    </div>

    <AdminToast />
  </div>
</template>
