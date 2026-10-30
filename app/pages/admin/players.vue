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
  ACCOUNT_STATUS_CHIPS,
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
  // Text badges, toned like `UiStatus` and the overview's ACCOUNT_STATUS_CHIPS.
  if (isMe) chips.push({ label: 'Vous', tone: 'bg-gold text-on-tier' })
  if (isSmurf(account)) chips.push({ label: `Smurf de ${main ? accountRiotName(main) : '?'}`, tone: 'border border-line-strong text-ink-2' })
  if (!account.inCrew && !account.archived) chips.push({ label: 'Hors crew', tone: ACCOUNT_STATUS_CHIPS.out.tone })
  if (account.archived) chips.push({ label: 'Archivé', tone: ACCOUNT_STATUS_CHIPS.archived.tone })

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
    rowTone: account.archived ? 'bg-sunken' : isMe ? 'bg-gold-soft' : 'bg-surface',
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
  <section aria-labelledby="admin-players-title">
    <AdminSectionHeader
      heading-id="admin-players-title"
      title="Joueurs"
      description="Un compte principal apparaît à la première connexion de son propriétaire. Les autres s'ajoutent comme smurfs."
    >
      <AdminButton size="lg" icon="lucide:plus" :disabled="!isLoaded" @click="isLinkOpen = true">
        Lier un smurf
      </AdminButton>
    </AdminSectionHeader>

    <div class="mb-3.5 flex flex-wrap items-center gap-2.5">
      <label class="flex h-9 min-w-[220px] max-w-[340px] flex-1 cursor-text items-center gap-2 rounded-2 border border-line-strong bg-surface px-2.5 transition-colors duration-120 ease-out hover:border-ink-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
        <Icon name="lucide:search" class="size-4 shrink-0 text-ink-3" />
        <input
          v-model="query"
          type="search"
          placeholder="Riot ID, pseudo ou nom…"
          aria-label="Filtrer les joueurs"
          class="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
        >
      </label>
      <div role="group" aria-label="Filtrer par statut" class="inline-flex flex-wrap gap-0.5 rounded-2 border border-line bg-neutral-soft p-0.5">
        <button
          v-for="option in ADMIN_ACCOUNT_FILTERS"
          :key="option.value"
          type="button"
          :aria-pressed="filter === option.value"
          class="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-1 border-0 px-3 text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-120 ease-out"
          :class="filter === option.value
            ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
            : 'bg-transparent text-ink-2 hover:text-ink'"
          @click="filter = option.value"
        >
          {{ option.label }}
          <span v-if="isLoaded" class="font-mono text-[11px] font-medium tabular-nums text-ink-3">{{ admin.counts[option.value] }}</span>
        </button>
      </div>
    </div>

    <div class="@container overflow-hidden rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface shadow-card">
      <div
        aria-hidden="true"
        class="hidden grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_116px] items-center gap-3.5 bg-sunken px-4 py-3 type-label text-ink-2 @2xl:grid"
      >
        <span /><span>Compte Riot</span><span>Rang Solo/Duo</span><span>Compte JungleDiff</span><span>Dernière synchro</span><span class="text-right">Actions</span>
      </div>

      <template v-if="isLoaded">
        <ul class="m-0 list-none p-0">
          <li
            v-for="row in rows"
            :key="row.account.id"
            class="grid grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3.5 border-t border-line px-4 py-3 @2xl:grid-cols-[40px_minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)_116px]"
            :class="row.rowTone"
          >
            <AdminAccountIcon :icon-id="row.account.lolIconId" :archived="row.account.archived" class="size-10" />

            <span class="flex min-w-0 flex-col gap-1">
              <span class="flex min-w-0 flex-wrap items-center gap-1.5">
                <span class="text-[15px] font-semibold [overflow-wrap:anywhere]" :class="row.account.archived ? 'text-ink-2' : 'text-ink'">
                  {{ row.name }}<span v-if="row.account.riotGamesTagLine" class="font-mono text-xs font-medium text-ink-2">#{{ row.account.riotGamesTagLine }}</span>
                </span>
                <span
                  v-for="chip in row.chips"
                  :key="chip.label"
                  class="inline-flex h-5 items-center whitespace-nowrap rounded-1 px-1.5 text-[11px] font-[650]"
                  :class="chip.tone"
                >{{ chip.label }}</span>
              </span>
              <span class="text-xs text-ink-2 @2xl:hidden">{{ row.rank }}<template v-if="row.syncText"> · {{ row.syncText }}</template></span>
            </span>

            <span class="hidden min-w-0 items-center gap-2 @2xl:flex">
              <img :src="row.emblem" alt="" class="size-[30px] shrink-0 object-contain" :class="{ 'opacity-40': !row.isRanked }">
              <span class="flex min-w-0 flex-col gap-0.5">
                <span class="whitespace-nowrap text-[13px] font-semibold" :class="row.isRanked ? 'text-ink' : 'text-ink-2'">{{ row.rank }}</span>
                <span class="font-mono text-[11px] font-medium tabular-nums text-ink-2">{{ row.lp }}</span>
              </span>
            </span>

            <span class="hidden min-w-0 flex-col gap-0.5 @2xl:flex">
              <span class="truncate text-[13px] font-semibold" :class="row.hasUser ? 'text-ink' : 'text-ink-2'">{{ row.user }}</span>
              <span class="truncate text-xs text-ink-2">{{ row.userSub }}</span>
            </span>

            <span class="hidden items-center gap-[7px] whitespace-nowrap type-mono text-ink @2xl:flex">
              <span aria-hidden="true" class="size-[7px] shrink-0 rounded-full" :class="row.syncWarn ? 'bg-loss' : 'bg-canopy'" />
              {{ row.syncText }}
            </span>

            <span class="flex items-center justify-end gap-1.5">
              <button
                type="button"
                title="Rafraîchir depuis Riot"
                :aria-label="`Rafraîchir ${row.name}`"
                :disabled="row.busy"
                class="inline-flex size-9 cursor-pointer items-center justify-center rounded-2 border border-line-strong bg-surface text-ink-2 transition-colors duration-120 ease-out enabled:hover:border-ink-3 enabled:hover:text-ink disabled:cursor-progress"
                @click="admin.refreshAccount(row.account.id)"
              >
                <Icon name="lucide:rotate-cw" class="size-4" :class="{ 'animate-spin': row.busy }" />
              </button>
              <button
                type="button"
                :aria-label="`Gérer ${row.name}`"
                class="inline-flex h-9 cursor-pointer items-center rounded-2 border border-line-strong bg-surface px-3 text-sm font-semibold text-ink transition-colors duration-120 ease-out hover:border-ink-3 hover:bg-raised"
                @click="managedId = row.account.id"
              >
                Gérer
              </button>
            </span>
          </li>
        </ul>
        <p v-if="rows.length === 0" class="m-0 border-t border-line px-[18px] py-7 text-sm text-ink-2">
          Aucun compte ne correspond à ce filtre.
        </p>
      </template>

      <div v-else-if="admin.loadStatus === 'error'" class="flex items-start gap-2 border-t border-line px-[18px] py-7 text-sm font-semibold text-loss-ink">
        <Icon name="lucide:triangle-alert" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ admin.loadError }}</span>
      </div>

      <div v-else>
        <div v-for="index in 6" :key="index" class="flex items-center gap-3.5 border-t border-line px-4 py-3">
          <UiSkeleton circle class="size-10 shrink-0" />
          <UiSkeleton class="h-4 w-40" />
        </div>
      </div>
    </div>

    <p class="mx-1 mt-3"><AdminRoute>GET /lol/Summoner?archived=…&amp;includeOutOfCrew=true · PATCH /lol/Summoner/{id}</AdminRoute></p>

    <AdminAccountModal v-if="managedAccount" :key="managedAccount.id" :account="managedAccount" @close="managedId = null" />
    <AdminLinkSmurfModal v-if="isLinkOpen" @close="isLinkOpen = false" />
  </section>
</template>
