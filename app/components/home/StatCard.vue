<template>
  <div class="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/80 flex flex-col justify-between h-full">
    <div>
      <h3 class="text-[10px] font-bold text-gray-400 tracking-widest uppercase mb-2">{{ title }}</h3>
      <div class="text-[28px] leading-none font-black text-gray-900 mb-1.5" :class="valueClass">{{ value }}</div>
    </div>
    <div class="text-[11px] text-gray-500 font-bold tracking-wide">{{ subtitle }}</div>
  </div>
</template>
<script setup lang="ts">
defineProps<{
  title: string
  value: string | number
  subtitle: string
  valueClass?: string
}>()
</script>
