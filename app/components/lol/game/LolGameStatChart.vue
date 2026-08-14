<template>
  <div class="border-border-base flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
    <div>
      <p class="font-heading text-text-main text-base font-semibold">
        Stats du champion
      </p>
      <p class="text-text-ter mt-0.5 text-[13px]">
        {{ selectedPlayerLabel }} — snapshots minute par minute
      </p>
    </div>

    <select
      class="border-border-base text-text-main rounded-lg border bg-white/5 px-2.5 py-1.5 text-xs font-medium light:bg-black/5"
      :value="statKey"
      @change="onStatKeyChange"
    >
      <optgroup v-for="group in groups" :key="group" :label="group">
        <option
          v-for="option in optionsFor(group)"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </option>
      </optgroup>
    </select>
  </div>

  <div class="p-5">
    <div class="relative">
      <div
        v-if="hoverIndex != null"
        class="border-border-base bg-surface-base pointer-events-none absolute top-0 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-xs shadow-lg"
        :style="{ left: `${hoverPercent}%` }"
      >
        <p class="text-text-ter">{{ hoverTimeLabel }}</p>
        <p class="text-text-main font-semibold">{{ hoverValueLabel }}</p>
      </div>

      <svg
        :viewBox="`0 0 ${width} ${height}`"
        preserveAspectRatio="none"
        class="h-56 w-full cursor-crosshair"
        @mousemove="onChartMouseMove"
        @mouseleave="onChartMouseLeave"
      >
        <path :d="areaPath" fill="rgba(94,163,255,0.3)" />
        <path
          :d="linePath"
          fill="none"
          class="stroke-blue-400"
          stroke-width="2"
        />

        <line
          v-if="frames.length > 1"
          :x1="playheadX"
          :x2="playheadX"
          y1="0"
          :y2="height"
          class="stroke-[rgba(255,255,255,0.45)] light:stroke-[rgba(0,0,0,0.3)]"
          stroke-width="1.5"
          stroke-dasharray="4 4"
        />

        <template v-if="hoverIndex != null">
          <line
            :x1="hoverX"
            :x2="hoverX"
            y1="0"
            :y2="height"
            class="stroke-brand-gold"
            stroke-width="1"
          />
          <circle
            :cx="hoverX"
            :cy="hoverY"
            r="4"
            class="fill-brand-gold"
          />
        </template>
      </svg>
    </div>

    <div class="text-text-ter mt-1 flex items-center justify-between text-xs">
      <span>{{ startLabel }}</span>
      <span class="text-text-secondary font-medium">{{ centerLabel }}</span>
      <span>{{ endLabel }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame, LoLGameTimelineFrameParticipant } from '~/lib/types/timeline'
import { formatFull, formatTimestamp, frameStatsFor, isLinkedToGameOn, playerDisplayName } from '~/utils/lol-match'

const props = defineProps<{
  timeline?: LoLGameTimelineFrame[]
  selectedPlayer?: LoLGameParticipantDto
  currentFrameIndex: number
}>()

type StatKey = keyof Pick<
  LoLGameTimelineFrameParticipant,
  | 'attackDamage'
  | 'abilityPower'
  | 'attackSpeed'
  | 'abilityHaste'
  | 'lifesteal'
  | 'omnivamp'
  | 'physicalVamp'
  | 'spellVamp'
  | 'magicPen'
  | 'magicPenPercent'
  | 'armorPen'
  | 'armorPenPercent'
  | 'bonusArmorPenPercent'
  | 'bonusMagicPenPercent'
  | 'armor'
  | 'magicResist'
  | 'health'
  | 'healthMax'
  | 'healthRegen'
  | 'ccReduction'
  | 'cooldownReduction'
  | 'movementSpeed'
  | 'power'
  | 'powerMax'
  | 'powerRegen'
>

type GroupType = 'Combat' | 'Défense' | 'Autres'

interface StatOption {
  key: StatKey
  label: string
  group: GroupType
  isPercent?: boolean
}

const STAT_OPTIONS: StatOption[] = [
  { key: 'attackDamage', label: 'Puissance physique', group: 'Combat' },
  { key: 'abilityPower', label: 'Puissance magique', group: 'Combat' },
  { key: 'attackSpeed', label: 'Vitesse d’attaque', group: 'Combat' },
  { key: 'abilityHaste', label: 'Hâte de compétence', group: 'Combat' },
  { key: 'lifesteal', label: 'Vol de vie', group: 'Combat', isPercent: true },
  { key: 'omnivamp', label: 'Vol de vie omnidirectionnel', group: 'Combat', isPercent: true },
  { key: 'physicalVamp', label: 'Vol de vie physique', group: 'Combat', isPercent: true },
  { key: 'spellVamp', label: 'Vol de vie des sorts', group: 'Combat', isPercent: true },
  { key: 'armorPen', label: 'Pénétration d’armure (brute)', group: 'Combat' },
  { key: 'armorPenPercent', label: 'Pénétration d’armure (%)', group: 'Combat', isPercent: true },
  { key: 'bonusArmorPenPercent', label: 'Pénétration d’armure bonus (%)', group: 'Combat', isPercent: true },
  { key: 'magicPen', label: 'Pénétration magique (brute)', group: 'Combat' },
  { key: 'magicPenPercent', label: 'Pénétration magique (%)', group: 'Combat', isPercent: true },
  { key: 'bonusMagicPenPercent', label: 'Pénétration magique bonus (%)', group: 'Combat', isPercent: true },
  { key: 'armor', label: 'Armure', group: 'Défense' },
  { key: 'magicResist', label: 'Résistance magique', group: 'Défense' },
  { key: 'health', label: 'Points de vie', group: 'Défense' },
  { key: 'healthMax', label: 'Points de vie max', group: 'Défense' },
  { key: 'healthRegen', label: 'Régénération de vie', group: 'Défense' },
  { key: 'ccReduction', label: 'Réduction de CC', group: 'Défense', isPercent: true },
  { key: 'cooldownReduction', label: 'Réduction des délais', group: 'Défense', isPercent: true },
  { key: 'movementSpeed', label: 'Vitesse de déplacement', group: 'Autres' },
  { key: 'power', label: 'Mana / Énergie', group: 'Autres' },
  { key: 'powerMax', label: 'Mana / Énergie max', group: 'Autres' },
  { key: 'powerRegen', label: 'Régénération de mana', group: 'Autres' },
]

const width = 800
const height = 220
const options = STAT_OPTIONS
const groups: GroupType[] = ['Combat', 'Défense', 'Autres']

const statKey = ref<StatKey>('attackDamage')

const selectedOption = computed<StatOption>(() => {
  return options.find((o) => o.key === statKey.value) ?? options[0]!
})

const optionsFor = (group: GroupType): StatOption[] => {
  return options.filter((o) => o.group === group)
}

const selectedPlayerLabel = computed(() => {
  const player = props.selectedPlayer
  if (player == null) {
    return ''
  }

  const name = playerDisplayName(player)
  return isLinkedToGameOn(player) && name !== player.riotIdGameName
    ? `${name} (${player.riotIdGameName})`
    : name
})

const onStatKeyChange = (event: Event) => {
  statKey.value = (event.target as HTMLSelectElement).value as StatKey
}

const frames = computed(() => props.timeline ?? [])

const series = computed(() => {
  return frames.value.map(
    (frame) => {
      const val = frameStatsFor(frame, props.selectedPlayer?.puuid)?.[statKey.value]
      return typeof val === 'number' ? val : 0
    }
  )
})

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  if (frames.value.length === 0) return

  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const index = Math.round(ratio * (frames.value.length - 1))
  hoverIndex.value = Math.min(frames.value.length - 1, Math.max(0, index))
}

const onChartMouseLeave = () => {
  hoverIndex.value = null
}

const xFor = (index: number): number => {
  const count = frames.value.length
  if (count <= 1) return 0
  return (index / (count - 1)) * width
}

const scale = computed(() => {
  const max = Math.max(1, ...series.value)
  return (height - 16) / max
})

const yFor = (value: number): number => {
  return height - 6 - value * scale.value
}

const hoverX = computed(() => {
  return hoverIndex.value == null ? undefined : xFor(hoverIndex.value)
})

const hoverY = computed(() => {
  return hoverIndex.value == null ? undefined : yFor(series.value[hoverIndex.value] ?? 0)
})

const hoverPercent = computed(() => {
  return hoverX.value == null ? 0 : (hoverX.value / width) * 100
})

const hoverTimeLabel = computed(() => {
  if (hoverIndex.value == null) return ''
  return formatTimestamp(frames.value[hoverIndex.value]?.timestamp ?? 0)
})

const hoverValueLabel = computed(() => {
  if (hoverIndex.value == null) return ''

  const suffix = selectedOption.value.isPercent ? '%' : ''
  return `${formatFull(series.value[hoverIndex.value] ?? 0)}${suffix}`
})

const linePath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''

  return values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)},${yFor(v ?? 0)}`)
    .join(' ')
})

const areaPath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''

  const first = `M ${xFor(0)},${height}`
  const line = values
    .map((v, i) => `L ${xFor(i)},${yFor(v ?? 0)}`)
    .join(' ')
  const last = `L ${xFor(values.length - 1)},${height}`
  return `${first} ${line} ${last} Z`
})

const playheadX = computed(() => xFor(props.currentFrameIndex))

const startLabel = '00:00'
const endLabel = computed(() => {
  const last = frames.value.at(-1)
  return last ? formatTimestamp(last.timestamp) : '00:00'
})

const centerLabel = computed(() => {
  const values = series.value
  if (values.length === 0 || props.selectedPlayer == null) return ''

  const last = values.at(-1) ?? 0
  const suffix = selectedOption.value.isPercent ? '%' : ''
  return `${formatFull(last)}${suffix}`
})
</script>
