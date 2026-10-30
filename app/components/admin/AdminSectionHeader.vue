<script setup lang="ts">
/** Title block of an admin section, with room on the right for its main action. */
defineProps<{
  title: string
  description: string
  /** Lets the section name itself after this heading (`aria-labelledby`). */
  headingId?: string
}>()
</script>

<template>
  <div class="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-4 md:mb-6">
    <div class="min-w-0">
      <h1 :id="headingId" class="m-0 type-d2 text-ink">{{ title }}</h1>
      <p class="mt-2 max-w-[70ch] type-body text-pretty text-ink-2">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
