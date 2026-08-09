<template>
  <div class="bg-surface-base rounded-2xl p-5 border border-border-base flex flex-col justify-between h-full animate-fade-in-up hover:-translate-y-[2px] hover:border-border-accent transition-all duration-300">
    <div>
      <h3 class="font-mono text-[11px] font-bold text-text-ter tracking-[0.1em] uppercase mb-2">{{ title }}</h3>
      <div class="text-[28px] leading-none font-extrabold mb-1.5" :class="valueClass || 'text-text-main'">
        {{ displayValue }}
      </div>
    </div>
    <div class="text-[12px] text-text-sec font-medium">{{ subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  subtitle: string
  valueClass?: string
}>()

const displayValue = ref<string | number>(props.value)

onMounted(() => {
  const strVal = String(props.value)
  const numMatch = strVal.match(/(\d+)/)
  if (numMatch && numMatch[1]) {
    const target = parseInt(numMatch[1], 10)
    let current = 0
    const duration = 800
    const steps = 30
    const stepTime = Math.max(16, duration / steps)
    const increment = Math.max(1, Math.floor(target / steps))
    
    const index = numMatch.index ?? 0
    const prefix = strVal.substring(0, index)
    const suffix = strVal.substring(index + numMatch[1].length)
    
    displayValue.value = `${prefix}0${suffix}`
    
    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        displayValue.value = props.value
        clearInterval(timer)
      } else {
        displayValue.value = `${prefix}${current}${suffix}`
      }
    }, stepTime)
  }
})
</script>
