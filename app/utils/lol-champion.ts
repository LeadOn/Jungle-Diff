/**
 * Champion names as Riot's data carries them ("MonkeyKing", "Kaisa") are Data Dragon ids, not what a
 * player reads. These are the ones a plain space-before-capital rule gets wrong.
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  MonkeyKing: 'Wukong',
  Chogath: 'Cho\'Gath',
  Kaisa: 'Kai\'Sa',
  Khazix: 'Kha\'Zix',
  Velkoz: 'Vel\'Koz',
  Belveth: 'Bel\'Veth',
  RekSai: 'Rek\'Sai',
  KogMaw: 'Kog\'Maw',
  KSante: 'K\'Santé',
  DrMundo: 'Dr. Mundo',
  Nunu: 'Nunu & Willump',
  Renata: 'Renata Glasc',
  FiddleSticks: 'Fiddlesticks',
}

/** "Kaisa" → "Kai'Sa", "MissFortune" → "Miss Fortune". */
export function championDisplayName(championName: string): string {
  return DISPLAY_NAME_OVERRIDES[championName] ?? championName.replace(/([a-z])([A-Z])/g, '$1 $2')
}

/**
 * Data Dragon ids used by the image CDN. The match payload spells a few champions differently from
 * the CDN's file names, and those files would 404.
 */
const CDN_ID_OVERRIDES: Record<string, string> = {
  FiddleSticks: 'Fiddlesticks',
}

/** Unversioned splash art: the CDN serves it outside the per-patch tree. */
export function championSplashUrl(championName: string): string {
  const id = CDN_ID_OVERRIDES[championName] ?? championName
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_0.jpg`
}
