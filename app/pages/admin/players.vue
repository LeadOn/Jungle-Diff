<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from '#app'
import type { LoLAdminAccountDto } from '~/lib/types'
import { useAdminStore } from '~/stores/admin'
import { usePlayerStore } from '~/stores/player'
import { useNow } from '~/composables/useNow'
import { isSmurf } from '~/utils/lol-smurf'
import { tierEmblemUrl, tierLabel } from '~/utils/lol-tier'
import { timeAgo } from '~/utils/date'
import { parseApiDate } from '~/utils/lol-match'
import {
  ADMIN_ACCOUNT_FILTERS,
  STALE_SYNC_MINUTES,
  accountRiotName,
  filterAccounts,
  hasKeycloakUser,
  isAdminAccountFilter,
  minutesSinceSync,
  sortAccounts,
} from '~/utils/lol-admin'
import type { AdminAccountFilter } from '~/utils/lol-admin'
import AdminSectionHeader from '~/components/admin/AdminSectionHeader.vue'
import AdminAccountIcon from '~/components/admin/AdminAccountIcon.vue'
import AdminAccountModal from '~/components/admin/AdminAccountModal.vue'
import AdminLinkSmurfModal from '~/components/admin/AdminLinkSmurfModal.vue'
import AdminButton from '~/components/admin/AdminButton.vue'
import AdminRoute from '~/components/admin/AdminRoute.vue'

useSeoMeta({ title: 'Joueurs · Administration' })

const route = useRoute()
const router = useRouter()
const admin = useAdminStore()
const playerStore = usePlayerStore()
const now = useNow()

const query = ref('')

/** The status filter lives in the URL, so the overview's counters can deep-link to it. */
const filter = computed<AdminAccountFilter>({
  get: () => (isAdminAccountFilter(route.query.filter) ? route.query.filter : 'crew'),
  set: (value) => {
    router.replace({ query: { ...route.query, filter: value === 'crew' ? undefined : value } })
  },
})

const managedId = ref<number | null>(null)
const managedAccount = computed(() => admin.accountById(managedId.value))
const isLinkOpen = ref(false)

const isLoaded = computed(() => admin.loadStatus === 'success')

type Chip = { label: string, tone: string }

const describe = (account: LoLAdminAccountDto) => {
  const main = isSmurf(account) ? admin.accountById(account.primaryPlayerId) : undefined
  const isMe = playerStore.currentPlayer?.id === account.id
  const chips: Chip[] = []
  if (isMe) chips.push({ label: 'Vous', tone: 'bg-brand-gold text-brand-gold-text' })
  if (isSmurf(account)) chips.push({ label: `Smurf de ${main ? accountRiotName(main) : '?'}`, tone: 'border border-border-accent bg-surface-base text-text-main' })
  if (!account.inCrew && !account.archived) chips.push({ label: 'Hors crew', tone: 'bg-brand-gold-soft text-brand-gold' })
  if (account.archived) chips.push({ label: 'Archivé', tone: 'bg-surface-high text-text-sec' })

  const rank = account.leagueOfLegendsSoloRank
  const busy = admin.isBusy(`refresh:${account.id}`)
  const hasUser = hasKeycloakUser(account)
  const syncText = !now.value
    ? ''
    : busy
      ? 'Rafraîchissement…'
      : account.lolRefreshedOn ? timeAgo(parseApiDate(account.lolRefreshedOn), now.value) : 'jamais synchronisé'

  return {
    account,
    name: accountRiotName(account),
    chips,
    rowTone: account.archived ? 'bg-surface-hover' : isMe ? 'bg-surface-highlight' : 'bg-surface-base',
    rank: tierLabel(rank),
    lp: rank ? `${rank.leaguePoints} LP` : '—',
    emblem: tierEmblemUrl(rank),
    isRanked: !!rank,
    user: hasUser ? account.nickname : main ? `Via ${main.nickname}` : 'Aucun',
    userSub: hasUser ? (account.fullName ?? '') : main ? 'compte secondaire' : 'jamais connecté',
    hasUser: hasUser || !!main,
    syncText,
    syncWarn: busy || (!!now.value && minutesSinceSync(account, now.value) > STALE_SYNC_MINUTES),
    busy,
  }
}

const rows = computed(() => sortAccounts(filterAccounts(admin.accounts, filter.value, query.value)).map(describe))
</script>

<template>
  <section aria-labelledby="admin-players-title" class="animate-rise">
    <AdminSectionHeader
      heading-id="admin-players-title"
      title="Joueurs"
      description="Un compte principal apparaît à la première connexion de son propriétaire. Les autres s'ajoutent comme smurfs."
    >
      <AdminButton size="lg" :disabled="!isLoaded" @click="isLinkOpen = true">
        <Icon name="lucide:plus" class="size-[15px]" />
        Lier un smurf
      </AdminButton>
    </AdminSectionHeader>

    <div class="mb-3.5 flex flex-wrap items-center gap-2.5">
      <label class="flex h-10 min-w-[220px] max-w-[340px] flex-1 items-center gap-2.5 rounded-full border border-border-base bg-surface-base px-3.5">
        <Icon name="lucide:search" class="size-[15px] shrink-0 text-text-sec" />
        <input
          v-model="query"
          type="search"
          placeholder="Riot ID, pseudo ou nom…"
          aria-label="Filtrer les joueurs"
          class="h-full min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-text-main outline-none"
        >
      </label>
      <div role="group" aria-label="Filtrer par statut" class="flex flex-wrap rounded-full border border-border-base bg-surface-base p-[3px]">
        <button
          v-for="option in ADMIN_ACCOUNT_FILTERS"
          :key="option.value"
          type="button"
          :aria-pressed="filter === option.value"
          class="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-[13px] py-1.5 text-[13px] font-bold transition-colors duration-200"
          :class="filter === option.value ? 'bg-inverse text-inverse-text' : 'text-text-main'"
          @click="filter = option.value"
        >
          {{ option.label }}
          <span v-if="isLoaded" class="font-mono text-[11px] opacity-65">{{ admin.counts[option.value] }}</span>
        </button>
      </div>
    </div>

    <div class="@container overflow-hidden rounded-3xl border border-border-base bg-surface-base shadow-card">
      <div
        aria-hidden="true"
        class="hidden grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_108px] items-center gap-3.5 bg-surface-hover px-4 py-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-sec @2xl:grid"
      >
        <span /><span>Compte Riot</span><span>Rang Solo/Duo</span><span>Compte JungleDiff</span><span>Dernière synchro</span><span class="text-right">Actions</span>
      </div>

      <template v-if="isLoaded">
        <ul class="m-0 list-none p-0">
          <li
            v-for="row in rows"
            :key="row.account.id"
            class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-border-subtle px-4 py-3 @2xl:grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_108px]"
            :class="row.rowTone"
          >
            <AdminAccountIcon :icon-id="row.account.lolIconId" :archived="row.account.archived" class="size-10 rounded-xl border border-border-base" />

            <span class="flex min-w-0 flex-col gap-[3px]">
              <span class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span class="text-[15px] font-bold [overflow-wrap:anywhere]" :class="row.account.archived ? 'text-text-sec' : 'text-text-main'">
                  {{ row.name }}<span v-if="row.account.riotGamesTagLine" class="font-medium text-text-sec">#{{ row.account.riotGamesTagLine }}</span>
                </span>
                <span
                  v-for="chip in row.chips"
                  :key="chip.label"
                  class="whitespace-nowrap rounded-full px-[7px] py-px text-[10.5px] font-bold"
                  :class="chip.tone"
                >{{ chip.label }}</span>
              </span>
              <span class="text-xs font-semibold text-text-sec @2xl:hidden">{{ row.rank }}<template v-if="row.syncText"> · {{ row.syncText }}</template></span>
            </span>

            <span class="hidden min-w-0 items-center gap-2 @2xl:flex">
              <img :src="row.emblem" alt="" class="size-[30px] shrink-0 object-contain" :class="{ 'opacity-40': !row.isRanked }">
              <span class="flex min-w-0 flex-col">
                <span class="whitespace-nowrap text-[13.5px] font-bold" :class="row.isRanked ? 'text-text-main' : 'text-text-sec'">{{ row.rank }}</span>
                <span class="font-mono text-[11px] text-text-sec">{{ row.lp }}</span>
              </span>
            </span>

            <span class="hidden min-w-0 flex-col gap-px @2xl:flex">
              <span class="truncate text-[13.5px] font-bold" :class="row.hasUser ? 'text-text-main' : 'text-text-sec'">{{ row.user }}</span>
              <span class="truncate text-[11.5px] font-semibold text-text-sec">{{ row.userSub }}</span>
            </span>

            <span class="hidden items-center gap-[7px] whitespace-nowrap text-[13px] font-bold @2xl:flex">
              <span aria-hidden="true" class="size-[7px] shrink-0 rounded-full" :class="row.syncWarn ? 'bg-brand-gold-bright' : 'bg-win'" />
              {{ row.syncText }}
            </span>

            <span class="flex items-center justify-end gap-1.5">
              <button
                type="button"
                title="Rafraîchir depuis Riot"
                :aria-label="`Rafraîchir ${row.name}`"
                :disabled="row.busy"
                class="flex size-[34px] cursor-pointer items-center justify-center rounded-full border border-border-accent bg-surface-base transition-colors duration-200 enabled:hover:border-text-main/35 disabled:cursor-wait"
                @click="admin.refreshAccount(row.account.id)"
              >
                <Icon name="lucide:rotate-cw" class="size-3.5 text-win" :class="{ 'animate-spin': row.busy }" />
              </button>
              <button
                type="button"
                :aria-label="`Gérer ${row.name}`"
                class="inline-flex h-[34px] cursor-pointer items-center rounded-full border border-border-accent bg-surface-base px-3.5 text-[12.5px] font-bold transition-colors duration-200 hover:border-text-main/35"
                @click="managedId = row.account.id"
              >
                Gérer
              </button>
            </span>
          </li>
        </ul>
        <p v-if="rows.length === 0" class="m-0 border-t border-border-subtle px-[18px] py-7 text-sm font-semibold text-text-sec">
          Aucun compte ne correspond à ce filtre.
        </p>
      </template>

      <div v-else-if="admin.loadStatus === 'error'" class="border-t border-border-subtle px-[18px] py-7 text-sm font-semibold text-text-sec">
        {{ admin.loadError }}
      </div>

      <div v-else>
        <div v-for="index in 6" :key="index" class="flex items-center gap-3.5 border-t border-border-subtle px-4 py-3">
          <span class="size-10 animate-pulse rounded-xl bg-surface-sunken" />
          <span class="h-4 w-40 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>
    </div>

    <p class="mx-1 mt-3"><AdminRoute>GET /lol/Summoner?archived=…&amp;includeOutOfCrew=true · PATCH /lol/Summoner/{id}</AdminRoute></p>

    <AdminAccountModal v-if="managedAccount" :key="managedAccount.id" :account="managedAccount" @close="managedId = null" />
    <AdminLinkSmurfModal v-if="isLinkOpen" @close="isLinkOpen = false" />
  </section>
</template>
