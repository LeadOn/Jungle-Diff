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
  <!-- Sticks under the site header (58px, 68px from md), so the sections stay one click away. -->
  <div class="sticky top-[58px] z-30 bg-bg-base/90 py-2.5 backdrop-blur-md md:top-[68px]">
    <div
      role="tablist"
      aria-label="Sections de la partie"
      class="flex w-max max-w-full overflow-x-auto rounded-full border border-border-base bg-surface-base p-[3px] shadow-card [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="tab.id === activeId"
        class="flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-bold transition-colors duration-200"
        :class="tab.id === activeId ? 'bg-inverse text-inverse-text' : 'text-text-main hover:bg-surface-muted'"
        @click="onSelect(tab)"
      >
        <Icon :name="tab.icon" class="size-4" />
        {{ tab.label }}
      </button>
    </div>
  </div>
</template>
