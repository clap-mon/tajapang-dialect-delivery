/**
 * 플레이 기록 로컬스토리지 (Local-First Storage) 관리 모듈
 * 외부 서버나 계정 없이 브라우저 로컬 기기에만 안전하게 전적을 보관합니다.
 */

export interface TypingRecord {
  id: string;
  date: number;
  cpm: number;
  accuracy: number;
  contentTitle?: string;
}

const STORAGE_KEYS = {
  RECORDS: "tajapang_student_records",
  DIALECT_PROGRESS: "tajapang_dialect_progress",
  DIALECT_RULES_SEEN: "tajapang_dialect_rules_seen",
};

// 학생 플레이 기록 로컬 저장
export const saveStudentRecord = (record: Omit<TypingRecord, "id" | "date">) => {
  if (typeof window === "undefined") return;
  try {
    const prevStr = localStorage.getItem(STORAGE_KEYS.RECORDS);
    const prev: TypingRecord[] = prevStr ? JSON.parse(prevStr) : [];
    const newRecord: TypingRecord = {
      ...record,
      id: Math.random().toString(36).substring(2, 9),
      date: Date.now(),
    };
    const updated = [newRecord, ...prev].slice(0, 50); // 최근 50개 보관
    localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save local record:", e);
  }
};

// 학생 플레이 기록 로컬 조회
export const getStudentRecords = (): TypingRecord[] => {
  if (typeof window === "undefined") return [];
  try {
    const str = localStorage.getItem(STORAGE_KEYS.RECORDS);
    return str ? JSON.parse(str) : [];
  } catch {
    return [];
  }
};

// ───────── 방언 타자 대결 진행 기록 (해금·클리어·옵션) ─────────

export interface DialectBossRecord {
  clearedAt: number;
  bestRounds: number; // 가장 적은 라운드로 이긴 기록
  bestHpLeft: number; // 가장 많이 남긴 체력
  clears?: number; // 이 보스를 이긴 횟수 (다음 도전 LV 계산용, 예전 기록에는 없을 수 있음)
}

// 보스를 이긴 횟수 (예전 기록처럼 clears가 없으면 1번 이긴 것으로 봄)
export const getDialectClears = (record?: DialectBossRecord) => (record ? record.clears ?? 1 : 0);

export interface DialectProgress {
  unlocked: number; // 도전 가능한 마지막 보스 순서 (1부터)
  cleared: Record<string, DialectBossRecord>;
  shieldOption: boolean; // 방패 규칙 사용 여부 (기본 꺼짐)
  showSpace: boolean; // 띄어쓰기 기호(␣) 표시
  previewMeaning: boolean; // 카드를 고를 때 표준어 뜻 미리 보기
  relaxedMode: boolean; // 여유 모드: 제한시간 늘림, 이겨도 LV은 그대로
  fastMode: boolean; // 연출 빠르게: 구호·공개 시간을 줄임
}

const DEFAULT_DIALECT_PROGRESS: DialectProgress = {
  unlocked: 1,
  cleared: {},
  shieldOption: false,
  showSpace: false,
  previewMeaning: false,
  relaxedMode: false,
  fastMode: false,
};

// 방언 보스 진행 기록 조회
export const getDialectProgress = (): DialectProgress => {
  if (typeof window === "undefined") return DEFAULT_DIALECT_PROGRESS;
  try {
    const str = localStorage.getItem(STORAGE_KEYS.DIALECT_PROGRESS);
    return str ? { ...DEFAULT_DIALECT_PROGRESS, ...JSON.parse(str) } : DEFAULT_DIALECT_PROGRESS;
  } catch {
    return DEFAULT_DIALECT_PROGRESS;
  }
};

// 방언 보스 진행 기록 저장
export const saveDialectProgress = (progress: DialectProgress) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.DIALECT_PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save dialect progress:", e);
  }
};

// 보스를 이겼을 때 클리어 기록과 다음 보스 해금 저장 (raiseLevel이 false면 이긴 횟수·LV은 그대로)
export const recordDialectClear = (bossId: string, bossOrder: number, totalBosses: number, rounds: number, hpLeft: number, raiseLevel = true) => {
  const progress = getDialectProgress();
  const prev = progress.cleared[bossId];
  const updated: DialectProgress = {
    ...progress,
    unlocked: Math.max(progress.unlocked, Math.min(totalBosses, bossOrder + 1)),
    cleared: {
      ...progress.cleared,
      [bossId]: {
        clearedAt: Date.now(),
        bestRounds: prev ? Math.min(prev.bestRounds, rounds) : rounds,
        bestHpLeft: prev ? Math.max(prev.bestHpLeft, hpLeft) : hpLeft,
        clears: getDialectClears(prev) + (raiseLevel ? 1 : 0),
      },
    },
  };
  saveDialectProgress(updated);
  return updated;
};

// 보스 하나의 클리어 기록 지우기 (해금 상태는 그대로 둠)
export const clearDialectBossRecord = (bossId: string) => {
  const progress = getDialectProgress();
  const cleared = { ...progress.cleared };
  delete cleared[bossId];
  const updated: DialectProgress = { ...progress, cleared };
  saveDialectProgress(updated);
  return updated;
};

// 보스 선택 화면의 규칙 팝업을 본 적이 있는지 (처음 한 번만 자동으로 열기)
export const hasSeenDialectRules = () => {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEYS.DIALECT_RULES_SEEN) === "1";
  } catch {
    return true;
  }
};

export const markDialectRulesSeen = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEYS.DIALECT_RULES_SEEN, "1");
  } catch {
    // 저장이 막힌 브라우저면 다음에도 다시 열림
  }
};
