<template>
  <NuxtLink 
    :to="gameLink"
    class="relative flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-xl border border-border-subtle hover:border-border-accent transition-all group overflow-hidden shadow-sm"
    :class="cardBgColor"
  >
    <!-- Liseré gauche -->
    <div class="absolute -left-[1px] top-0 bottom-0 w-1.5" :class="getResultColor(computedStatus)"></div>
    
    <div class="flex items-center justify-between w-full sm:w-auto pl-2">
      <div class="flex items-center gap-3 sm:gap-4">
        <!-- Icône Champion & Badge -->
        <div class="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
          <div class="w-full h-full rounded-full overflow-hidden border-2" :class="getAvatarBorderColor(computedStatus)">
            <img 
              v-if="championName"
              :src="`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${championName}.png`" 
              :alt="championName" 
              class="w-full h-full object-cover scale-[1.15]"
              @error="(e) => (e.target as HTMLImageElement).src = `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/profileicon/29.png`"
            />
            <Icon v-else name="lucide:circle-dashed" class="text-text-ter text-xl sm:text-2xl m-auto h-full w-full opacity-50" />
          </div>
          
          <!-- Badge Niveau -->
          <div class="absolute bottom-0 right-0 bg-surface-high text-text-main text-[9px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-border-subtle shadow-sm">
            {{ champLevel }}
          </div>
        </div>
        
        <div class="flex flex-col justify-center min-w-0">
          <div class="text-[13px] sm:text-[14px] font-extrabold mb-0.5 truncate" :class="getResultTextColor(computedStatus)">
            {{ getResultText(computedStatus) }} 
            <template v-if="summonerName">
              <span class="text-text-ter font-normal mx-1">·</span> 
              <span class="text-text-sec font-semibold">{{ summonerName }}</span>
            </template>
          </div>
          <div class="text-[11px] sm:text-[12px] font-bold text-text-main mb-0.5 truncate">
            {{ queueName }} <span class="text-text-ter font-normal mx-0.5">·</span> {{ duration }}
          </div>
          <div class="text-[10px] sm:text-[11px] font-medium text-text-sec truncate">
            {{ gameDate }}
          </div>
        </div>
      </div>

      <!-- Mobile KDA -->
      <div class="flex flex-col items-end sm:hidden ml-2 flex-shrink-0">
        <span class="font-mono text-[12px] font-bold text-text-main tracking-tight">
          {{ kills }} <span class="text-text-ter font-normal mx-[1px]">/</span> {{ deaths }} <span class="text-text-ter font-normal mx-[1px]">/</span> {{ assists }}
        </span>
        <span class="font-mono text-[10px] font-medium text-text-sec mt-0.5">{{ kdaText }}</span>
      </div>
    </div>
    
    <div class="flex items-center gap-4 sm:gap-8 mt-3 sm:mt-0 pl-[60px] sm:pl-0 sm:mr-2 w-full sm:w-auto justify-start sm:justify-end">
      <!-- Desktop KDA -->
      <div class="hidden sm:flex flex-col items-end w-24 flex-shrink-0">
        <span class="font-mono text-[13px] font-bold text-text-main tracking-tight">
          {{ kills }} <span class="text-text-ter font-normal mx-0.5">/</span> {{ deaths }} <span class="text-text-ter font-normal mx-0.5">/</span> {{ assists }}
        </span>
        <span class="font-mono text-[11px] font-medium text-text-sec mt-0.5">{{ kdaText }} <span class="text-text-ter opacity-60">KDA</span></span>
      </div>
      
      <!-- Items Slots (7) -->
      <div class="flex items-center gap-1">
        <div 
          v-for="(itemId, index) in items" 
          :key="index"
          class="w-6 h-6 sm:w-7 sm:h-7 rounded-md overflow-hidden bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/5 flex-shrink-0"
        >
          <img 
            v-if="itemId > 0"
            :src="`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/item/${itemId}.png`" 
            :alt="`Item ${itemId}`"
            class="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { 
  closestDdragonVersion, 
  formatQueue, 
  formatGameDate, 
  formatGameDuration, 
  calculateKda, 
  getParticipantByPlayerId 
} from '~/lib/utils/lol'
import type { LoLGameDto } from '~/lib/types'

const props = defineProps<{
  game: LoLGameDto
  playerId?: number
}>()

const store = useLolStore()
const patchStore = usePatchStore()

// Resolve participant based on playerId.
// If playerId is missing (e.g. homepage), find the first crew member in the game.
const participant = computed(() => {
  if (props.playerId) {
    return getParticipantByPlayerId(props.game, props.playerId)
  }
  
  if (store.players && store.players.length > 0) {
    const crewMember = props.game.leagueOfLegendsGameParticipants.find(p => 
      p.playerId !== null && store.players.some(crew => crew.id === p.playerId)
    )
    if (crewMember) return crewMember
  }
  
  return props.game.leagueOfLegendsGameParticipants[0] || null
})

// Compute Ddragon version for images based on the specific game's version.
const ddragonVersion = computed(() => {
  return closestDdragonVersion(props.game.gameVersion, patchStore.availablePatches)
})

// Status logic (Win, Loss, Remake, Unknown)
const computedStatus = computed(() => {
  if (props.game.isRemake || props.game.endOfGameResult === null) return 'UNKNOWN'
  if (!participant.value || participant.value.win === undefined || participant.value.win === null) return 'UNKNOWN'
  return participant.value.win ? 'WIN' : 'LOSS'
})

// Stats
const championName = computed(() => participant.value?.championName || '')
const champLevel = computed(() => participant.value?.champLevel || '??')
const summonerName = computed(() => participant.value?.riotIdGameName || '')

const kills = computed(() => participant.value?.kills ?? 0)
const deaths = computed(() => participant.value?.deaths ?? 0)
const assists = computed(() => participant.value?.assists ?? 0)

const kdaText = computed(() => calculateKda(kills.value, deaths.value, assists.value))

const items = computed(() => {
  if (!participant.value) return [0, 0, 0, 0, 0, 0, 0]
  return [
    participant.value.item0 ?? 0,
    participant.value.item1 ?? 0,
    participant.value.item2 ?? 0,
    participant.value.item3 ?? 0,
    participant.value.item4 ?? 0,
    participant.value.item5 ?? 0,
    participant.value.item6 ?? 0 // trinket
  ]
})

// Formatting
const queueName = computed(() => formatQueue(props.game.queueId ?? 0, store.queues))
const duration = computed(() => formatGameDuration(props.game.gameStart, props.game.gameEnd))
const gameDate = computed(() => formatGameDate(props.game.gameStart))

const gameLink = computed(() => `/game/${props.game.matchId}/${props.playerId || participant.value?.playerId || ''}`)

// UI Styling Helpers
const getResultColor = (status: string) => {
  if (status === 'WIN') return 'bg-brand-green'
  if (status === 'LOSS') return 'bg-brand-red'
  return 'bg-text-ter opacity-60'
}

const cardBgColor = computed(() => {
  if (computedStatus.value === 'WIN') return 'bg-brand-green/5 dark:bg-brand-green/10'
  if (computedStatus.value === 'LOSS') return 'bg-brand-red/5 dark:bg-brand-red/10'
  return 'bg-surface-base' // Unknown / Remake
})

const getAvatarBorderColor = (status: string) => {
  if (status === 'WIN') return 'border-brand-green/40'
  if (status === 'LOSS') return 'border-brand-red/40'
  return 'border-border-accent'
}

const getResultTextColor = (status: string) => {
  if (status === 'WIN') return 'text-brand-green'
  if (status === 'LOSS') return 'text-brand-red'
  return 'text-text-ter'
}

const getResultText = (status: string) => {
  if (status === 'WIN') return 'Victoire'
  if (status === 'LOSS') return 'Défaite'
  if (props.game.isRemake) return 'Remake'
  return 'Inconnu'
}
</script>
