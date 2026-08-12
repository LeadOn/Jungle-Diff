import type { LoLQueue, LoLGameDto, LoLGameParticipantDto } from '~/lib/types'

const QUEUE_LABELS: Record<number, string> = {
  0: 'Partie personnalisée', 
  400: 'Normale (Draft)', 
  420: 'Classée Solo/Duo',
  430: 'Normale (Aveugle)', 
  440: 'Classée Flex', 
  450: 'ARAM',
  480: 'Normale (Swiftplay)', 
  490: 'Normale (Rapide)', 
  700: 'Clash', 
  720: 'Clash ARAM',
  830: 'Coop vs IA (Intro)', 
  840: 'Coop vs IA (Débutant)', 
  850: 'Coop vs IA (Intermédiaire)',
  900: 'ARURF', 
  1020: 'Un pour tous', 
  1300: 'Nexus Blitz', 
  1400: 'Grimoire ultime',
  1700: 'Arena', 
  1710: 'Arena (16 joueurs)', 
  1900: 'URF', 
  2000: 'Tutoriel',
}

export const formatQueue = (queueId: number, queues?: LoLQueue[]): string => {
  if (QUEUE_LABELS[queueId]) return QUEUE_LABELS[queueId]
  
  if (queues && queues.length > 0) {
    const queue = queues.find((q) => q.id === queueId)
    if (queue) return queue.description || queue.map || `Queue ${queueId}`
  }
  
  return `Queue ${queueId}`
}

export const closestDdragonVersion = (gameVersion: string, availableVersions: string[]): string => {
  if (!gameVersion) return ''
  
  const parts = gameVersion.split('.')
  const gameMajor = Number(parts[0])
  const gameMinor = Number(parts[1])
  
  if (!availableVersions.length || Number.isNaN(gameMajor) || Number.isNaN(gameMinor)) {
    return gameVersion
  }
  const gameScore = gameMajor * 100 + gameMinor
  let closest = availableVersions[0] || gameVersion
  let closestDistance = Infinity
  for (const version of availableVersions) {
    const parts = version.split('.')
    const major = Number(parts[0])
    const minor = Number(parts[1])
    if (Number.isNaN(major) || Number.isNaN(minor)) continue
    const distance = Math.abs(major * 100 + minor - gameScore)
    if (distance < closestDistance) {
      closestDistance = distance
      closest = version
      if (distance === 0) break
    }
  }
  return closest || gameVersion
}

export const formatGameDate = (isoString: string): string => {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date).replace(',', ' à')
}

export const formatGameDuration = (startIso: string, endIso: string): string => {
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  const diffInSeconds = Math.floor((end - start) / 1000)
  
  if (isNaN(diffInSeconds) || diffInSeconds < 0) return '--:--'
  
  const m = Math.floor(diffInSeconds / 60)
  const s = diffInSeconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const calculateKda = (kills: number, deaths: number, assists: number): string => {
  const d = Math.max(deaths, 1)
  return ((kills + assists) / d).toFixed(2).replace('.', ',')
}

export const getParticipantByPlayerId = (game: LoLGameDto, playerId?: number): LoLGameParticipantDto | null => {
  if (!game.leagueOfLegendsGameParticipants || game.leagueOfLegendsGameParticipants.length === 0) {
    return null
  }
  
  if (playerId) {
    const participant = game.leagueOfLegendsGameParticipants.find(p => p.playerId === playerId)
    if (participant) return participant
  }
  
  return null
}
