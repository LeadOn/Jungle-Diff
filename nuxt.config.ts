import tailwindcss from '@tailwindcss/vite'
import pkg from './package.json'

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

  icon: {
    clientBundle: {
      scan: true
    },
    serverBundle: {
      collections: ['lucide']
    }
  },

  i18n: {
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', iso: 'fr-FR', name: 'Français' },
      { code: 'en', iso: 'en-US', name: 'English' }
    ],
    // Disabled: the null-prototype objects this optimization produces break
    // the SSR payload serialization (crashes @pinia/nuxt's payload reducer
    // with "obj.hasOwnProperty is not a function") on routes that hit the
    // error page. Also recommended by the module itself, which deprecates
    // this flag in v10.
    bundle: {
      optimizeTranslationDirective: false
    }
  },

  vite: {
    plugins: [
      tailwindcss()
    ]
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      appVersion: pkg.version,
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
