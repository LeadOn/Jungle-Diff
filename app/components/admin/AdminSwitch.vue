<script setup lang="ts">
/** A labelled on/off row of the account dialog. `tone` colours the track when it is on. */
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
    class="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-surface-hover px-3.5 py-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
    @click="emit('update:modelValue', !modelValue)"
  >
    <span class="flex flex-col gap-0.5">
      <span class="text-sm font-bold">{{ label }}</span>
      <span class="text-xs font-semibold text-text-sec">{{ description }}</span>
    </span>
    <span
      aria-hidden="true"
      class="relative h-6 w-[42px] shrink-0 rounded-full transition-colors duration-200"
      :class="modelValue ? (tone === 'loss' ? 'bg-loss' : 'bg-win') : 'bg-text-main/20'"
    >
      <span
        class="absolute top-[3px] size-[18px] rounded-full bg-white transition-[left] duration-300 ease-spring"
        :class="modelValue ? 'left-[21px]' : 'left-[3px]'"
      />
    </span>
  </button>
</template>
