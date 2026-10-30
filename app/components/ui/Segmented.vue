<script setup lang="ts" generic="T extends string | number">
import { ref } from 'vue'

export interface UiSegmentedOption<V extends string | number = string> {
  value: V
  label: string
  disabled?: boolean
}

const props = defineProps<{
  modelValue: T
  options: readonly UiSegmentedOption<T>[]
  ariaLabel?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: T]
}>()

const buttonRefs = ref<HTMLButtonElement[]>([])

function selectOption(option: UiSegmentedOption<T>) {
  if (option.disabled || option.value === props.modelValue) return
  emit('update:modelValue', option.value)
}

function onKeydown(event: KeyboardEvent, index: number) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  event.preventDefault()
  const count = props.options.length
  if (count === 0) return
  const step = event.key === 'ArrowRight' ? 1 : -1
  for (let offset = 1; offset <= count; offset++) {
    const nextIndex = (index + step * offset + count) % count
    const candidate = props.options[nextIndex]
    if (candidate && !candidate.disabled) {
      emit('update:modelValue', candidate.value)
      buttonRefs.value[nextIndex]?.focus()
      return
    }
  }
}
</script>

<template>
  <div
    role="group"
    :aria-label="ariaLabel"
    class="inline-flex gap-0.5 rounded-2 border border-line bg-neutral-soft p-0.5"
  >
    <button
      v-for="(option, index) in options"
      :key="String(option.value)"
      ref="buttonRefs"
      type="button"
      :disabled="option.disabled"
      :aria-pressed="modelValue === option.value"
      class="h-7 rounded-1 border-0 px-3 text-[0.8125rem] font-semibold transition-[background-color,color,box-shadow] duration-[120ms] ease-out"
      :class="[
        modelValue === option.value
          ? 'bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong),var(--shadow-hair-value)]'
          : 'bg-transparent text-ink-2 hover:text-ink',
        option.disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
      ]"
      @click="selectOption(option)"
      @keydown="onKeydown($event, index)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

