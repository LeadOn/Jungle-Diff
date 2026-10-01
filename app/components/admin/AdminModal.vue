<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'

/**
 * Frame of the admin dialogs: scrim, focus, Escape and scroll lock. The content is slotted and
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
    <div class="fixed inset-0 z-[90] animate-fade bg-ink/35 backdrop-blur-[4px]" @click="emit('close')" />
    <div class="pointer-events-none fixed inset-0 z-[91] flex items-start justify-center overflow-y-auto px-4 pb-4" :class="LAYOUT[props.size].frame">
      <div
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="pointer-events-auto w-full animate-pop overflow-hidden rounded-[26px] border border-border-base bg-surface-base shadow-card-hover"
        :class="LAYOUT[props.size].dialog"
      >
        <slot :title-id="titleId" />
      </div>
    </div>
  </Teleport>
</template>
