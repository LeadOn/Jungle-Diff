<script setup lang="ts">
import { ref, onBeforeUnmount, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { usePlayerStore } from '~/stores/player'
import { useRuntimeConfig } from '#app'
import { useGameOnLol } from '~/composables/useGameOnLol'
import { isAbortError } from '~/lib/types/error'

definePageMeta({
  auth: true
})

const authStore = useAuthStore()
const playerStore = usePlayerStore()
const config = useRuntimeConfig()
const gameOnApi = useGameOnLol()

useSeoMeta({
  title: 'Paramètres',
  description: 'Gérez votre profil et vos préférences JungleDiff.'
})

const loading = ref(true)
const saving = ref(false)
const showSuccess = ref(false)
const saveError = ref<string | null>(null)

// This page's requests are aborted if the user navigates away mid-load.
const pageRequests = new AbortController()
let successTimer: ReturnType<typeof setTimeout> | null = null

onBeforeUnmount(() => {
  pageRequests.abort()
  if (successTimer) clearTimeout(successTimer)
})

const player = computed(() => playerStore.currentPlayer)

const form = ref({
  fullName: '',
  nickname: '',
  riotGamesNickname: '',
  riotGamesTagLine: ''
})

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

// Roles are resolved server-side and exposed by the session store: the page no longer digs through
// token claims, which it has no way of reading any more anyway.
const isAdmin = computed(() => authStore.isAdmin)

const avatarUrl = computed(() => {
  if (!player.value || !player.value.id) return undefined
  // Append timestamp to avoid caching issues after upload
  return `${config.public.gameOnApiUrl}/player/${player.value.id}/pp?t=${new Date().getTime()}`
})

onMounted(async () => {
  try {
    await playerStore.fetchCurrentPlayer(false, pageRequests.signal)
    if (player.value) {
      form.value = {
        fullName: player.value.fullName || '',
        nickname: player.value.nickname || '',
        riotGamesNickname: player.value.riotGamesNickname || '',
        riotGamesTagLine: player.value.riotGamesTagLine || ''
      }
    }
  } catch (e) {
    if (!isAbortError(e)) console.error('[settings] Profil connecté indisponible:', e)
  } finally {
    loading.value = false
  }
})

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0] || null
  }
}

const saveProfile = async () => {
  if (!player.value) return
  saving.value = true
  showSuccess.value = false
  saveError.value = null
  try {
    if (selectedFile.value) {
      await gameOnApi.uploadProfilePicture(selectedFile.value, pageRequests.signal)
      // Force fetch to get new PP URL (if backend doesn't return it in update)
      // or we can just append a new timestamp to avatarUrl computed
    }
    const updated = await gameOnApi.updateCurrentPlayer({
      FullName: form.value.fullName,
      Nickname: form.value.nickname,
      RiotGamesNickname: form.value.riotGamesNickname || undefined,
      RiotGamesTagLine: form.value.riotGamesTagLine || undefined
    }, pageRequests.signal)
    playerStore.setCurrentPlayer(updated)
    if (selectedFile.value) {
      // Reload the profile to pick up the new picture URL.
      await playerStore.fetchCurrentPlayer(true, pageRequests.signal)
    }

    showSuccess.value = true
    if (successTimer) clearTimeout(successTimer)
    successTimer = setTimeout(() => { showSuccess.value = false }, 3000)
    selectedFile.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (e) {
    if (isAbortError(e)) return
    console.error('[settings] Mise à jour du profil en échec:', e)
    // Rendered in-page rather than via `alert()`: a native dialog blocks the thread and cannot be
    // styled or announced properly by a screen reader.
    saveError.value = "La mise à jour n'a pas pu être enregistrée. Réessayez dans un instant."
  } finally {
    saving.value = false
  }
}

const logout = () => {
  authStore.logout()
}
</script>

<template>
  <div class="mx-auto grid w-full max-w-[800px] gap-6 px-4 py-8">
    <!-- Header Skeleton -->
    <div
      v-if="loading"
      class="flex items-center justify-between gap-4 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-6 shadow-card"
      aria-busy="true"
    >
      <div class="flex items-center gap-5">
        <UiSkeleton circle class="h-20 w-20 shrink-0" />
        <div class="grid gap-2">
          <UiSkeleton class="h-6 w-32" />
          <UiSkeleton class="h-4 w-48 max-w-full" />
        </div>
      </div>
      <UiSkeleton class="h-11 w-11 shrink-0" />
    </div>

    <!-- Header -->
    <div
      v-else-if="player"
      class="flex items-center justify-between gap-4 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface p-6 shadow-card"
    >
      <div class="flex min-w-0 items-center gap-5">
        <div class="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-sunken">
          <img v-if="player.profilePictureUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" >
          <div v-else class="flex h-full w-full items-center justify-center fig text-[2rem] text-ink-3">
            {{ player.nickname?.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex min-w-0 flex-col justify-center gap-1">
          <h1 class="type-d2 m-0 text-ink [overflow-wrap:anywhere]">{{ player.nickname }}</h1>
          <p class="type-body m-0 truncate text-ink-2">{{ player.fullName }}</p>
        </div>
      </div>

      <UiButton
        variant="secondary"
        size="lg"
        icon
        title="Se déconnecter"
        aria-label="Se déconnecter"
        class="shrink-0"
        @click="logout"
      >
        <Icon name="lucide:log-out" class="size-[18px]" aria-hidden="true" />
      </UiButton>
    </div>

    <template v-if="!loading && player">
      <!--
        The admin block no longer carries the "copy access token" button: tokens now live in
        httpOnly cookies and are not readable by the page. Copying one to the clipboard — synced
        across devices and readable by other applications — also exposed a full session credential.
      -->
      <UiPanel v-if="isAdmin" heading-tag="h2">
        <template #title>
          <span class="inline-flex items-center gap-2">
            <Icon name="lucide:shield-alert" class="size-[18px] text-ink-3" aria-hidden="true" />
            Administration
          </span>
        </template>
        <div class="grid gap-4 px-4 pb-4">
          <p class="type-body m-0 text-ink-2">
            Votre compte dispose du rôle <span class="type-mono text-ink">gameon_admin</span>.
          </p>
          <NuxtLink
            to="/admin"
            class="group flex w-full items-center justify-between gap-3 rounded-3 border border-line bg-sunken px-4 py-3.5 text-ink transition-colors duration-[120ms] ease-out hover:border-line-strong"
          >
            <span class="text-[0.8125rem] font-semibold">
              Ouvrir l'espace d'administration
            </span>
            <Icon name="lucide:arrow-right" class="size-4 text-ink-3 transition-colors duration-[120ms] ease-out group-hover:text-ink" aria-hidden="true" />
          </NuxtLink>
        </div>
      </UiPanel>

      <!-- LoL Block -->
      <UiPanel heading-tag="h2">
        <template #title>
          <span class="inline-flex items-center gap-2">
            <Icon name="lucide:gamepad-2" class="size-[18px] text-ink-3" aria-hidden="true" />
            League of Legends
          </span>
        </template>
        <div class="grid gap-4 px-4 pb-4">
          <p v-if="!player.riotGamesNickname" class="type-small m-0 rounded-3 border border-line bg-canopy-soft px-3.5 py-3 text-ink">
            Vous pouvez renseigner votre compte Riot Games dans les préférences ci-dessous.
          </p>

          <NuxtLink
            :to="`/summoner/${player.id}`"
            class="group flex w-full items-center justify-between gap-3 rounded-3 border border-line bg-sunken px-4 py-3.5 text-ink transition-colors duration-[120ms] ease-out hover:border-line-strong"
          >
            <span class="text-[0.8125rem] font-semibold">
              Voir mon profil LoL
            </span>
            <Icon name="lucide:arrow-right" class="size-4 text-ink-3 transition-colors duration-[120ms] ease-out group-hover:text-ink" aria-hidden="true" />
          </NuxtLink>
        </div>
      </UiPanel>

      <!-- Preferences -->
      <UiPanel heading-tag="h2">
        <template #title>
          <span class="inline-flex items-center gap-2">
            <Icon name="lucide:settings" class="size-[18px] text-ink-3" aria-hidden="true" />
            Préférences
          </span>
        </template>

        <form class="flex flex-col gap-5 px-4 pt-1 pb-5" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="settings-full-name" class="text-[0.8125rem] font-semibold text-ink">
                Nom complet <span class="text-loss-ink" aria-hidden="true">*</span>
              </label>
              <input id="settings-full-name" v-model="form.fullName" type="text" required class="field" >
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="settings-nickname" class="text-[0.8125rem] font-semibold text-ink">
                Pseudo <span class="text-loss-ink" aria-hidden="true">*</span>
              </label>
              <input id="settings-nickname" v-model="form.nickname" type="text" required class="field" >
            </div>
          </div>

          <div class="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div class="flex flex-col gap-1.5">
              <label for="settings-riot-name" class="text-[0.8125rem] font-semibold text-ink">Compte Riot Games</label>
              <input id="settings-riot-name" v-model="form.riotGamesNickname" type="text" placeholder="Ex: Faker" class="field" >
            </div>

            <div class="flex flex-col gap-1.5">
              <label for="settings-riot-tag" class="text-[0.8125rem] font-semibold text-ink">Tag Line</label>
              <input id="settings-riot-tag" v-model="form.riotGamesTagLine" type="text" placeholder="Ex: EUW" class="field" >
            </div>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="settings-avatar" class="text-[0.8125rem] font-semibold text-ink">Photo de profil</label>
            <input
              id="settings-avatar"
              ref="fileInput"
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif"
              aria-describedby="settings-avatar-hint"
              class="field-file"
              @change="handleFileChange"
            >
            <p id="settings-avatar-hint" class="type-small m-0 text-ink-3">Formats autorisés : PNG, JPG, WebP ou GIF.</p>
          </div>

          <div class="mt-2 flex flex-col gap-3 md:flex-row md:items-center">
            <UiButton
              type="submit"
              variant="primary"
              size="lg"
              :busy="saving"
              :disabled="saving"
              class="w-full md:w-auto"
            >
              <Icon v-if="saving" name="lucide:loader-2" class="size-4 animate-spin" aria-hidden="true" />
              <Icon v-else name="lucide:save" class="size-4" aria-hidden="true" />
              {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
            </UiButton>

            <!-- Save outcome, inline beside the action that produced it. -->
            <p
              v-if="saveError"
              role="alert"
              class="type-small m-0 flex items-center gap-2 rounded-2 border border-[color-mix(in_oklch,var(--loss)_45%,var(--line))] bg-loss-soft px-3 py-2 text-loss-ink"
            >
              <Icon name="lucide:triangle-alert" class="size-4 shrink-0" aria-hidden="true" />
              {{ saveError }}
            </p>
            <p
              v-if="showSuccess"
              role="status"
              class="type-small m-0 flex items-center gap-2 rounded-2 border border-[color-mix(in_oklch,var(--win)_45%,var(--line))] bg-win-soft px-3 py-2 text-win-ink"
            >
              <Icon name="lucide:check" class="size-4 shrink-0" aria-hidden="true" />
              Mise à jour réussie !
            </p>
          </div>
        </form>
      </UiPanel>
    </template>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";

.field {
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-2);
  background: var(--sunken);
  color: var(--ink);
  font-size: 0.875rem;
  font-weight: 500;
  transition: border-color 120ms var(--ease-out);
}

.field:hover {
  border-color: var(--line-strong);
}

.field:focus {
  border-color: var(--focus);
}

.field-file {
  display: block;
  width: 100%;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--radius-2);
  background: var(--sunken);
  color: var(--ink-2);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: border-color 120ms var(--ease-out);
}

.field-file:hover {
  border-color: var(--line-strong);
}

.field-file::file-selector-button {
  height: 28px;
  margin-right: 12px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-1);
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 120ms var(--ease-out);
}

.field-file:hover::file-selector-button {
  background: var(--raised);
}
</style>
