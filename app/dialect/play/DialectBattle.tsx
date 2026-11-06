"use client";

import React, { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDialectProgress, recordDialectClear, saveStudentRecord } from '@/lib/storage';
import { convertEngToKor, getChoseong } from '@/lib/hangul';
import TajaPangLogo from '../../components/TajaPangLogo';
import StatCard from '../../race/components/StatCard';
import {
  BATTLE_RULES as R,
  BEATS,
  DIALECT_BOSSES,
  HAND_INFO,
  HIDDEN_BOSS,
  bossCpmAtLevel,
  bossTitle,
  finisherDamageFor,
  isHiddenUnlocked,
  simulateBossSeconds,
  splitLine,
  typingText,
  type BossId,
  type DialectBoss,
  type DialectLine,
  type Hand
} from '../data/dialectBosses';
import { BossAvatar, HpBar, SpeechBubble, type BossMood } from '../components/BattleParts';
import { PlayerCharacter, getPlayerSkin, type PlayerMood } from '../../components/PlayerSkin';
import { RegionBackdrop } from '../components/RegionBackdrop';
import { isMuted, setMuted, sfx } from '../components/sound';
import { appConfirm, blockReloadKeys } from '@/lib/appDialog';

// 카운트다운을 우리말로 (3 → 셋, 2 → 둘, 1 → 하나, 0 → 시작!)
const COUNTDOWN_WORDS = ['시작!', '하나', '둘', '셋'];

// 가위·바위·보 카드 색 (처음 하는 학생도 세 장이 서로 다른 손이라는 걸 바로 알도록)
const HAND_STYLE: Record<Hand, { color: string; bg: string }> = {
  scissors: { color: '#F87171', bg: 'rgba(248, 113, 113, 0.14)' },
  rock: { color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.14)' },
  paper: { color: '#FACC15', bg: 'rgba(250, 204, 21, 0.14)' },
};

const HANDS: Hand[] = ['scissors', 'rock', 'paper'];
const SHOUTS = ['가위!', '바위!', '보!'];

type Phase = 'countdown' | 'choose' | 'finisher' | 'shoot' | 'reveal' | 'over';
type RoundResult = 'win' | 'lose' | 'draw' | 'timeout' | 'finisher-success' | 'finisher-fail';
type RoundCards = Record<Hand, DialectLine>;

interface Outcome {
  result: RoundResult;
  playerHand: Hand | null;
  bossHand: Hand | null;
  damageToBoss: number;
  damageToPlayer: number;
  shielded: boolean;
  headline: string;
  detail: string;
  isFinalBlow: boolean;
}

interface LogEntry {
  round: number;
  result: RoundResult;
  line: DialectLine | null;
  playerHand: Hand | null;
}

// 누적 타자 기록 (1단계 엔진과 같은 기준: 한 글자 = 3타, 정확도 = 정타 / (정타 + 지우기))
interface BattleStats {
  correctChars: number;
  typingMs: number;
  backspace: number;
  flawless: number;
  keystrokes: number;
}

const EMPTY_STATS: BattleStats = { correctChars: 0, typingMs: 0, backspace: 0, flawless: 0, keystrokes: 0 };

const RESULT_STYLE: Record<RoundResult, { label: string; chip: string; text: string }> = {
  win: { label: '승리', chip: 'bg-emerald-300', text: 'text-emerald-300' },
  lose: { label: '패배', chip: 'bg-rose-300', text: 'text-rose-400' },
  draw: { label: '비김', chip: 'bg-slate-200', text: 'text-sky-300' },
  timeout: { label: '시간 초과', chip: 'bg-rose-200', text: 'text-rose-400' },
  'finisher-success': { label: '필살 성공', chip: 'bg-amber-300', text: 'text-[#FFE600]' },
  'finisher-fail': { label: '필살 실패', chip: 'bg-slate-300', text: 'text-slate-300' },
};

const pick = <T,>(list: T[]): T => list[Math.floor(Math.random() * list.length)];

const shuffle = <T,>(list: T[]): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// 카드마다 마지막으로 나온 라운드 (이번 대결 안에서만 기억)
type CardHistory = Map<DialectLine, number>;
const NEVER_SHOWN_GAP = 99;

// 카드 더미 방식으로 뽑기: 오래 안 나온 카드부터 나옴
// - 아직 안 나온 카드가 있으면 그 카드가 먼저 나옴 (한 바퀴 돌기 전엔 같은 카드가 다시 안 나옴)
// - 바로 앞 라운드에 나온 카드는 연달아 나오지 않음
// - 세 카드 첫 글자의 초성은 모두 달라야 함 (첫 타로 어느 카드인지 바로 판별)
// 가능한 조합 가운데 "가장 최근에 나온 카드가 얼마나 오래전인지"가 가장 큰 조합을 고르고,
// 같으면 세 카드의 간격 합이 큰 조합, 그래도 같으면 무작위
const drawCards = (boss: DialectBoss, history: CardHistory, round: number, prev: RoundCards | null): RoundCards => {
  const first = (l: DialectLine) => getChoseong(typingText(boss, l)[0]);
  const gap = (l: DialectLine) => {
    const last = history.get(l);
    return last === undefined ? NEVER_SHOWN_GAP : round - last;
  };
  const options = (h: Hand) => shuffle(boss.cards[h].filter(l => l !== prev?.[h]));

  let best: RoundCards | null = null;
  let bestScore = -1;
  for (const s of options('scissors')) {
    for (const r of options('rock')) {
      if (first(r) === first(s)) continue;
      for (const p of options('paper')) {
        if (first(p) === first(s) || first(p) === first(r)) continue;
        const gaps = [gap(s), gap(r), gap(p)];
        const score = Math.min(...gaps) * 1000 + gaps.reduce((a, b) => a + b, 0);
        if (score > bestScore) {
          bestScore = score;
          best = { scissors: s, rock: r, paper: p };
        }
      }
    }
  }
  // 초성이 겹치지 않는 조합이 없을 때(데이터 오류)만 그냥 뽑음
  const cards = best ?? { scissors: pick(boss.cards.scissors), rock: pick(boss.cards.rock), paper: pick(boss.cards.paper) };
  for (const h of HANDS) history.set(cards[h], round);
  return cards;
};

// 입력의 첫 글자 초성으로 어느 카드를 치는지 판별
const findHand = (boss: DialectBoss, cards: RoundCards | null, value: string): Hand | null => {
  if (!cards || !value) return null;
  const typed = getChoseong(value[0]);
  return HANDS.find(h => getChoseong(typingText(boss, cards[h])[0]) === typed) ?? null;
};

const calcCpm = (s: BattleStats) => (s.typingMs > 0 ? Math.floor((s.correctChars * 3) / (s.typingMs / 60000)) : 0);
const calcAccuracy = (correct: number, typo: number) => (correct + typo > 0 ? Math.max(0, Math.floor((correct / (correct + typo)) * 100)) : 100);

// 받침 유무에 따라 조사 선택 (을/를, 이/가)
const josa = (word: string, withBatchim: string, withoutBatchim: string) => {
  const code = word.charCodeAt(word.length - 1);
  const hasBatchim = code >= 0xAC00 && code <= 0xD7A3 && (code - 0xAC00) % 28 !== 0;
  return `${word}${hasBatchim ? withBatchim : withoutBatchim}`;
};

const loadProfile = () => ({
  nickname: sessionStorage.getItem('tajapang_nickname') || '나',
  skin: getPlayerSkin(),
});

// 필살 문장의 방언 부분 글자별 색칠
// - 친 글자: 흐린 흰색(맞음) / 빨간색(틀림), 다음에 칠 글자: 노란 밑줄, 아직 안 친 글자: 노란색
const renderTypedText = (targetText: string, userInput: string, showSpace: boolean) => {
  const letters = targetText.split('').map((char, index) => {
    let color = "font-black text-[#FFE600] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]";
    if (index < userInput.length) {
      color = userInput[index] === char ? "text-white/35" : "text-red-400";
    } else if (index === userInput.length) {
      color = "font-black text-[#FFE600] underline decoration-4 underline-offset-8 decoration-[#FFE600] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]";
    }
    return (
      <span key={index} className={color}>
        {char === ' ' ? (showSpace ? '␣' : ' ') : char}
      </span>
    );
  });

  const isAllTyped = userInput.length === targetText.length;
  letters.push(
    <span key="enter-guide-symbol" className={isAllTyped ? "text-[#FFE600] font-black drop-shadow-[0_0_8px_rgba(255,230,0,0.6)] animate-pulse pl-1.5" : "text-white/10 font-normal pl-1.5"} style={{ verticalAlign: 'middle' }}>
      ↵
    </span>
  );
  return letters;
};

type BadgeState = 'shaking' | 'win' | 'lose' | 'even';

// 구호·공개 화면의 손 표시
// - 구호 중(shaking): 양쪽 모두 구호에 맞춰 ✌️(가위!) → ✊(바위!) → 🖐️(보!)로 바뀌며 콩 튐
// - 공개 후: 이긴 쪽은 노란 테두리 + "승!", 진 쪽은 흐리게
function HandBadge({ who, hand, state, beat = 0 }: { who: string; hand: Hand | null; state: BadgeState; beat?: number }) {
  const shaking = state === 'shaking';
  return (
    <div className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${state === 'lose' ? 'opacity-45 grayscale-[50%]' : ''}`}>
      {state === 'win' && (
        <span className="absolute -top-2 -right-3 z-10 bg-[#FFE600] text-slate-900 border-2 border-black rounded-full px-2 py-0.5 text-xs md:text-sm font-black shadow-[2px_2px_0px_#000] rotate-12 animate-shout-pop">승!</span>
      )}
      <div
        key={shaking ? `beat-${beat}` : 'revealed'}
        className={`w-20 h-20 md:w-24 md:h-24 md:[@media(min-height:900px)]:w-32 md:[@media(min-height:900px)]:h-32 bg-white rounded-2xl flex items-center justify-center text-5xl md:text-6xl md:[@media(min-height:900px)]:text-7xl shadow-[3px_3px_0px_#000] ${state === 'win'
          ? 'border-[5px] border-[#FFE600] ring-4 ring-black'
          : 'border-4 border-black'
          } ${shaking ? 'animate-fist-shake' : 'animate-card-flip'}`}
      >
        {shaking ? HAND_INFO[HANDS[beat] ?? 'rock'].emoji : hand ? HAND_INFO[hand].emoji : '⏰'}
      </div>
      <span className="text-[11px] md:text-sm font-black text-white whitespace-nowrap">
        {shaking ? who : `${who} · ${hand ? HAND_INFO[hand].label : '시간 초과'}`}
      </span>
    </div>
  );
}

interface DialectBattleProps {
  boss: DialectBoss;
  prevBoss?: DialectBoss;
  nextBoss?: DialectBoss;
  level: number; // 이번 도전의 보스 LV (그 보스를 이긴 횟수 + 1)
  alreadyCleared: boolean; // 전에 이 보스를 이긴 적이 있으면 대사 뜻을 처음부터 보여 줌
  shieldOption: boolean;
  showSpace: boolean; // 띄어쓰기 기호(␣) 표시
  previewMeaning: boolean; // 카드 뜻 미리 보기
  relaxedMode: boolean; // 여유 모드 (제한시간 +relaxedBonusSec, 이겨도 LV 그대로)
  fastMode: boolean; // 연출 빠르게
  onRestart: () => void;
  onChangeBoss: (id: BossId) => void;
}

export default function DialectBattle({ boss, prevBoss, nextBoss, level, alreadyCleared, shieldOption, showSpace, previewMeaning, relaxedMode, fastMode, onRestart, onChangeBoss }: DialectBattleProps) {
  const bossCpm = bossCpmAtLevel(boss, level);
  // 무대 캐릭터 크기: 화면 세로에 맞춰 (큰 모니터 128 · 노트북 768 112 · 크롬북 720 96 · 브라우저 창이 710보다 낮으면 72)
  const [stageCharSize] = useState(() => {
    const h = window.innerHeight;
    return h >= 900 ? 128 : h >= 760 ? 112 : h >= 710 ? 96 : 72;
  });
  // 세로가 낮은 화면(노트북 768·크롬북 720 등)에서는 "내가 친 카드" 상자도 조금 작게 해서 체력바가 잘리지 않게
  const [compactStage] = useState(() => window.innerHeight < 820);
  // 브라우저 창이 아주 낮으면(710 미만) 말풍선·캐릭터·체력바 사이 간격도 줄여서 체력바가 무대 밖으로 밀리지 않게
  const [tightStage] = useState(() => window.innerHeight < 710);
  const bonusSec = relaxedMode ? R.relaxedBonusSec : 0;
  const cardTimeLimit = boss.stats.timeLimit + bonusSec;
  const finisherTimeLimit = R.finisherTimeLimit + bonusSec;
  const finisherDamage = finisherDamageFor(boss);
  const pace = fastMode ? 0.5 : 1; // 연출 빠르게면 구호·공개 시간을 절반으로
  const router = useRouter();
  const [profile] = useState(loadProfile);

  const [phase, setPhase] = useState<Phase>('countdown');
  const [countdown, setCountdown] = useState<number | null>(3);
  const [round, setRound] = useState(0);
  const [cards, setCards] = useState<RoundCards | null>(null);
  const [finisherLine, setFinisherLine] = useState<DialectLine | null>(null);
  const [bossHand, setBossHand] = useState<Hand>('rock');
  const [roundStartAt, setRoundStartAt] = useState(0);
  const [now, setNow] = useState(0);

  const [playerHp, setPlayerHp] = useState(R.playerHp);
  const [bossHp, setBossHp] = useState(boss.stats.hp);
  const [gauge, setGauge] = useState(0);
  const [shield, setShield] = useState(0);
  const [shieldProgress, setShieldProgress] = useState(0);
  const [stats, setStats] = useState<BattleStats>(EMPTY_STATS);
  const [log, setLog] = useState<LogEntry[]>([]);

  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [shoutStep, setShoutStep] = useState(0);
  const [bubble, setBubble] = useState<DialectLine>(boss.intro);
  const [bubbleKey, setBubbleKey] = useState(0); // 같은 대사가 다시 나와도 말풍선을 새로 띄우기 위한 번호
  const [heardLines, setHeardLines] = useState<DialectLine[]>([boss.intro]); // 이번 대결에서 들은 보스 대사
  const [picked, setPicked] = useState<{ hand: Hand | null; line: DialectLine } | null>(null); // 이번 라운드에 내가 친 카드
  const [shake, setShake] = useState<'boss' | 'player' | 'big' | null>(null);
  const [winner, setWinner] = useState<'player' | 'boss' | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [muted, setMutedState] = useState(isMuted);
  const [hiddenAppeared, setHiddenAppeared] = useState(false); // 이번 승리로 다섯 보스를 모두 이겨 숨겨진 보스가 나타났는지

  // 타자 입력 상태 (1단계 엔진과 같은 방식)
  const [userInput, setUserInput] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isError, setIsError] = useState(false);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const [isEngModeWarning, setIsEngModeWarning] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resolvingRef = useRef(false); // 한 라운드가 두 번 판정되지 않도록 막음
  const timersRef = useRef<number[]>([]);
  const historyRef = useRef<CardHistory>(new Map()); // 카드마다 마지막으로 나온 라운드
  const lastCardsRef = useRef<RoundCards | null>(null); // 바로 앞 라운드 카드 (연달아 같은 카드 방지)

  const isTyping = phase === 'choose' || phase === 'finisher';
  const timeLimit = phase === 'finisher' ? finisherTimeLimit : cardTimeLimit;
  const elapsedSec = isTyping ? Math.max(0, (now - roundStartAt) / 1000) : 0;
  const remainingSec = Math.max(0, timeLimit - elapsedSec);
  const selectedHand = phase === 'choose' ? findHand(boss, cards, userInput) : null;
  const typeOf = (l: DialectLine) => typingText(boss, l); // 지역 보스는 방언, 표준어 박사는 표준어 풀이를 침
  const targetText = phase === 'finisher'
    ? finisherLine ? typeOf(finisherLine) : ''
    : selectedHand && cards ? typeOf(cards[selectedHand]) : '';
  // 보스 대사의 뜻은 그 보스를 이긴 뒤에만 공개 (표준어 박사는 대사가 표준어라 가릴 뜻이 없음)
  const showBossMeaning = alreadyCleared || winner === 'player' || !!boss.typeStandard;

  // 연출용 지연 실행 (화면을 벗어나면 모두 취소)
  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach(id => window.clearTimeout(id));
  }, []);

  // 대결 중 새로고침/탭닫기 실수 방지
  useEffect(() => {
    if (phase === 'over' || phase === 'countdown') return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    const unblockReloadKeys = blockReloadKeys('새로고침하면 진행 중인 게임이 초기화되어요. 새로고침을 막았습니다.');
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unblockReloadKeys();
    };
  }, [phase]);

  // ───── 라운드 시작 ─────
  const startRound = (n: number, currentGauge: number) => {
    resolvingRef.current = false;
    const t = Date.now();
    setRound(n);
    setRoundStartAt(t);
    setNow(t);
    setUserInput('');
    setIsComposing(false);
    setIsError(false);
    setBackspaceCount(0);
    setWarning(null);
    setIsEngModeWarning(false);
    setOutcome(null);
    setShoutStep(0);
    setPicked(null);
    if (inputRef.current) inputRef.current.value = '';

    if (currentGauge >= R.gaugeMax) {
      // 필살 게이지가 가득 차면 가위바위보 대신 필살 문장 라운드
      setFinisherLine(pick(boss.finishers));
      setCards(null);
      setPhase('finisher');
    } else {
      const nextCards = drawCards(boss, historyRef.current, n, lastCardsRef.current);
      lastCardsRef.current = nextCards;
      setCards(nextCards);
      setBossHand(pick(HANDS)); // 보스의 수는 라운드 시작 때 미리 정해 둠
      setFinisherLine(null);
      setPhase('choose');
    }
    later(() => inputRef.current?.focus(), 60);
  };

  // 셋 → 둘 → 하나 → 시작! 후 1라운드 시작
  const onCountdownDone = useEffectEvent(() => startRound(1, 0));
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 3) sfx.countdown(false);
    const timer = setTimeout(() => {
      if (countdown > 0) {
        setCountdown(countdown - 1);
        sfx.countdown(countdown - 1 === 0);
      } else {
        setCountdown(null);
        onCountdownDone();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ───── 판정 결과 반영: 구호 → 동시 공개 → 피해 → 다음 라운드 ─────
  const settleRound = (o: Omit<Outcome, 'isFinalBlow'>, line: DialectLine | null, next: { gauge: number; shield: number; shieldProgress: number; stats: BattleStats }) => {
    const newBossHp = Math.max(0, bossHp - o.damageToBoss);
    const newPlayerHp = Math.max(0, playerHp - o.damageToPlayer);
    const isFinalBlow = newBossHp === 0 || newPlayerHp === 0;
    const finalOutcome: Outcome = { ...o, isFinalBlow };

    setGauge(next.gauge);
    setStats(next.stats);
    setLog(prev => [...prev, { round, result: o.result, line, playerHand: o.playerHand }]);

    // 보스 반응 대사 (쓰러짐 > 맞음 > 비김 > 때림)
    const reaction = newBossHp === 0
      ? boss.defeated
      : o.damageToBoss > 0
        ? pick(boss.reactions.hurt)
        : o.result === 'draw'
          ? pick(boss.reactions.draw)
          : pick(boss.reactions.taunt);

    const reveal = () => {
      setPhase('reveal');
      setOutcome(finalOutcome);
      setBossHp(newBossHp);
      setPlayerHp(newPlayerHp);
      // 방패 표시는 결과 공개와 함께 바꿈 (구호 중에 미리 바뀌면 진 걸 먼저 알게 되고, 막은 순간 바로 '충전 중'으로 보이도록)
      setShield(next.shield);
      setShieldProgress(next.shieldProgress);
      setBubble(reaction);
      setBubbleKey(k => k + 1);
      setHeardLines(prev => (prev.some(l => l.text === reaction.text) ? prev : [...prev, reaction]));
      if (o.damageToBoss > 0 || o.damageToPlayer > 0) {
        sfx.hit(isFinalBlow || o.result === 'finisher-success');
        setShake(isFinalBlow ? 'big' : o.damageToBoss > 0 ? 'boss' : 'player');
        later(() => setShake(null), 950);
      } else if (o.shielded) {
        sfx.block();
      } else {
        sfx.reveal();
      }
      later(() => {
        if (isFinalBlow) {
          finishBattle(newBossHp === 0 ? 'player' : 'boss', newPlayerHp, next.stats);
        } else {
          startRound(round + 1, next.gauge);
        }
      }, (isFinalBlow ? 3200 : 2800) * pace);
    };

    if (o.playerHand && o.bossHand) {
      // "가위! 바위! 보!" 구호 후 동시 공개
      setPhase('shoot');
      setShoutStep(0);
      sfx.shout(0);
      later(() => { setShoutStep(1); sfx.shout(1); }, 450 * pace);
      later(() => { setShoutStep(2); sfx.shout(2); }, 900 * pace);
      later(reveal, 1350 * pace);
    } else {
      reveal();
    }
  };

  const finishBattle = (w: 'player' | 'boss', hpLeft: number, finalStats: BattleStats) => {
    setWinner(w);
    setPhase('over');
    if (w === 'player') {
      sfx.win();
      const wasUnlocked = isHiddenUnlocked(getDialectProgress().cleared);
      const updated = recordDialectClear(boss.id, boss.order, DIALECT_BOSSES.length, round, hpLeft, !relaxedMode);
      setHiddenAppeared(!boss.hidden && !wasUnlocked && isHiddenUnlocked(updated.cleared));
    } else {
      sfx.lose();
    }
    saveStudentRecord({
      cpm: calcCpm(finalStats),
      accuracy: calcAccuracy(finalStats.correctChars, finalStats.backspace),
      contentTitle: `방언 대결 ${boss.region} ${w === 'player' ? '승리' : '패배'}`
    });
  };

  // 방패 충전: 방패를 들고 있는 동안과 방패를 쓴 라운드에는 충전하지 않음
  // (막은 라운드가 무결점이어도 바로 새 방패가 생기지 않고, 쓴 뒤에는 항상 새로 무결점 shieldEvery번이 필요)
  const nextShieldState = (flawless: boolean, currentShield: number, usedShield: boolean) => {
    let s = currentShield;
    let p = shieldProgress;
    if (shieldOption && flawless && currentShield === 0 && !usedShield) {
      p += 1;
      if (p >= R.shieldEvery) {
        p = 0;
        s = Math.min(1, s + 1);
      }
    }
    return { shield: s, shieldProgress: p };
  };

  // 카드 문장을 끝까지 치고 엔터 → 가위바위보 판정
  const resolveCardRound = (hand: Hand) => {
    if (resolvingRef.current || !cards) return;
    resolvingRef.current = true;

    const t = Date.now();
    const playerTime = (t - roundStartAt) / 1000;
    const flawless = !isError && backspaceCount === 0;
    const typed = typeOf(cards[hand]);
    const result: RoundResult = hand === bossHand ? 'draw' : BEATS[hand] === bossHand ? 'win' : 'lose';

    let damageToBoss = 0;
    let damageToPlayer = 0;
    let shielded = false;
    let currentShield = shield;
    let headline = '';
    let detail = '';

    if (result === 'win') {
      const remainingRatio = Math.max(0, 1 - playerTime / cardTimeLimit);
      const timeBonus = remainingRatio * R.timeBonusRate;
      damageToBoss = Math.round(R.baseDamage * (1 + timeBonus + (flawless ? R.flawlessBonusRate : 0)));
      headline = `승리! 보스에게 ${damageToBoss} 피해`;
      detail = `남은 시간 보너스 +${Math.round(timeBonus * 100)}%${flawless ? ` · 무결점 보너스 +${Math.round(R.flawlessBonusRate * 100)}%` : ''}`;
    } else if (result === 'lose') {
      if (shieldOption && currentShield > 0) {
        shielded = true;
        currentShield -= 1;
        headline = '패배... 하지만 방패로 막았다!';
      } else {
        damageToPlayer = boss.stats.attack;
        headline = `패배! ${damageToPlayer} 피해를 받았다`;
      }
    } else {
      // 비김: 보스가 같은 카드를 치는 가상 시간(AI봇 방식)과 비교해 더 빠른 쪽이 작은 피해
      const bossTime = simulateBossSeconds(typed.length, bossCpm);
      const timeText = `나 ${playerTime.toFixed(1)}초 vs 보스 ${bossTime.toFixed(1)}초 (보스 ${bossCpm}타)`;
      if (playerTime < bossTime) {
        damageToBoss = R.drawDamage;
        headline = `비김! 내가 더 빨랐다 → 보스에게 ${R.drawDamage} 피해`;
      } else {
        damageToPlayer = R.drawDamage;
        headline = `비김! 보스가 더 빨랐다 → ${R.drawDamage} 피해를 받았다`;
      }
      detail = timeText;
    }

    setPicked({ hand, line: cards[hand] });
    settleRound(
      { result, playerHand: hand, bossHand, damageToBoss, damageToPlayer, shielded, headline, detail },
      cards[hand],
      {
        gauge: flawless ? Math.min(R.gaugeMax, gauge + 1) : gauge,
        ...nextShieldState(flawless, currentShield, shielded),
        stats: {
          ...stats,
          correctChars: stats.correctChars + typed.length,
          typingMs: stats.typingMs + (t - roundStartAt),
          backspace: stats.backspace + backspaceCount,
          flawless: stats.flawless + (flawless ? 1 : 0),
        },
      }
    );
  };

  // 필살 문장 성공 → 가위바위보와 무관하게 큰 피해, 게이지 초기화
  const resolveFinisher = () => {
    if (resolvingRef.current || !finisherLine) return;
    resolvingRef.current = true;
    const t = Date.now();
    const flawless = !isError && backspaceCount === 0;
    setPicked({ hand: null, line: finisherLine });
    settleRound(
      {
        result: 'finisher-success',
        playerHand: null,
        bossHand: null,
        damageToBoss: finisherDamage,
        damageToPlayer: 0,
        shielded: false,
        headline: `🔥 필살기 성공! 보스에게 ${finisherDamage} 피해`,
        detail: `${((t - roundStartAt) / 1000).toFixed(1)}초 만에 완성`,
      },
      finisherLine,
      {
        gauge: 0,
        shield,
        shieldProgress,
        stats: {
          ...stats,
          correctChars: stats.correctChars + typeOf(finisherLine).length,
          typingMs: stats.typingMs + (t - roundStartAt),
          backspace: stats.backspace + backspaceCount,
          flawless: stats.flawless + (flawless ? 1 : 0),
        },
      }
    );
  };

  // 제한시간 초과: 카드 라운드는 패배, 필살 라운드는 피해 없이 게이지만 초기화
  const handleTimeUp = () => {
    if (resolvingRef.current) return;
    resolvingRef.current = true;
    const nextStats = { ...stats, backspace: stats.backspace + backspaceCount };

    if (phase === 'finisher') {
      settleRound(
        { result: 'finisher-fail', playerHand: null, bossHand: null, damageToBoss: 0, damageToPlayer: 0, shielded: false, headline: '필살기 실패... 시간 초과!', detail: '필살 게이지가 초기화됩니다.' },
        finisherLine,
        { gauge: 0, shield, shieldProgress, stats: nextStats }
      );
      return;
    }

    let currentShield = shield;
    let damageToPlayer = boss.stats.attack;
    let shielded = false;
    if (shieldOption && currentShield > 0) {
      shielded = true;
      currentShield -= 1;
      damageToPlayer = 0;
    }
    settleRound(
      {
        result: 'timeout',
        playerHand: null,
        bossHand,
        damageToBoss: 0,
        damageToPlayer,
        shielded,
        headline: shielded ? '시간 초과... 방패로 막았다!' : `시간 초과! ${damageToPlayer} 피해를 받았다`,
        detail: `제한시간 ${cardTimeLimit}초 안에 카드 하나를 끝까지 쳐야 해요.`,
      },
      null,
      { gauge, shield: currentShield, shieldProgress, stats: nextStats }
    );
  };

  // 0.1초마다 시간 게이지 갱신 + 제한시간 초과 판정
  const onTick = useEffectEvent(() => {
    const t = Date.now();
    setNow(t);
    if (t - roundStartAt >= timeLimit * 1000) handleTimeUp();
  });
  useEffect(() => {
    if (!isTyping) return;
    const id = window.setInterval(onTick, 100);
    return () => window.clearInterval(id);
  }, [isTyping]);

  // ───── 타자 입력 (1단계 엔진 복사: 조합 중 예외, 백스페이스 집계, 한/영 자동 변환) ─────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isTyping) return;
    sfx.key();
    setStats(prev => ({ ...prev, keystrokes: prev.keystrokes + 1 }));

    // 한글 조합 중(isComposing) 브라우저가 e.key를 'Process'로 매핑하는 IME 표준 스펙 한계를 극복하기 위해
    // 물리적 키 코드(e.code) 및 가상 키코드(e.keyCode)를 다중 검증하여 백스페이스를 확실히 포착합니다.
    if (e.key === 'Backspace' || e.code === 'Backspace' || e.keyCode === 8) {
      setBackspaceCount(prev => prev + 1);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isComposing) return;
      handleSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isTyping) return;
    let value = e.target.value;

    // 영문 자판 감지 시 2벌식 한글로 자동 변환
    if (/[a-zA-Z]/.test(value)) {
      setIsEngModeWarning(true);
      value = convertEngToKor(value);
    } else if (isEngModeWarning) {
      setIsEngModeWarning(false);
    }
    setUserInput(value);

    let target = '';
    if (phase === 'finisher') {
      target = finisherLine ? typeOf(finisherLine) : '';
    } else {
      const hand = findHand(boss, cards, value);
      target = hand && cards ? typeOf(cards[hand]) : '';
    }
    const noCard = phase === 'choose' && value.length > 0 && !target;
    setIsError(noCard || value.split('').some((char, i) => char !== target[i]));
    setWarning(noCard ? '세 카드 중 하나의 첫 글자로 시작해 보세요!' : null);
  };

  const handleSubmit = () => {
    if (phase === 'choose') {
      if (selectedHand && cards && userInput === typeOf(cards[selectedHand])) {
        resolveCardRound(selectedHand);
      } else {
        sfx.error();
        setIsError(true);
        setWarning('⚠️ 카드 문장과 똑같이 치고 엔터를 눌러 주세요!');
      }
    } else if (phase === 'finisher') {
      if (finisherLine && userInput === typeOf(finisherLine)) {
        resolveFinisher();
      } else {
        sfx.error();
        setIsError(true);
        setWarning('⚠️ 필살 문장과 똑같이 치고 엔터를 눌러 주세요!');
      }
    }
  };

  const handleLeave = async () => {
    if (phase === 'over' || await appConfirm('대결을 그만두고 보스 선택 화면으로 돌아가시겠습니까?')) {
      router.push('/dialect');
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  // ───── 화면 표시용 계산 ─────
  let currentCorrect = 0;
  for (let i = 0; i < userInput.length; i++) {
    if (userInput[i] === targetText[i]) currentCorrect++;
  }
  const liveMs = stats.typingMs + (isTyping ? Math.max(0, now - roundStartAt) : 0);
  const liveCorrect = stats.correctChars + (isTyping ? currentCorrect : 0);
  const cpm = liveMs > 0 ? Math.floor((liveCorrect * 3) / (liveMs / 60000)) : 0;
  const accuracy = calcAccuracy(liveCorrect, stats.backspace + (isTyping ? backspaceCount : 0));
  const timeRatio = timeLimit > 0 ? remainingSec / timeLimit : 0;

  const bossMood: BossMood = winner === 'player'
    ? 'ko'
    : winner === 'boss'
      ? 'happy'
      : phase === 'reveal' && outcome
        ? outcome.damageToBoss > 0 ? 'hurt' : (outcome.damageToPlayer > 0 || outcome.shielded) ? 'happy' : 'idle'
        : 'idle';
  const playerHurt = phase === 'reveal' && !!outcome && outcome.damageToPlayer > 0;
  // 맞으면 X 눈, 보스를 때리거나 이기면 웃는 눈, 평소엔 스킨 고유 표정
  const playerMood: PlayerMood = winner === 'player'
    ? 'happy'
    : winner === 'boss' || playerHurt
      ? 'hurt'
      : phase === 'reveal' && !!outcome && outcome.damageToBoss > 0
        ? 'happy'
        : 'idle';

  // 오늘 만난 방언 (중복 제거)
  const learnedLines = Array.from(new Map(log.filter(e => e.line).map(e => [e.line!.text, e.line!])).values());

  return (
    <main className={`bg-[#FFF59D] p-2 flex flex-col justify-between h-screen overflow-hidden ${shake === 'big' ? 'animate-battle-shake-big' : ''}`}>
      {/* 끝난 화면도 한 화면 높이로 고정 (결과 리포트는 자체 스크롤 팝업이라 영향 없음) */}
      {/* 상단 바 (로고 및 모드, 스탯 통합) */}
      <div className="flex justify-between items-center bg-white py-2 px-4 rounded-[20px] border-4 border-black shadow-[4px_4px_0px_#000] mb-2 w-full gap-3">
        <TajaPangLogo size="sm" />

        <div className="hidden xl:flex flex-1 justify-center mx-6 gap-3">
          <StatCard label="현재 타수" value={cpm} subLabel="타" color="text-indigo-600" bgColor="bg-[#FFDE4D]" rotation="-rotate-1" compact />
          <StatCard label="정확도" value={`${accuracy}%`} color="text-emerald-600" bgColor="bg-[#FFB0B0]" rotation="rotate-1" compact />
          <StatCard label="무결점 성공" value={stats.flawless} subLabel="회" color="text-amber-600" bgColor="bg-[#BFF6C3]" rotation="-rotate-1" compact />
          <StatCard label="라운드" value={round} color="text-rose-600" bgColor="bg-[#E2F1AF]" rotation="rotate-1" compact />
        </div>

        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <div className="bg-slate-100 border-4 border-black px-4 py-2 rounded-xl text-center leading-none shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">{boss.hidden ? '숨겨진 보스' : `${boss.order}단계`}</span>
            <span className="text-xl font-black tracking-wider whitespace-nowrap" style={{ color: boss.color.dark }}>{boss.region} 대결</span>
            {(relaxedMode || fastMode) && (
              <span className="block mt-1 text-[9px] font-black text-slate-500 whitespace-nowrap">
                {[relaxedMode && '⌛ 여유', fastMode && '⏩ 빠르게'].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <button
            onClick={toggleMute}
            title={muted ? '효과음 켜기' : '효과음 끄기'}
            className="bg-white border-4 border-black w-11 h-11 rounded-xl font-black text-lg shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={handleLeave}
            className="bg-rose-500 hover:bg-rose-600 text-white border-4 border-black px-4 py-2 rounded-xl font-black text-sm shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>🚪</span>
            <span className="hidden sm:inline">나가기</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col p-1 gap-2.5 overflow-hidden">
        <div className="flex-1 flex gap-2.5 overflow-hidden">
          <div className="flex-1 flex flex-col gap-2 relative">
            {/* 좁은 화면(1280px 미만)에서 노출되는 스탯 카드 영역 (넓은 화면은 상단 바 헤더로 통합) */}
            <div className="flex justify-center gap-1.5 xl:hidden">
              <StatCard label="현재 타수" value={cpm} subLabel="타" color="text-indigo-600" bgColor="bg-[#FFDE4D]" rotation="-rotate-1" />
              <StatCard label="정확도" value={`${accuracy}%`} color="text-emerald-500" bgColor="bg-[#FFB0B0]" rotation="rotate-2" />
              <StatCard label="무결점 성공" value={stats.flawless} subLabel="회" color="text-amber-500" bgColor="bg-[#BFF6C3]" rotation="-rotate-2" />
              <StatCard label="라운드" value={round} color="text-rose-500" bgColor="bg-[#E2F1AF]" rotation="rotate-1" />
            </div>

            {/* 칠판형 타자 영역 */}
            <div
              onClick={() => { if (isTyping) inputRef.current?.focus(); }}
              className="flex-1 max-h-[320px] bg-classroom-chalkboard rounded-[24px] border-[6px] border-black shadow-[6px_6px_0px_#000] p-3 md:p-4 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 opacity-10 bg-chalk-dust"></div>

              {/* 칠판 구석 백스페이스 카운트 (1단계와 동일) */}
              {isTyping && (
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-0.5 rounded-full border border-white/20 font-black text-[9px] shadow-[1px_1px_0px_#000] z-20 flex items-center gap-1 select-none">
                  <span>지우기:</span>
                  <span className="bg-white text-red-600 px-1 rounded-sm text-[8px] leading-none py-0.5">{backspaceCount}</span>
                </div>
              )}

              {/* 셋, 둘, 하나, 시작! 카운트다운 오버레이 */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/75 z-40 flex flex-col items-center justify-center select-none pointer-events-none transition-all duration-300">
                  <div
                    key={`countdown-${countdown}`}
                    className={`text-7xl md:text-9xl font-black italic animate-bounce drop-shadow-[5px_5px_0px_#000] ${countdown === 3 ? 'text-red-500' :
                        countdown === 2 ? 'text-orange-500' :
                          countdown === 1 ? 'text-emerald-500' :
                            'text-yellow-300 scale-110'
                      }`}
                  >
                    {COUNTDOWN_WORDS[countdown] ?? countdown}
                  </div>
                </div>
              )}

              {phase === 'countdown' && (
                <div className="z-10 text-center text-white flex flex-col gap-2">
                  <span className="text-xl md:text-3xl font-black text-[#FFF59D] drop-shadow-[2.5px_2.5px_0px_#000]">{bossTitle(boss)}</span>
                  <span className="text-xs md:text-sm font-bold text-white/70">
                    {boss.typeStandard
                      ? '방언 카드 아래의 표준어 풀이를 쳐요. 첫 글자로 카드가 골라져요. 끝까지 치고 엔터!'
                      : '카드 첫 글자를 치면 그 카드가 골라져요. 끝까지 치고 엔터!'}
                  </span>
                </div>
              )}

              {/* 가위·바위·보 카드 라운드 / 필살 라운드 공통: 시간 게이지 */}
              {isTyping && (
                <div className="w-full max-w-5xl z-10 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 pr-28">
                    <span className="bg-white text-slate-900 border-2 border-black text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">{round}라운드</span>
                    <div className="flex-1 h-3 bg-white/10 rounded-full border-2 border-black overflow-hidden">
                      <div
                        className={`h-full transition-[width] duration-100 ease-linear ${timeRatio > 0.5 ? 'bg-emerald-400' : timeRatio > 0.25 ? 'bg-amber-400' : 'bg-rose-500'}`}
                        style={{ width: `${timeRatio * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-black shrink-0 w-12 text-right ${timeRatio > 0.25 ? 'text-white' : 'text-rose-400 animate-pulse'}`}>{remainingSec.toFixed(1)}초</span>
                  </div>

                  {phase === 'choose' && cards && (
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                      {HANDS.map(hand => {
                        const { dialect, standard } = splitLine(cards[hand]);
                        const isSelected = selectedHand === hand;
                        const isDimmed = !!selectedHand && !isSelected;
                        return (
                          <div
                            key={hand}
                            className={`rounded-2xl border-4 px-2 pt-1.5 pb-1.5 md:pb-2.5 text-center transition-all duration-150 ${isSelected
                              ? 'scale-[1.03] shadow-[0_0_0_4px_rgba(255,230,0,0.35)]'
                              : ''
                              } ${isDimmed ? 'opacity-30' : ''}`}
                            style={{
                              borderColor: isSelected ? '#FFE600' : HAND_STYLE[hand].color,
                              backgroundColor: HAND_STYLE[hand].bg,
                            }}
                          >
                            {/* 손 모양을 크게: 흰 동그라미 안 손 그림 + 진한 손 이름 (손마다 색이 다름) */}
                            <div className="flex items-center justify-center gap-2 mb-0.5">
                              <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border-[3px] flex items-center justify-center text-lg md:text-xl shadow-[2px_2px_0px_#000]" style={{ borderColor: HAND_STYLE[hand].color }}>
                                {HAND_INFO[hand].emoji}
                              </span>
                              <span className="text-sm md:text-base font-black" style={{ color: HAND_STYLE[hand].color }}>{HAND_INFO[hand].label}</span>
                            </div>
                            {/* 표준어 박사: 위에 지역 표시 + 방언(보기), 아래에 칠 표준어 풀이 */}
                            {boss.typeStandard && (
                              <p className="text-xs md:text-sm font-bold text-white/70 leading-snug flex flex-wrap items-center justify-center gap-1.5 mb-0.5">
                                <span className="bg-white/90 text-slate-900 rounded px-1.5 py-px text-[10px] md:text-[11px] font-black">{cards[hand].region}</span>
                                <span>{dialect}</span>
                              </p>
                            )}
                            <p className="text-lg md:text-2xl xl:text-3xl font-bold tracking-tight leading-snug flex flex-wrap justify-center">
                              {(boss.typeStandard ? standard : dialect).split('').map((char, index) => {
                                let color = index === 0 ? 'text-[#FFE600] font-black' : 'text-white/90';
                                if (isSelected) {
                                  color = index < userInput.length
                                    ? (userInput[index] === char ? 'text-amber-300' : 'text-red-400')
                                    : 'text-white/30';
                                }
                                return <span key={index} className={color}>{char === ' ' ? (showSpace ? '␣' : ' ') : char}</span>;
                              })}
                            </p>
                            {previewMeaning && !boss.typeStandard && (
                              <p className="mt-1 text-[10px] md:text-xs font-bold text-white/50 leading-snug">{standard}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {phase === 'finisher' && finisherLine && (
                    <div className="flex flex-col items-center gap-2">
                      <span className="bg-rose-600 text-white border-2 border-black px-3 py-1 rounded-full text-[11px] md:text-xs font-black shadow-[2px_2px_0px_#000] animate-bounce-subtle">
                        🔥 필살기 라운드! {finisherTimeLimit}초 안에 끝까지 치면 {finisherDamage} 피해!
                      </span>
                      <p className="text-xl md:text-3xl lg:text-4xl font-bold tracking-tight leading-snug flex flex-wrap justify-center gap-x-0.5 text-white text-center">
                        {renderTypedText(typeOf(finisherLine), userInput, showSpace)}
                      </p>
                      <p className="text-xs md:text-sm font-bold text-white/60 text-center -mt-1">
                        {boss.typeStandard
                          ? `(${finisherLine.region} 방언: ${splitLine(finisherLine).dialect})`
                          : `(${splitLine(finisherLine).standard})`}
                      </p>
                    </div>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    lang="ko"
                    spellCheck={false} // 방언에 브라우저 맞춤법 빨간 밑줄이 생기지 않게
                    autoCorrect="off"
                    autoCapitalize="off"
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onCompositionStart={() => setIsComposing(true)}
                    onCompositionEnd={() => setIsComposing(false)}
                    onBlur={(e) => {
                      if (isTyping) setTimeout(() => e.target.focus(), 10);
                    }}
                    className={`w-full bg-white/5 border-b-4 ${isError ? 'border-red-400' : 'border-white/10'} text-white text-2xl md:text-3xl p-2 md:p-3 outline-none focus:border-amber-300 transition-all text-center font-bold placeholder:opacity-20`}
                    placeholder={phase === 'finisher' ? '필살 문장을 끝까지 치세요' : '카드 하나를 골라 치세요'}
                    autoComplete="off"
                  />
                  {isEngModeWarning && (
                    <div className="bg-[#FFF59D] text-slate-900 border-2 border-black px-4 py-1.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] mx-auto w-fit animate-bounce-subtle flex items-center justify-center gap-1.5">
                      <span>💡</span>
                      <span>영문 자판이 감지되어 한글로 자동 변환 중입니다! [한/영] 키를 눌러주세요.</span>
                    </div>
                  )}
                  {warning && (
                    <p className="text-red-400 text-sm md:text-base font-black text-center animate-bounce-subtle">{warning}</p>
                  )}
                </div>
              )}

              {/* 가위! 바위! 보! 구호 */}
              {phase === 'shoot' && (
                <div className="z-10 w-full max-w-4xl flex items-center justify-center gap-6 md:gap-14 select-none">
                  <HandBadge who="나" hand={null} state="shaking" beat={shoutStep} />
                  <span key={shoutStep} className="min-w-[4.5em] text-center text-5xl md:text-7xl font-black italic text-[#FFE600] drop-shadow-[5px_5px_0px_#000] animate-shout-pop">
                    {SHOUTS[shoutStep]}
                  </span>
                  <HandBadge who="보스" hand={null} state="shaking" beat={shoutStep} />
                </div>
              )}

              {/* 동시 공개 + 판정 + 방언 = 표준어 정리 */}
              {phase === 'reveal' && outcome && (
                <div className="z-10 w-full max-w-4xl flex flex-col items-center gap-2 select-none">
                  {outcome.playerHand || outcome.bossHand ? (
                    <div className="flex items-center gap-6 md:gap-14">
                      <HandBadge who="나" hand={outcome.playerHand} state={outcome.result === 'win' ? 'win' : outcome.result === 'draw' ? 'even' : 'lose'} />
                      <span className="text-white/60 font-black text-2xl md:text-3xl italic">VS</span>
                      <HandBadge who="보스" hand={outcome.bossHand} state={outcome.result === 'win' ? 'lose' : outcome.result === 'draw' ? 'even' : 'win'} />
                    </div>
                  ) : (
                    <span className="text-5xl animate-shout-pop">{outcome.result === 'finisher-success' ? '💥' : '⌛'}</span>
                  )}
                  <p className={`text-lg md:text-2xl lg:text-3xl font-black text-center drop-shadow-[2px_2px_0px_#000] animate-shout-pop ${outcome.isFinalBlow && outcome.damageToBoss > 0 ? 'text-[#FFE600]' : RESULT_STYLE[outcome.result].text}`}>
                    {outcome.isFinalBlow && outcome.damageToBoss > 0 ? `💥 마지막 일격! ${outcome.headline}` : outcome.headline}
                  </p>
                  {outcome.detail && <p className="text-white/70 text-[11px] md:text-xs font-bold text-center">{outcome.detail}</p>}
                  <div className="flex flex-wrap justify-center gap-1.5 md:gap-2 mt-1">
                    {cards && !finisherLine
                      ? HANDS.map(hand => {
                        const { dialect, standard } = splitLine(cards[hand]);
                        const isMine = hand === outcome.playerHand;
                        return (
                          <span key={hand} className={`text-[11px] md:text-xs font-black px-2.5 py-1 rounded-lg border-2 ${isMine ? 'border-[#FFE600] bg-white/15 text-white' : 'border-white/20 bg-white/5 text-white/75'}`}>
                            {HAND_INFO[hand].emoji} {dialect} <span className="text-white/40">=</span> {standard}
                          </span>
                        );
                      })
                      : finisherLine && (
                        <span className="text-[11px] md:text-xs font-black px-2.5 py-1 rounded-lg border-2 border-[#FFE600] bg-white/15 text-white">
                          {splitLine(finisherLine).dialect} <span className="text-white/40">=</span> {splitLine(finisherLine).standard}
                        </span>
                      )}
                  </div>
                </div>
              )}

              {/* 대결 종료 */}
              {phase === 'over' && winner && (
                <div className="text-center z-10 text-white flex flex-col gap-3 items-center justify-center py-2">
                  <span className="text-3xl md:text-4xl font-black text-[#FFF59D] drop-shadow-[2.5px_2.5px_0px_#000] animate-pulse">
                    {winner === 'player' ? '🏆 승리!' : '💥 패배...'}
                  </span>
                  <p className="text-white/70 text-xs md:text-sm font-bold -mt-1">
                    {winner === 'player'
                      ? `${josa(boss.name, '을', '를')} 물리쳤습니다! ${boss.hidden ? '숨겨진 보스까지 모두 정복했어요! 🎉' : nextBoss ? `다음 보스 ${nextBoss.region} ${josa(nextBoss.name, '이', '가')} 열렸어요.` : '마지막 지역 보스까지 물리쳤어요! 🎉'}${relaxedMode ? ' (여유 모드라 레벨은 오르지 않아요)' : ''}`
                      : `${boss.name}에게 졌습니다. 다시 도전해 보세요!`}
                  </p>
                  {hiddenAppeared && (
                    <p className="bg-gradient-to-r from-violet-600 to-indigo-700 text-white border-2 border-black rounded-xl px-4 py-1.5 text-sm md:text-base font-black shadow-[2px_2px_0px_#000] animate-bounce-subtle">
                      ✨ 숨겨진 보스, {josa(HIDDEN_BOSS.name, '이', '가')} 나타났어요!
                    </p>
                  )}
                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setShowReport(true)}
                      className="bg-[#00F0FF] text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-[#33f3ff]"
                    >
                      📊 결과 리포트 보기
                    </button>
                    {hiddenAppeared && (
                      <button
                        onClick={() => onChangeBoss(HIDDEN_BOSS.id)}
                        className="bg-violet-600 hover:bg-violet-700 text-white border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
                      >
                        ✨ {HIDDEN_BOSS.name} 도전
                      </button>
                    )}
                    {winner === 'player' ? null : (
                      <>
                        <button
                          onClick={onRestart}
                          className="bg-[#FFDE4D] text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-[#ffe775]"
                        >
                          🔁 재도전
                        </button>
                        {prevBoss && (
                          <button
                            onClick={() => onChangeBoss(prevBoss.id)}
                            className="bg-white text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-slate-100"
                          >
                            ⏮ 이전 보스 다시 하기 ({prevBoss.region})
                          </button>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => router.push('/dialect')}
                      className={`${winner === 'player' ? 'bg-[#FFDE4D] hover:bg-[#ffe775]' : 'bg-white hover:bg-slate-100'} text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer`}
                    >
                      🗺️ 보스 선택으로
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 우측 라운드 기록 (1단계 실시간 순위 자리) */}
          <div className="hidden lg:flex w-72 bg-[#BFF6C3] rounded-[24px] border-4 border-black p-3 text-black flex-col gap-2 overflow-hidden shadow-[4px_4px_0px_#000] max-h-[320px]">
            <h3 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1.5 flex flex-col gap-1">
              <div className="flex items-center gap-1.5"><span>📜 라운드 기록</span><span className="text-[8px] font-bold text-slate-500 normal-case">(최근 순)</span></div>
              <span className="text-[8px] font-bold text-indigo-700 block leading-none">※ 방언 = 표준어 풀이{boss.typeStandard ? ' (친 글자는 표준어)' : ''}</span>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {log.length === 0 ? (
                <p className="text-[11px] font-bold text-slate-600 text-center py-6">첫 라운드를 기다리는 중...</p>
              ) : (
                [...log].reverse().map(entry => {
                  const parts = entry.line ? splitLine(entry.line) : null;
                  return (
                    <div key={entry.round} className="p-2 rounded-none border-2 border-black bg-white shadow-[2px_2px_0px_#000]">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-black">R{entry.round} {entry.playerHand ? HAND_INFO[entry.playerHand].emoji : entry.result.startsWith('finisher') ? '🔥' : '⏰'}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border border-black ${RESULT_STYLE[entry.result].chip}`}>{RESULT_STYLE[entry.result].label}</span>
                      </div>
                      {parts ? (
                        <>
                          <p className="text-xs font-black leading-snug">{parts.dialect}</p>
                          <p className="text-[10px] font-bold text-slate-500 leading-snug">= {parts.standard}</p>
                        </>
                      ) : (
                        <p className="text-[10px] font-bold text-slate-500">카드를 끝까지 치지 못했어요</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 결과 리포트 모달 */}
        {phase === 'over' && winner && showReport && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-classroom-chalkboard rounded-[32px] border-[8px] border-black shadow-[12px_12px_0px_#000] p-5 md:p-6 flex flex-col justify-between relative animate-in zoom-in duration-300">
              <div className="absolute inset-0 opacity-10 bg-chalk-dust pointer-events-none"></div>

              <button
                onClick={() => setShowReport(false)}
                className="absolute top-4 right-4 bg-rose-500 hover:bg-rose-600 text-white w-8 h-8 rounded-full border-4 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer z-30 animate-bounce-subtle"
                title="닫기"
              >
                ✕
              </button>

              <div className="text-center mb-4 z-10">
                <h2 className="text-3xl font-black text-[#FFF59D] drop-shadow-[2.5px_2.5px_0px_#000] tracking-wider">{winner === 'player' ? '🏆 승리!' : '💥 패배...'}</h2>
                <p className="text-white text-[11px] opacity-80 mt-1 font-bold">{bossTitle(boss)} 대결 리포트</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10 mb-4">
                <div className="md:col-span-2 bg-[#FFDE4D] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1 mb-2">📊 종합 타이핑 스탯</span>
                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">평균 속도</span>
                      <span className="text-xl font-black text-indigo-600 leading-none">{calcCpm(stats)} <span className="text-[10px]">타/분</span></span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">최종 정확도</span>
                      <span className="text-xl font-black text-emerald-600 leading-none">{calcAccuracy(stats.correctChars, stats.backspace)}%</span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">무결점 성공</span>
                      <span className="text-xl font-black text-amber-600 leading-none">{stats.flawless}회</span>
                      <span className="text-[9px] font-bold text-slate-500 mt-1 leading-none">(지우기: {stats.backspace}회)</span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">진행 라운드</span>
                      <span className="text-xl font-black text-rose-600 leading-none">{round}라운드</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex-1 bg-[#FFB0B0] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col justify-between min-h-[75px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1.5">👑 대결 결과</span>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-2xl font-black text-slate-900 leading-none">{winner === 'player' ? '승리' : '패배'}</span>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#BFF6C3] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col justify-between min-h-[75px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1.5">❤️ 남은 체력</span>
                    <div className="flex-grow flex flex-col gap-1 justify-center px-1">
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="text-slate-600 text-[9px]">나:</span>
                        <span className="text-indigo-600 text-sm">{playerHp} / {R.playerHp}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="text-slate-600 text-[9px]">보스:</span>
                        <span className="text-rose-500 text-sm">{bossHp} / {boss.stats.hp}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 오늘 만난 방언 */}
              <div className="bg-white text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1 mb-1.5">📚 오늘 만난 {boss.typeStandard ? '지역' : boss.region} 방언</span>
                {learnedLines.length === 0 ? (
                  <p className="text-[11px] font-bold text-slate-600">이번 대결에서 끝까지 친 방언 문장이 없어요. 다시 도전해 보세요!</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {learnedLines.map(l => {
                      const { dialect, standard } = splitLine(l);
                      return (
                        <li key={l.text} className="text-[11px] font-bold text-slate-800 bg-slate-50 border-2 border-black rounded-lg px-2 py-1">
                          {boss.typeStandard && <span className="text-[9px] font-black text-slate-500 mr-1">[{l.region}]</span>}
                          <span className="font-black" style={{ color: boss.color.dark }}>{dialect}</span>{standard && ` = ${standard}`}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* 보스가 한 말 (이긴 뒤에만 뜻 공개) */}
              <div className="bg-white text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col z-10 mt-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1 mb-1.5">💬 {josa(boss.name, '이', '가')} 한 말</span>
                {showBossMeaning ? (
                  <ul className="flex flex-col gap-1.5">
                    {heardLines.map(l => {
                      const { dialect, standard } = splitLine(l);
                      return (
                        <li key={l.text} className="text-[11px] font-bold text-slate-800 bg-slate-50 border-2 border-black rounded-lg px-2 py-1">
                          <span className="font-black" style={{ color: boss.color.dark }}>{dialect}</span>{standard && ` = ${standard}`}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-[11px] font-bold text-slate-600">🔒 {josa(boss.name, '을', '를')} 이기면 보스 대사의 뜻이 공개돼요!</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 대결 무대 (1단계 트랙 자리): 학생 vs 보스, 체력바, 말풍선 */}
        <div className={`bg-white p-3 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden relative transition-all duration-300 w-full flex-1 min-h-[260px] ${shake === 'player' ? 'animate-battle-shake' : ''}`}>
          <div
            className="flex-1 rounded-2xl border-2 border-black relative overflow-hidden shadow-inner"
            style={{ background: `linear-gradient(120deg, #F1F5F9 0%, #F8FAFC 45%, ${boss.color.light} 100%)` }}
          >
            {/* 지역 배경 그림 (public/backgrounds/bg-지역.webp) */}
            <RegionBackdrop region={boss.backdrop ?? boss.id} />

            {/* 내가 친 카드 (엔터로 확정한 뒤 ~ 피해가 들어갈 때까지), 무대 가운데 위쪽에 크게 */}
            <div className={`absolute inset-0 mx-auto max-w-5xl grid grid-cols-[1fr_auto_1fr] items-end gap-3 md:gap-8 px-4 md:px-10 ${tightStage ? 'pb-2 pt-1' : 'pb-3 pt-2'}`}>
              {/* 학생 */}
              <div className={`flex flex-col items-center relative min-w-0 ${tightStage ? 'gap-1' : 'gap-2'}`}>
                {/* 내가 친 카드: 보스 말풍선처럼 내 캐릭터 위에 (엔터로 확정한 뒤 ~ 피해가 들어갈 때까지) */}
                {picked && (phase === 'shoot' || phase === 'reveal') && (
                  <div className={`relative w-full max-w-[420px] bg-white border-4 border-black rounded-2xl px-4 md:px-6 shadow-[3px_3px_0px_#000] text-center flex flex-col items-center animate-shout-pop ${tightStage ? 'py-1 gap-0' : compactStage ? 'py-1.5 gap-0.5' : 'py-2.5 md:py-3 gap-1'}`}>
                    {/* 아주 낮은 창에서는 "내가 친 카드" 줄을 빼고 손 모양만 문장 앞에 붙여 높이를 줄임 */}
                    {!tightStage && (
                      <p className="text-[11px] md:text-sm font-black text-slate-500 leading-none">
                        {picked.hand ? `${HAND_INFO[picked.hand].emoji} 내가 친 카드` : '🔥 내가 친 필살 문장'}
                      </p>
                    )}
                    <p className={`font-black leading-tight break-keep ${compactStage ? 'text-lg md:text-xl' : 'text-lg md:text-2xl'}`} style={{ color: boss.color.dark }}>
                      {tightStage && <span className="mr-1">{picked.hand ? HAND_INFO[picked.hand].emoji : '🔥'}</span>}
                      {splitLine(picked.line).dialect}
                    </p>
                    <p className={`font-bold text-slate-600 leading-snug break-keep ${compactStage ? 'text-xs md:text-sm' : 'text-xs md:text-base'}`}>= {splitLine(picked.line).standard}</p>
                    <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-black" />
                    <span className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white" />
                  </div>
                )}
                <div className={`relative ${tightStage ? 'mt-3' : 'mt-4'}`}>
                  {phase === 'reveal' && outcome && (outcome.damageToPlayer > 0 || outcome.shielded) && (
                    <span key={`p-dmg-${round}`} className="absolute left-1/2 top-0 text-2xl md:text-4xl font-black text-rose-600 drop-shadow-[2px_2px_0px_#000] animate-damage-float pointer-events-none z-20 whitespace-nowrap">
                      {outcome.shielded ? '🛡️ 막음!' : `-${outcome.damageToPlayer}`}
                    </span>
                  )}
                  {/* 발밑 받침 */}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-5 rounded-[50%] border-2 border-black/25 bg-white/80" style={{ width: stageCharSize * 1.25 }} />
                  <div className="relative"><PlayerCharacter skin={profile.skin} size={stageCharSize} mood={playerMood} /></div>
                </div>
                <div className="w-full max-w-[280px]">
                  <HpBar label={profile.nickname === '나' ? '나' : `${profile.nickname} (나)`} hp={playerHp} maxHp={R.playerHp} />
                </div>
              </div>

              {/* 가운데: VS, 필살 게이지, 방패 */}
              <div className="flex flex-col items-center gap-2 pb-6">
                <span className="text-3xl md:text-5xl font-black italic text-slate-300 select-none">VS</span>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[9px] md:text-[10px] font-black text-slate-500 whitespace-nowrap">🔥 필살 게이지</span>
                  <div className="flex gap-1">
                    {Array.from({ length: R.gaugeMax }).map((_, i) => (
                      <span key={i} className={`w-4 h-4 md:w-5 md:h-5 rounded-full border-2 border-black transition-colors ${i < gauge ? 'bg-rose-500' : 'bg-white'} ${gauge >= R.gaugeMax ? 'animate-pulse' : ''}`} />
                    ))}
                  </div>
                  {gauge >= R.gaugeMax && phase !== 'finisher' && phase !== 'over' && (
                    <span className="text-[9px] font-black text-rose-600 animate-bounce-subtle whitespace-nowrap">다음 라운드 필살기!</span>
                  )}
                </div>
                {shieldOption && (
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={`text-xl ${shield > 0 ? '' : 'grayscale opacity-40'}`}>🛡️</span>
                    <span className="text-[9px] font-black text-slate-500 whitespace-nowrap">{shield > 0 ? '방패 준비!' : `충전 ${shieldProgress}/${R.shieldEvery}`}</span>
                  </div>
                )}
              </div>

              {/* 보스 */}
              <div className={`flex flex-col items-center relative min-w-0 ${tightStage ? 'gap-1' : 'gap-2'}`}>
                <SpeechBubble key={bubbleKey} line={bubble} color={boss.color.dark} showStandard={showBossMeaning} compact={compactStage} />
                <div className={`relative ${tightStage ? 'mt-3' : 'mt-4'} ${shake === 'boss' ? 'animate-battle-shake' : ''}`}>
                  {phase === 'reveal' && outcome && outcome.damageToBoss > 0 && (
                    <span key={`b-dmg-${round}`} className="absolute left-1/2 top-0 text-2xl md:text-4xl font-black text-rose-600 drop-shadow-[2px_2px_0px_#000] animate-damage-float pointer-events-none z-20 whitespace-nowrap">
                      -{outcome.damageToBoss}
                    </span>
                  )}
                  <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 h-5 rounded-[50%] border-2 border-black/25" style={{ width: stageCharSize * 1.3, backgroundColor: boss.color.light }} />
                  <div className="relative"><BossAvatar boss={boss} mood={bossMood} size={Math.round(stageCharSize * 1.08)} /></div>
                </div>
                <div className="w-full max-w-[280px]">
                  <HpBar label={boss.hidden ? boss.name : `${boss.region} · ${boss.name}`} hp={bossHp} maxHp={boss.stats.hp} align="right" />
                </div>
              </div>
            </div>

            {/* 마지막 일격 연출 */}
            {phase === 'reveal' && outcome?.isFinalBlow && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="absolute inset-0 bg-white animate-ko-flash" />
                <span className="relative text-5xl md:text-7xl font-black italic text-rose-600 drop-shadow-[4px_4px_0px_#000] animate-shout-pop">
                  {bossHp === 0 ? '격파!' : '쓰러졌다!'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
