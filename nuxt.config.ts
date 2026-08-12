import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default {
  compatibilityDate: '2026-08-09',
  future: {
    compatibilityVersion: 4
  },
  ssr: true,
  
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/i18n',
    '@nuxt/eslint',
    '@nuxt/icon'
  ],

  i18n: {
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', iso: 'fr-FR', name: 'Français' },
      { code: 'en', iso: 'en-US', name: 'English' }
    ]
  },

  vite: {
    plugins: [
      tailwindcss()
    ]
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      gameOnApiUrl: process.env.NUXT_PUBLIC_GAME_ON_API_URL,
      keycloak: {
        authority: process.env.NUXT_PUBLIC_KEYCLOAK_AUTHORITY,
        clientId: process.env.NUXT_PUBLIC_KEYCLOAK_CLIENT_ID,
        realm: process.env.NUXT_PUBLIC_KEYCLOAK_REALM
      }
    }
  },

  typescript: {
    strict: true,
    typeCheck: true
  }
}
