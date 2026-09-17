import { defineNuxtPlugin } from '#app'
import { useLolStore } from '~/stores/lol'

/**
 * Loads Data Dragon versions once per SSR request from `/api/ddragon/versions`, which caches them
 * server-side. This plugin previously called Riot's CDN directly, on every single render.
 */
export default defineNuxtPlugin(async () => {
  await useLolStore().loadVersions()
})
