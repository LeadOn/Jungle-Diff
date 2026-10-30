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
    iconUrl: stat.player?.lolIconId != null
      ? getProfileIconUrl(stat.player.lolIconId, patchStore.currentPatch)
      : null,
    value: formatDecimal(stat.value),
    unit: meta.unit.trim(),
    // The record's own game when there is one, the records page otherwise.
    to: stat.matchId && stat.player ? `/game/${stat.matchId}/${stat.player.id}` : '/stats',
  })))
</script>

<template>
  <UiPanel
    v-if="items.length > 0"
    title="Records du mois"
    heading-tag="h3"
    link-to="/stats"
    link-text="Tout voir"
  >
    <NuxtLink
      v-for="item in items"
      :key="item.key"
      :to="item.to"
      :title="item.description"
      class="list-row"
    >
      <span class="list-av">
        <img v-if="item.iconUrl" :src="item.iconUrl" alt="">
      </span>
      <span class="list-main">
        <b>{{ item.title }}</b>
        <span>{{ item.holder }}</span>
      </span>
      <span class="list-val">
        <span class="fig">{{ item.value }}</span>
        <small>{{ item.unit }}</small>
      </span>
    </NuxtLink>
  </UiPanel>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.list-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  border-top: 1px solid var(--line);
  text-decoration: none;
  color: inherit;
  transition: background-color 120ms var(--ease-out);
}

.list-row:hover {
  background: color-mix(in oklch, var(--sunken) 70%, var(--surface));
}

.list-av {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--sunken);
}

.list-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.list-main {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.list-main b {
  font-weight: 640;
  font-size: 0.875rem;
}

.list-main span {
  font-size: 0.75rem;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-val {
  display: flex;
  align-items: baseline;
  gap: 3px;
  white-space: nowrap;
}

.list-val .fig {
  font-size: 1.75rem;
}

.list-val small {
  font-size: 0.75rem;
  color: var(--ink-3);
  font-weight: 600;
}
</style>
