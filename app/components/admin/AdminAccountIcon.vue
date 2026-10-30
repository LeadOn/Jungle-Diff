<script setup lang="ts">
import { computed } from 'vue'
import { usePatchStore } from '~/stores/patch'
import { getProfileIconUrl } from '~/utils/ddragon'

/**
 * A Riot profile icon, round like every player in Canopée; the size comes from the parent's classes.
 */
const props = withDefaults(defineProps<{
  iconId: number | null
  /** Archived accounts are drawn in grey, like their row. */
  archived?: boolean
}>(), { archived: false })

const patch = usePatchStore()

const src = computed(() => (props.iconId != null ? getProfileIconUrl(props.iconId, patch.currentPatch) : null))
</script>

<template>
  <span aria-hidden="true" class="block shrink-0 overflow-hidden rounded-full bg-sunken shadow-[0_0_0_1px_var(--line)]" :class="{ grayscale: archived }">
    <UiAppImage v-if="src" :src="src" alt="" class="size-full object-cover" />
  </span>
</template>
