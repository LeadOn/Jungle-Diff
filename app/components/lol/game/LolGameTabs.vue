<template>
  <div
    class="border-border-base inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full border p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    role="tablist"
  >
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      :aria-selected="tab.id === activeId"
      class="flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors"
      :class="
        tab.id === activeId
          ? 'text-text-main light:bg-[rgba(23,30,54,0.08)] bg-white/10'
          : 'text-text-ter hover:text-text-main'
      "
      @click="onSelect(tab)"
    >
      <Icon :name="tab.icon" class="w-4 h-4" />
      {{ tab.label }}
    </button>
  </div>
</template>

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
