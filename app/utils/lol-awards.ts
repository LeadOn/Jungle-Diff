import type { LoLFunStatDto, LoLGlobalStatsDto } from '~/lib/types/home'
import type { LeaguePlayer } from '~/lib/types/player'

export const formatShortDate = (isoString: string): string => {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'short'
  }).format(date).toUpperCase().replace('.', '')
}

export const getPlayerName = (p: Partial<LeaguePlayer> | null | undefined) => {
  if (!p) return 'Crew'
  return p.riotGamesNickname || p.nickname
}

export type LoLGlobalStatAwardKey = keyof Omit<LoLGlobalStatsDto, 'totalGamesAnalyzed' | 'totalPlayersTracked' | 'topChampions'>

export interface AwardMeta {
  key: LoLGlobalStatAwardKey
  title: string
  description: string
  color: string
  icon: string
  unit: string
  getSubtitle: (stat: LoLFunStatDto) => string
}

export const AWARD_MAPPINGS: Record<LoLGlobalStatAwardKey, AwardMeta> = {
  pingMachine: {
    key: 'pingMachine',
    title: 'Spam Ping',
    description: 'Le plus de pings envoyés en une game',
    color: 'text-brand-gold',
    icon: '🎯',
    unit: ' pings',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  biggestInter: {
    key: 'biggestInter',
    title: 'Énorme Inter',
    description: 'Le plus de morts en une game',
    color: 'text-brand-red',
    icon: '💀',
    unit: ' morts',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  highestBounty: {
    key: 'highestBounty',
    title: 'Plus grosse prime',
    description: 'La plus grosse prime encaissée par un ennemi sur sa tête',
    color: 'text-brand-gold',
    icon: '🏆',
    unit: ' PO',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  shoppingAddict: {
    key: 'shoppingAddict',
    title: 'Acheteur Compulsif',
    description: 'Le plus de consommables achetés en une game',
    color: 'text-brand-gold',
    icon: '🛒',
    unit: ' items',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  oneTrickPony: {
    key: 'oneTrickPony',
    title: 'One-Trick Pony',
    description: '% le plus élevé de games sur un seul champion (min. 10 games)',
    color: 'text-brand-gold',
    icon: '🐴',
    unit: ' %',
    getSubtitle: (s) => `${getPlayerName(s.player)} · Période`
  },
  crowdControlMaster: {
    key: 'crowdControlMaster',
    title: 'Maître du CC',
    description: 'Le plus de temps de CC infligé aux ennemis',
    color: 'text-brand-green',
    icon: '🌀',
    unit: 's',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  punchingBall: {
    key: 'punchingBall',
    title: 'Punching Ball',
    description: 'Le plus de dégâts subis par minute',
    color: 'text-brand-red',
    icon: '🥊',
    unit: ' dég/min',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  pacifist: {
    key: 'pacifist',
    title: 'Pacifiste',
    description: 'Le moins de dégâts infligés aux champions sur une game',
    color: 'text-brand-gold',
    icon: '🕊️',
    unit: ' dégâts',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  squirrel: {
    key: 'squirrel',
    title: 'Le farmer',
    description: "Le plus d'or non dépensé en fin de game",
    color: 'text-brand-gold',
    icon: '🐿️',
    unit: ' PO',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  jungleThief: {
    key: 'jungleThief',
    title: 'Voleur de jungle',
    description: 'Le plus de monstres jungle tués sans être le jungler',
    color: 'text-brand-green',
    icon: '🐒',
    unit: ' camps',
    getSubtitle: (s) => `${getPlayerName(s.player)}${s.gameDate ? ' · ' + formatShortDate(s.gameDate) : ''}`
  },
  comebackKing: {
    key: 'comebackKing',
    title: 'Roi du comeback',
    description: 'Le plus de victoires en étant derrière en or à 20 min',
    color: 'text-brand-gold',
    icon: '👑',
    unit: ' comebacks',
    getSubtitle: (s) => `${getPlayerName(s.player)} · Retour incroyable`
  },
  nightOwl: {
    key: 'nightOwl',
    title: 'Oiseau de nuit',
    description: 'Le plus de games jouées entre minuit et 6h',
    color: 'text-text-main',
    icon: '🦉',
    unit: ' parties',
    getSubtitle: (s) => `${getPlayerName(s.player)} · Après minuit`
  },
  longestLossStreak: {
    key: 'longestLossStreak',
    title: 'Pire série de défaites',
    description: 'La plus longue série de défaites consécutives',
    color: 'text-brand-red',
    icon: '📉',
    unit: ' défaites',
    getSubtitle: (s) => `${getPlayerName(s.player)} · En série`
  },
  emotionalElevator: {
    key: 'emotionalElevator',
    title: 'Ascenseur émotionnel',
    description: 'La plus grosse chute de LP entre deux relevés',
    color: 'text-brand-gold',
    icon: '🎢',
    unit: ' LP',
    getSubtitle: (s) => `${getPlayerName(s.player)} · Montagnes russes`
  },
  cursedPatch: {
    key: 'cursedPatch',
    title: 'Patch maudit',
    description: 'Patch avec le pire winrate tous joueurs confondus (min. 10 games)',
    color: 'text-brand-red',
    icon: '☠️',
    unit: '% winrate',
    getSubtitle: () => `Maudit sur la période`
  },
}

export const PRIORITY_KEYS: LoLGlobalStatAwardKey[] = [
  'biggestInter', 'longestLossStreak', 'crowdControlMaster', 'highestBounty', 
  'nightOwl', 'jungleThief', 'pingMachine', 'punchingBall', 'pacifist', 
  'squirrel', 'comebackKing', 'emotionalElevator', 'cursedPatch', 
  'oneTrickPony', 'shoppingAddict'
]
