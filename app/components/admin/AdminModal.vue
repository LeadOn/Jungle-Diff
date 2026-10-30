<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

/**
 * Frame of the admin dialogs: overlay, focus, Escape and scroll lock. The content is slotted and
 * receives `titleId`, which its heading carries so the dialog is named by it.
 */
const props = withDefaults(defineProps<{ size?: 'md' | 'lg' }>(), { size: 'md' })

const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialog = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const LAYOUT = {
  md: { frame: 'pt-[12vh]', dialog: 'max-w-[500px]' },
  lg: { frame: 'pt-[6vh]', dialog: 'max-w-[560px]' },
} as const

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('close')
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  await nextTick()
  dialog.value?.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), button:not([disabled])')?.focus()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
  previouslyFocused?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-in fixed inset-0 z-[90] bg-overlay" @click="emit('close')" />
    <div class="pointer-events-none fixed inset-0 z-[91] flex items-start justify-center overflow-y-auto px-4 pb-4" :class="LAYOUT[props.size].frame">
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="modal-in pointer-events-auto w-full overflow-hidden rounded-5 bg-surface text-ink shadow-float"
        :class="LAYOUT[props.size].dialog"
      >
        <slot :title-id="titleId" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Appearance only (d-3): the dialog fades in, nothing moves. Reduced motion is handled globally. */
.modal-in {
  animation: modal-in var(--d-3) var(--ease-out) both;
}

@keyframes modal-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
