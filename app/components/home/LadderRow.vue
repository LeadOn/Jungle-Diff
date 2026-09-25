<script setup lang="ts">
import { computed } from 'vue'
import type { LadderEntry } from '~/utils/lol-ladder'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'
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

const ranked = computed(() => props.entry.rank !== null)

const iconStyle = computed(() => (props.entry.iconId != null
  ? { backgroundImage: `url('${getProfileIconUrl(props.entry.iconId, patchStore.currentPatch)}')` }
  : {}))

const positionStyle = computed(() => ({ backgroundColor: tierTint(props.entry.rank?.tier) ?? undefined }))

const rowClass = computed(() => {
  if (props.hovered) return 'bg-surface-hover'
  if (props.isMe) return 'bg-surface-highlight'
  return 'bg-surface-base'
})

const lpText = computed(() => (props.entry.rank ? `${props.entry.rank.leaguePoints} LP` : ''))

const winRateClass = computed(() => {
  if (props.entry.winRate === null) return 'text-text-sec'
  return props.entry.winRate >= 50 ? 'text-brand-green' : 'text-brand-red'
})

const deltaClass = computed(() => {
  if (!ranked.value || props.entry.delta === 0) return 'text-text-sec'
  return props.entry.delta > 0 ? 'text-brand-green' : 'text-brand-red'
})
</script>

<template>
  <NuxtLink
    :to="`/summoner/${entry.id}`"
    class="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-b-[1.5px] border-dashed border-border-dashed p-3 transition-colors duration-200 last:border-b-0 sm:grid-cols-[28px_minmax(0,1.4fr)_minmax(0,1.2fr)_70px_60px_58px_48px]"
    :class="rowClass"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <span
      class="flex size-[26px] items-center justify-center rounded-full border border-border-accent text-xs font-bold"
      :class="ranked ? 'text-ink' : 'bg-surface-sunken'"
      :style="positionStyle"
    >{{ entry.position ?? '—' }}</span>

    <span class="flex min-w-0 items-center gap-3">
      <span class="size-[38px] shrink-0 rounded-xl border border-border-base bg-surface-sunken bg-cover bg-center" :style="iconStyle" />
      <span class="flex min-w-0 flex-col gap-px">
        <span class="flex min-w-0 items-center gap-1.5">
          <span class="truncate text-[15px] font-bold">{{ entry.name }}</span>
          <span v-if="isMe" class="shrink-0 rounded-full bg-brand-gold px-[7px] py-px text-[10.5px] font-bold text-brand-gold-text">Vous</span>
          <span
            v-if="entry.smurf"
            :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
            class="shrink-0 cursor-help rounded-full border border-border-accent px-1.5 text-[10.5px] font-bold"
          >Smurf</span>
        </span>
        <span class="hidden text-xs font-medium text-text-sec sm:block">{{ entry.tag }}</span>
        <span class="whitespace-nowrap text-xs font-semibold text-text-sec sm:hidden">{{ tierLabel(entry.rank) }}<template v-if="lpText"> · {{ lpText }}</template></span>
      </span>
    </span>

    <span class="hidden min-w-0 items-center gap-2 sm:flex">
      <img
        :src="tierEmblemUrl(entry.rank)"
        alt=""
        class="size-8 shrink-0 object-contain"
        :class="ranked ? '' : 'opacity-40 grayscale'"
      >
      <span class="flex min-w-0 flex-col">
        <span class="whitespace-nowrap text-sm font-bold" :class="ranked ? 'text-text-main' : 'text-text-sec'">{{ tierLabel(entry.rank) }}</span>
        <span class="font-mono text-[11px] text-text-sec">{{ lpText }}</span>
      </span>
    </span>

    <span class="hidden sm:block">
      <span
        v-if="entry.gap !== null"
        :title="`${entry.gap} LP pour dépasser ${entry.previousName}`"
        class="whitespace-nowrap rounded-full border border-border-accent bg-surface-muted px-2 py-[3px] font-mono text-[11px] font-semibold"
      >{{ formatSigned(-entry.gap) }} LP</span>
    </span>

    <span class="hidden gap-[3px] sm:flex">
      <span
        v-for="(win, index) in entry.form"
        :key="index"
        :title="win ? 'Victoire' : 'Défaite'"
        class="size-[9px] rounded-full border border-border-accent"
        :class="win ? 'bg-win' : 'bg-loss'"
      />
    </span>

    <span class="hidden text-sm font-bold sm:block" :class="winRateClass">{{ entry.winRate === null ? '—' : formatPercent(entry.winRate) }}</span>

    <span class="text-right font-mono text-[13px] font-semibold" :class="deltaClass">{{ ranked ? formatSigned(entry.delta) : '—' }}</span>
  </NuxtLink>
</template>
