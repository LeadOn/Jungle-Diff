/**
 * Turns "14.22.x.x" into a numeric score (e.g. 14022) so distances can be compared.
 * The major is multiplied by 1000 to be sure two-digit minors are covered.
 */
const getPatchScore = (version: string): number => {
  const parts = version.split('.')
  const major = parseInt(parts[0] || '0', 10) || 0
  const minor = parseInt(parts[1] || '0', 10) || 0
  return major * 1000 + minor
}

/**
 * Trouve le patch DDragon le plus proche de la gameVersion de la partie.
 */
export function resolveDdragonPatchForGame(gameVersion: string | undefined | null, availablePatches: string[]): string {
  // Choix de la robustesse: Si la version est invalide (ou liste vide), on fallback sur currentPatch.
  const fallbackPatch = availablePatches[0] || '14.22.1'

  if (!gameVersion || availablePatches.length === 0) {
    return fallbackPatch
  }

  const targetScore = getPatchScore(gameVersion)
  
  if (targetScore === 0) {
    return fallbackPatch // Échec total du parsing de la string
  }

  let closestPatch = fallbackPatch
  let minDiff = Infinity

  for (const patch of availablePatches) {
    const score = getPatchScore(patch)
    const diff = Math.abs(targetScore - score)
    
    if (diff < minDiff) {
      minDiff = diff
      closestPatch = patch
    }
    
    // Distance 0 (major and minor match exactly): stop here
    if (diff === 0) {
      break
    }
  }

  return closestPatch
}

/**
 * Builds a champion icon URL.
 */
export function getChampionIconUrl(championName: string, patch: string): string {
  if (!championName) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${championName}.png`
}

/**
 * Builds an item icon URL.
 */
export function getItemIconUrl(itemId: string | number, patch: string): string {
  if (!itemId || itemId === 0 || itemId === '0') return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`
}

/**
 * Builds a player profile icon URL.
 */
export function getProfileIconUrl(iconId: string | number, patch: string): string {
  if (iconId == null) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/${iconId}.png`
}
