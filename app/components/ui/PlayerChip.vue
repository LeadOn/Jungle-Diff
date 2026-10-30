<script setup lang="ts">
withDefaults(defineProps<{
  label?: string
  avatarUrl?: string | null
  count?: number | string | null
  active?: boolean
}>(), {
  label: undefined,
  avatarUrl: null,
  count: null,
  active: false,
})
</script>

<template>
  <button
    type="button"
    :aria-pressed="active"
    class="inline-flex h-[30px] cursor-pointer items-center gap-[7px] rounded-2 border text-[0.8125rem] font-semibold whitespace-nowrap transition-colors duration-[120ms] ease-out"
    :class="[
      avatarUrl ? 'pr-2.5 pl-1' : 'px-2.5',
      active
        ? 'border-ink bg-ink text-paper'
        : 'border-line bg-surface text-ink hover:border-line-strong',
    ]"
  >
    <UiAppImage
      v-if="avatarUrl"
      :src="avatarUrl"
      alt=""
      class="h-[22px] w-[22px] shrink-0 rounded-full object-cover"
    />
    <span><slot>{{ label }}</slot></span>
    <span
      v-if="count !== undefined && count !== null"
      class="font-mono text-[11px] font-medium"
      :class="active ? 'text-[color-mix(in_oklch,var(--paper)_70%,transparent)]' : 'text-ink-3'"
    >
      {{ count }}
    </span>
  </button>
</template>
