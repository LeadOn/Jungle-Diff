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
  <div class="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-4 md:mb-[22px]">
    <div class="min-w-0">
      <h1 :id="headingId" class="m-0 text-[28px] font-bold tracking-[-0.035em] md:text-[34px]">{{ title }}</h1>
      <p class="mt-1.5 text-sm font-semibold text-pretty text-text-sec">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
