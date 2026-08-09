<template>
  <div class="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/80">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-[16px] font-extrabold text-gray-900 leading-tight">Ladder du crew</h2>
        <p class="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-0.5">6 JOUEURS • SYNC IL Y A 12 MIN</p>
      </div>
      <div class="flex bg-[#faf9f6] rounded-full p-1 border border-gray-200/80">
        <button class="px-5 py-1.5 text-xs font-bold bg-white shadow-sm rounded-full text-gray-900 border border-gray-200/60">Solo/Duo</button>
        <button class="px-5 py-1.5 text-xs font-bold text-gray-400 hover:text-gray-900 rounded-full transition-colors">Flex</button>
      </div>
    </div>
    
    <div class="overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <th class="pb-3 w-8 font-semibold">#</th>
            <th class="pb-3 font-semibold">Joueur</th>
            <th class="pb-3 font-semibold">Solo / Duo</th>
            <th class="pb-3 font-semibold">Forme</th>
            <th class="pb-3 font-semibold w-32">Winrate</th>
            <th class="pb-3 text-right font-semibold">7J</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-for="(player, i) in players" :key="i" class="border-b border-gray-100 last:border-0 hover:bg-[#faf9f6] transition-colors group">
            <td class="py-3.5 font-bold text-gray-300 group-hover:text-gray-400 transition-colors">{{ i + 1 }}</td>
            <td class="py-3.5">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-bold flex items-center justify-center text-xs shadow-inner">{{ player.initial }}</div>
                <div>
                  <div class="font-bold text-[13px] text-gray-900 leading-tight">{{ player.name }}</div>
                  <div class="text-[10px] text-gray-400 font-bold">{{ player.tag }}</div>
                </div>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex items-center gap-2.5">
                <div class="w-6 h-6 flex items-center justify-center text-sm">
                  <span v-if="player.rank.includes('Diamond')">💎</span>
                  <span v-else-if="player.rank.includes('Emerald')">🌲</span>
                  <span v-else-if="player.rank.includes('Platinum')">💠</span>
                  <span v-else-if="player.rank.includes('Gold')">🥇</span>
                  <span v-else-if="player.rank.includes('Silver')">🥈</span>
                  <span v-else>➖</span>
                </div>
                <div>
                  <div class="font-extrabold text-[13px] text-gray-900 leading-tight">{{ player.rank }}</div>
                  <div class="text-[11px] text-gray-400 font-bold" v-if="player.lp">{{ player.lp }} LP</div>
                </div>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex gap-1">
                <span v-for="(win, j) in player.form" :key="j" class="w-1.5 h-3.5 rounded-sm" :class="win ? 'bg-green-500' : 'bg-red-400'"></span>
              </div>
            </td>
            <td class="py-3.5">
              <div class="flex flex-col gap-1 w-full max-w-[100px]">
                <div class="flex items-center justify-between">
                  <div class="font-extrabold text-[13px]" :class="player.winrate >= 50 ? 'text-green-600' : 'text-red-500'">{{ player.winrate }}%</div>
                  <div class="text-[9px] font-bold text-gray-400 tracking-wider">{{ player.v }}V {{ player.d }}D</div>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-1">
                  <div class="h-1 rounded-full" :class="player.winrate >= 50 ? 'bg-green-500' : 'bg-red-400'" :style="{ width: `${player.winrate}%` }"></div>
                </div>
              </div>
            </td>
            <td class="py-3.5 text-right font-black text-[13px]" :class="player.lpChange > 0 ? 'text-green-600' : player.lpChange < 0 ? 'text-red-500' : 'text-gray-400'">
              {{ player.lpChange > 0 ? '+' : '' }}{{ player.lpChange }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
      <button class="text-[11px] font-bold text-gray-400 hover:text-gray-900 transition-colors flex items-center gap-1.5 cursor-pointer">
        <span class="text-[var(--color-brand)] text-lg leading-none mt-[-2px]">+</span> Lier un compte Riot pour apparaitre au classement
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const players = [
  { initial: 'H', name: 'Hugo', tag: 'Hugo#EUW', rank: 'Diamond IV', lp: '42', form: [true, true, true, true, false], winrate: 56, v: 145, d: 112, lpChange: 112 },
  { initial: 'T', name: 'Théo', tag: 'TheoTop#EUW', rank: 'Emerald II', lp: '84', form: [true, true, false, true, true], winrate: 54, v: 102, d: 89, lpChange: 34 },
  { initial: 'V', name: 'Valentin', tag: 'Valou#EUW', rank: 'Platinum I', lp: '18', form: [false, false, true, false, true], winrate: 52, v: 215, d: 198, lpChange: -22 },
  { initial: 'A', name: 'Antoine', tag: 'Anto#EUW', rank: 'Gold III', lp: '77', form: [true, false, true, true, false], winrate: 50, v: 45, d: 45, lpChange: 8 },
  { initial: 'M', name: 'Maxime', tag: 'Max#EUW', rank: 'Silver I', lp: '35', form: [false, false, false, true, false], winrate: 47, v: 88, d: 99, lpChange: -47 },
]
</script>
