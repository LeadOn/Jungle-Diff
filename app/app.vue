<script setup lang="ts">
import { useAuth } from '~/composables/useAuth'
const auth = useAuth()

useHead({
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
    { name: 'apple-mobile-web-app-title', content: 'JungleDiff' }
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
