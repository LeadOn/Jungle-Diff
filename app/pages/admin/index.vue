<script setup lang="ts">
import { computed } from 'vue'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useNow } from '~/composables/useNow'
import { isAbortError } from '~/lib/types/error'
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
import AdminButton from '~/components/admin/AdminButton.vue'

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
  <section aria-labelledby="admin-overview-title">
    <AdminSectionHeader heading-id="admin-overview-title" title="Vue d'ensemble" description="Les comptes suivis et les tâches de maintenance exposées par l'API." />

    <div class="grid grid-cols-2 gap-3 min-[73.75rem]:grid-cols-4">
      <NuxtLink
        v-for="stat in stats"
        :key="stat.filter"
        :to="{ path: '/admin/players', query: { filter: stat.filter } }"
        class="flex flex-col gap-2 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-4 text-ink no-underline shadow-card transition-colors duration-120 ease-out hover:border-line-strong md:p-[18px]"
      >
        <span class="text-sm font-semibold">{{ stat.label }}</span>
        <span class="block fig text-[44px]">
          <template v-if="isLoaded">{{ admin.counts[stat.filter] }}</template>
          <UiSkeleton v-else class="h-10 w-14" />
        </span>
        <span class="text-[13px] text-ink-2">{{ stat.sub }}</span>
      </NuxtLink>
    </div>

    <div class="mt-5 grid items-start gap-5 min-[73.75rem]:grid-cols-2">
      <UiPanel as="div" class="flex flex-col p-5">
        <h2 class="m-0 type-title text-ink">Maintenance</h2>
        <div
          v-for="task in maintenance"
          :key="task.key"
          class="mt-3 flex flex-wrap items-center gap-3 border-t border-dashed border-line-strong pt-3"
        >
          <span class="flex min-w-[200px] flex-1 flex-col gap-1">
            <span class="text-sm font-semibold text-ink">{{ task.title }}</span>
            <span class="text-[13px] text-ink-2">{{ task.sub }}</span>
            <AdminRoute>{{ task.route }}</AdminRoute>
          </span>
          <AdminButton
            variant="secondary"
            icon="lucide:rotate-cw"
            :busy="admin.isBusy(task.key)"
            @click="runMaintenance(task.key)"
          >
            {{ admin.isBusy(task.key) ? 'En cours…' : 'Lancer' }}
          </AdminButton>
        </div>
        <p class="m-0 mt-3 border-t border-dashed border-line-strong pt-3 text-[13px] text-ink-2">
          L'API rafraîchit aussi seule les rangs du crew toutes les 20 min, et les types de file une fois par jour.
        </p>
      </UiPanel>

      <UiPanel as="div" class="p-5">
        <h2 class="m-0 type-title text-ink">Synchros les plus anciennes</h2>
        <p class="mb-2 mt-1 text-[13px] text-ink-2">D'après lolRefreshedOn. Les comptes hors crew ne sont rafraîchis qu'à la demande.</p>

        <template v-if="stale.length">
          <div
            v-for="row in stale"
            :key="row.account.id"
            class="grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 border-t border-dashed border-line-strong py-2.5"
          >
            <AdminAccountIcon :icon-id="row.account.lolIconId" :archived="row.account.archived" class="size-9" />
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="flex min-w-0 items-center gap-1.5">
                <span class="truncate text-sm font-semibold text-ink">{{ row.name }}</span>
                <span class="inline-flex h-5 shrink-0 items-center rounded-1 px-1.5 text-[11px] font-[650]" :class="row.chip.tone">{{ row.chip.label }}</span>
              </span>
              <span class="type-mono" :class="row.isOld ? 'text-loss-ink' : 'text-ink-2'">{{ row.ago }}</span>
            </span>
            <button
              type="button"
              :aria-label="`Rafraîchir ${row.name}`"
              title="Rafraîchir depuis Riot"
              :disabled="row.busy"
              class="inline-flex size-9 cursor-pointer items-center justify-center rounded-2 border border-line-strong bg-surface text-ink-2 transition-colors duration-120 ease-out enabled:hover:border-ink-3 enabled:hover:text-ink disabled:cursor-progress"
              @click="admin.refreshAccount(row.account.id)"
            >
              <Icon name="lucide:rotate-cw" class="size-4" :class="{ 'animate-spin': row.busy }" />
            </button>
          </div>
        </template>
        <template v-else-if="admin.loadStatus === 'pending' || !now">
          <div v-for="index in 4" :key="index" class="flex items-center gap-3 border-t border-dashed border-line-strong py-2.5">
            <UiSkeleton circle class="size-9 shrink-0" />
            <UiSkeleton class="h-4 w-32" />
          </div>
        </template>
        <p v-else class="m-0 border-t border-dashed border-line-strong pb-1 pt-3.5 text-sm text-ink-2">Aucun compte à afficher.</p>
      </UiPanel>
    </div>

    <div class="mt-5 rounded-5 border border-dashed border-line-strong p-5">
      <h2 class="m-0 type-title text-ink">Pas encore possible</h2>
      <p class="mb-3 mt-1 text-[13px] text-ink-2">Ce que l'admin pourrait offrir, mais qu'aucune route ne permet aujourd'hui.</p>
      <div class="grid gap-2.5 md:grid-cols-2 min-[73.75rem]:grid-cols-5">
        <div v-for="gap in gaps" :key="gap.title" class="flex flex-col gap-1.5 rounded-3 border border-line bg-surface p-3.5">
          <span
            class="inline-flex h-5 items-center self-start rounded-1 px-1.5 font-mono text-[11px] font-medium"
            :class="gap.where === 'API' ? 'border border-line-strong text-ink-2' : 'bg-neutral-soft text-ink-2'"
          >{{ gap.where }}</span>
          <span class="text-sm font-semibold text-ink">{{ gap.title }}</span>
          <span class="text-[13px] text-pretty text-ink-2">{{ gap.need }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
