import { defineCachedEventHandler } from 'nitropack/runtime'

/**
 * Data Dragon version list, cached server-side.
 *
 * Every SSR render used to trigger two calls to `ddragon.leagueoflegends.com` (one for the `patch`
 * store, one for the `lol` store), so any slowdown on Riot's CDN slowed down *every* page. The
 * Nitro cache brings that down to one call per hour, and `staleMaxAge` keeps serving the last
 * known list while revalidation fails.
 */
export default defineCachedEventHandler(
  async () => {
    const versions = await $fetch<string[]>('https://ddragon.leagueoflegends.com/api/versions.json', {
      timeout: 5000,
      retry: 1,
      retryDelay: 300
    })

    if (!Array.isArray(versions) || versions.length === 0) {
      throw new Error('Data Dragon returned an empty version list')
    }

    return versions
  },
  {
    name: 'ddragon-versions',
    maxAge: 60 * 60,
    staleMaxAge: 24 * 60 * 60,
    swr: true
  }
)
