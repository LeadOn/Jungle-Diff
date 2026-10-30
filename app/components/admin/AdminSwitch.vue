<script setup lang="ts">
/**
 * A labelled on/off row of the account dialog, with the track and knob of `UiSwitch`. `tone` colours
 * the track when it is on: canopy for an ordinary flag, loss for one that hides the account.
 */
withDefaults(defineProps<{
  modelValue: boolean
  label: string
  description: string
  tone?: 'win' | 'loss'
  disabled?: boolean
}>(), { tone: 'win', disabled: false })

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-3 border border-line bg-sunken px-3.5 py-3 text-left transition-colors duration-120 ease-out enabled:hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-45"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="flex flex-col gap-0.5">
      <span class="text-sm font-semibold text-ink">{{ label }}</span>
      <span class="text-[13px] text-ink-2">{{ description }}</span>
    </span>
    <span
      aria-hidden="true"
      class="relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-200 ease-out"
      :class="modelValue ? (tone === 'loss' ? 'bg-loss' : 'bg-canopy') : 'bg-line-strong'"
    >
      <span
        class="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-raised shadow-[var(--shadow-knob-value)] transition-transform duration-200 ease-out"
        :class="modelValue ? 'translate-x-[14px]' : 'translate-x-0'"
      />
    </span>
  </button>
</template>
