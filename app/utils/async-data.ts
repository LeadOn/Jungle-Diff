import type { NuxtApp } from '#app'

/**
 * `getCachedData` à passer à `useAsyncData` pour une donnée qui doit rester fraîche.
 *
 * Par défaut Nuxt réutilise la donnée déjà associée à la clé et ne rejoue jamais le handler lors
 * d'une navigation cliente : revenir sur l'accueil depuis une fiche joueur réaffichait les rangs
 * du tout premier chargement, jusqu'au prochain F5. Ici on ne réutilise le payload que pendant
 * l'hydratation — sinon le handler repartirait de zéro, `pending` repasserait à true et le rendu
 * client divergerait du HTML serveur — et on laisse le handler se rejouer ensuite. C'est alors au
 * store d'arbitrer s'il faut vraiment retourner chercher la donnée (fenêtre de fraîcheur).
 */
export const cacheOnlyDuringHydration = (key: string, nuxtApp: NuxtApp) =>
  nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined
