<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame, LoLGameTimelineEvent } from '~/lib/types/timeline'
import { championIconUrl as getChampionIconUrl, frameStatsFor } from '~/utils/lol-match'
import { MAP_STRUCTURES, structureKeyForEvent } from '~/utils/lol-map-structures'
import { championDisplayName } from '~/utils/lol-champion'
import {
  allTimelineEvents,
  findByPuuid,
  INHIBITOR_ICON_URL,
  monsterIconUrl,
  monsterLabel,
  TOWER_ICON_URL,
  WARD_ICON_URL,
} from '~/utils/lol-timeline-event'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  players: LoLGameParticipantDto[]
  currentFrameIndex: number
  patch: string
}>()

interface MapDot {
  player: LoLGameParticipantDto
  leftPercent: number
  bottomPercent: number
}

interface StructureDot {
  teamId: number
  label: string
  isInhibitor: boolean
  destroyed: boolean
  leftPercent: number
  bottomPercent: number
}

interface ObjectiveMarker {
  iconUrl: string
  label: string
  leftPercent: number
  bottomPercent: number
}

const MAP_SIZE = 14980

const mapUrl = computed(() => `https://ddragon.leagueoflegends.com/cdn/${props.patch}/img/map/map11.png`)

const currentFrame = computed(() => (props.timeline ?? [])[props.currentFrameIndex])
const currentTimestamp = computed(() => currentFrame.value?.timestamp ?? 0)

const toPercent = (value: number) => Math.min(100, Math.max(0, (value / MAP_SIZE) * 100))

const dots = computed<MapDot[]>(() => props.players
  .map((player) => {
    const stats = frameStatsFor(currentFrame.value, player.puuid)
    if (stats == null) return null
    return { player, leftPercent: toPercent(stats.positionX), bottomPercent: toPercent(stats.positionY) }
  })
  .filter((dot): dot is MapDot => dot != null))

const structures = computed<StructureDot[]>(() => {
  const time = currentTimestamp.value
  const destroyedCounts = new Map<string, number>()

  for (const event of allTimelineEvents(props.timeline)) {
    if (event.eventType !== 'BUILDING_KILL' || event.timestamp > time) continue
    const key = structureKeyForEvent(event)
    destroyedCounts.set(key, (destroyedCounts.get(key) ?? 0) + 1)
  }

  const usedPerKey = new Map<string, number>()

  return MAP_STRUCTURES.map((structure) => {
    const used = usedPerKey.get(structure.key) ?? 0
    usedPerKey.set(structure.key, used + 1)

    return {
      teamId: structure.teamId,
      label: structure.label,
      isInhibitor: structure.isInhibitor,
      destroyed: used < (destroyedCounts.get(structure.key) ?? 0),
      leftPercent: toPercent(structure.positionX),
      bottomPercent: toPercent(structure.positionY),
    }
  })
})

const objectiveZoneKey = (monsterType: string | null): string => {
  switch (monsterType) {
    case 'BARON_NASHOR':
    case 'RIFTHERALD':
    case 'HORDE':
      return 'baron-pit'
    case 'DRAGON':
      return 'dragon-pit'
    default:
      return monsterType ?? 'unknown'
  }
}

/** The last monster taken in each pit, as of the current frame. */
const objectiveMarkers = computed<ObjectiveMarker[]>(() => {
  const time = currentTimestamp.value

  const events = allTimelineEvents(props.timeline).filter(event =>
    event.eventType === 'ELITE_MONSTER_KILL'
    && event.timestamp <= time
    && event.positionX != null
    && event.positionY != null)

  const latestByZone = new Map<string, LoLGameTimelineEvent>()
  for (const event of events) {
    const zone = objectiveZoneKey(event.monsterType ?? null)
    const current = latestByZone.get(zone)
    if (current == null || event.timestamp > current.timestamp) latestByZone.set(zone, event)
  }

  return Array.from(latestByZone.values()).map(event => ({
    iconUrl: monsterIconUrl(event),
    label: monsterLabel(event),
    leftPercent: toPercent(event.positionX!),
    bottomPercent: toPercent(event.positionY!),
  }))
})

const wardCounts = computed(() => {
  const time = currentTimestamp.value
  let blue = 0
  let red = 0

  for (const event of allTimelineEvents(props.timeline)) {
    if (event.eventType !== 'WARD_PLACED' || event.timestamp > time) continue
    const creator = findByPuuid(props.players, event.creatorPUUID ?? '')
    if (creator?.teamId === 100) blue++
    else if (creator?.teamId === 200) red++
  }

  return { blue, red }
})

const championIconUrl = (player: LoLGameParticipantDto) => getChampionIconUrl(player.championName, props.patch)

const dotTitle = (player: LoLGameParticipantDto) =>
  [player.riotIdGameName, player.championName ? championDisplayName(player.championName) : ''].filter(Boolean).join(' · ')

const structureClass = (structure: StructureDot): string => {
  if (structure.destroyed) return 'bg-ink-muted opacity-35'
  return structure.teamId === 100 ? 'bg-team-blue' : 'bg-team-red'
}

const structureTooltip = (structure: StructureDot): string => {
  const team = structure.teamId === 100 ? 'Équipe bleue' : 'Équipe rouge'
  return `${team} — ${structure.label}${structure.destroyed ? ' (détruite)' : ''}`
}
</script>

<template>
  <div class="p-[22px]">
    <!-- The map is a photo of the Rift: it stays dark in both themes. -->
    <div class="relative mx-auto aspect-square w-full max-w-[440px] overflow-hidden rounded-[22px] bg-ink shadow-[0_14px_34px_-18px_rgba(22,36,27,0.5)]">
      <UiAppImage
        :src="mapUrl"
        alt="Mini-carte de la Faille de l'invocateur"
        class="pointer-events-none absolute inset-0 size-full select-none object-cover"
      />

      <span
        v-for="(structure, index) in structures"
        :key="'struct-' + index"
        :title="structureTooltip(structure)"
        class="absolute flex size-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full ring-[1.5px] ring-white/80 transition-[opacity,background-color] duration-300"
        :class="structureClass(structure)"
        :style="{ left: `${structure.leftPercent}%`, bottom: `${structure.bottomPercent}%` }"
      >
        <UiAppImage :src="structure.isInhibitor ? INHIBITOR_ICON_URL : TOWER_ICON_URL" alt="" class="size-2.5 object-contain" />
      </span>

      <UiAppImage
        v-for="(marker, index) in objectiveMarkers"
        :key="'obj-' + index"
        :src="marker.iconUrl"
        :alt="marker.label"
        :title="marker.label"
        class="absolute size-[18px] -translate-x-1/2 translate-y-1/2 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        :style="{ left: `${marker.leftPercent}%`, bottom: `${marker.bottomPercent}%` }"
      />

      <UiAppImage
        v-for="dot in dots"
        :key="dot.player.puuid"
        :src="championIconUrl(dot.player)"
        :alt="dot.player.riotIdGameName"
        :title="dotTitle(dot.player)"
        class="absolute size-[26px] -translate-x-1/2 translate-y-1/2 rounded-full border-[2.5px] object-cover shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-[left,bottom] duration-400"
        :class="dot.player.teamId === 100 ? 'border-team-blue' : 'border-team-red'"
        :style="{ left: `${dot.leftPercent}%`, bottom: `${dot.bottomPercent}%` }"
      />
    </div>

    <div class="mt-3.5 flex flex-wrap justify-center gap-2">
      <span class="inline-flex items-center gap-1.5 rounded-full bg-team-blue-soft px-[11px] py-1 text-xs font-bold text-team-blue-text">
        <UiAppImage :src="WARD_ICON_URL" alt="" class="size-3.5 object-contain" />
        {{ wardCounts.blue }} wards posées
      </span>
      <span class="inline-flex items-center gap-1.5 rounded-full bg-team-red-soft px-[11px] py-1 text-xs font-bold text-team-red-text">
        <UiAppImage :src="WARD_ICON_URL" alt="" class="size-3.5 object-contain" />
        {{ wardCounts.red }} wards posées
      </span>
    </div>
    <p class="mx-auto mb-0 mt-2 max-w-[420px] text-center text-[11.5px] font-medium text-text-sec">
      Cumul depuis le début de la partie — l'API ne fournit pas la position des wards.
    </p>
  </div>
</template>
