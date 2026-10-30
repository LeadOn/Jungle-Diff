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
      class="toast-in flex items-center gap-3 rounded-3 bg-night px-4 py-2.5 text-on-night shadow-float"
    >
      <Icon
        :name="admin.toastState.tone === 'success' ? 'lucide:check' : 'lucide:triangle-alert'"
        class="size-4 shrink-0"
        :class="admin.toastState.tone === 'success' ? 'text-on-night-win' : 'text-on-night-loss'"
      />
      <span class="text-[13px] font-semibold">{{ admin.toastState.message }}</span>
    </div>
  </div>
</template>

<style scoped>
/* Appearance only (d-3): the toast fades in, nothing moves. Reduced motion is handled globally. */
.toast-in {
  animation: toast-in var(--d-3) var(--ease-out) both;
}

@keyframes toast-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
