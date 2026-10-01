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
  <div class="w-full max-w-[800px] mx-auto py-8 px-4">
    <!-- Error Banner -->
    <div v-if="saveError" class="mb-6 bg-brand-red/10 border border-brand-red/20 rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up">
      <div class="w-8 h-8 rounded-full bg-brand-red/20 flex items-center justify-center flex-shrink-0 text-brand-red">
        <Icon name="lucide:triangle-alert" class="text-[16px]" style="stroke-width: 3px;" />
      </div>
      <p class="text-brand-red text-sm font-bold m-0">{{ saveError }}</p>
    </div>

    <!-- Success Banner -->
    <div v-if="showSuccess" class="mb-6 bg-brand-green/10 border border-brand-green/20 rounded-2xl p-4 flex items-center gap-3 animate-fade-in-up">
      <div class="w-8 h-8 rounded-full bg-brand-green/20 flex items-center justify-center flex-shrink-0 text-brand-green">
        <Icon name="lucide:check" class="text-[16px]" style="stroke-width: 3px;" />
      </div>
      <p class="text-brand-green text-sm font-bold m-0">Mise à jour réussie !</p>
    </div>

    <!-- Header Skeleton -->
    <div v-if="loading" class="flex items-center justify-between animate-pulse mb-8 bg-surface-base rounded-2xl p-6 border border-border-base">
      <div class="flex items-center gap-6">
        <div class="w-24 h-24 rounded-full bg-surface-high"/>
        <div class="flex flex-col gap-2">
          <div class="w-32 h-6 rounded bg-surface-high"/>
          <div class="w-48 h-4 rounded bg-surface-high"/>
        </div>
      </div>
      <div class="w-12 h-12 rounded-full bg-surface-high"/>
    </div>

    <!-- Header -->
    <div v-else-if="player" class="flex items-center justify-between mb-8 bg-surface-base rounded-2xl p-6 border border-border-base shadow-sm animate-fade-in-up">
      <div class="flex items-center gap-6">
        <div class="w-24 h-24 rounded-full bg-surface-high border border-border-subtle overflow-hidden flex-shrink-0 shadow-inner">
          <img v-if="player.profilePictureUrl" :src="avatarUrl" alt="Avatar" class="w-full h-full object-cover" >
          <div v-else class="w-full h-full flex items-center justify-center text-text-ter font-bold text-3xl">
            {{ player.nickname?.charAt(0).toUpperCase() }}
          </div>
        </div>
        <div class="flex flex-col justify-center">
          <h1 class="m-0 text-2xl font-black text-text-main leading-tight">{{ player.nickname }}</h1>
          <p class="m-0 text-sm font-medium text-text-sec mt-1">{{ player.fullName }}</p>
        </div>
      </div>
      
      <button class="w-12 h-12 flex items-center justify-center rounded-full bg-brand-red/10 text-brand-red hover:bg-brand-red/20 border border-brand-red/20 transition-colors shadow-sm" title="Se déconnecter" @click="logout">
        <Icon name="lucide:log-out" class="text-[18px]" style="stroke-width: 2.5px;" />
      </button>
    </div>

    <div v-if="!loading && player" class="flex flex-col gap-6">
      <!--
        The admin block no longer carries the "copy access token" button: tokens now live in
        httpOnly cookies and are not readable by the page. Copying one to the clipboard — synced
        across devices and readable by other applications — also exposed a full session credential.
      -->
      <div v-if="isAdmin" class="bg-surface-base rounded-2xl p-6 border border-border-base shadow-sm animate-fade-in-up" style="animation-delay: 50ms;">
        <h2 class="text-sm font-black text-text-main mb-4 flex items-center gap-2">
          <Icon name="lucide:shield-alert" class="text-brand-gold" />
          Administration
        </h2>
        <p class="m-0 text-[13px] font-medium text-text-sec">
          Votre compte dispose du rôle <span class="font-mono font-bold text-brand-gold">gameon_admin</span>.
        </p>
        <NuxtLink to="/admin" class="mt-4 flex items-center justify-between w-full p-4 rounded-xl bg-surface-high border border-border-subtle hover:border-border-accent hover:bg-surface-high/80 text-text-main transition-colors group">
          <span class="flex items-center gap-3 font-bold text-[13px]">
            Ouvrir l'espace d'administration
          </span>
          <Icon name="lucide:arrow-right" class="text-[16px] text-text-ter group-hover:text-brand-gold transition-colors" />
        </NuxtLink>
      </div>

      <!-- LoL Block -->
      <div class="bg-surface-base rounded-2xl p-6 border border-border-base shadow-sm animate-fade-in-up" style="animation-delay: 100ms;">
        <h2 class="text-sm font-black text-text-main mb-4 flex items-center gap-2">
          <Icon name="lucide:gamepad-2" class="text-brand-gold text-[18px]" />
          League of Legends
        </h2>
        
        <div v-if="!player.riotGamesNickname" class="mb-4 text-[13px] font-medium text-brand-gold bg-brand-gold/10 p-3 rounded-lg border border-brand-gold/20">
          Vous pouvez renseigner votre compte Riot Games dans les préférences ci-dessous.
        </div>
        
        <NuxtLink :to="`/summoner/${player.id}`" class="flex items-center justify-between w-full p-4 rounded-xl bg-surface-high border border-border-subtle hover:border-border-accent hover:bg-surface-high/80 text-text-main transition-colors group">
          <span class="flex items-center gap-3 font-bold text-[13px]">
            Voir mon profil LoL
          </span>
          <Icon name="lucide:arrow-right" class="text-[16px] text-text-ter group-hover:text-brand-gold transition-colors" />
        </NuxtLink>
      </div>

      <!-- Preferences -->
      <div class="bg-surface-base rounded-2xl p-6 border border-border-base shadow-sm animate-fade-in-up" style="animation-delay: 150ms;">
        <h2 class="text-sm font-black text-text-main mb-6 flex items-center gap-2">
          <Icon name="lucide:settings" class="text-text-sec" />
          Préférences
        </h2>
        
        <form class="flex flex-col gap-5" @submit.prevent="saveProfile">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold text-text-ter uppercase tracking-widest">Nom complet <span class="text-brand-red">*</span></label>
              <input v-model="form.fullName" type="text" required class="bg-surface-high border border-border-subtle rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-main focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" >
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold text-text-ter uppercase tracking-widest">Pseudo <span class="text-brand-red">*</span></label>
              <input v-model="form.nickname" type="text" required class="bg-surface-high border border-border-subtle rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-main focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" >
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold text-text-ter uppercase tracking-widest">Compte Riot Games</label>
              <input v-model="form.riotGamesNickname" type="text" placeholder="Ex: Faker" class="bg-surface-high border border-border-subtle rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-main focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" >
            </div>
            
            <div class="flex flex-col gap-2">
              <label class="text-[11px] font-bold text-text-ter uppercase tracking-widest">Tag Line</label>
              <input v-model="form.riotGamesTagLine" type="text" placeholder="Ex: EUW" class="bg-surface-high border border-border-subtle rounded-xl px-4 py-2.5 text-[13px] font-bold text-text-main focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all" >
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-[11px] font-bold text-text-ter uppercase tracking-widest">Photo de profil</label>
            <input ref="fileInput" type="file" accept="image/png, image/jpeg, image/webp, image/gif" class="block w-full text-sm text-text-sec file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-surface-high file:text-text-main hover:file:bg-surface-high/80 file:cursor-pointer cursor-pointer border border-border-subtle rounded-xl p-2 bg-surface-base" @change="handleFileChange" >
            <p class="text-[11px] text-text-ter font-medium mt-1">Formats autorisés : PNG, JPG, WebP ou GIF.</p>
          </div>

          <div class="mt-4">
            <button type="submit" :disabled="saving" class="w-full md:w-auto px-8 py-3 rounded-full bg-brand-gold text-brand-gold-text font-black text-[13px] hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-wait">
              <Icon v-if="saving" name="lucide:loader-2" class="animate-spin text-[16px]" />
              <Icon v-else name="lucide:save" class="text-[16px]" />
              {{ saving ? 'Enregistrement...' : 'Enregistrer les modifications' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
@reference "../assets/css/main.css";
</style>
