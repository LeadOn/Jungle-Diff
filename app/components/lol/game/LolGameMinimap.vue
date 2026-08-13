<template>
  <div class="p-5">
    <div class="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl">
      <img
        :src="mapUrl"
        class="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
      />

      <span
        v-for="(structure, index) in structures"
        :key="'struct-' + index"
        class="absolute flex h-4 w-4 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-300"
        :class="structureClasses(structure)"
        :style="{ left: `${structure.leftPercent}%`, bottom: `${structure.bottomPercent}%` }"
        :title="structureTooltip(structure)"
      >
        <img
          :src="structure.isInhibitor ? inhibitorIconUrl : towerIconUrl"
          class="h-2.5 w-2.5 object-contain"
        />
      </span>

      <img
        v-for="(marker, index) in objectiveMarkers"
        :key="'obj-' + index"
        :src="marker.iconUrl"
        :title="marker.label"
        class="absolute h-4 w-4 -translate-x-1/2 translate-y-1/2 object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
        :style="{ left: `${marker.leftPercent}%`, bottom: `${marker.bottomPercent}%` }"
      />

      <img
        v-for="dot in dots"
        :key="dot.player.puuid"
        :src="championIconUrl(dot.player)"
        :title="dot.player.riotIdGameName"
        class="absolute h-6 w-6 -translate-x-1/2 translate-y-1/2 rounded-full border-2 object-cover shadow-[0_0_6px_rgba(0,0,0,0.6)] transition-[left,bottom] duration-300"
        :class="teamBorderClass(dot.player)"
        :style="{ left: `${dot.leftPercent}%`, bottom: `${dot.bottomPercent}%` }"
      />
    </div>

    <div class="text-text-ter mt-3 flex items-center justify-center gap-4 text-xs font-semibold">
      <span class="text-brand-green inline-flex items-center gap-1">
        <img :src="wardIconUrl" class="h-3.5 w-3.5 object-contain" />
        {{ wardCounts.blue }} posées
      </span>
      <span class="text-brand-red inline-flex items-center gap-1">
        <img :src="wardIconUrl" class="h-3.5 w-3.5 object-contain" />
        {{ wardCounts.red }} posées
      </span>
    </div>
    <p class="text-text-ter mx-auto mt-1 max-w-[420px] text-center text-[11px]">
      Cumul depuis le début de la partie — l'API ne fournit pas la position des wards.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame, LoLGameTimelineEvent } from '~/lib/types/timeline'
import { championIconUrl as getChampionIconUrl, frameStatsFor } from '~/utils/lol-match'
import { MAP_STRUCTURES, structureKeyForEvent } from '~/utils/lol-map-structures'
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

const towerIconUrl = TOWER_ICON_URL
const inhibitorIconUrl = INHIBITOR_ICON_URL
const wardIconUrl = WARD_ICON_URL

const mapUrl = computed(() => {
  return `https://ddragon.leagueoflegends.com/cdn/${props.patch}/img/map/map11.png`
})

const currentFrame = computed(() => {
  return (props.timeline ?? [])[props.currentFrameIndex]
})

const currentTimestamp = computed(() => {
  return currentFrame.value?.timestamp ?? 0
})

const toPercent = (value: number) => {
  return Math.min(100, Math.max(0, (value / MAP_SIZE) * 100))
}

const dots = computed<MapDot[]>(() => {
  return props.players
    .map((player) => {
      const stats = frameStatsFor(currentFrame.value, player.puuid)
      if (stats == null) {
        return null
      }

      return {
        player,
        leftPercent: toPercent(stats.positionX),
        bottomPercent: toPercent(stats.positionY),
      }
    })
    .filter((dot): dot is MapDot => dot != null)
})

const structures = computed<StructureDot[]>(() => {
  const time = currentTimestamp.value
  const destroyedCounts = new Map<string, number>()

  for (const event of allTimelineEvents(props.timeline)) {
    if (event.eventType !== 'BUILDING_KILL' || event.timestamp > time) {
      continue
    }
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

const objectiveMarkers = computed<ObjectiveMarker[]>(() => {
  const time = currentTimestamp.value

  const events = allTimelineEvents(props.timeline).filter(
    (event) =>
      event.eventType === 'ELITE_MONSTER_KILL' &&
      event.timestamp <= time &&
      event.positionX != null &&
      event.positionY != null
  )

  const latestByZone = new Map<string, LoLGameTimelineEvent>()
  for (const event of events) {
    const zone = objectiveZoneKey(event.monsterType ?? null)
    const current = latestByZone.get(zone)
    if (current == null || event.timestamp > current.timestamp) {
      latestByZone.set(zone, event)
    }
  }

  return Array.from(latestByZone.values()).map((event) => ({
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
    if (event.eventType !== 'WARD_PLACED' || event.timestamp > time) {
      continue
    }
    const creator = findByPuuid(props.players, event.creatorPUUID ?? '')
    if (creator?.teamId === 100) blue++
    else if (creator?.teamId === 200) red++
  }

  return { blue, red }
})

const championIconUrl = (player: LoLGameParticipantDto): string => {
  return getChampionIconUrl(player.championName, props.patch)
}

const teamBorderClass = (player: LoLGameParticipantDto): string => {
  return player.teamId === 100 ? 'border-brand-green' : 'border-brand-red'
}

const structureClasses = (structure: StructureDot): string => {
  if (structure.destroyed) {
    return 'opacity-30 grayscale'
  }
  return structure.teamId === 100
    ? 'bg-brand-green/85 ring-1 ring-black/30'
    : 'bg-brand-red/85 ring-1 ring-black/30'
}

const structureTooltip = (structure: StructureDot): string => {
  const team = structure.teamId === 100 ? 'Équipe bleue' : 'Équipe rouge'
  const status = structure.destroyed ? ' (détruite)' : ''
  return `${team} — ${structure.label}${status}`
}
</script>
