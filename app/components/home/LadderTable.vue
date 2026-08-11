<template>
  <div class="bg-surface-base rounded-2xl p-6 border border-border-base animate-fade-in-up">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 class="text-[16px] font-extrabold text-text-main leading-tight">Ladder du crew</h2>
        <p class="font-mono text-[11px] text-text-ter font-bold tracking-[0.1em] uppercase mt-0.5">{{ players?.length || 0 }} JOUEURS</p>
      </div>
      
      <!-- Queue Toggle -->
      <div class="flex bg-surface-high rounded-full p-1 border border-border-subtle w-fit">
        <button 
          @click="activeQueue = 'solo'"
          class="px-5 py-1.5 text-xs font-bold rounded-full transition-all"
          :class="activeQueue === 'solo' ? 'bg-surface-base shadow-sm text-text-main border border-border-accent' : 'text-text-sec hover:text-text-main'"
        >
          Solo/Duo
        </button>
        <button 
          @click="activeQueue = 'flex'"
          class="px-5 py-1.5 text-xs font-bold rounded-full transition-all"
          :class="activeQueue === 'flex' ? 'bg-surface-base shadow-sm text-text-main border border-border-accent' : 'text-text-sec hover:text-text-main'"
        >
          Flex
        </button>
      </div>
    </div>
    
    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse min-w-[600px]">
        <thead>
          <tr class="font-mono text-[10px] font-bold text-text-ter uppercase tracking-[0.1em] border-b border-border-subtle">
            <th class="pb-3 w-8">#</th>
            <th class="pb-3">Joueur</th>
            <th class="pb-3">{{ activeQueue === 'solo' ? 'SOLO / DUO' : 'FLEX' }}</th>
            <th class="pb-3">Forme</th>
            <th class="pb-3 w-32">Winrate</th>
            <th class="pb-3 text-right">7J</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-for="(player, i) in sortedPlayers" :key="player.id" class="border-b border-border-subtle last:border-0 hover:bg-surface-high transition-colors group">
            <td class="py-3.5 font-bold" :class="i === 0 && player.queues[activeQueue] ? 'text-brand-gold' : 'text-text-ter'">{{ i + 1 }}</td>
            <td class="py-3.5">
              <div class="flex items-center gap-3">
                <div v-if="player.iconUrl" class="w-8 h-8 rounded-md overflow-hidden shadow-sm flex-shrink-0 border border-border-subtle">
                  <img :src="player.iconUrl" alt="Profile Icon" class="w-full h-full object-cover" />
                </div>
                <div v-else class="w-8 h-8 rounded-md flex items-center justify-center text-xs font-black shadow-sm flex-shrink-0" :style="{ backgroundColor: getTierColor(player.queues[activeQueue]?.tier, 0.15), color: getTierColor(player.queues[activeQueue]?.tier, 1), border: `1px solid ${getTierColor(player.queues[activeQueue]?.tier, 0.3)}` }">
                  {{ player.initial }}
                </div>
                <div>
                  <div class="font-bold text-[13px] text-text-main leading-tight" :class="i === 0 && player.queues[activeQueue] ? 'text-brand-gold' : ''">{{ player.name }}</div>
                  <div class="text-[11px] text-text-ter font-medium">{{ player.tag }}</div>
                </div>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex items-center gap-2.5" v-if="player.queues[activeQueue]">
                <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
                  <img :src="getTierIconUrl(player.queues[activeQueue]?.tier)" alt="Rank Icon" class="w-full h-full object-contain drop-shadow-sm" />
                </div>
                <div>
                  <div class="font-extrabold text-[13px] text-text-main leading-tight">{{ player.queues[activeQueue]?.rankLabel }}</div>
                  <div class="font-mono text-[11px] text-text-ter font-bold">{{ player.queues[activeQueue]?.lp }} LP</div>
                </div>
              </div>
              <div v-else class="flex items-center gap-2.5">
                <div class="w-8 h-8 flex items-center justify-center flex-shrink-0 opacity-50 grayscale">
                  <img :src="getTierIconUrl('UNRANKED')" alt="Unranked" class="w-full h-full object-contain" />
                </div>
                <div class="text-[13px] font-bold text-text-ter italic">
                  Non classé
                </div>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex gap-1" v-if="player.queues[activeQueue]">
                <span v-for="(win, j) in player.queues[activeQueue]?.form" :key="j" class="w-2 h-3.5 rounded-[2px]" :class="win ? 'bg-brand-green' : 'bg-brand-red opacity-80'"></span>
              </div>
              <div v-else class="text-text-ter">-</div>
            </td>
            <td class="py-3.5">
              <div class="flex flex-col gap-1 w-full max-w-[100px]" v-if="player.queues[activeQueue]">
                <div class="flex items-center justify-between">
                  <div class="font-extrabold text-[13px]" :class="(player.queues[activeQueue]?.winrate ?? 0) >= 50 ? 'text-brand-green' : 'text-brand-red'">{{ player.queues[activeQueue]?.winrate }}%</div>
                  <div class="font-mono text-[10px] font-bold text-text-ter">{{ player.queues[activeQueue]?.v }}V {{ player.queues[activeQueue]?.d }}D</div>
                </div>
                <div class="w-full bg-border-subtle rounded-full h-1 overflow-hidden">
                  <div class="h-1 rounded-full transition-all duration-1000 ease-out" :class="(player.queues[activeQueue]?.winrate ?? 0) >= 50 ? 'bg-brand-green' : 'bg-brand-red'" :style="{ width: `${player.queues[activeQueue]?.winrate ?? 0}%` }"></div>
                </div>
              </div>
              <div v-else class="text-text-ter">-</div>
            </td>
            <td class="py-3.5 text-right font-black text-[13px]" :class="getDeltaColor(player.queues[activeQueue]?.lpChange)">
              <span v-if="player.queues[activeQueue]">
                {{ (player.queues[activeQueue]?.lpChange ?? 0) > 0 ? '+' : '' }}{{ player.queues[activeQueue]?.lpChange }}
              </span>
              <span v-else>-</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
      <button disabled class="text-[12px] font-bold text-text-sec flex items-center gap-1.5 opacity-50 cursor-not-allowed">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-brand-gold"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Lier un compte Riot pour apparaitre au classement
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LeaguePlayer } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'

const props = defineProps<{
  players?: LeaguePlayer[]
}>()

const activeQueue = ref<'solo'|'flex'>('solo')
const patchStore = usePatchStore()

const mappedPlayers = computed(() => {
  if (!props.players) return []
  return props.players.map(p => {
    const solo = p.leagueOfLegendsSoloRank
    const flex = p.leagueOfLegendsFlexRank
    
    const capitalizeTier = (tier: string) => tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase()

    return {
      id: p.id,
      initial: p.nickname.charAt(0).toUpperCase(),
      iconUrl: p.lolIconId != null ? `https://ddragon.leagueoflegends.com/cdn/${patchStore.currentPatch}/img/profileicon/${p.lolIconId}.png` : null,
      name: p.nickname,
      tag: p.riotGamesNickname && p.riotGamesTagLine ? `${p.riotGamesNickname}#${p.riotGamesTagLine}` : '',
      queues: {
        solo: solo ? {
          tier: solo.tier,
          rankLabel: solo.tier === 'MASTER' || solo.tier === 'GRANDMASTER' || solo.tier === 'CHALLENGER' ? capitalizeTier(solo.tier) : `${capitalizeTier(solo.tier)} ${solo.rank}`,
          lp: solo.leaguePoints,
          form: p.recentFormSolo || [],
          winrate: solo.wins + solo.losses > 0 ? Math.round((solo.wins / (solo.wins + solo.losses)) * 100) : 0,
          v: solo.wins,
          d: solo.losses,
          lpChange: p.lpChange7DaysSolo ?? 0
        } : null,
        flex: flex ? {
          tier: flex.tier,
          rankLabel: flex.tier === 'MASTER' || flex.tier === 'GRANDMASTER' || flex.tier === 'CHALLENGER' ? capitalizeTier(flex.tier) : `${capitalizeTier(flex.tier)} ${flex.rank}`,
          lp: flex.leaguePoints,
          form: p.recentFormFlex || [],
          winrate: flex.wins + flex.losses > 0 ? Math.round((flex.wins / (flex.wins + flex.losses)) * 100) : 0,
          v: flex.wins,
          d: flex.losses,
          lpChange: p.lpChange7DaysFlex ?? 0
        } : null
      }
    }
  })
})

const tierValue: Record<string, number> = {
  'CHALLENGER': 900,
  'GRANDMASTER': 800,
  'MASTER': 700,
  'DIAMOND': 600,
  'EMERALD': 500,
  'PLATINUM': 400,
  'GOLD': 300,
  'SILVER': 200,
  'BRONZE': 100,
  'IRON': 50
}

const getTierColor = (tier: string | undefined, opacity: number) => {
  const colors: Record<string, string> = {
    'DIAMOND': `rgba(87, 107, 206, ${opacity})`,
    'EMERALD': `rgba(63, 214, 143, ${opacity})`,
    'PLATINUM': `rgba(50, 115, 101, ${opacity})`,
    'GOLD': `rgba(240, 194, 78, ${opacity})`,
    'SILVER': `rgba(132, 142, 163, ${opacity})`,
    'UNRANKED': `rgba(124, 133, 153, ${opacity})`
  }
  return tier && colors[tier] ? colors[tier] : colors['UNRANKED']
}

const getTierIconUrl = (tier: string | undefined) => {
  const t = tier ? tier.toLowerCase() : 'unranked'
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/${t}.png`
}

const getDeltaColor = (delta: number | undefined) => {
  if (delta === undefined) return 'text-text-ter'
  if (delta > 0) return 'text-brand-green'
  if (delta < 0) return 'text-brand-red'
  return 'text-text-ter'
}

const sortedPlayers = computed(() => {
  return [...mappedPlayers.value].sort((a, b) => {
    const qA = a.queues[activeQueue.value]
    const qB = b.queues[activeQueue.value]
    
    // Sort unranked to the bottom
    if (!qA && qB) return 1
    if (!qB && qA) return -1
    if (!qA && !qB) return 0
    
    // If both ranked, sort by tier value + lp
    const scoreA = (tierValue[qA!.tier] || 0) + (qA!.lp / 100)
    const scoreB = (tierValue[qB!.tier] || 0) + (qB!.lp / 100)
    
    return scoreB - scoreA
  })
})
</script>
