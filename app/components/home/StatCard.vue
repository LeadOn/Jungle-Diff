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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  title: string
  value: string | number
  subtitle: string
  valueClass?: string
}>()

// Seeded with the real value so the server renders the final number: the count-up is a mount-time
// flourish, not the source of truth.
const displayValue = ref<string | number>(props.value)
let timer: ReturnType<typeof setInterval> | null = null

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/**
 * Counts up to `value`, or shows it as-is when it holds no number.
 *
 * Re-run on every `value` change, not only on mount. The card used to snapshot the prop into
 * `displayValue` once and never look at it again, which froze it for good: harmless while the home
 * page loaded its figures a single time, wrong as soon as a filter could re-query them.
 */
const animateTo = (value: string | number) => {
  stopTimer()

  const strVal = String(value)
  const numMatch = strVal.match(/(\d+)/)
  if (!numMatch || !numMatch[1]) {
    displayValue.value = value
    return
  }

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

  timer = setInterval(() => {
    current += increment
    if (current >= target) {
      displayValue.value = value
      stopTimer()
    } else {
      displayValue.value = `${prefix}${current}${suffix}`
    }
  }, stepTime)
}

onMounted(() => animateTo(props.value))

watch(() => props.value, newValue => animateTo(newValue))

onBeforeUnmount(stopTimer)
</script>
