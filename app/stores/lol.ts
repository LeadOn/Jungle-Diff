import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LoLQueue } from '~/lib/types/lol'
import { useGameOnLol } from '~/composables/useGameOnLol'

export const useLolStore = defineStore('lol', () => {
  const version = ref<string>('')
  const versions = ref<string[]>([])
  const queues = ref<LoLQueue[]>([])

  const setVersion = (v: string) => {
    version.value = v
  }

  const setVersions = (vs: string[]) => {
    versions.value = vs
  }

  const setQueues = (q: LoLQueue[]) => {
    queues.value = q
  }

  const fetchQueues = async () => {
    // Cache check
    if (queues.value.length > 0) return

    const gameOnApi = useGameOnLol()
    try {
      const data = await gameOnApi.getQueues()
      if (data) {
        setQueues(data)
      }
    } catch (e) {
      console.error('Failed to fetch queues', e)
    }
  }

  return {
    version,
    versions,
    queues,
    setVersion,
    setVersions,
    setQueues,
    fetchQueues
  }
})
