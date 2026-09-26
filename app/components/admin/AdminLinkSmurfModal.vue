<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAdminStore } from '~/stores/admin'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { isAbortError } from '~/lib/types/error'
import { isSmurf } from '~/utils/lol-smurf'
import { accountRiotId, accountRiotName, hasKeycloakUser, linkSmurfErrorMessage, sortAccounts } from '~/utils/lol-admin'
import AdminModal from './AdminModal.vue'
import AdminButton from './AdminButton.vue'
import AdminResult from './AdminResult.vue'
import AdminRiotIdInput from './AdminRiotIdInput.vue'
import AdminRoute from './AdminRoute.vue'

/**
 * "Lier un smurf": the only way an account enters the database other than its owner signing in. The
 * API creates the account when the Riot ID is unknown, imports its rank and recent games, and hands it
 * the games it already played with the crew.
 */
const emit = defineEmits<{ close: [] }>()

const admin = useAdminStore()
const api = useGameOnLol()

/** A smurf can only hang off a main: the API refuses to link to an account that is itself one. */
const mains = computed(() => sortAccounts(admin.accounts.filter(account => !isSmurf(account) && !account.archived)))

const mainId = ref<number | null>(mains.value[0]?.id ?? null)
// Opened before the list arrived: pick the first main as soon as there is one.
watch(mains, (list) => {
  if (mainId.value === null && list[0]) mainId.value = list[0].id
})
const name = ref('')
const tag = ref('EUW')
const result = ref<{ ok: boolean, text: string } | null>(null)

const busy = computed(() => admin.isBusy('link-modal'))
const canSubmit = computed(() => mainId.value !== null && name.value.trim() !== '' && tag.value.trim() !== '')

const mainLabel = (id: number) => {
  const account = admin.accountById(id)
  if (!account) return `#${id}`
  return hasKeycloakUser(account) && account.fullName ? `${accountRiotId(account)} · ${account.fullName}` : accountRiotId(account)
}

const clearResult = () => { result.value = null }

const submit = async () => {
  // Once linked, the button reads "Terminé" and simply closes.
  if (result.value?.ok) {
    emit('close')
    return
  }
  if (!canSubmit.value || mainId.value === null) return
  const target = mainId.value
  result.value = null

  await admin.runExclusive('link-modal', async () => {
    try {
      const response = await api.linkSmurf(target, name.value.trim(), tag.value.trim(), admin.signal())
      const count = response.backfilledParticipations
      const main = admin.accountById(target)
      result.value = {
        ok: true,
        text: `Lié à ${main ? accountRiotName(main) : `#${target}`} · ${count} partie${count > 1 ? 's' : ''} passée${count > 1 ? 's' : ''} rattachée${count > 1 ? 's' : ''}.`,
      }
      admin.toast(`${name.value.trim()}#${tag.value.trim()} lié comme smurf`)
      await admin.fetchAccounts({ silent: true })
    } catch (error) {
      if (isAbortError(error)) return
      console.error('[admin] Smurf link failed:', error)
      result.value = { ok: false, text: linkSmurfErrorMessage(error) }
    }
  })
}

const ctaLabel = computed(() => {
  if (result.value?.ok) return 'Terminé'
  return busy.value ? 'Liaison…' : 'Lier le compte'
})
</script>

<template>
  <AdminModal size="md" @close="emit('close')">
    <template #default="{ titleId }">
      <div class="px-[22px] pt-[22px]">
        <h2 :id="titleId" class="m-0 text-[22px] font-bold tracking-[-0.025em]">Lier un smurf</h2>
        <p class="mt-1 text-[13px] font-semibold text-pretty text-text-sec">
          Crée le compte s'il est inconnu, importe son rang et ses parties récentes, et lui rattache les parties déjà jouées avec le crew.
        </p>
      </div>

      <div class="flex flex-col gap-4 px-[22px] py-5">
        <label class="flex flex-col gap-1.5">
          <span class="text-[12.5px] font-bold">Compte principal</span>
          <select
            v-model="mainId"
            class="h-11 rounded-[14px] border border-border-accent bg-surface-hover px-3 text-sm font-semibold text-text-main outline-none focus:border-text-main/45"
            @change="clearResult"
          >
            <option v-for="main in mains" :key="main.id" :value="main.id">{{ mainLabel(main.id) }}</option>
          </select>
        </label>

        <div class="flex flex-col gap-1.5">
          <span class="text-[12.5px] font-bold">Riot ID du smurf</span>
          <AdminRiotIdInput
            v-model:name="name"
            v-model:tag="tag"
            size="lg"
            name-label="Pseudo Riot du smurf"
            tag-label="Tag Riot du smurf"
            @update:name="clearResult"
            @update:tag="clearResult"
            @submit="submit"
          />
        </div>

        <AdminResult v-if="result" :tone="result.ok ? 'success' : 'error'">{{ result.text }}</AdminResult>

        <AdminRoute>POST /lol/Summoner/{playerId}/smurfs · 404 introuvable · 409 déjà utilisé</AdminRoute>
      </div>

      <div class="flex justify-end gap-2 border-t border-border-subtle bg-surface-muted px-[22px] py-3.5">
        <AdminButton variant="secondary" @click="emit('close')">Annuler</AdminButton>
        <AdminButton icon="lucide:rotate-cw" :busy="busy" :disabled="!result?.ok && !canSubmit" @click="submit">
          {{ ctaLabel }}
        </AdminButton>
      </div>
    </template>
  </AdminModal>
</template>
