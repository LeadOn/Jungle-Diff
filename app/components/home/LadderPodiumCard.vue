<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/lol-ladder'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
import { championDisplayName, championSplashUrl } from '~/utils/lol-champion'
import { tierEmblemUrl, tierLabel, tierTint } from '~/utils/lol-tier'
import { formatPercent, formatSigned } from '~/utils/number'

const props = defineProps<{
  entry: LadderEntry
  hovered: boolean
  isMe: boolean
}>()

const emit = defineEmits<{
  (e: 'hover', id: number | null): void
}>()

const patchStore = usePatchStore()

const isFirst = computed(() => props.entry.position === 1)
const medal = computed(() => (isFirst.value ? '1er' : `${props.entry.position}e`))

// The backdrop is the player's most played champion of the month, or the tier's pastel without one.
const mainChampion = computed(() => props.entry.mainChampion)
const backdropStyle = computed(() => (mainChampion.value
  ? { backgroundImage: `url('${championSplashUrl(mainChampion.value)}')` }
  : { backgroundColor: tierTint(props.entry.rank?.tier) ?? undefined }))

const iconStyle = computed(() => (props.entry.iconId != null
  ? { backgroundImage: `url('${getProfileIconUrl(props.entry.iconId, patchStore.currentPatch)}')` }
  : {}))

const deltaClass = computed(() => {
  if (props.entry.delta > 0) return 'bg-win-soft text-brand-green'
  if (props.entry.delta < 0) return 'bg-loss-soft text-brand-red'
  return 'bg-surface-muted text-text-main'
})

const gapText = computed(() => (props.entry.gap === null
  ? 'En tête du crew'
  : `${formatSigned(-props.entry.gap)} LP de ${props.entry.previousName}`))
</script>

<template>
  <NuxtLink
    :to="`/summoner/${entry.id}`"
    class="relative block overflow-hidden rounded-3xl border border-border-subtle bg-surface-base px-[18px] pb-[18px] transition-[translate,box-shadow] duration-[350ms] ease-spring"
    :class="[
      hovered ? '-translate-y-1.5' : '',
      isFirst ? (hovered ? 'shadow-podium-hover' : 'shadow-podium') : (hovered ? 'shadow-card-hover' : 'shadow-card'),
    ]"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <span
      :title="mainChampion ? `Champion le plus joué (30 j) : ${championDisplayName(mainChampion)}` : undefined"
      class="relative -mx-[18px] block h-[100px] overflow-hidden bg-surface-sunken"
    >
      <span
        class="absolute inset-0 bg-cover bg-[position:center_18%] transition-transform duration-1000 ease-out-expo"
        :class="hovered ? 'scale-[1.08]' : 'scale-100'"
        :style="backdropStyle"
      />
      <span class="absolute inset-0 bg-scrim-soft" />
      <span
        class="absolute left-3 top-3 rounded-full px-[11px] py-1 text-[12.5px] font-bold"
        :class="isFirst ? 'bg-brand-gold-bright text-ink' : 'bg-ink/60 text-white'"
      >{{ medal }}</span>
      <span v-if="mainChampion" class="absolute right-3 top-3.5 text-[11.5px] font-bold text-white text-shadow-md">{{ championDisplayName(mainChampion) }}</span>
    </span>
    <img :src="tierEmblemUrl(entry.rank)" alt="" class="absolute right-3 top-[62px] size-[68px] object-contain drop-shadow-lg">
    <span
      class="relative -mt-[29px] block size-[58px] rounded-[18px] border-[3px] border-surface-base bg-surface-base bg-cover bg-center shadow-md"
      :style="iconStyle"
    />
    <span class="mt-3 flex min-w-0 items-center gap-1.5">
      <span class="truncate text-[21px] font-bold tracking-[-0.02em]">{{ entry.name }}</span>
      <span v-if="isMe" class="shrink-0 rounded-full bg-brand-gold px-2 py-0.5 text-[11px] font-bold text-brand-gold-text">Vous</span>
      <span
        v-if="entry.smurf"
        :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
        class="shrink-0 cursor-help rounded-full border border-border-accent px-[7px] py-px text-[11px] font-bold"
      >Smurf</span>
    </span>
    <span class="mt-0.5 block text-sm font-bold text-text-sec">{{ tierLabel(entry.rank) }} · {{ entry.rank?.leaguePoints }} LP</span>
    <span class="mt-3.5 flex flex-wrap items-center gap-1.5">
      <span title="Progression sur 7 jours" class="whitespace-nowrap rounded-full px-[9px] py-[3px] font-mono text-[11.5px] font-semibold" :class="deltaClass">{{ formatSigned(entry.delta) }} LP</span>
      <span v-if="entry.winRate !== null" class="whitespace-nowrap rounded-full bg-surface-muted px-[9px] py-[3px] text-xs font-bold">{{ formatPercent(entry.winRate) }} WR</span>
    </span>
    <span class="mt-3.5 flex items-center justify-between gap-2 border-t border-dashed border-border-dashed pt-3">
      <span class="min-w-0 truncate text-[12.5px] font-bold">{{ gapText }}</span>
      <span class="flex shrink-0 gap-[3px]">
        <span
          v-for="(win, index) in entry.form"
          :key="index"
          :title="win ? 'Victoire' : 'Défaite'"
          class="size-[9px] rounded-full"
          :class="win ? 'bg-win' : 'bg-loss'"
        />
      </span>
    </span>
  </NuxtLink>
</template>
