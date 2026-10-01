<script setup lang="ts">
import { computed } from 'vue'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useNow } from '~/composables/useNow'
import { isAbortError } from '~/lib/types/error'
import { championSplashUrl } from '~/utils/lol-champion'
import { timeAgo } from '~/utils/date'
import { parseApiDate } from '~/utils/lol-match'
import {
  ACCOUNT_STATUS_CHIPS,
  STALE_SYNC_MINUTES,
  accountRiotName,
  accountStatus,
  adminErrorMessage,
  minutesSinceSync,
  staleAccounts,
} from '~/utils/lol-admin'
import type { AdminAccountFilter } from '~/utils/lol-admin'
import AdminSectionHeader from '~/components/admin/AdminSectionHeader.vue'
import AdminAccountIcon from '~/components/admin/AdminAccountIcon.vue'
import AdminRoute from '~/components/admin/AdminRoute.vue'

useSeoMeta({ title: 'Administration' })

const admin = useAdminStore()
const api = useGameOnLol()
const now = useNow()

const isLoaded = computed(() => admin.loadStatus === 'success')

const stats = computed<Array<{ filter: AdminAccountFilter, label: string, sub: string }>>(() => [
  { filter: 'crew', label: 'Crew', sub: 'comptes rafraîchis toutes les 20 min' },
  { filter: 'smurf', label: 'Smurfs', sub: 'rattachés à un compte principal' },
  { filter: 'out', label: 'Hors crew', sub: 'suivis, rafraîchis à la demande' },
  { filter: 'archived', label: 'Archivés', sub: 'historique conservé' },
])

const runMaintenance = (key: 'ranks' | 'queues') => admin.runExclusive(key, async () => {
  try {
    if (key === 'ranks') {
      await api.refreshAllRanks(admin.signal())
      admin.toast('Rangs du crew rafraîchis')
      await admin.fetchAccounts({ silent: true })
    } else {
      await api.syncQueues(admin.signal())
      admin.toast('Types de file resynchronisés')
    }
  } catch (error) {
    if (isAbortError(error)) return
    console.error(`[admin] Maintenance "${key}" failed:`, error)
    admin.toast(adminErrorMessage(error, key === 'ranks'
      ? 'Le rafraîchissement des rangs a échoué.'
      : 'La resynchronisation des files a échoué.'), 'error')
  }
})

const maintenance = computed(() => [
  {
    key: 'ranks' as const,
    title: 'Rafraîchir tous les rangs',
    sub: 'Relit le rang Solo/Duo et Flex de chaque compte du crew.',
    route: 'PATCH /lol/Summoner/ranks',
  },
  {
    key: 'queues' as const,
    title: 'Resynchroniser les types de file',
    sub: 'Recharge la liste des files depuis Riot (noms des modes de jeu).',
    route: 'POST /lol/Queue/sync · gameon_admin',
  },
])

const stale = computed(() => {
  if (!isLoaded.value || !now.value) return []
  return staleAccounts(admin.accounts, now.value).map((account) => {
    const status = accountStatus(account)
    const busy = admin.isBusy(`refresh:${account.id}`)
    return {
      account,
      name: accountRiotName(account),
      chip: ACCOUNT_STATUS_CHIPS[status],
      ago: busy
        ? 'Rafraîchissement…'
        : account.lolRefreshedOn ? timeAgo(parseApiDate(account.lolRefreshedOn), now.value) : 'jamais synchronisé',
      isOld: minutesSinceSync(account, now.value) > STALE_SYNC_MINUTES,
      busy,
    }
  })
})

const gaps = [
  { where: 'API', title: 'Journal des opérations', need: 'Aucun historique des synchros ni des imports : tout part dans les logs serveur.' },
  { where: 'API', title: 'File rAImmus complète', need: 'La file est en mémoire, lisible ticket par ticket. Les abandons ne sont pas conservés.' },
  { where: 'API', title: 'Santé et quotas', need: 'Pas de route de santé, ni de compteur Riot ou du modèle.' },
  { where: 'API', title: 'Rôles et utilisateurs', need: 'Le rôle gameon_admin se gère dans la console Keycloak.' },
  { where: 'Front', title: 'Purge du cache', need: 'Aucune route Nitro pour vider le cache SWR de l\'accueil ni celui des versions Data Dragon.' },
] as const
</script>

<template>
  <section aria-labelledby="admin-overview-title" class="animate-rise">
    <AdminSectionHeader heading-id="admin-overview-title" title="Vue d'ensemble" description="Les comptes suivis et les tâches de maintenance exposées par l'API." />

    <div class="grid grid-cols-2 gap-3.5 min-[73.75rem]:grid-cols-4">
      <NuxtLink
        v-for="stat in stats"
        :key="stat.filter"
        :to="{ path: '/admin/players', query: { filter: stat.filter } }"
        class="flex flex-col gap-1.5 rounded-[22px] border border-border-subtle bg-surface-base p-[18px] shadow-card transition-transform duration-[350ms] ease-spring hover:-translate-y-[3px]"
      >
        <span class="text-sm font-bold">{{ stat.label }}</span>
        <span class="text-[44px] font-bold leading-none tracking-[-0.05em]">
          <template v-if="isLoaded">{{ admin.counts[stat.filter] }}</template>
          <span v-else class="inline-block h-11 w-14 animate-pulse rounded-xl bg-surface-sunken align-bottom" />
        </span>
        <span class="text-[12.5px] font-semibold text-text-sec">{{ stat.sub }}</span>
      </NuxtLink>
    </div>

    <div class="mt-5 grid items-start gap-5 min-[73.75rem]:grid-cols-2">
      <div class="relative isolate flex flex-col gap-3.5 overflow-hidden rounded-3xl bg-ink p-[22px] text-ink-text shadow-hero">
        <img :src="championSplashUrl('Rammus')" alt="" class="absolute inset-0 -z-10 size-full object-cover object-[right_30%]">
        <div aria-hidden="true" class="absolute inset-0 -z-10 bg-scrim-hero" />

        <h2 class="m-0 text-[17px] font-bold">Maintenance</h2>
        <div
          v-for="task in maintenance"
          :key="task.key"
          class="flex flex-wrap items-center gap-3 rounded-[18px] border border-white/12 bg-white/7 p-3.5"
        >
          <span class="flex min-w-[200px] flex-1 flex-col gap-[3px]">
            <span class="text-[14.5px] font-bold">{{ task.title }}</span>
            <span class="text-[12.5px] font-semibold text-ink-text/75">{{ task.sub }}</span>
            <AdminRoute on-ink>{{ task.route }}</AdminRoute>
          </span>
          <button
            type="button"
            :disabled="admin.isBusy(task.key)"
            class="inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-full bg-white px-[15px] text-[13px] font-bold text-ink transition-transform duration-[250ms] ease-spring enabled:hover:scale-[1.04] disabled:cursor-wait"
            @click="runMaintenance(task.key)"
          >
            <Icon name="lucide:rotate-cw" class="size-[13px] text-win" :class="{ 'animate-spin': admin.isBusy(task.key) }" />
            {{ admin.isBusy(task.key) ? 'En cours…' : 'Lancer' }}
          </button>
        </div>
        <p class="m-0 pt-1 text-[12.5px] font-semibold text-ink-text/75">
          L'API rafraîchit aussi seule les rangs du crew toutes les 20 min, et les types de file une fois par jour.
        </p>
      </div>

      <div class="rounded-3xl border border-border-subtle bg-surface-base p-5 shadow-card">
        <h2 class="m-0 text-xl font-bold tracking-[-0.025em]">Synchros les plus anciennes</h2>
        <p class="mb-2 mt-[3px] text-[12.5px] font-semibold text-text-sec">D'après lolRefreshedOn. Les comptes hors crew ne sont rafraîchis qu'à la demande.</p>

        <template v-if="stale.length">
          <div
            v-for="row in stale"
            :key="row.account.id"
            class="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-dashed border-border-dashed py-2.5"
          >
            <AdminAccountIcon :icon-id="row.account.lolIconId" :archived="row.account.archived" class="size-9 rounded-[11px]" />
            <span class="flex min-w-0 flex-col gap-px">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="truncate text-sm font-bold">{{ row.name }}</span>
                <span class="shrink-0 rounded-full px-[7px] text-[10.5px] font-bold" :class="row.chip.tone">{{ row.chip.label }}</span>
              </span>
              <span class="text-xs font-semibold" :class="row.isOld ? 'text-brand-gold' : 'text-text-sec'">{{ row.ago }}</span>
            </span>
            <button
              type="button"
              :aria-label="`Rafraîchir ${row.name}`"
              title="Rafraîchir depuis Riot"
              :disabled="row.busy"
              class="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-border-accent transition-colors duration-200 enabled:hover:border-text-main/35 disabled:cursor-wait"
              @click="admin.refreshAccount(row.account.id)"
            >
              <Icon name="lucide:rotate-cw" class="size-3.5 text-win" :class="{ 'animate-spin': row.busy }" />
            </button>
          </div>
        </template>
        <template v-else-if="admin.loadStatus === 'pending' || !now">
          <div v-for="index in 4" :key="index" class="flex items-center gap-3 border-t border-dashed border-border-dashed py-2.5">
            <span class="size-9 animate-pulse rounded-[11px] bg-surface-sunken" />
            <span class="h-4 w-32 animate-pulse rounded bg-surface-sunken" />
          </div>
        </template>
        <p v-else class="m-0 border-t border-dashed border-border-dashed pb-1 pt-3.5 text-[13.5px] font-semibold text-text-sec">Aucun compte à afficher.</p>
      </div>
    </div>

    <div class="mt-5 rounded-3xl border-[1.5px] border-dashed border-border-dashed p-5">
      <h2 class="m-0 text-xl font-bold tracking-[-0.025em]">Pas encore possible</h2>
      <p class="mb-3 mt-[3px] text-[12.5px] font-semibold text-text-sec">Ce que l'admin pourrait offrir, mais qu'aucune route ne permet aujourd'hui.</p>
      <div class="grid gap-2.5 md:grid-cols-2 min-[73.75rem]:grid-cols-5">
        <div v-for="gap in gaps" :key="gap.title" class="flex flex-col gap-1.5 rounded-2xl border border-border-subtle bg-surface-base p-3.5">
          <span
            class="self-start rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold"
            :class="gap.where === 'API' ? 'bg-loss-soft text-brand-red' : 'bg-brand-gold-soft text-brand-gold'"
          >{{ gap.where }}</span>
          <span class="text-sm font-bold">{{ gap.title }}</span>
          <span class="text-[12.5px] font-semibold text-pretty text-text-sec">{{ gap.need }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
