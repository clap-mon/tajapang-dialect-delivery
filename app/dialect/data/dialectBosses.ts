/**
 * 방언 타자 대결 데이터 (5개 지역 검토 완료)
 *
 * 검수 상태 (각 항목의 review 필드)
 * - REVIEW_NOTE   : 우리말샘 방언 표제어로 검수 필요 (새로 추가하는 항목의 기본값)
 * - JEJU_VERIFIED : 국립국어원 우리말샘 + 제주어모바일사전(제주어교육연구소, jejudic.kr)으로 핵심 낱말 확인 (어미 -우다·-게는 지역어 종합 정보 구술발화 자료)
 * - CHUNG_VERIFIED: 국립국어원 우리말샘(충청 지역 표시) + 지역어 종합 정보(-유·-쥬·-두 어미 등 구술발화 자료)로 확인, 내비두다는 온라인가나다 답변 참고
 * - JEOLLA_VERIFIED: 국립국어원 우리말샘 + 지역어 종합 정보(어휘·구술발화 조사 자료, 문학 속 지역어)로 확인 (-불랑께는 전남 신안 구술 자료)
 * - GYEONG_VERIFIED: 국립국어원 우리말샘 + 지역어 종합 정보로 확인 ('욕보다'는 경상 방언이지만 표준어 뜻을 고려해 쓰지 않음)
 * - GANG_VERIFIED : 국립국어원 우리말샘 + 지역어 종합 정보로 확인 ('-드래요'는 강원 구술발화 자료의 간접 근거)
 * - 진행: 5개 지역(제주·충청·전라·경상·강원) 검토 완료
 * - 형식: "방언 - 표준어" (' - ' 앞이 방언, 뒤가 표준어 풀이)
 * - 카드 문장과 필살 문장 모두 방언 부분만 치고, 표준어 풀이는 화면에 뜻으로만 보여 줍니다.
 * - 두벌식 키보드로 칠 수 없는 옛 자모(아래아 등)는 쓰지 않습니다.
 * - 지역을 비하하거나 놀리는 표현은 쓰지 않고, 장난스러운 수준까지만 씁니다.
 */

export const REVIEW_NOTE = '우리말샘 방언 표제어로 검수 필요';
export const JEJU_VERIFIED = '우리말샘·제주어사전 확인';
export const CHUNG_VERIFIED = '우리말샘·지역어 종합 정보 확인';
export const JEOLLA_VERIFIED = '우리말샘·지역어 종합 정보 확인';
export const GYEONG_VERIFIED = '우리말샘·지역어 종합 정보 확인';
export const GANG_VERIFIED = '우리말샘·지역어 종합 정보 확인';

// 방언 검토 자료 (사용 안내 '방언 출처 및 검토처'에 표시)
export const DIALECT_SOURCES = [
  { id: 'opendict', name: '국립국어원 우리말샘', url: 'https://opendict.korean.go.kr', desc: '방언 표제어의 지역 표시와 뜻' },
  { id: 'dialect', name: '국립국어원 지역어 종합 정보', url: 'https://dialect.korean.go.kr/dialect/', desc: '어미와 말투를 구술 발화 조사 자료로 확인' },
  { id: 'jejudic', name: '제주어모바일사전 (제주어교육연구소)', url: 'http://jejudic.kr', desc: '제주어 낱말 확인' },
  { id: 'qna', name: '국립국어원 온라인가나다', url: 'https://korean.go.kr/front/onlineQna/onlineQnaList.do?mn_id=216', desc: '표준어와 방언 쓰임 질의응답 참고' },
] as const;

export type DialectSourceId = (typeof DIALECT_SOURCES)[number]['id'];

// 지역별 실제 검토 내용 (대표 예시만, 전체 목록은 지역별 검토표에 기록)
export const DIALECT_REVIEWS: { region: string; sources: DialectSourceId[]; note: string }[] = [
  { region: '제주', sources: ['opendict', 'jejudic', 'dialect'], note: '핵심 낱말(하영, 몬딱, 지슬, 오름 등)은 사전으로, 어미 ‘-우다·-게’는 구술 자료로 확인' },
  { region: '충청', sources: ['opendict', 'dialect', 'qna'], note: '증말·어여·쪼매 등 충청 표시 낱말, ‘-유·-쥬·-두’는 구술 자료(충남 공주 등), ‘내비두다’는 온라인가나다 답변 참고' },
  { region: '전라', sources: ['opendict', 'dialect'], note: '솔찬히·싸게싸게·거그, 어미 ‘-당께·-랑께’, ‘-불랑께(=버릴 테니까)’는 전남 신안 구술 자료로 확인' },
  { region: '경상', sources: ['opendict', 'dialect', 'qna'], note: '단디·어데 등 확인, ‘욕보다’는 표준어 뜻(혼나다)과 헷갈려 쓰지 않음(온라인가나다 답변 참고)' },
  { region: '강원', sources: ['opendict', 'dialect'], note: '마카·감재·올개 등 확인, ‘-드래요’는 강원 구술 자료로 확인' },
];

export type Hand = 'scissors' | 'rock' | 'paper';

export type BossId = 'jeju' | 'chungcheong' | 'jeolla' | 'gyeongsang' | 'gangwon' | 'standard';

// 방언 한 줄 ("방언 - 표준어") + 지역 태그 + 검수 표시
export interface DialectLine {
  text: string;
  region: string;
  review: string;
}

export interface DialectBoss {
  id: BossId;
  order: number; // 1부터 시작, 이 순서대로 해금
  region: string;
  name: string;
  concept: string; // 보스 고르기 카드 소개 (\n 자리에서 줄바꿈)
  accessory: string; // 보스 머리 위 소품 이모지 (helmet·gat·cheomseongdae·snowpeak·mortarboard는 BossAccessory에서 직접 그림)
  color: { main: string; light: string; dark: string };
  stats: {
    hp: number;
    timeLimit: number; // 카드 라운드 제한시간(초)
    cpm: number; // 비김 판정용 보스 가상 타수 (LV1 기준, 이길 때마다 다음 도전에서 levelCpmStep씩 오름)
    attack: number; // 학생이 졌을 때 받는 피해
  };
  intro: DialectLine;
  defeated: DialectLine; // 보스가 쓰러질 때 대사
  cards: Record<Hand, DialectLine[]>;
  finishers: DialectLine[];
  practiceExtras?: DialectLine[]; // 개인 연습 꾸러미에만 쓰는 추가 문장 (대결 카드 수는 그대로)
  hidden?: boolean; // 숨겨진 보스 (다섯 지역 보스를 모두 이기면 나타남, 보스 카드 목록에는 없음)
  typeStandard?: boolean; // 방언 카드를 보여 주고 표준어 풀이를 치는 방식
  stage?: string; // 숨겨진 스테이지 이름
  backdrop?: string; // 배경 그림 이름 (없으면 id, public/backgrounds/bg-이름.webp)
  reactions: {
    hurt: DialectLine[]; // 학생이 이겼을 때 (보스가 맞음)
    taunt: DialectLine[]; // 학생이 졌을 때 (보스가 때림)
    draw: DialectLine[]; // 비겼을 때
  };
}

// 공통 대결 수치 (밸런스 조정은 여기서)
export const BATTLE_RULES = {
  playerHp: 120, // 한 판이 10라운드 안팎이 되도록 보스 체력과 함께 조정
  baseDamage: 20, // 승리 기본 피해
  timeBonusRate: 0.25, // 남은 시간 비율 × 0.25 (일반 승리 최대 28, 필살기가 확실히 크게 느껴지도록)
  flawlessBonusRate: 0.15, // 무결점이면 +0.15
  drawDamage: 8, // 비김 시 더 빨리 친 쪽이 주는 피해
  gaugeMax: 3, // 무결점 문장 3개로 필살 게이지 완충
  finisherTimeLimit: 25, // 필살 문장이 최대 19자(표준어 박사 23자)라, 보통 학생(180타 안팎)도 대부분 성공하도록 (모의 대결 2026-11-06)
  relaxedBonusSec: 5, // 여유 모드에서 늘어나는 제한시간(초)
  finisherHpRate: 1 / 3, // 필살기 피해 = 보스 체력의 1/3 (5 단위 반올림, 일반 승리 피해보다 확실히 크게)
  shieldEvery: 2, // (옵션) 무결점 2번마다 방패 1개, 최대 1개
  levelCpmStep: 50, // 같은 보스를 이길 때마다 다음 도전의 보스 타수 증가량
  maxLevel: 5, // 보스 LV 상한 (LV5 = +200타)
};

// 그 보스를 이긴 횟수로 이번 도전의 LV 계산 (1부터, 상한 maxLevel)
export const bossLevel = (clears: number) => Math.min(BATTLE_RULES.maxLevel, 1 + Math.max(0, clears));

// 보스별 필살기 피해 (체력의 finisherHpRate, 5 단위 반올림: 제주 40 ~ 강원·표준어 박사 55)
export const finisherDamageFor = (boss: DialectBoss) => Math.round((boss.stats.hp * BATTLE_RULES.finisherHpRate) / 5) * 5;

// LV이 반영된 보스 가상 타수
export const bossCpmAtLevel = (boss: DialectBoss, level: number) => boss.stats.cpm + (level - 1) * BATTLE_RULES.levelCpmStep;

// 보스가 문장 하나를 치는 데 걸리는 가상 시간(초)
// 개인 연습 AI봇과 같은 방식: 1초마다 리듬(0.85~1.15배)이 흔들리고, 문장 첫머리에서는 머뭇거림(60% 확률로 한 박자 쉼)
export const simulateBossSeconds = (charCount: number, cpm: number) => {
  const totalStrokes = Math.max(1, charCount * 3); // 한 글자 = 3타 (학생·봇과 같은 기준)
  let typed = 0;
  let seconds = 0;
  while (typed < totalStrokes && seconds < 120) {
    if (typed === 0 && Math.random() > 0.4) {
      seconds += 1;
      continue;
    }
    const step = (cpm * (0.85 + Math.random() * 0.3)) / 60;
    if (typed + step >= totalStrokes) return seconds + (totalStrokes - typed) / step;
    typed += step;
    seconds += 1;
  }
  return seconds;
};

export const HAND_INFO: Record<Hand, { label: string; emoji: string }> = {
  scissors: { label: '가위', emoji: '✌️' },
  rock: { label: '바위', emoji: '✊' },
  paper: { label: '보', emoji: '🖐️' },
};

// 이기는 손: key가 value를 이김
export const BEATS: Record<Hand, Hand> = {
  scissors: 'paper',
  rock: 'scissors',
  paper: 'rock',
};

// 지역 태그 + 검수 표시를 붙여 주는 도우미
const line = (region: string, review = REVIEW_NOTE) => (text: string): DialectLine => ({ text, region, review });
const jeju = line('제주', JEJU_VERIFIED); // 제주: 검토 완료
const chung = line('충청', CHUNG_VERIFIED); // 충청: 검토 완료
const jeolla = line('전라', JEOLLA_VERIFIED); // 전라: 검토 완료
const gyeong = line('경상', GYEONG_VERIFIED); // 경상: 검토 완료
const gang = line('강원', GANG_VERIFIED); // 강원: 검토 완료

export const DIALECT_BOSSES: DialectBoss[] = [
  // ───────────────────────── 1. 제주 (우리말샘·제주어사전 확인) ─────────────────────────
  {
    id: 'jeju',
    order: 1,
    region: '제주',
    name: '돌하르방 대장',
    concept: '감귤 밭을 지키는 듬직한 돌하르방.\n느긋하지만 손이 맵다.',
    accessory: '🍊',
    color: { main: '#F97316', light: '#FFEDD5', dark: '#9A3412' },
    stats: { hp: 120, timeLimit: 15, cpm: 80, attack: 15 },
    intro: jeju('혼저 옵서예! 하르방이 기다렸수다 - 어서 오세요! 할아버지가 기다렸습니다'),
    defeated: jeju('폭삭 속았수다! 잘 쳤수다 - 수고 많으셨습니다! 잘 쳤습니다'),
    cards: {
      scissors: [
        jeju('혼저 옵서예 - 어서 오세요'),
        jeju('폭삭 속았수다 - 수고 많으셨습니다'),
        jeju('바당 보래 가게 - 바다 보러 가자'),
        jeju('아이고 아꼽다 - 아이고 귀엽다'),
        jeju('감저 쪄 먹게 - 고구마 쪄 먹자'),
        jeju('놀멍 쉬멍 - 놀면서 쉬면서'),
      ],
      rock: [
        jeju('하영 고맙수다 - 많이 고맙습니다'),
        jeju('몬딱 먹엉 갑서 - 모두 먹고 가세요'),
        jeju('와리지 맙서 - 서두르지 마세요'),
        jeju('재기재기 옵서 - 빨리빨리 오세요'),
        jeju('지슬 하영 있수다 - 감자 많이 있습니다'),
        jeju('속솜허영 이시라 - 조용히 하고 있어라'),
      ],
      paper: [
        jeju('맨도롱 또똣허다 - 알맞게 따뜻하다'),
        jeju('강 봥 옵서 - 가서 보고 오세요'),
        jeju('우영팟디 가게 - 텃밭에 가자'),
        jeju('어드레 감수과 - 어디로 가세요'),
        jeju('할망 집이 감수다 - 할머니 집에 갑니다'),
        jeju('도르멍 오라 - 달려서 와라'),
      ],
    },
    practiceExtras: [jeju('오름에 올라 보게 - 산봉우리에 올라 보자')],
    finishers: [
      jeju('폭삭 속았수다 하영 고맙수다 - 수고 많으셨습니다 많이 고맙습니다'),
      jeju('놀멍 쉬멍 바당 보래 가게 - 놀면서 쉬면서 바다 보러 가자'),
      jeju('맨도롱 또똣헐 때 혼저 먹읍서 - 따뜻할 때 어서 드세요'),
    ],
    reactions: {
      hurt: [
        jeju('아이고게, 아프우다! - 아이고, 아픕니다!'),
        jeju('요거 보통 아니우다! - 이거 보통이 아닙니다!'),
      ],
      taunt: [
        jeju('와리지 말앙 촌촌히 허라! - 서두르지 말고 차근차근 해라!'),
        jeju('하르방 손이 맵수다! - 할아버지 손이 맵습니다!'),
      ],
      draw: [
        jeju('어떵 허코? 똑같수다! - 어떻게 할까? 똑같습니다!'),
        jeju('경허난 비겼수다 - 그러니까 비겼습니다'),
      ],
    },
  },
  // ───────────────────────── 2. 충청 (우리말샘·지역어 종합 정보 확인) ─────────────────────────
  {
    id: 'chungcheong',
    order: 2,
    region: '충청',
    name: '호두 장군',
    concept: '호두과자를 사랑하는 마음씨 좋은 장군.\n웃으면서 매섭게 겨룬다.',
    accessory: 'helmet', // 호두 장식 장군 투구 (BossAccessory에서 그림)
    color: { main: '#A16207', light: '#FEF3C7', dark: '#713F12' },
    stats: { hp: 130, timeLimit: 15, cpm: 100, attack: 17 },
    intro: chung('어여 와유! 호두 장군이 기둘렸슈 - 어서 와요! 호두 장군이 기다렸어요'),
    defeated: chung('졌슈, 증말 잘 치네유! - 졌어요, 정말 잘 치네요!'),
    cards: {
      scissors: [
        chung('그려유 알았슈 - 그래요 알았어요'),
        chung('어여 와유 - 어서 와요'),
        chung('쪼매만 기둘려유 - 조금만 기다려요'),
        chung('기둘리지 마유 - 기다리지 마요'),
        chung('증말 고마워유 - 정말 고마워요'),
        chung('밥 먹었슈 - 밥 먹었어요'),
      ],
      rock: [
        chung('다 괜찮아유 - 다 괜찮아요'),
        chung('뭐 허는 겨 - 뭐 하는 거야'),
        chung('어여 먹어유 - 어서 먹어요'),
        chung('증말 맛있슈 - 정말 맛있어요'),
        chung('해 넘어가유 - 해가 넘어가요'),
        chung('쪼매 남았슈 - 조금 남았어요'),
      ],
      paper: [
        chung('워디 가유 - 어디 가요'),
        chung('가만 내비둬유 - 가만 놓아둬요'),
        chung('왜 그랴유 - 왜 그래요'),
        chung('근디 말여유 - 그런데 말이에요'),
        chung('이리 와 봐유 - 이리 와 봐요'),
        chung('날이 덥쥬 - 날이 덥지요'),
      ],
    },
    practiceExtras: [chung('어데 갔다 왔슈 - 어디 갔다 왔어요')],
    finishers: [
      chung('쪼매만 기둘려유 금방 가유 - 조금만 기다려요 금방 가요'),
      chung('쪼매 힘들어두 끝까지 해 봐유 - 조금 힘들어도 끝까지 해 봐요'),
      chung('호두과자 먹고 힘내유 - 호두과자 먹고 힘내요'),
    ],
    reactions: {
      hurt: [
        chung('아이구, 아퍼유! - 아이고, 아파요!'),
        chung('아이구, 증말 매섭네유! - 아이고, 정말 매섭네요!'),
      ],
      taunt: [
        chung('어뗘유, 맵쥬? - 어때요, 맵지요?'),
        chung('그렇게 허는 거 아녀유 - 그렇게 하는 거 아니에요'),
      ],
      draw: [
        chung('어라, 똑같구먼유 - 어라, 똑같네요'),
        chung('비겼슈, 한 번 더 혀유 - 비겼어요, 한 번 더 해요'),
      ],
    },
  },
  // ───────────────────────── 3. 전라 (우리말샘·지역어 종합 정보 확인) ─────────────────────────
  {
    id: 'jeolla',
    order: 3,
    region: '전라',
    name: '비빔 대감',
    concept: '전주비빔밥처럼 갖은 재료를 척척 비비는\n흥 많은 대감. 기세가 대단하다.',
    accessory: 'gat', // 대감에 어울리는 갓 (이모지에 없어 BossAccessory에서 그림)
    color: { main: '#16A34A', light: '#DCFCE7', dark: '#14532D' },
    stats: { hp: 140, timeLimit: 14, cpm: 120, attack: 19 },
    intro: jeolla('어서 오랑께! 비빔 대감 나가신다 - 어서 오라니까! 비빔 대감 나가신다'),
    defeated: jeolla('워메, 내가 져부렀네! 솔찬히 잘하네잉 - 어머, 내가 져 버렸네! 상당히 잘하네'),
    cards: {
      scissors: [
        jeolla('솔찬히 좋네잉 - 상당히 좋네'),
        jeolla('아따 맛있어부러 - 아 맛있다'),
        jeolla('쪼까 기다려잉 - 조금 기다려'),
        jeolla('싸게싸게 와부러 - 빨리빨리 와'),
        jeolla('내가 해불랑께 - 내가 해 버릴 테니까'),
        jeolla('귀경 가세잉 - 구경 가자'),
      ],
      rock: [
        jeolla('솔찬히 많다잉 - 상당히 많다'),
        jeolla('아따 잘한당께 - 아 잘한다니까'),
        jeolla('그라제 그라제 - 그렇지 그렇지'),
        jeolla('오매 이쁜 거 - 어머 예쁜 것'),
        jeolla('솔찬히 덥다잉 - 상당히 덥다'),
        jeolla('놀다 가잉 - 놀다 가'),
      ],
      paper: [
        jeolla('겁나게 맛나다 - 매우 맛있다'),
        jeolla('뭣 허러 왔어잉 - 무엇 하러 왔어'),
        jeolla('우리 집이 가세 - 우리 집에 가자'),
        jeolla('시방 뭐 하냐 - 지금 뭐 하니'),
        jeolla('워메 놀래부렀네 - 어머 놀랐네'),
        jeolla('비빔밥 맛나당께 - 비빔밥 맛있다니까'),
      ],
    },
    practiceExtras: [jeolla('거그 가지 마랑께 - 거기 가지 말라니까')],
    finishers: [
      jeolla('아따 겁나게 잘 쳐부렀네잉 - 아 매우 잘 쳐 버렸네'),
      jeolla('싸게싸게 쳐야 이기제잉 - 빨리빨리 쳐야 이기지'),
      jeolla('비빔밥 한 그릇 싸게싸게 비벼불랑께 - 비빔밥 한 그릇 빨리빨리 비벼 버릴 테니까'),
    ],
    reactions: {
      hurt: [
        jeolla('워메, 아프당께! - 어머, 아프다니까!'),
        jeolla('워메, 손이 맵당께! - 어머, 손이 맵다니까!'),
      ],
      taunt: [
        jeolla('아따, 쪼까 더 연습허랑께 - 아, 조금 더 연습하라니까'),
        jeolla('그라제, 내가 이겼제 - 그렇지, 내가 이겼지'),
      ],
      draw: [
        jeolla('똑같당께, 한 번 더 혀 - 똑같다니까, 한 번 더 해'),
        jeolla('아따, 비겨부렀네 - 아, 비겨 버렸네'),
      ],
    },
  },
  // ───────────────────────── 4. 경상 (우리말샘·지역어 종합 정보 확인) ─────────────────────────
  {
    id: 'gyeongsang',
    order: 4,
    region: '경상',
    name: '첨성대 박사',
    concept: '밤하늘 별을 세며 수를 읽는 박사.\n셈도 빠르고 손도 빠르다.',
    accessory: 'cheomseongdae', // 작은 첨성대 (BossAccessory에서 그림)
    color: { main: '#2563EB', light: '#DBEAFE', dark: '#1E3A8A' },
    stats: { hp: 150, timeLimit: 13, cpm: 150, attack: 21 },
    intro: gyeong('퍼뜩 와라! 첨성대 박사가 기다렸데이 - 빨리 와라! 첨성대 박사가 기다렸다'),
    defeated: gyeong('졌다 마, 니 억수로 잘하네! - 졌다, 너 대단히 잘하네!'),
    cards: {
      scissors: [
        gyeong('니 머라카노 - 너 뭐라고 하니'),
        gyeong('단디 해라 - 제대로 해라'),
        gyeong('와 이라노 - 왜 이러니'),
        gyeong('밥 묵었나 - 밥 먹었니'),
        gyeong('억수로 좋다 - 대단히 좋다'),
        gyeong('퍼뜩 와라 - 빨리 와라'),
      ],
      rock: [
        gyeong('이거 우짜노 - 이거 어떻게 하니'),
        gyeong('고마 해라 - 그만 해라'),
        gyeong('와 그라노 - 왜 그러니'),
        gyeong('쪼매만 기다리라 - 조금만 기다려라'),
        gyeong('정구지 지짐 묵자 - 부추전 먹자'),
        gyeong('마이 묵었데이 - 많이 먹었다'),
      ],
      paper: [
        gyeong('그기 아이다 - 그게 아니다'),
        gyeong('인자 됐나 - 이제 됐니'),
        gyeong('할매 보고 싶데이 - 할머니 보고 싶다'),
        gyeong('내캉 니캉 - 나랑 너랑'),
        gyeong('지금 뭐 하노 - 지금 뭐 하니'),
        gyeong('디기 덥데이 - 되게 덥다'),
      ],
    },
    practiceExtras: [gyeong('니 어데 가노 - 너 어디 가니')],
    finishers: [
      gyeong('단디 해라 끝까지 퍼뜩 해 보자 - 제대로 해라 끝까지 빨리 해 보자'),
      gyeong('내캉 니캉 끝까지 한판 붙어 보자 - 나랑 너랑 끝까지 한판 붙어 보자'),
      gyeong('억수로 잘 치네 니 진짜 대단하데이 - 대단히 잘 치네 너 정말 대단하다'),
    ],
    reactions: {
      hurt: [
        gyeong('아이고 마, 아프데이! - 아이고, 아프다!'),
        gyeong('와, 니 쫌 치네! - 와, 너 좀 치네!'),
      ],
      taunt: [
        gyeong('봐라, 단디 하라 캤제 - 봐라, 제대로 하라고 했지'),
        gyeong('단디 한 번 더 해 봐라 - 제대로 한 번 더 해 봐라'),
      ],
      draw: [
        gyeong('머꼬, 똑같네 - 뭐야, 똑같네'),
        gyeong('한 판 더 하자 마 - 한 판 더 하자'),
      ],
    },
  },
  // ───────────────────────── 5. 강원 (우리말샘·지역어 종합 정보 확인) ─────────────────────────
  {
    id: 'gangwon',
    order: 5,
    region: '강원',
    name: '설악 산신령',
    concept: '눈 덮인 설악산을 지키는 산신령.\n마지막 관문답게 가장 빠르다.',
    accessory: 'snowpeak', // 눈 덮인 설악 봉우리 (BossAccessory에서 그림)
    color: { main: '#0D9488', light: '#CCFBF1', dark: '#134E4A' },
    stats: { hp: 160, timeLimit: 12, cpm: 180, attack: 23 },
    intro: gang('날래 오우! 설악 산신령이 기다렸드래요 - 빨리 와요! 설악 산신령이 기다렸대요'),
    defeated: gang('졌드래요! 마카 대단하오 - 졌대요! 모두 대단해요'),
    cards: {
      scissors: [
        gang('마카 오너라 - 모두 오너라'),
        gang('그랬드래요 - 그랬대요'),
        gang('우트게 할라나 - 어떻게 하려나'),
        gang('날래 가자 - 빨리 가자'),
        gang('정지에 있소 - 부엌에 있어요'),
        gang('부루쌈 싸 먹자 - 상추쌈 싸 먹자'),
      ],
      rock: [
        gang('부루 뜯었소 - 상추 뜯었어요'),
        gang('강냉이 쪄 먹자 - 옥수수 쪄 먹자'),
        gang('어데 가우 - 어디 가요'),
        gang('눈이 마이 왔소 - 눈이 많이 왔어요'),
        gang('지렁 좀 주우 - 간장 좀 주세요'),
        gang('밥 마이 먹었소 - 밥 많이 먹었어요'),
      ],
      paper: [
        gang('감재 삶아 먹자 - 감자 삶아 먹자'),
        gang('마카 모였소 - 모두 모였어요'),
        gang('오야 알았소 - 응 알았어요'),
        gang('손님 왔드래요 - 손님 왔대요'),
        gang('추웠드래요 - 추웠대요'),
        gang('기래 맞아 - 그래 맞아'),
      ],
    },
    practiceExtras: [gang('올개 감재 농사 잘됐소 - 올해 감자 농사 잘됐어요')],
    finishers: [
      gang('마카 모여 설악산 구경 가드래요 - 모두 모여 설악산 구경 간대요'),
      gang('강냉이 쪄 놨으니 날래 와서 먹소 - 옥수수 쪄 놨으니 빨리 와서 먹어요'),
      gang('눈이 마이 와도 끝까지 치드래요 - 눈이 많이 와도 끝까지 친대요'),
    ],
    reactions: {
      hurt: [
        gang('아이고야, 아프드래요! - 아이고, 아프대요!'),
        gang('우트게 이래 잘 치나 - 어떻게 이렇게 잘 치니'),
      ],
      taunt: [
        gang('기래, 아직 멀었소 - 그래, 아직 멀었어요'),
        gang('산신령은 안 지드래요 - 산신령은 안 진대요'),
      ],
      draw: [
        gang('똑같드래요! - 똑같대요!'),
        gang('기래, 한 번 더 하우 - 그래, 한 번 더 해요'),
      ],
    },
  },
];

// "방언 - 표준어" 분리
export const splitLine = (l: DialectLine) => {
  const idx = l.text.indexOf(' - ');
  if (idx === -1) return { dialect: l.text, standard: '' };
  return { dialect: l.text.slice(0, idx), standard: l.text.slice(idx + 3) };
};

// ───────────────────────── 숨겨진 보스: 표준어 광장의 표준어 박사 ─────────────────────────
// 서울·경기를 지역 보스로 두지 않고, 전국이 함께 쓰는 공통말(표준어) 무대로 만듦
// 카드는 다섯 지역 카드에서 뽑고(지역 표시 그대로), 학생은 방언을 보고 표준어 풀이를 침
const std = line('표준어', '표준어 문장');
// 칠 표준어에 문장부호가 있거나 너무 긴 카드는 빼고, 같은 표준어는 한 장만
const STANDARD_CARD_MAX = 12;
const standardCards = (hand: Hand) => {
  const seen = new Set<string>();
  return DIALECT_BOSSES.flatMap(b => b.cards[hand]).filter(l => {
    const { standard } = splitLine(l);
    if (!standard || /[,.!?]/.test(standard) || standard.length > STANDARD_CARD_MAX || seen.has(standard)) return false;
    seen.add(standard);
    return true;
  });
};

export const HIDDEN_BOSS: DialectBoss = {
  id: 'standard',
  order: 6,
  region: '표준어',
  name: '표준어 박사',
  stage: '표준어 광장',
  concept: '전국 친구들이 다 알아듣는 공통말을 아는 박사.\n다섯 지역 말을 모두 알아야 이길 수 있다.',
  accessory: 'mortarboard', // 학사모 (BossAccessory에서 그림)
  color: { main: '#6D28D9', light: '#EDE9FE', dark: '#312E81' },
  hidden: true,
  typeStandard: true,
  backdrop: 'seoul',
  stats: { hp: 170, timeLimit: 15, cpm: 200, attack: 23 },
  intro: std('다섯 지역 말을 모두 만나고 왔군요! 이번엔 표준어로 겨뤄 볼까요?'),
  defeated: std('정말 대단해요! 방언도 표준어도 모두 소중한 우리말이에요!'),
  cards: { scissors: standardCards('scissors'), rock: standardCards('rock'), paper: standardCards('paper') },
  finishers: DIALECT_BOSSES.flatMap(b => b.finishers),
  reactions: {
    hurt: [std('앗, 정말 빠르네요!'), std('와, 뜻을 다 알고 있군요!')],
    taunt: [std('천천히 또박또박 쳐 봐요!'), std('이번 판은 제가 이겼네요!')],
    draw: [std('어머, 똑같네요!'), std('비겼어요! 한 번 더 해요!')],
  },
};

export const ALL_BOSSES: DialectBoss[] = [...DIALECT_BOSSES, HIDDEN_BOSS];

// 다섯 지역 보스를 모두 이겼으면 숨겨진 보스가 열림 (하나라도 기록을 지우면 다시 잠김)
export const isHiddenUnlocked = (cleared: Record<string, unknown>) => DIALECT_BOSSES.every(b => !!cleared[b.id]);

// 이번 대결에서 칠 글자: 지역 보스는 방언, 표준어 박사는 표준어 풀이
export const typingText = (boss: DialectBoss, l: DialectLine) => {
  const { dialect, standard } = splitLine(l);
  return boss.typeStandard ? standard : dialect;
};

// 화면 제목 ("3단계 · 전라 비빔 대감" / "숨겨진 보스 · 표준어 박사")
export const bossTitle = (boss: DialectBoss) => (boss.hidden ? `숨겨진 보스 · ${boss.name}` : `${boss.order}단계 · ${boss.region} ${boss.name}`);

export const getBossById = (id: string | null | undefined) => ALL_BOSSES.find(b => b.id === id);

// 개인 연습 꾸러미용: 그 지역의 검토된 방언 문장 전부 (카드·필살 문장·보스 대사, 같은 방언은 한 번만)
export const practiceLinesFor = (boss: DialectBoss): DialectLine[] => {
  const all = [
    ...boss.cards.scissors, ...boss.cards.rock, ...boss.cards.paper,
    ...boss.finishers,
    ...(boss.practiceExtras ?? []),
    boss.intro, boss.defeated,
    ...boss.reactions.hurt, ...boss.reactions.taunt, ...boss.reactions.draw,
  ];
  const seen = new Set<string>();
  return all.filter(l => {
    const key = splitLine(l).dialect;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
