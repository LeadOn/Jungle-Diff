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

const iconUrl = computed(() => (props.entry.iconId != null
  ? getProfileIconUrl(props.entry.iconId, patchStore.currentPatch)
  : null))

const tierStyle = computed(() => {
  const tint = tierTint(props.entry.rank?.tier)
  return tint ? { '--tier': tint } : undefined
})

const lpText = computed(() => (props.entry.rank ? `${props.entry.rank.leaguePoints} LP` : ''))

const winRateClass = computed(() => {
  if (props.entry.winRate === null) return ''
  return props.entry.winRate >= 50 ? 'win' : 'loss'
})

const deltaClass = computed(() => {
  if (!ranked.value || props.entry.delta === 0) return 'text-ink-3'
  return props.entry.delta > 0 ? 'text-win-ink' : 'text-loss-ink'
})
</script>

<template>
  <NuxtLink
    :to="`/summoner/${entry.id}`"
    :data-flip-id="`row-${entry.id}`"
    class="lrow"
    :class="{ me: isMe, hovered }"
    :style="tierStyle"
    :aria-label="`${ranked ? `${entry.position}e, ` : ''}${entry.name}${isMe ? ' (vous)' : ''}, ${tierLabel(entry.rank)}${lpText ? ` ${lpText}` : ''}`"
    @mouseenter="emit('hover', entry.id)"
    @mouseleave="emit('hover', null)"
  >
    <span class="lpos" :class="{ none: !ranked }">{{ entry.position ?? '—' }}</span>

    <span class="lid">
      <span class="avatar">
        <img v-if="iconUrl" :src="iconUrl" alt="">
      </span>
      <span class="lname">
        <span class="lname-top">
          <b>{{ entry.name }}</b>
          <UiStatus v-if="isMe" variant="me">Vous</UiStatus>
          <UiStatus
            v-if="entry.smurf"
            variant="smurf"
            :title="entry.mainName ? `Compte secondaire de ${entry.mainName}` : 'Compte secondaire'"
          >Smurf</UiStatus>
        </span>
        <span class="lsub lsub-tag">{{ entry.tag }}<template v-if="entry.smurf && entry.mainName"> · de {{ entry.mainName }}</template></span>
        <span class="lsub lsub-rank">{{ tierLabel(entry.rank) }}<template v-if="lpText"> · {{ lpText }}</template></span>
      </span>
    </span>

    <span class="ltier" :class="{ none: !ranked }">
      <img :src="tierEmblemUrl(entry.rank)" alt="">
      <span>
        <b>{{ tierLabel(entry.rank) }}</b>
        <span>{{ lpText }}</span>
      </span>
    </span>

    <span class="lgap">
      <span
        v-if="entry.gap !== null"
        :title="`${entry.gap} LP pour dépasser ${entry.previousName}`"
        class="gap-chip"
      >{{ formatSigned(-entry.gap) }} LP</span>
    </span>

    <span class="lform">
      <LolFormPills v-if="ranked" :form="entry.form" />
    </span>

    <span class="lwr" :class="winRateClass">{{ entry.winRate === null ? '—' : formatPercent(entry.winRate) }}</span>

    <span class="ld7 fig" :class="deltaClass">{{ ranked ? formatSigned(entry.delta) : '—' }}</span>
  </NuxtLink>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.lrow {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 12px;
  padding: 12px 16px 12px 14px;
  border-bottom: 1.5px dashed var(--line);
  color: inherit;
  text-decoration: none;
  transition: background-color 120ms var(--ease-out);
}

.lrow:last-child {
  border-bottom: 0;
}

.lrow:hover,
.lrow.hovered {
  background: color-mix(in oklch, var(--sunken) 70%, var(--surface));
}

.lrow.me {
  background: var(--gold-soft);
}

.lrow.me .lsub,
.lrow.me .ltier span span {
  color: var(--ink-2);
}

.lrow:focus-visible {
  outline-offset: -3px;
}

.lrow.moving {
  z-index: 3;
}

.lpos {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--tier, var(--tier-none));
  color: var(--on-tier);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
}

.lpos.none {
  background: var(--sunken);
  color: var(--ink-2);
}

.lid {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.lid .avatar {
  position: relative;
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--sunken);
  box-shadow: 0 0 0 1px var(--line);
  overflow: hidden;
}

.lid .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.lname {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.lname-top {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.lname-top b {
  font-weight: 660;
  font-size: 0.9375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lsub {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lsub-tag {
  display: none;
}

.ltier,
.lgap,
.lform,
.lwr {
  display: none;
}

.ltier {
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ltier img {
  width: 32px;
  height: 32px;
  flex: none;
  object-fit: contain;
}

.ltier b {
  display: block;
  font-size: 0.875rem;
  font-weight: 650;
  white-space: nowrap;
}

.ltier span span {
  display: block;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--ink-3);
}

.ltier.none img {
  opacity: 0.4;
  filter: grayscale(1);
}

.ltier.none b {
  color: var(--ink-3);
  font-weight: 520;
}

.gap-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--line-strong);
  background: var(--sunken);
  font-family: var(--font-mono);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.lwr {
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 650;
  text-align: right;
}

.lwr.win {
  color: var(--win-ink);
}

.lwr.loss {
  color: var(--loss-ink);
}

.ld7 {
  text-align: right;
  font-size: 1.125rem;
}

@container ladder (min-width: 560px) {
  .lrow {
    grid-template-columns: 30px minmax(0, 1.3fr) minmax(0, 1fr) 78px 56px;
  }

  .lsub-tag {
    display: block;
  }

  .lsub-rank {
    display: none;
  }

  .ltier,
  .lgap {
    display: flex;
  }
}

@container ladder (min-width: 760px) {
  .lrow {
    grid-template-columns: 30px minmax(0, 1.3fr) minmax(0, 1fr) 78px 64px 50px 56px;
  }

  .lform,
  .lwr {
    display: block;
  }
}
</style>
