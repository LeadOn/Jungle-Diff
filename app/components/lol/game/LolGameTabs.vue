<script setup lang="ts">
export interface GameTab {
  id: string
  label: string
  icon: string
}

const props = defineProps<{
  tabs: GameTab[]
  activeId: string
}>()

const emit = defineEmits<{
  (e: 'update:activeId', id: string): void
}>()

const onSelect = (tab: GameTab) => {
  if (tab.id !== props.activeId) {
    emit('update:activeId', tab.id)
  }
}
</script>

<template>
  <!-- Sticks under the site header (56px), so the sections stay one click away. -->
  <div class="sticky top-14 z-30 bg-paper/90 py-2.5 backdrop-blur-md">
    <div
      role="tablist"
      aria-label="Sections de la partie"
      class="flex w-max max-w-full gap-0.5 overflow-x-auto rounded-3 border border-line bg-neutral-soft p-[3px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="tab.id === activeId"
        class="flex h-9 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-2 px-3.5 text-sm font-semibold transition-[background-color,color,box-shadow] duration-[120ms] ease-out"
        :class="tab.id === activeId
          ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
          : 'text-ink-2 hover:text-ink'"
        @click="onSelect(tab)"
      >
        <Icon :name="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
