<script setup lang="ts">
import { ref, computed } from 'vue'
import type { LoLGameParticipantDto } from '~/lib/types/match'
import type { LoLGameTimelineFrame, LoLGameTimelineFrameParticipant } from '~/lib/types/timeline'
import { formatFull, formatTimestamp, frameStatsFor, playerRiotName } from '~/utils/lol-match'

const props = withDefaults(defineProps<{
  timeline?: LoLGameTimelineFrame[]
  selectedPlayer?: LoLGameParticipantDto
  currentFrameIndex: number
  /** The film draws its playhead on the curve; the Performance tab reads the whole game instead. */
  showPlayhead?: boolean
}>(), { timeline: undefined, selectedPlayer: undefined, showPlayhead: true })

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

const GROUPS: GroupType[] = ['Combat', 'Défense', 'Autres']
const WIDTH = 800
const HEIGHT = 220

const statKey = ref<StatKey>('attackDamage')

const selectedOption = computed<StatOption>(() => STAT_OPTIONS.find(o => o.key === statKey.value) ?? STAT_OPTIONS[0]!)

const optionsFor = (group: GroupType): StatOption[] => STAT_OPTIONS.filter(o => o.group === group)

const selectedPlayerLabel = computed(() => (props.selectedPlayer ? playerRiotName(props.selectedPlayer) : ''))

const onStatKeyChange = (event: Event) => {
  statKey.value = (event.target as HTMLSelectElement).value as StatKey
  hoverIndex.value = null
}

const frames = computed(() => props.timeline ?? [])

/**
 * A custom game imported from the LoL client ships a timeline without `championStats`, so every
 * option of the picker draws a flat line at 0 and the block reads as real, uniformly null data.
 * Nothing but zeros across every frame and every stat means there is nothing to plot at all.
 */
const hasChampionStats = computed(() => frames.value.some((frame) => {
  const stats = frameStatsFor(frame, props.selectedPlayer?.puuid)
  if (stats == null) return false
  return STAT_OPTIONS.some((option) => {
    const value = stats[option.key]
    return typeof value === 'number' && value !== 0
  })
}))

const series = computed(() => frames.value.map((frame) => {
  const value = frameStatsFor(frame, props.selectedPlayer?.puuid)?.[statKey.value]
  return typeof value === 'number' ? value : 0
}))

const xFor = (index: number): number => {
  const count = frames.value.length
  return count <= 1 ? 0 : (index / (count - 1)) * WIDTH
}

const scale = computed(() => (HEIGHT - 16) / Math.max(1, ...series.value))
const yFor = (value: number): number => HEIGHT - 6 - value * scale.value

const valueLabel = (value: number) => `${formatFull(value)}${selectedOption.value.isPercent ? ' %' : ''}`

const endValueLabel = computed(() => (series.value.length > 0 ? valueLabel(series.value.at(-1) ?? 0) : ''))

const linePath = computed(() => series.value.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' '))

const areaPath = computed(() => {
  const values = series.value
  if (values.length === 0) return ''
  const line = values.map((v, i) => `L ${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(' ')
  return `M ${xFor(0)},${HEIGHT} ${line} L ${xFor(values.length - 1)},${HEIGHT} Z`
})

const playheadX = computed(() => xFor(props.currentFrameIndex))

const hoverIndex = ref<number | null>(null)

const onChartMouseMove = (event: MouseEvent) => {
  if (frames.value.length === 0) return
  const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  hoverIndex.value = Math.round(ratio * (frames.value.length - 1))
}

const hover = computed(() => {
  const index = hoverIndex.value
  if (index == null) return null
  const value = series.value[index] ?? 0
  const x = xFor(index)
  return {
    x,
    y: yFor(value),
    percent: (x / WIDTH) * 100,
    time: formatTimestamp(frames.value[index]?.timestamp ?? 0),
    value: valueLabel(value),
  }
})

const endLabel = computed(() => formatTimestamp(frames.value.at(-1)?.timestamp ?? 0))
</script>

<template>
  <section v-if="hasChampionStats" class="rounded-[26px] border border-border-subtle bg-surface-base p-[22px] shadow-card">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="m-0 text-xl font-bold tracking-[-0.025em]">Stats du champion</h3>
        <p class="m-0 mt-[3px] text-[12.5px] font-semibold text-text-sec">
          {{ selectedPlayerLabel }} — snapshots minute par minute · {{ endValueLabel }} en fin de partie
        </p>
      </div>

      <select
        :value="statKey"
        aria-label="Statistique affichée"
        class="h-[34px] max-w-full cursor-pointer rounded-full border border-border-base bg-surface-muted px-3 text-[12.5px] font-bold text-text-main"
        @change="onStatKeyChange"
      >
        <optgroup v-for="group in GROUPS" :key="group" :label="group">
          <option v-for="option in optionsFor(group)" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </optgroup>
      </select>
    </div>

    <div class="relative mt-[18px]">
      <span
        v-if="hover"
        role="tooltip"
        class="pointer-events-none absolute -top-1.5 z-[5] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[14px] bg-ink px-[11px] py-[7px] text-ink-text"
        :style="{ left: `${hover.percent}%` }"
      >
        <span class="block font-mono text-[11px] text-on-photo-green">{{ hover.time }}</span>
        <span class="block text-[12.5px] font-bold">{{ hover.value }}</span>
      </span>

      <svg
        :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        preserveAspectRatio="none"
        class="block h-[220px] w-full cursor-crosshair"
        @mousemove="onChartMouseMove"
        @mouseleave="hoverIndex = null"
      >
        <path :d="areaPath" class="fill-dmg-magic/22" />
        <path :d="linePath" fill="none" class="stroke-dmg-magic" stroke-width="2" vector-effect="non-scaling-stroke" />

        <line
          v-if="showPlayhead && frames.length > 1"
          :x1="playheadX"
          :x2="playheadX"
          y1="0"
          :y2="HEIGHT"
          class="stroke-text-main/40"
          stroke-width="1.5"
          stroke-dasharray="4 4"
          vector-effect="non-scaling-stroke"
        />

        <line v-if="hover" :x1="hover.x" :x2="hover.x" y1="0" :y2="HEIGHT" class="stroke-brand-gold-bright" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>

      <!-- Outside the SVG: its non-uniform scaling would stretch a circle into an ellipse. -->
      <span
        v-if="hover"
        class="pointer-events-none absolute -ml-1 -mt-1 size-2 rounded-full bg-brand-gold-bright"
        :style="{ left: `${hover.percent}%`, top: `${(hover.y / HEIGHT) * 100}%` }"
      />
    </div>

    <div class="mt-1.5 flex justify-between font-mono text-[11.5px] text-text-sec">
      <span>00:00</span>
      <span>{{ endLabel }}</span>
    </div>
  </section>
</template>
