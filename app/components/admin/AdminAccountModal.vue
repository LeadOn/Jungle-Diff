<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import type { LoLAdminAccountDto } from '~/lib/types'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { useNow } from '~/composables/useNow'
import { isAbortError } from '~/lib/types/error'
import { isSmurf } from '~/utils/lol-smurf'
import { tierLabel } from '~/utils/lol-tier'
import { timeAgo } from '~/utils/date'
import { parseApiDate } from '~/utils/lol-match'
import {
  accountRiotName,
  adminErrorMessage,
  hasKeycloakUser,
  linkSmurfErrorMessage,
  sameRiotId,
} from '~/utils/lol-admin'
import AdminModal from './AdminModal.vue'
import AdminAccountIcon from './AdminAccountIcon.vue'
import AdminButton from './AdminButton.vue'
import AdminResult from './AdminResult.vue'
import AdminRiotIdInput from './AdminRiotIdInput.vue'
import AdminRoute from './AdminRoute.vue'
import AdminSwitch from './AdminSwitch.vue'

/**
 * "Gérer": one account's settings, spread over the three admin routes that own them. Nothing is sent
 * until "Enregistrer", except linking and unlinking smurfs, which act at once like the mock-up's.
 *
 * The form is seeded once, when the dialog opens: the list may reload behind it (after a link, say)
 * and must not wipe what is being typed. Everything else — smurfs, main, header — reads the live list.
 */
const props = defineProps<{ account: LoLAdminAccountDto }>()

const emit = defineEmits<{ close: [] }>()

const admin = useAdminStore()
const api = useGameOnLol()
const now = useNow()

const id = props.account.id
const hasUser = hasKeycloakUser(props.account)
const isSecondary = isSmurf(props.account)

const initial = {
  nickname: props.account.nickname,
  fullName: props.account.fullName ?? '',
  riotName: props.account.riotGamesNickname ?? '',
  riotTag: props.account.riotGamesTagLine ?? '',
  inCrew: props.account.inCrew,
  archived: props.account.archived,
}
const form = reactive({ ...initial, linkName: '', linkTag: 'EUW' })

const saving = ref(false)
const saveError = ref<string | null>(null)
const linkResult = ref<{ ok: boolean, text: string } | null>(null)

const live = computed(() => admin.accountById(id) ?? props.account)
const title = computed(() => `${accountRiotName(live.value)}${live.value.riotGamesTagLine ? `#${live.value.riotGamesTagLine}` : ''}`)

const subtitle = computed(() => {
  const parts: string[] = []
  if (hasUser && live.value.fullName) parts.push(live.value.fullName)
  parts.push(tierLabel(live.value.leagueOfLegendsSoloRank))
  if (now.value) {
    parts.push(live.value.lolRefreshedOn
      ? `synchro ${timeAgo(parseApiDate(live.value.lolRefreshedOn), now.value)}`
      : 'jamais synchronisé')
  }
  return parts.join(' · ')
})

const main = computed(() => (isSecondary ? admin.accountById(live.value.primaryPlayerId) : undefined))
const smurfs = computed(() => admin.accounts.filter(account => isSmurf(account) && account.primaryPlayerId === id))
const crewSmurfCount = computed(() => smurfs.value.filter(smurf => smurf.inCrew && !smurf.archived).length)

type Change = 'riot' | 'player' | 'crew'

const changes = computed<Change[]>(() => {
  const list: Change[] = []
  if (!sameRiotId({ name: form.riotName, tag: form.riotTag }, { name: initial.riotName, tag: initial.riotTag })) list.push('riot')
  if (hasUser && (form.nickname !== initial.nickname || form.fullName !== initial.fullName || form.archived !== initial.archived)) list.push('player')
  if (form.inCrew !== initial.inCrew) list.push('crew')
  return list
})

/** What would make the API refuse the save, checked before anything is sent. */
const invalidReason = computed(() => {
  if (changes.value.includes('riot') && (!form.riotName.trim() || !form.riotTag.trim())) return 'Le Riot ID demande un pseudo et un tag.'
  if (changes.value.includes('player') && (!form.nickname.trim() || !form.fullName.trim())) return 'Le pseudo et le nom complet sont obligatoires.'
  return null
})

const leaveCrewWarning = computed(() => {
  if (form.inCrew || !initial.inCrew || crewSmurfCount.value === 0) return null
  const count = crewSmurfCount.value
  return count > 1
    ? `Ses ${count} smurfs sortiront aussi du crew, et n'y reviendront pas automatiquement.`
    : 'Son smurf sortira aussi du crew, et n\'y reviendra pas automatiquement.'
})

const dirtyLabel = computed(() => {
  if (invalidReason.value) return invalidReason.value
  const count = changes.value.length
  if (count === 0) return 'Aucune modification'
  return `${count} appel${count > 1 ? 's' : ''} à envoyer`
})

const routes = computed(() => {
  const list: string[] = []
  if (hasUser) list.push('PATCH /Player · Pseudo, Nom complet, Archivé (objet complet)')
  list.push(`PATCH /lol/Summoner/${id}/admin?riotGamesNickname&riotGamesTagLine`)
  list.push(`PATCH /lol/Summoner/${id}/crew?inCrew`)
  list.push(isSecondary
    ? `DELETE /lol/Summoner/smurfs/${id}`
    : `POST /lol/Summoner/${id}/smurfs · DELETE /lol/Summoner/smurfs/{id}`)
  return list
})

const save = async () => {
  if (saving.value || changes.value.length === 0 || invalidReason.value) return
  saving.value = true
  saveError.value = null
  const done: string[] = []

  try {
    if (changes.value.includes('riot')) {
      const requested = { name: form.riotName.trim(), tag: form.riotTag.trim() }
      const updated = await api.updateRiotId(id, requested.name, requested.tag, admin.signal())
      // The API answers 200 with the account untouched when Riot does not know the ID or another
      // account already holds it: only the Riot ID it hands back says whether it took.
      if (!sameRiotId({ name: updated.riotGamesNickname, tag: updated.riotGamesTagLine }, requested)) {
        throw new Error('riot-id-rejected')
      }
      done.push('Riot ID')
    }

    if (changes.value.includes('player')) {
      await api.updatePlayer({
        id,
        // Sent back as read: the API overwrites it, and a blank one would detach the Keycloak user.
        keycloakId: props.account.keycloakId,
        nickname: form.nickname.trim(),
        fullName: form.fullName.trim(),
        archived: form.archived,
        riotGamesNickname: live.value.riotGamesNickname,
        riotGamesTagLine: live.value.riotGamesTagLine,
      }, admin.signal())
      done.push(form.archived !== initial.archived ? (form.archived ? 'archivé' : 'restauré') : 'profil')
    }

    if (changes.value.includes('crew')) {
      const result = await api.setCrewMembership(id, form.inCrew, admin.signal())
      const dragged = result.affectedSmurfAccounts
      done.push(form.inCrew
        ? 'dans le crew'
        : `hors crew${dragged ? ` avec ${dragged} smurf${dragged > 1 ? 's' : ''}` : ''}`)
    }

    admin.toast(`${title.value} · ${done.join(', ')}`)
    emit('close')
  } catch (error) {
    if (isAbortError(error)) return
    console.error('[admin] Account update failed:', error)
    const reason = error instanceof Error && error.message === 'riot-id-rejected'
      ? 'Riot ID refusé : Riot ne le connaît pas, ou un autre compte l\'utilise déjà.'
      : adminErrorMessage(error, 'L\'API a refusé la modification.')
    saveError.value = done.length ? `${done.join(', ')} : enregistré. Ensuite, ${reason.charAt(0).toLowerCase()}${reason.slice(1)}` : reason
  } finally {
    saving.value = false
    admin.fetchAccounts({ silent: true })
  }
}

const unlink = async (smurf: LoLAdminAccountDto, closeAfter: boolean) => {
  const mainName = accountRiotName(main.value ?? live.value)
  await admin.runExclusive(`unlink:${smurf.id}`, async () => {
    try {
      await api.unlinkSmurf(smurf.id, admin.signal())
      admin.toast(`${accountRiotName(smurf)} délié de ${closeAfter ? mainName : accountRiotName(live.value)}`)
      await admin.fetchAccounts({ silent: true })
      if (closeAfter) emit('close')
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Smurf unlink failed:', error)
      admin.toast(adminErrorMessage(error, `${accountRiotName(smurf)} n'a pas pu être délié.`), 'error')
    }
  })
}

const canLink = computed(() => form.linkName.trim() !== '' && form.linkTag.trim() !== '')

const link = async () => {
  if (!canLink.value) return
  linkResult.value = null
  await admin.runExclusive(`link:${id}`, async () => {
    try {
      const result = await api.linkSmurf(id, form.linkName.trim(), form.linkTag.trim(), admin.signal())
      const count = result.backfilledParticipations
      linkResult.value = {
        ok: true,
        text: `Lié à ${accountRiotName(live.value)} · ${count} partie${count > 1 ? 's' : ''} passée${count > 1 ? 's' : ''} rattachée${count > 1 ? 's' : ''}.`,
      }
      form.linkName = ''
      form.linkTag = 'EUW'
      await admin.fetchAccounts({ silent: true })
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Smurf link failed:', error)
      linkResult.value = { ok: false, text: linkSmurfErrorMessage(error) }
    }
  })
}

const clearLinkResult = () => { linkResult.value = null }
</script>

<template>
  <AdminModal size="lg" @close="emit('close')">
    <template #default="{ titleId }">
      <div class="flex items-center gap-3.5 px-[22px] py-5">
        <AdminAccountIcon :icon-id="live.lolIconId" class="size-12 rounded-[14px]" />
        <div class="min-w-0">
          <h2 :id="titleId" class="m-0 truncate text-[21px] font-bold tracking-[-0.025em]">{{ title }}</h2>
          <p class="mt-0.5 text-[12.5px] font-semibold text-text-sec">{{ subtitle }}</p>
        </div>
      </div>

      <div class="flex max-h-[62vh] flex-col gap-[18px] overflow-y-auto px-[22px] pb-5 pt-1">
        <div v-if="hasUser" class="flex flex-col gap-2.5">
          <span class="field-heading">Compte JungleDiff</span>
          <div class="grid grid-cols-2 gap-2.5">
            <label class="flex flex-col gap-1.5">
              <span class="text-[12.5px] font-bold">Pseudo</span>
              <input v-model="form.nickname" class="field" autocomplete="off">
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-[12.5px] font-bold">Nom complet</span>
              <input v-model="form.fullName" class="field" autocomplete="off">
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-2.5">
          <span class="field-heading">Riot ID</span>
          <AdminRiotIdInput v-model:name="form.riotName" v-model:tag="form.riotTag" :disabled="!hasUser" />
          <p v-if="!hasUser" class="m-0 text-xs font-semibold text-pretty text-text-sec">
            Non modifiable sur un compte sans utilisateur JungleDiff : l'API le retrouverait par son utilisateur Keycloak et changerait un autre compte. Pour un smurf, déliez-le puis liez le bon Riot ID.
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <AdminSwitch
            v-model="form.inCrew"
            label="Membre du crew"
            description="Rafraîchi automatiquement et compté dans les classements et les stats."
          />
          <p v-if="leaveCrewWarning" class="m-0 rounded-xl bg-brand-gold-soft px-3 py-2 text-[12.5px] font-semibold text-pretty text-brand-gold">
            {{ leaveCrewWarning }}
          </p>
          <AdminSwitch
            v-if="hasUser"
            v-model="form.archived"
            label="Archivé"
            description="Masqué des listes, historique conservé."
            tone="loss"
          />
        </div>

        <div v-if="isSecondary" class="flex flex-wrap items-center gap-2.5 rounded-2xl border border-border-base px-3.5 py-3">
          <span class="min-w-[180px] flex-1 text-[13.5px] font-semibold">
            Smurf de <strong>{{ main ? accountRiotName(main) : 'un compte inconnu' }}</strong>
          </span>
          <button
            type="button"
            :disabled="admin.isBusy(`unlink:${id}`)"
            class="inline-flex h-[34px] cursor-pointer items-center rounded-full border border-brand-red/30 px-[13px] text-[12.5px] font-bold text-brand-red disabled:cursor-wait disabled:opacity-60"
            @click="unlink(live, true)"
          >
            {{ admin.isBusy(`unlink:${id}`) ? 'Déliaison…' : 'Délier' }}
          </button>
        </div>

        <div v-else class="flex flex-col gap-2.5">
          <span class="field-heading">Smurfs</span>
          <div
            v-for="smurf in smurfs"
            :key="smurf.id"
            class="flex items-center gap-2.5 rounded-[14px] border border-border-base py-2 pl-2.5 pr-2"
          >
            <AdminAccountIcon :icon-id="smurf.lolIconId" :archived="smurf.archived" class="size-[30px] rounded-[9px]" />
            <span class="min-w-0 flex-1 truncate text-[13.5px] font-bold">
              {{ accountRiotName(smurf) }}<span v-if="smurf.riotGamesTagLine" class="font-medium text-text-sec">#{{ smurf.riotGamesTagLine }}</span>
            </span>
            <button
              type="button"
              :disabled="admin.isBusy(`unlink:${smurf.id}`)"
              class="inline-flex h-[30px] cursor-pointer items-center rounded-full px-3 text-xs font-bold text-brand-red disabled:cursor-wait disabled:opacity-60"
              @click="unlink(smurf, false)"
            >
              {{ admin.isBusy(`unlink:${smurf.id}`) ? 'Déliaison…' : 'Délier' }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <AdminRiotIdInput
              v-model:name="form.linkName"
              v-model:tag="form.linkTag"
              class="min-w-0 flex-1"
              name-label="Pseudo du smurf"
              tag-label="Tag du smurf"
              name-placeholder="Pseudo du smurf"
              @update:name="clearLinkResult"
              @update:tag="clearLinkResult"
              @submit="link"
            />
            <AdminButton size="md" :busy="admin.isBusy(`link:${id}`)" :disabled="!canLink" @click="link">
              {{ admin.isBusy(`link:${id}`) ? 'Liaison…' : 'Lier' }}
            </AdminButton>
          </div>
          <AdminResult v-if="linkResult" :tone="linkResult.ok ? 'success' : 'error'">{{ linkResult.text }}</AdminResult>
        </div>

        <div class="flex flex-col gap-[3px] rounded-xl bg-surface-muted px-3 py-2.5">
          <AdminRoute v-for="route in routes" :key="route">{{ route }}</AdminRoute>
        </div>

        <AdminResult v-if="saveError" tone="error">{{ saveError }}</AdminResult>
      </div>

      <div class="flex flex-wrap items-center gap-2 border-t border-border-subtle bg-surface-muted px-[22px] py-3.5">
        <span class="flex-1 text-[12.5px] font-semibold" :class="invalidReason ? 'text-brand-red' : 'text-text-sec'">{{ dirtyLabel }}</span>
        <AdminButton variant="secondary" @click="emit('close')">Fermer</AdminButton>
        <AdminButton :busy="saving" :disabled="changes.length === 0 || !!invalidReason" @click="save">
          {{ saving ? 'Enregistrement…' : 'Enregistrer' }}
        </AdminButton>
      </div>
    </template>
  </AdminModal>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.field-heading {
  @apply font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-text-sec;
}

.field {
  @apply h-[42px] rounded-xl border border-border-accent bg-surface-hover px-3 text-sm font-semibold text-text-main outline-none transition-colors focus:border-text-main/45;
}
</style>
