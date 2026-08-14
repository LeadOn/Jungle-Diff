/**
 * Transforme "14.22.x.x" en un score numérique (ex: 14022) pour calculer les distances.
 * On multiplie la majeure par 1000 pour être sûr de couvrir les mineures à 2 chiffres.
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
    
    // Si distance 0 (majeur et mineur correspondent exactement), on arrête
    if (diff === 0) {
      break
    }
  }

  return closestPatch
}

/**
 * Génère l'URL d'icône d'un champion.
 */
export function getChampionIconUrl(championName: string, patch: string): string {
  if (!championName) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${championName}.png`
}

/**
 * Génère l'URL d'icône d'un item.
 */
export function getItemIconUrl(itemId: string | number, patch: string): string {
  if (!itemId || itemId === 0 || itemId === '0') return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/item/${itemId}.png`
}

/**
 * Génère l'URL d'icône de profil d'un joueur.
 */
export function getProfileIconUrl(iconId: string | number, patch: string): string {
  if (iconId == null) return ''
  return `https://ddragon.leagueoflegends.com/cdn/${patch}/img/profileicon/${iconId}.png`
}
