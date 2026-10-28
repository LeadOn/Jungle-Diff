/*
 * Crew data captured from http://localhost:3000/ on 21 Oct 2026 at 10:49 (GameOn API, production).
 * Only game handles are kept: no full names, PUUIDs or account ids.
 * Rank tuple: [tier, division, LP, wins, losses, LP over 7 days, recent form (1 = win)].
 */
window.JD = {
  capturedAt: '21 oct. 2026, 10 h 49',
  patch: '16.19',
  sync: 'il y a 7 min',
  windowLabel: '15 – 21 oct.',
  version: '1.8.0',
  week: {
    games: 203, prevGames: 236,
    wins: 94, losses: 109, prevWins: 114, prevLosses: 122,
    netLp: -295, playMinutes: 5965.9, avgMinutes: 29,
    activeCount: 10, crewSize: 16,
  },
  days: [
    { initial: 'J', label: 'jeu. 15 oct.', games: 29, wins: 12, losses: 17, minutes: 857.3, lp: -21 },
    { initial: 'V', label: 'ven. 16 oct.', games: 23, wins: 8, losses: 15, minutes: 712.3, lp: -232 },
    { initial: 'S', label: 'sam. 17 oct.', games: 41, wins: 14, losses: 27, minutes: 1191.7, lp: -256 },
    { initial: 'D', label: 'dim. 18 oct.', games: 49, wins: 29, losses: 20, minutes: 1358.4, lp: 136 },
    { initial: 'L', label: 'lun. 19 oct.', games: 30, wins: 16, losses: 14, minutes: 869.4, lp: 71 },
    { initial: 'M', label: 'mar. 20 oct.', games: 30, wins: 14, losses: 16, minutes: 940.3, lp: -22 },
    { initial: 'M', label: 'mer. 21 oct.', games: 1, wins: 1, losses: 0, minutes: 36.5, lp: 29, today: true },
  ],
  players: [
    { id: 43, name: 'SuperMao', tag: 'EUWFR', icon: 4022, level: 848, main: 'Lissandra', solo: ['MASTER', 'I', 657, 263, 243, -6, '11001'], flex: ['EMERALD', 'I', 75, 30, 28, 0, '10100'] },
    { id: 19, name: 'Wullver', tag: 'EUW', icon: 512, level: 461, main: 'Kindred', solo: ['MASTER', 'I', 133, 158, 150, -72, '10100'], flex: ['DIAMOND', 'I', 75, 53, 44, 0, '10110'] },
    { id: 34, name: 'RememberV', tag: '8888', icon: 3017, level: 475, main: 'Viego', solo: ['DIAMOND', 'IV', 16, 360, 352, 221, '01000'], flex: ['DIAMOND', 'IV', 71, 62, 55, 0, '01010'] },
    { id: 28, name: 'Ramesese', tag: '2762', icon: 6872, level: 664, main: 'Garen', solo: ['EMERALD', 'II', 75, 59, 33, 0, '11111'], flex: ['PLATINUM', 'III', 26, 24, 25, 0, '11100'] },
    { id: 52, name: 'Zéloufis', tag: 'EUW', icon: 6927, level: 387, main: 'Tryndamere', solo: ['EMERALD', 'III', 66, 252, 234, -101, '10001'], flex: ['DIAMOND', 'IV', 42, 50, 41, 21, '11011'] },
    { id: 42, name: 'SkyBlood', tag: '3691', icon: 7180, level: 245, main: 'Velkoz', solo: ['EMERALD', 'III', 8, 236, 203, -23, '00001'], flex: ['PLATINUM', 'III', 59, 119, 99, -58, '01100'] },
    { id: 40, name: 'Oceiros', tag: 'LRI', icon: 3368, level: 256, main: 'Draven', solo: ['PLATINUM', 'I', 94, 339, 333, -278, '11110'], flex: ['GOLD', 'II', 76, 28, 25, -83, '00000'] },
    { id: 1, name: 'LeadOn', tag: 'EUW', icon: 907, level: 237, main: 'Xerath', solo: ['PLATINUM', 'II', 84, 247, 228, 55, '10101'], flex: ['GOLD', 'III', 44, 35, 33, 0, '01000'] },
    { id: 39, name: 'THS Dogue', tag: 'EUW', icon: 5719, level: 623, main: 'Garen', solo: ['PLATINUM', 'II', 2, 206, 224, -133, '10010'], flex: null },
    { id: 56, name: 'RememberV', tag: '6757', icon: 7, level: 41, main: 'Viego', solo: ['PLATINUM', 'IV', 48, 33, 32, 44, '10100'], flex: null },
    { id: 55, name: 'MidelD', tag: 'EUW', icon: 989, level: 361, main: 'MonkeyKing', solo: ['PLATINUM', 'IV', 0, 112, 114, 0, '00101'], flex: null },
    { id: 54, name: 'EchoHack', tag: '4542', icon: 6872, level: 247, main: 'MissFortune', solo: ['SILVER', 'I', 47, 7, 5, 0, '00101'], flex: null },
    { id: 41, name: 'Nïnpo', tag: '4011', icon: 3614, level: 323, main: 'Yorick', solo: ['SILVER', 'II', 56, 116, 117, 58, '01111'], flex: ['SILVER', 'IV', 78, 5, 7, 0, '01100'] },
    { id: 32, name: 'TheCerbere', tag: '8512', icon: 6680, level: 52, main: null, solo: ['BRONZE', 'II', 45, 32, 30, 0, '10100'], flex: null },
    { id: 35, name: 'Jinwok', tag: 'EUW', icon: 6806, level: 140, main: 'Nautilus', solo: null, flex: null },
    { id: 51, name: 'choukrusse', tag: 'EUW', icon: 6040, level: 213, main: 'Galio', solo: null, flex: null },
    { id: 49, name: 'КосМиp', tag: 'супер', icon: 4022, level: 93, main: 'Lissandra', smurfOf: 43, solo: ['DIAMOND', 'II', 28, 64, 49, 16, '11000'], flex: ['PLATINUM', 'II', 97, 4, 1, 0, '01111'] },
    { id: 33, name: 'Kindred Adc Here', tag: 'EUW', icon: 939, level: 63, main: null, smurfOf: 19, solo: ['PLATINUM', 'IV', 85, 4, 2, 0, '11001'], flex: ['EMERALD', 'II', 93, 9, 3, 0, '11111'] },
    { id: 45, name: 'knj jrak', tag: 'EUW', icon: 4020, level: 49, main: null, smurfOf: 42, solo: ['GOLD', 'IV', 57, 29, 29, 0, '11001'], flex: null },
    { id: 44, name: 'JordiBardElla', tag: 'ALGE', icon: 7178, level: 27, main: 'Velkoz', smurfOf: 42, solo: null, flex: null },
    { id: 50, name: 'TMD LeadOn', tag: 'EUW', icon: 774, level: 13, main: null, smurfOf: 1, solo: null, flex: null },
    { id: 53, name: 'Sire OseDuFoie', tag: '1996', icon: 989, level: 25, main: 'Ashe', smurfOf: 40, solo: null, flex: null },
  ],
  // Ranked games over the last 7 days, as counted by `activePlayers`.
  active: [[40, 52], [34, 45], [52, 33], [39, 23], [41, 13], [42, 13], [1, 8], [19, 7], [43, 6], [56, 3]],
  games: [
    { day: 0, time: '00:08', player: 43, champ: 'Ahri', role: 'Milieu', queue: 'Solo/Duo', duration: '36:28', win: true, k: 15, d: 8, a: 9, ratio: '3,00', level: 18, items: [3157, 3171, 4645, 3100, 2503, 3089, 3363], lp: 29 },
    { day: 1, time: '23:18', player: 40, champ: 'Nasus', role: 'Milieu', queue: 'Normale (Draft)', duration: '27:25', win: false, k: 4, d: 6, a: 5, ratio: '1,50', level: 15, items: [3078, 3171, 3110, 1054, 3076, 1031, 3364], lp: 'none' },
    { day: 1, time: '23:05', player: 34, champ: 'Zac', role: 'Jungle', queue: 'Solo/Duo', duration: '33:42', win: false, k: 14, d: 7, a: 18, ratio: '4,57', level: 18, items: [3075, 3068, 3143, 3065, 3111, 6653, 3364], lp: -20 },
    { day: 1, time: '22:44', player: 40, champ: 'Samira', role: 'Bot', queue: 'Flex', duration: '27:29', win: false, k: 3, d: 3, a: 4, ratio: '2,33', level: 14, items: [1055, 6676, 3031, 3036, 1018, null, 3363], lp: -18 },
    { day: 1, time: '22:18', player: 34, champ: 'Viego', role: 'Jungle', queue: 'Solo/Duo', duration: '33:56', win: true, k: 18, d: 7, a: 6, ratio: '3,43', level: 18, items: [6676, 6697, 3047, 3036, 3031, 2019, 3364], lp: 20 },
    { day: 1, time: '22:11', player: 40, champ: 'Samira', role: 'Bot', queue: 'Normale (Draft)', duration: '28:09', win: false, k: 5, d: 11, a: 2, ratio: '0,64', level: 14, items: [1055, 6676, 3031, 3036, 1036, null, 3363], lp: 'none' },
  ],
  feedDays: [
    { label: "Aujourd'hui", date: 'mer. 21 oct.' },
    { label: 'Hier', date: 'mar. 20 oct.' },
  ],
  playerOfTheWeek: { player: 34, lp: 246, games: 45, winRate: 62, streak: 5 },
  records: [
    { title: 'Énorme Inter', player: 39, date: '5 oct.', value: '17', unit: 'morts', tone: 'loss' },
    { title: 'Pire série de défaites', player: 40, date: '17 oct.', value: '11', unit: 'défaites', tone: 'loss' },
    { title: 'Maître du CC', player: 39, date: '10 oct.', value: '530', unit: 's', tone: 'win' },
  ],
  champions: [
    { name: 'Viego', player: 34, games: 134, kda: '3,3', winRate: 47 },
    { name: 'Yorick', player: 41, games: 73, kda: '2,7', winRate: 53 },
    { name: 'Tryndamere', player: 52, games: 52, kda: '2,6', winRate: 54 },
    { name: 'Kindred', player: 19, games: 45, kda: '2,9', winRate: 44 },
  ],
}
