<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: boolean
  label?: string
  disabled?: boolean
}>(), {
  label: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function toggle() {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="modelValue"
    :disabled="disabled"
    class="inline-flex items-center gap-2.5 border-0 bg-transparent p-0 text-[0.8125rem] font-semibold text-ink select-none"
    :class="disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'"
    @click="toggle"
  >
    <span
      aria-hidden="true"
      class="relative h-5 w-[34px] shrink-0 rounded-full transition-colors duration-200 ease-out"
      :class="modelValue ? 'bg-canopy' : 'bg-line-strong'"
    >
      <span
        class="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-raised shadow-[0_1px_2px_oklch(0_0_0/0.25)] transition-transform duration-200 ease-out"
        :class="modelValue ? 'translate-x-[14px]' : 'translate-x-0'"
      />
    </span>
    <span v-if="label || $slots.default">
      <slot>{{ label }}</slot>
    </span>
  </button>
</template>
