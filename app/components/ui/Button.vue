<script setup lang="ts">
import { computed, resolveComponent } from 'vue'

export type UiButtonVariant = 'primary' | 'secondary' | 'quiet' | 'gold' | 'night'
export type UiButtonSize = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{
  variant?: UiButtonVariant
  size?: UiButtonSize
  icon?: boolean
  block?: boolean
  busy?: boolean
  disabled?: boolean
  to?: string
  href?: string
  type?: 'button' | 'submit' | 'reset'
}>(), {
  variant: 'secondary',
  size: 'md',
  icon: false,
  block: false,
  busy: false,
  disabled: false,
  to: undefined,
  href: undefined,
  type: 'button',
})

const tag = computed(() => {
  if (props.to) return resolveComponent('NuxtLink')
  if (props.href) return 'a'
  return 'button'
})

const variantClasses: Record<UiButtonVariant, string> = {
  primary: 'bg-ink text-paper border-transparent hover:bg-[color-mix(in_oklch,var(--ink)_86%,var(--paper))]',
  secondary: 'bg-surface border-line-strong text-ink hover:border-ink-3 hover:bg-raised',
  quiet: 'bg-transparent border-transparent text-ink-2 hover:bg-neutral-soft hover:text-ink',
  gold: 'bg-gold border-transparent text-on-tier hover:bg-[color-mix(in_oklch,var(--gold)_88%,var(--on-tier))]',
  night: 'bg-on-night border-transparent text-night hover:bg-[color-mix(in_oklch,var(--on-night)_88%,var(--night))]',
}

const sizeClasses = computed(() => {
  if (props.icon) {
    if (props.size === 'sm') return 'h-7 w-7 px-0 text-[0.8125rem]'
    if (props.size === 'lg') return 'h-11 w-11 px-0 text-[0.9375rem]'
    return 'h-9 w-9 px-0 text-[0.875rem]'
  }
  if (props.size === 'sm') return 'h-7 px-2.5 gap-1.5 text-[0.8125rem]'
  if (props.size === 'lg') return 'h-11 px-[18px] gap-2 text-[0.9375rem]'
  return 'h-9 px-[14px] gap-2 text-[0.875rem]'
})
</script>

<template>
  <component
    :is="tag"
    :to="to"
    :href="href"
    :type="!to && !href ? type : undefined"
    :disabled="!to && !href ? disabled : undefined"
    :aria-disabled="disabled ? 'true' : undefined"
    :aria-busy="busy ? 'true' : undefined"
    class="inline-flex items-center justify-center rounded-2 border font-semibold whitespace-nowrap no-underline transition-colors duration-[120ms] ease-out select-none"
    :class="[
      variantClasses[variant],
      sizeClasses,
      block ? 'w-full' : '',
      disabled ? 'cursor-not-allowed opacity-45' : busy ? 'cursor-progress' : 'cursor-pointer',
    ]"
  >
    <slot />
  </component>
</template>
