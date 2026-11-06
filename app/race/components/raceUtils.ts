import type { BotLevel, BotSpeeds, Participant, RaceSettings } from './types';

// 나 자신의 참가자 ID (통신이 없으므로 고정값)
export const MY_ID = 'me';

export const MAX_BOTS = 2; // 나까지 3명 = 트랙 3줄

// 대기실 → 게임 화면 데이터 전달용 sessionStorage 키
export const RACE_STORAGE_KEYS = {
  PROBLEM_SET: 'tajapang_race_problemSet',
  SETTINGS: 'tajapang_race_settings',
  PARTICIPANTS: 'tajapang_race_participants',
};

// 팡 친구 난이도별 타수 범위 (대기실 슬라이더와 시뮬레이션이 같은 범위를 사용)
export const BOT_SPEED_LIMITS: Record<BotLevel, { min: number; max: number }> = {
  easy: { min: 50, max: 200 },
  medium: { min: 200, max: 400 },
  hard: { min: 400, max: 800 }
};

export const DEFAULT_BOT_SPEEDS: BotSpeeds = { easy: 150, medium: 300, hard: 500 };

export const DEFAULT_SETTINGS: RaceSettings = {
  botSpeeds: DEFAULT_BOT_SPEEDS,
  comboWeight: 50,
  enableFlawlessBonus: true,
  showSpace: false,
  removePunctuation: true
};

export const BOT_LEVEL_LABEL: Record<BotLevel, string> = { easy: '초급', medium: '중급', hard: '고급' };
export const BOT_LEVEL_EMOJI: Record<BotLevel, string> = { easy: '🐢', medium: '🐇', hard: '🐆' };

export const clampBotSpeed = (level: BotLevel, speed: number) => {
  const { min, max } = BOT_SPEED_LIMITS[level];
  return Math.min(max, Math.max(min, speed));
};

// 문장 부호 제거 옵션 적용
export const applyPunctuationSetting = (text: string, removePunctuation: boolean) => {
  if (!removePunctuation) return text;
  return text.replace(/[.,!?;:"'()\[\]{}\-<>@#$%^&*=_+|\\~`]/g, "").trim().replace(/\s+/g, ' ');
};

// 트랙 이름표용 닉네임 3글자 제한 (예전 기록의 "초급봇 1" 같은 이름은 초급1로 줄임)
export const formatNickname = (nickname?: string) => {
  const display = nickname || '학생';

  const botMatch = display.match(/^(초급|중급|고급)봇\s*(\d+)$/);
  if (botMatch) {
    const [, prefix, num] = botMatch;
    return `${prefix}${num}`;
  }

  return display.length > 3 ? display.slice(0, 3) : display;
};

// 총점 기준 내림차순 랭킹 정렬 헬퍼 (1순위: 총점 -> 2순위: 완주 선착순 -> 3순위: 진행률 -> 4순위: 타속 -> 5순위: 정확도)
export const sortByScoreDesc = (a: Participant, b: Participant) => {
  // 1. 점수 내림차순 최우선
  if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
  // 2. 완주자 선착순 (completedAt)
  if ((a.progress || 0) === 100 && (b.progress || 0) === 100) {
    const ca = a.completedAt ?? 9999999999999;
    const cb = b.completedAt ?? 9999999999999;
    if (ca !== cb) return ca - cb;
  }
  // 3. 진행률 내림차순
  if ((b.progress ?? 0) !== (a.progress ?? 0)) return (b.progress ?? 0) - (a.progress ?? 0);
  // 4. 타속(cpm) 내림차순
  if ((b.cpm ?? 0) !== (a.cpm ?? 0)) return (b.cpm ?? 0) - (a.cpm ?? 0);
  // 5. 정확도(accuracy) 내림차순
  return (b.accuracy ?? 100) - (a.accuracy ?? 100);
};
