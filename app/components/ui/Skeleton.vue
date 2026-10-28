<script setup lang="ts">
withDefaults(defineProps<{
  as?: string
  circle?: boolean
}>(), {
  as: 'span',
  circle: false,
})
</script>

<template>
  <component
    :is="as"
    aria-hidden="true"
    class="block skel"
    :class="circle ? 'rounded-full' : 'rounded-1'"
  />
</template>

