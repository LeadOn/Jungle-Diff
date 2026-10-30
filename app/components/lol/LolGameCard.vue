<script setup lang="ts">
import { computed } from 'vue'
import type { FeedEntry } from '~/utils/lol-feed'
import { RANKED_QUEUE_IDS } from '~/utils/lol-feed'
import { useLolStore } from '~/stores/lol'
import { usePatchStore } from '~/stores/patch'
import { calculateKda, closestDdragonVersion, formatGameDuration, formatQueueShort } from '~/lib/utils/lol'
import { getChampionIconUrl, getItemIconUrl } from '~/utils/ddragon'
import { championDisplayName } from '~/utils/lol-champion'
import { roleLabel } from '~/utils/lol-role'
import { rankAfter, rankChangeSummary, rankTransition } from '~/utils/lol-rank-change'
import { tierEmblemUrl, tierLabel, tierTint } from '~/utils/lol-tier'
import { playerDisplayName } from '~/utils/lol-ladder'
import { formatClock } from '~/utils/date'

/**
 * One game of a feed, told from one crew member's side: the home's recent games and a profile's
 * history both draw it, so the two lists cannot drift apart.
 *
 * `showPlayer` titles the card with the player's name and puts the champion on the second line, as
 * the home feed mixes the whole crew. A profile lists one player's games only, so it turns it off:
 * the champion takes the title and the name, identical on every card, is dropped.
 */
const props = withDefaults(defineProps<{
  entry: FeedEntry
  showPlayer?: boolean
  isMe?: boolean
}>(), { showPlayer: true, isMe: false })

const store = useLolStore()
const patchStore = usePatchStore()

const game = computed(() => props.entry.game)
const participant = computed(() => props.entry.participant)

const ddragonVersion = computed(() => closestDdragonVersion(game.value.gameVersion, patchStore.availablePatches) || patchStore.currentPatch)

const nameOf = (playerId: number | null, fallback: string) => {
  const player = playerId !== null ? store.players.find(candidate => candidate.id === playerId) : undefined
  return player ? playerDisplayName(player) : fallback
}

const who = computed(() => nameOf(participant.value.playerId, participant.value.riotIdGameName))
const teammatesTitle = computed(() => `Avec ${props.entry.teammates.map(mate => nameOf(mate.playerId, mate.riotIdGameName)).join(', ')}`)

const result = computed(() => {
  if (game.value.isRemake) {
    return { label: 'Remake', cls: 'r' }
  }
  return participant.value.win
    ? { label: 'Victoire', cls: 'w' }
    : { label: 'Défaite', cls: 'l' }
})

const queueLabel = computed(() => formatQueueShort(game.value.queueId, store.queues))

const clock = computed(() => formatClock(game.value.gameStart))
const duration = computed(() => formatGameDuration(game.value.gameStart, game.value.gameEnd))
const championName = computed(() => championDisplayName(participant.value.championName))
const title = computed(() => (props.showPlayer ? who.value : championName.value))
const meta = computed(() => [
  props.showPlayer ? championName.value : '',
  roleLabel(participant.value.teamPosition),
  queueLabel.value,
  duration.value,
].filter(Boolean).join(' · '))

const kda = computed(() => `${participant.value.kills} / ${participant.value.deaths} / ${participant.value.assists}`)
const kdaCompact = computed(() => `${participant.value.kills}/${participant.value.deaths}/${participant.value.assists}`)
const kdaRatio = computed(() => `${calculateKda(participant.value.kills, participant.value.deaths, participant.value.assists)} KDA`)

const items = computed(() => {
  const p = participant.value
  return [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6].map((id, slot) => ({
    slot,
    url: id ? getItemIconUrl(id, ddragonVersion.value) : '',
  }))
})

/**
 * The LP chip. A known `rankChange` prints its figure, 0 included. A remake or an unranked queue
 * says there were no LP at stake. A ranked game whose LP the API could not pin prints nothing: `null`
 * means unknown, and "Sans LP" there would be a false statement.
 */
const lp = computed(() => {
  const change = participant.value.rankChange
  if (change) {
    return {
      kind: 'known' as const,
      value: change.leaguePointsChange,
      title: rankChangeSummary(change),
    }
  }
  if (game.value.isRemake) return { kind: 'none' as const, title: 'Remake : aucun LP en jeu' }
  if (game.value.queueId === null || !RANKED_QUEUE_IDS.has(game.value.queueId)) {
    return { kind: 'none' as const, title: 'Partie normale ou remake : aucun LP en jeu' }
  }
  return null
})

const transition = computed(() => {
  const change = participant.value.rankChange
  const direction = change ? rankTransition(change) : null
  if (!change || !direction) return null
  const reached = rankAfter(change)
  const tint = tierTint(reached.tier)
  return {
    text: `${direction === 'promotion' ? 'Promu' : 'Rétrogradé'} ${tierLabel(reached)}`,
    emblem: tierEmblemUrl(reached),
    style: tint ? { '--tier': tint } : undefined,
  }
})

const championIconUrl = computed(() => getChampionIconUrl(participant.value.championName, ddragonVersion.value))
</script>

<template>
  <NuxtLink
    :to="`/game/${game.matchId}/${participant.playerId}`"
    class="game"
    :class="result.cls"
    :aria-label="`${result.label} de ${who} sur ${championName}`"
  >
    <span class="champ">
      <img :src="championIconUrl" alt="">
      <span class="lvl">{{ participant.champLevel }}</span>
    </span>

    <span class="game-main">
      <span class="game-title">
        <span class="game-res">{{ result.label }}</span>
        <b>{{ title }}</b>
        <UiStatus v-if="isMe && showPlayer" variant="me">Vous</UiStatus>
        <UiStatus v-if="entry.teammates.length > 0" variant="plus" :title="teammatesTitle">+{{ entry.teammates.length }}</UiStatus>
        <span
          v-if="transition"
          :title="transition.text"
          :style="transition.style"
          class="promo"
        >
          <img :src="transition.emblem" alt="">{{ transition.text }}
        </span>
      </span>
      <span class="game-meta">
        {{ meta }}<span class="time-inline"> · {{ clock }}</span>
      </span>
      <span class="game-items">
        <template v-for="item in items" :key="item.slot">
          <img
            v-if="item.url"
            :src="item.url"
            alt=""
            :class="item.slot === 6 ? 'trinket' : ''"
          >
          <i v-else :class="item.slot === 6 ? 'trinket' : ''" />
        </template>
      </span>
    </span>

    <span class="game-kda">
      <span class="fig">{{ kda }}</span>
      <span>{{ kdaRatio }}</span>
    </span>
    <span class="game-time">{{ clock }}</span>

    <span class="game-end">
      <span class="kda-inline">{{ kdaCompact }}</span>
      <LolLpBadge
        v-if="lp?.kind === 'known'"
        :value="lp.value"
        :title="lp.title"
        size="md"
      />
      <LolLpBadge
        v-else-if="lp?.kind === 'none'"
        none
        :title="lp.title"
        size="md"
      />
    </span>
  </NuxtLink>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.game {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 14px;
  padding: 14px 14px 14px 20px;
  border-radius: var(--radius-5);
  border: 1px solid color-mix(in oklch, var(--line) 70%, transparent);
  box-shadow: var(--shadow-card-value);
  text-decoration: none;
  color: inherit;
  transition: box-shadow 120ms var(--ease-out);
}

.game.w {
  background: linear-gradient(90deg, var(--win-soft), var(--surface) 60%);
}

.game.l {
  background: linear-gradient(90deg, var(--loss-soft), var(--surface) 60%);
}

.game.r {
  background: linear-gradient(90deg, var(--neutral-soft), var(--surface) 60%);
}

.game::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 5px;
  background: var(--win);
}

.game.l::before {
  background: var(--loss);
}

.game.r::before {
  background: var(--line-strong);
}

.game:hover {
  box-shadow: var(--shadow-card-value), 0 0 0 1px var(--line-strong);
}

.champ {
  position: relative;
  flex: none;
  width: 52px;
  height: 52px;
}

.champ > img {
  width: 100%;
  height: 100%;
  border-radius: var(--radius-4);
  object-fit: cover;
  background: var(--sunken);
}

.champ .lvl {
  position: absolute;
  right: -7px;
  bottom: -7px;
  min-width: 22px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--line-strong);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
}

.game-main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.game-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0 8px;
  min-width: 0;
}

.game-res {
  flex: 1 0 100%;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.game.w .game-res {
  color: var(--win-ink);
}

.game.l .game-res {
  color: var(--loss-ink);
}

.game.r .game-res {
  color: var(--ink-2);
}

.game-title b {
  font-weight: 700;
  font-size: 0.96875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.promo {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px 0 2px;
  border-radius: var(--radius-1);
  font-size: 11.5px;
  font-weight: 650;
  background: color-mix(in oklch, var(--tier, var(--tier-none)) 32%, var(--surface));
  color: var(--ink);
  white-space: nowrap;
}

.promo img {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.game-meta {
  font-size: 0.78125rem;
  font-weight: 600;
  color: var(--ink-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.game-items {
  display: none;
  gap: 3px;
  margin-top: 3px;
}

.game-items img,
.game-items i {
  display: block;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: var(--neutral-soft);
  object-fit: cover;
}

.game-items .trinket {
  margin-left: 4px;
}

.game-kda,
.game-time {
  display: none;
}

.game-kda {
  text-align: right;
}

.game-kda .fig {
  font-size: 1.0625rem;
  display: block;
  white-space: nowrap;
}

.game-kda span:not(.fig) {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-2);
}

.game-time {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--ink-2);
  text-align: right;
}

.game-end {
  display: grid;
  justify-items: end;
  gap: 5px;
}

.game-end .kda-inline {
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-2);
}

@container (min-width: 600px) {
  .game {
    grid-template-columns: 52px minmax(0, 1fr) 92px 46px auto;
  }

  .game-kda,
  .game-time {
    display: block;
  }

  .game-end .kda-inline,
  .time-inline {
    display: none;
  }

  .game-title {
    flex-wrap: nowrap;
  }

  .game-res {
    flex: none;
  }
}

@container (min-width: 700px) {
  .game-items {
    display: flex;
  }
}
</style>
