<template>
  <div class="bg-white rounded-[24px] p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/80">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-[13px] font-extrabold text-gray-900">{{ title }}</h3>
      <span v-if="badge" class="text-[10px] font-bold bg-[#faf9f6] text-gray-900 px-2 py-0.5 rounded border border-gray-200/80">{{ badge }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  badge?: string
}>()
</script>
