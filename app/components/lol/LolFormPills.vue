<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /**
   * Recent match results. By default (`newestFirst = true`), matches the GameOn API order
   * (`recentFormSolo` / `recentFormFlex` come newest-first) and reverses them so the pills
   * read from oldest (left) to newest (right), per the Canopée design system.
   */
  form: readonly boolean[]
  newestFirst?: boolean
}>(), {
  newestFirst: true,
})

const orderedForm = computed(() => (props.newestFirst ? [...props.form].reverse() : [...props.form]))

const ariaLabel = computed(() => {
  if (orderedForm.value.length === 0) return undefined
  return `Forme : ${orderedForm.value.map(win => (win ? 'V' : 'D')).join(' ')}`
})
</script>

<template>
  <span
    v-if="orderedForm.length > 0"
    class="inline-flex items-center gap-0.5"
    :aria-label="ariaLabel"
  >
    <i
      v-for="(win, index) in orderedForm"
      :key="index"
      :title="win ? 'Victoire' : 'Défaite'"
      class="block h-3.5 w-2 rounded-[3px]"
      :class="win ? 'bg-win' : 'bg-loss'"
    />
  </span>
</template>

