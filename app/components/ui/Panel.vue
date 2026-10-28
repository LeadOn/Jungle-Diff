<script setup lang="ts">
withDefaults(defineProps<{
  as?: 'section' | 'div' | 'article'
  headingTag?: 'h2' | 'h3' | 'h4'
  title?: string
  titleId?: string
  meta?: string
  linkTo?: string
  linkText?: string
}>(), {
  as: 'section',
  headingTag: 'h3',
  title: undefined,
  titleId: undefined,
  meta: undefined,
  linkTo: undefined,
  linkText: undefined,
})
</script>

<template>
  <component
    :is="as"
    :aria-labelledby="titleId || undefined"
    class="min-w-0 rounded-5 border border-[color-mix(in_oklch,var(--line)_70%,transparent)] bg-surface shadow-card"
  >
    <div
      v-if="title || $slots.title || $slots.actions || (linkTo && linkText) || meta"
      class="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-2.5"
    >
      <component
        :is="headingTag"
        v-if="title || $slots.title"
        :id="titleId"
        class="type-title text-ink"
      >
        <slot name="title">{{ title }}</slot>
      </component>
      <slot name="actions">
        <NuxtLink
          v-if="linkTo && linkText"
          :to="linkTo"
          class="inline-flex items-center gap-1 text-[0.8125rem] font-semibold text-canopy no-underline hover:underline hover:underline-offset-[3px]"
        >
          <span>{{ linkText }}</span>
          <Icon name="lucide:arrow-right" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </NuxtLink>
        <span v-else-if="meta" class="type-mono text-ink-3">{{ meta }}</span>
      </slot>
    </div>
    <slot />
  </component>
</template>
