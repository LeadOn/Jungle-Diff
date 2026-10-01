<script setup lang="ts">
/** A Riot ID typed as its two halves, game name and tag, around the `#` that joins them. */
withDefaults(defineProps<{
  name: string
  tag: string
  /** Accessible names of the two fields; the visible label is the caller's. */
  nameLabel?: string
  tagLabel?: string
  namePlaceholder?: string
  size?: 'md' | 'lg'
  disabled?: boolean
}>(), {
  nameLabel: 'Pseudo Riot',
  tagLabel: 'Tag Riot',
  namePlaceholder: 'Pseudo',
  size: 'md',
  disabled: false,
})

const emit = defineEmits<{
  'update:name': [value: string]
  'update:tag': [value: string]
  submit: []
}>()

const read = (event: Event) => (event.target as HTMLInputElement).value
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :value="name"
      :aria-label="nameLabel"
      :placeholder="namePlaceholder"
      :disabled="disabled"
      spellcheck="false"
      autocomplete="off"
      class="riot-field min-w-0 flex-1 font-bold"
      :class="size === 'lg' ? 'h-11 rounded-[14px] px-3.5 text-[15px]' : 'h-[42px] rounded-xl px-3 text-sm'"
      @input="emit('update:name', read($event))"
      @keydown.enter.prevent="emit('submit')"
    >
    <span aria-hidden="true" class="font-bold text-text-sec" :class="size === 'lg' ? 'text-lg' : 'text-[17px]'">#</span>
    <input
      :value="tag"
      :aria-label="tagLabel"
      placeholder="EUW"
      :disabled="disabled"
      spellcheck="false"
      autocomplete="off"
      class="riot-field font-mono"
      :class="size === 'lg' ? 'h-11 w-[100px] rounded-[14px] px-3.5 text-sm' : 'h-[42px] w-24 rounded-xl px-3 text-[13.5px]'"
      @input="emit('update:tag', read($event))"
      @keydown.enter.prevent="emit('submit')"
    >
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.riot-field {
  @apply border border-border-accent bg-surface-hover text-text-main outline-none transition-colors focus:border-text-main/45 disabled:cursor-not-allowed disabled:opacity-60;
}
</style>
