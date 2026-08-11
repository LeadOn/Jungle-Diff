export interface LeagueOfLegendsRank {
  id: number;
  playerId: number;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
  createdOn: string;
}

export interface LeaguePlayer {
  id: number;
  nickname: string;
  profilePictureUrl: string | null;
  riotGamesNickname: string | null;
  riotGamesTagLine: string | null;
  lolIconId: number | null;
  lolRefreshedOn: string | null;
  leagueOfLegendsSoloRank: LeagueOfLegendsRank | null;
  leagueOfLegendsFlexRank: LeagueOfLegendsRank | null;
  recentFormSolo: boolean[];
  recentFormFlex: boolean[];
  lpChange7DaysSolo: number | null;
  lpChange7DaysFlex: number | null;
}
