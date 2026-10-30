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
      <aside class="relative min-w-0 lg:sticky lg:top-20">
        <nav aria-label="Sections d'administration" class="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 [scrollbar-width:none] md:-mx-6 md:px-6 lg:mx-0 lg:flex-col lg:p-0 [&::-webkit-scrollbar]:hidden">
          <NuxtLink
            v-for="section in sections"
            :key="section.to"
            :to="section.to"
            class="flex h-10 shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-2 pl-3 pr-2 text-sm no-underline transition-[background-color,color,box-shadow] duration-120 ease-out"
            :class="currentPath === section.to
              ? 'bg-surface font-[640] text-ink shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
              : 'font-medium text-ink-2 hover:bg-neutral-soft hover:text-ink'"
          >
            <span>{{ section.label }}</span>
            <span
              v-if="section.count !== null"
              class="inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-neutral-soft px-1.5 font-mono text-[11px] font-medium tabular-nums"
              :class="currentPath === section.to ? 'text-ink' : 'text-ink-2'"
            >{{ section.count }}</span>
          </NuxtLink>
        </nav>

        <div class="mt-5 hidden rounded-5 border border-dashed border-line-strong p-4 lg:block">
          <div class="type-label text-ink-2">Connecté en tant que</div>
          <ClientOnly>
            <div class="mt-1.5 truncate text-[15px] font-semibold text-ink">{{ signedInAs }}</div>
            <template #fallback>
              <UiSkeleton class="mt-1.5 h-5 w-24" />
            </template>
          </ClientOnly>
          <div class="mt-2 inline-flex h-5 items-center rounded-1 bg-neutral-soft px-1.5 font-mono text-[11px] font-medium text-ink-2">{{ ADMIN_ROLE }}</div>
          <div class="mt-3.5 border-t border-line pt-3 font-mono text-[11px] text-ink-2">
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
