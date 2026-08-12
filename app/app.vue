<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { usePatchStore } from '~/stores/patch'
const auth = useAuthStore()
const patchStore = usePatchStore()

await useAsyncData('init-lol-patches', () => patchStore.loadPatches())

useHead({
  htmlAttrs: {
    lang: 'fr'
  },
  titleTemplate: '%s - JungleDiff',
  script: [
    {
      innerHTML: `
        try {
          if (localStorage.getItem('theme') === 'light') {
            document.documentElement.classList.add('light');
          }
        } catch (e) {}
      `
    }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'shortcut icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ],
  meta: [
    { name: 'apple-mobile-web-app-title', content: 'JungleDiff' },
    { name: 'description', content: 'JungleDiff - League of Legends stats tracker' }
  ]
})
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
