<script setup lang="ts">
import { ref, watch, computed, useAttrs, onMounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  src?: string | null
  alt?: string
  fallback?: string
}>(), {
  src: null,
  alt: '',
  fallback: ''
})

const attrs = useAttrs()
const isLoaded = ref(false)
const hasError = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

function onLoad() {
  isLoaded.value = true
}

function onError() {
  hasError.value = true
}

const checkCache = () => {
  if (imgRef.value && imgRef.value.complete && imgRef.value.naturalHeight > 0) {
    isLoaded.value = true
  }
}

onMounted(() => {
  checkCache()
})

watch(() => props.src, () => {
  if (props.src) {
    isLoaded.value = false
    hasError.value = false
    nextTick(() => {
      checkCache()
    })
  } else {
    isLoaded.value = false
    hasError.value = true
  }
}, { immediate: true })

const classString = computed(() => {
  const cls = attrs.class
  if (typeof cls === 'string') return cls
  if (Array.isArray(cls)) return cls.join(' ')
  if (typeof cls === 'object' && cls !== null) {
    return Object.keys(cls).filter(key => cls[key]).join(' ')
  }
  return ''
})

const objectFitClass = computed(() => {
  const objectClasses = classString.value.split(' ').filter(c => c.startsWith('object-'))
  if (objectClasses.length === 0) {
    return 'object-cover' // default
  }
  return objectClasses.join(' ')
})

const positionClass = computed(() => {
  const cls = classString.value
  if (cls.match(/\b(absolute|fixed|sticky|static)\b/)) {
    return ''
  }
  return 'relative'
})
</script>

<template>
  <div 
    class="overflow-hidden isolate flex items-center justify-center transition-colors duration-300"
    :class="[!isLoaded && !hasError ? 'bg-surface-high/30' : 'bg-transparent', positionClass]"
  >
    <img
      ref="imgRef"
      v-show="src && !hasError"
      :src="src || ''"
      :alt="alt"
      class="w-full h-full transition-opacity duration-500 ease-out"
      :class="[objectFitClass, { 'opacity-0': !isLoaded, 'opacity-100': isLoaded }]"
      @load="onLoad"
      @error="onError"
    />
    <div v-if="hasError || (!src && !isLoaded)" class="absolute inset-0 flex items-center justify-center bg-surface-high/50 text-text-muted">
      <img v-if="fallback" :src="fallback" :alt="alt" class="w-full h-full opacity-50 grayscale" :class="objectFitClass" />
      <Icon v-else name="lucide:image-off" class="w-1/2 h-1/2 opacity-30" />
    </div>
  </div>
</template>
