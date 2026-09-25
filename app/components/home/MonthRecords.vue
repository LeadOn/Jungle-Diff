<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGlobalStatsDto } from '~/lib/types'
import { usePatchStore } from '~/stores/patch'
import { AWARD_MAPPINGS, PRIORITY_KEYS, getPlayerName } from '~/utils/lol-awards'
import { getProfileIconUrl } from '~/utils/ddragon'
import { formatDayMonth } from '~/utils/date'
import { formatDecimal } from '~/utils/number'

/**
 * The three most telling crew records. `crewRecords` is computed by the API over a rolling month,
 * not the calendar week, deliberately: a single week rarely holds enough ranked games for the awards
 * to mean anything (see GetLoLHomeStatsQueryHandler.Handle in the GameOn API).
 */
const props = defineProps<{
  records: LoLGlobalStatsDto
}>()

const patchStore = usePatchStore()

const items = computed(() => PRIORITY_KEYS
  .flatMap((key) => {
    const stat = props.records[key]
    const meta = AWARD_MAPPINGS[key]
    return stat && meta ? [{ key, stat, meta }] : []
  })
  .slice(0, 3)
  .map(({ key, stat, meta }) => ({
    key,
    title: meta.title,
    description: meta.description,
    holder: `${getPlayerName(stat.player)}${stat.gameDate ? ` · ${formatDayMonth(stat.gameDate)}` : ''}`,
    iconStyle: stat.player?.lolIconId != null
      ? { backgroundImage: `url('${getProfileIconUrl(stat.player.lolIconId, patchStore.currentPatch)}')` }
      : {},
    value: formatDecimal(stat.value),
    unit: meta.unit.trim(),
    // The record's own game when there is one, the records page otherwise.
    to: stat.matchId && stat.player ? `/game/${stat.matchId}/${stat.player.id}` : '/stats',
    colorClass: meta.color,
  })))
</script>

<template>
  <section v-if="items.length > 0" aria-labelledby="month-records-title">
    <div class="mb-3.5 flex items-baseline justify-between gap-3">
      <h3 id="month-records-title" class="text-xl font-bold tracking-[-0.025em]">Records du mois</h3>
      <NuxtLink to="/stats" class="text-[13px] font-bold text-brand-link transition-colors duration-200 hover:text-text-main">Tout voir →</NuxtLink>
    </div>
    <div class="flex flex-col gap-2.5">
      <NuxtLink
        v-for="item in items"
        :key="item.key"
        :to="item.to"
        :title="item.description"
        class="flex items-center gap-3 rounded-[18px] border border-border-subtle bg-surface-base px-3.5 py-3 shadow-card transition-transform duration-300 ease-spring hover:translate-x-1"
      >
        <span class="size-10 shrink-0 rounded-xl bg-surface-sunken bg-cover bg-center" :style="item.iconStyle" />
        <span class="min-w-0 flex-1">
          <span class="block text-[14.5px] font-bold">{{ item.title }}</span>
          <span class="mt-0.5 block truncate text-xs font-semibold text-text-sec">{{ item.holder }}</span>
        </span>
        <span class="shrink-0 whitespace-nowrap">
          <span class="text-[28px] font-bold tracking-[-0.04em]" :class="item.colorClass">{{ item.value }}</span>
          <span class="ml-[3px] text-xs font-bold text-text-sec">{{ item.unit }}</span>
        </span>
      </NuxtLink>
    </div>
  </section>
</template>
