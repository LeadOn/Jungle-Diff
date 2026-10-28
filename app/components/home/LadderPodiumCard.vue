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

const mainChampion = computed(() => props.entry.mainChampion)
const splashUrl = computed(() => (mainChampion.value ? championSplashUrl(mainChampion.value) : null))

const iconUrl = computed(() => (props.entry.iconId != null
  ? getProfileIconUrl(props.entry.iconId, patchStore.currentPatch)
  : null))

const tierStyle = computed(() => {
  const tint = tierTint(props.entry.rank?.tier)
  return tint ? { '--tier': tint } : undefined
})

const gapText = computed(() => (props.entry.gap === null
  ? 'En tête du crew'
  : `${formatSigned(-props.entry.gap)} LP de ${props.entry.previousName}`))
</script>

<template>
  <NuxtLink
    :to="`/summoner/${entry.id}`"
    :data-flip-id="`pod-${entry.id}`"
    class="pod"
    :class="[
      `p${entry.position}`,
      { first: isFirst, me: isMe, hovered },
    ]"
    :style="tierStyle"
    :aria-label="`${medal}, ${entry.name}${isMe ? ' (vous)' : ''}, ${tierLabel(entry.rank)} ${entry.rank?.leaguePoints ?? 0} LP`"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <span
      :title="mainChampion ? `Champion le plus joué (30 j) : ${championDisplayName(mainChampion)}` : undefined"
      class="pod-art"
    >
      <img v-if="splashUrl" :src="splashUrl" alt="">
      <span class="pod-medal">{{ medal }}</span>
      <span v-if="mainChampion" class="pod-champ">{{ championDisplayName(mainChampion) }}</span>
    </span>

    <img :src="tierEmblemUrl(entry.rank)" alt="" class="pod-emb">

    <span class="pod-av">
      <img v-if="iconUrl" :src="iconUrl" alt="">
    </span>

    <span class="pod-body">
      <span class="pod-name">
        <b>{{ entry.name }}</b>
        <UiStatus v-if="isMe" variant="me">Vous</UiStatus>
        <UiStatus
          v-if="entry.smurf"
          variant="smurf"
          :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
        >Smurf</UiStatus>
      </span>
      <span class="pod-rank">{{ tierLabel(entry.rank) }} · {{ entry.rank?.leaguePoints }} LP</span>
      <span class="pod-chips">
        <LolLpBadge :value="entry.delta" title="Variation sur 7 jours" />
        <span v-if="entry.winRate !== null" class="pod-wr">{{ formatPercent(entry.winRate) }} V</span>
      </span>
      <span class="pod-foot">
        <span class="min-w-0 truncate">{{ gapText }}</span>
        <LolFormPills :form="entry.form" />
      </span>
    </span>
  </NuxtLink>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.pod {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: var(--radius-5);
  background: var(--surface);
  border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
  box-shadow: var(--shadow-card-value);
  color: inherit;
  text-decoration: none;
  transition: box-shadow 120ms var(--ease-out);
}

.pod:hover,
.pod.hovered {
  box-shadow: var(--shadow-card-value), 0 0 0 1px var(--line-strong);
}

.pod.me {
  box-shadow: var(--shadow-card-value), 0 0 0 2px color-mix(in oklch, var(--gold) 60%, var(--line));
}

.pod.first {
  box-shadow: var(--shadow-card-value), 0 0 0 2px var(--gold);
}

.pod.moving {
  z-index: 3;
}

.pod-art {
  position: relative;
  display: block;
  height: 96px;
  overflow: hidden;
  background: color-mix(in oklch, var(--tier, var(--tier-none)) 55%, var(--night));
}

.pod-art img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
}

.pod-art::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--photo-scrim-value);
}

.pod-medal,
.pod-champ {
  position: absolute;
  z-index: 1;
  top: 10px;
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  color: var(--on-night);
}

.pod-medal {
  left: 12px;
  background: var(--night);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
}

.pod.first .pod-medal {
  background: var(--gold);
  color: var(--on-tier);
}

.pod-champ {
  right: 12px;
  max-width: calc(100% - 80px);
  background: color-mix(in oklch, var(--night) 80%, transparent);
  font-size: 0.75rem;
  font-weight: 650;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pod-emb {
  position: absolute;
  z-index: 2;
  right: 12px;
  top: 58px;
  width: 56px;
  height: 56px;
  object-fit: contain;
  filter: drop-shadow(0 3px 6px color-mix(in oklch, var(--night) 45%, transparent));
}

.pod-av {
  position: absolute;
  z-index: 2;
  left: 14px;
  top: 66px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--sunken);
  box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--tier, var(--line-strong));
  overflow: hidden;
}

.pod-av img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.pod-body {
  display: grid;
  gap: 6px;
  padding: 36px 14px 14px;
}

.pod-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  min-width: 0;
}

.pod-name b {
  font-stretch: 118%;
  font-weight: 740;
  font-size: 1.125rem;
  letter-spacing: -0.02em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pod-rank {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-2);
}

.pod-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
}

.pod-wr {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: var(--neutral-soft);
  color: var(--ink-2);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
}

.pod-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 6px;
  padding-top: 10px;
  border-top: 1.5px dashed var(--line-strong);
  font-size: 0.75rem;
  color: var(--ink-2);
}

@container ladder (min-width: 640px) {
  .pod-art {
    height: 112px;
  }

  .pod-emb {
    top: 74px;
  }

  .pod-av {
    top: 82px;
  }

  .pod.first .pod-art {
    height: 128px;
  }

  .pod.first .pod-emb {
    top: 90px;
  }

  .pod.first .pod-av {
    top: 98px;
  }
}
</style>
