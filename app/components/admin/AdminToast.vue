<script setup lang="ts">
import { useAdminStore } from '~/stores/admin'

const admin = useAdminStore()
</script>

<template>
  <!-- The live region stays in the DOM so a screen reader announces each new message. -->
  <div role="status" aria-live="polite" class="pointer-events-none fixed bottom-[22px] left-1/2 z-[95] w-max max-w-[calc(100vw-32px)] -translate-x-1/2">
    <div
      v-if="admin.toastState"
      :key="admin.toastState.message"
      class="flex animate-pop items-center gap-3.5 rounded-full bg-ink px-[18px] py-2.5 text-ink-text shadow-float"
    >
      <Icon
        :name="admin.toastState.tone === 'success' ? 'lucide:check' : 'lucide:triangle-alert'"
        class="size-4 shrink-0"
        :class="admin.toastState.tone === 'success' ? 'text-on-photo-lime' : 'text-on-photo-red'"
      />
      <span class="text-[13.5px] font-bold">{{ admin.toastState.message }}</span>
    </div>
  </div>
</template>
