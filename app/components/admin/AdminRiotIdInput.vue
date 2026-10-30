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
      class="riot-field min-w-0 flex-1 font-semibold"
      :class="size === 'lg' ? 'h-11 px-3.5 text-[15px]' : 'h-10 px-3 text-sm'"
      @input="emit('update:name', read($event))"
      @keydown.enter.prevent="emit('submit')"
    >
    <span aria-hidden="true" class="font-mono font-medium text-ink-3" :class="size === 'lg' ? 'text-base' : 'text-[15px]'">#</span>
    <input
      :value="tag"
      :aria-label="tagLabel"
      placeholder="EUW"
      :disabled="disabled"
      spellcheck="false"
      autocomplete="off"
      class="riot-field font-mono"
      :class="size === 'lg' ? 'h-11 w-[100px] px-3.5 text-sm' : 'h-10 w-24 px-3 text-[13px]'"
      @input="emit('update:tag', read($event))"
      @keydown.enter.prevent="emit('submit')"
    >
  </div>
</template>

<style scoped>
@reference "../../assets/css/main.css";

.riot-field {
  /* Fields: 6 px radius, hairline that darkens on hover; focus is the global focus-visible ring. */
  @apply rounded-2 border border-line-strong bg-surface text-ink transition-colors duration-120 ease-out hover:border-ink-3 disabled:cursor-not-allowed disabled:bg-sunken disabled:opacity-60 disabled:hover:border-line-strong;
}
</style>
