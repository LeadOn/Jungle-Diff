<script setup lang="ts">
/**
 * The pill buttons of the admin space. `primary` is the inverse pill (ink in the light theme);
 * `secondary` the white one with a hairline. `busy` spins the icon and blocks the button, so an
 * action cannot be fired twice while its call is in flight.
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
  sm: 'h-[34px] px-3.5 text-[12.5px]',
  md: 'h-10 px-4 text-[13.5px]',
  lg: 'h-[42px] px-[18px] text-sm',
} as const
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || busy"
    :aria-busy="busy || undefined"
    class="inline-flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full font-bold transition-[transform,border-color,opacity] duration-[250ms] ease-spring disabled:cursor-not-allowed"
    :class="[
      SIZES[size],
      variant === 'primary'
        ? 'bg-inverse text-inverse-text enabled:hover:scale-[1.03] disabled:opacity-45'
        : 'border border-border-accent bg-surface-base text-text-main enabled:hover:border-text-main/35 disabled:opacity-45',
      busy && 'disabled:opacity-100',
    ]"
  >
    <Icon
      v-if="icon"
      :name="icon"
      class="size-3.5 shrink-0"
      :class="[
        variant === 'primary' ? 'text-on-photo-lime dark:text-win' : 'text-win',
        busy && 'animate-spin',
      ]"
    />
    <slot />
  </button>
</template>
