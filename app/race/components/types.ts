export type BotLevel = 'easy' | 'medium' | 'hard';

export type BotSpeeds = Record<BotLevel, number>;

// 달리기 참가자 (나 + AI 팡 친구)
export interface Participant {
  id: string;
  nickname: string;
  emoji: string; // 팡 친구는 난이도 표시 이모지 (🐢 🐇 🐆)
  skinId?: string; // 배움팡 캐릭터 (PLAYER_SKINS id)
  joinedAt: number;
  isBot?: boolean;
  botLevel?: BotLevel;
  progress?: number;
  cpm?: number;
  accuracy?: number;
  score?: number;
  combo?: number;
  currentIdx?: number;
  completedAt?: number;
}

// 대기실에서 게임 화면으로 넘기는 설정값
export interface RaceSettings {
  botSpeeds: BotSpeeds;
  comboWeight: number;
  enableFlawlessBonus: boolean;
  showSpace: boolean;
  removePunctuation: boolean;
  contentOption?: 'sentence' | 'word';
}
