import { defineNuxtConfig } from 'nuxt/config'
import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-08-09',
  future: {
    compatibilityVersion: 4
  },
  ssr: true,

  modules: [
    '@pinia/nuxt',
    '@nuxt/eslint',
    '@nuxt/icon',
    '@nuxt/fonts'
  ],

  icon: {
    clientBundle: {
      scan: true
    },
    serverBundle: {
      collections: ['lucide']
    }
  },

  fonts: {
    // Fonts are downloaded at build time and served from our own origin: no render-blocking
    // request to fonts.googleapis.com at runtime (performance + GDPR), and a third-party-free CSP.
    families: [
      { name: 'Manrope', provider: 'google', weights: [400, 500, 600, 700, 800] },
      { name: 'IBM Plex Mono', provider: 'google', weights: [400, 500, 600, 700] }
    ]
  },

  vite: {
    plugins: [
      tailwindcss()
    ]
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    // Listing pages are identical for every visitor: serve them from the Nitro cache and
    // revalidate in the background instead of replaying the API calls on each visit.
    '/': { swr: 60 },
    '/stats': { swr: 60 },
    // Authenticated pages must never be cached.
    '/settings': { swr: false, headers: { 'cache-control': 'no-store' } },
    '/api/auth/**': { headers: { 'cache-control': 'no-store' } }
  },

  nitro: {
    compressPublicAssets: { gzip: true, brotli: true }
  },

  runtimeConfig: {
    // --- Private (server only) ---
    // Target of the `/api/gameon` proxy. Falls back to the public URL when unset.
    gameOnApiUrl: '',
    keycloak: {
      // Optional: only set this when the Keycloak client is confidential.
      // Empty = public client, the code exchange relies on PKCE alone.
      clientSecret: ''
    },
    // --- Public (exposed to the browser) ---
    public: {
      appVersion: pkg.version,
      // Only used to build image URLs (<img src>), which are anonymous.
      // Data calls go through the `/api/gameon` proxy.
      gameOnApiUrl: '',
      keycloak: {
        authority: '',
        clientId: '',
        realm: ''
      }
    }
  },

  typescript: {
    strict: true,
    typeCheck: true
  }
})
