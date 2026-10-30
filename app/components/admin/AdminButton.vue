<script setup lang="ts">
/**
 * The buttons of the admin space, drawn exactly like `UiButton` (primary: ink fill; secondary:
 * surface with a hairline; 28 / 36 / 44 px, 6 px radius). Kept as its own component because `busy`
 * also blocks the button, so an action cannot be fired twice while its call is in flight, and the
 * icon (which spins while busy) is passed by name.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  busy?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
}>(), {
  variant: 'primary',
  size: 'md',
  icon: undefined,
  busy: false,
  disabled: false,
  type: 'button',
})

const SIZES = {
  sm: 'h-7 px-2.5 gap-1.5 text-[0.8125rem]',
  md: 'h-9 px-[14px] gap-2 text-[0.875rem]',
  lg: 'h-11 px-[18px] gap-2 text-[0.9375rem]',
} as const

const VARIANTS = {
  primary: 'border-transparent bg-ink text-paper enabled:hover:bg-[color-mix(in_oklch,var(--ink)_86%,var(--paper))]',
  secondary: 'border-line-strong bg-surface text-ink enabled:hover:border-ink-3 enabled:hover:bg-raised',
} as const
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || busy"
    :aria-busy="busy || undefined"
    class="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-2 border font-semibold transition-colors duration-120 ease-out select-none"
    :class="[
      SIZES[size],
      VARIANTS[variant],
      busy ? 'cursor-progress' : disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
    ]"
  >
    <Icon
      v-if="icon"
      :name="icon"
      class="size-4 shrink-0"
      :class="busy && 'animate-spin'"
    />
    <slot />
  </button>
</template>
