"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { saveStudentRecord } from '@/lib/storage';
import { convertEngToKor } from '@/lib/hangul';
import TajaPangLogo from '../../components/TajaPangLogo';
import RunnerPang from '../components/RunnerPang';
import { PLAYER_SKINS, getPlayerSkin, getSkinById } from '../../components/PlayerSkin';
import StatCard from '../components/StatCard';
import type { Participant, RaceSettings } from '../components/types';
import {
  BOT_SPEED_LIMITS,
  DEFAULT_SETTINGS,
  MY_ID,
  RACE_STORAGE_KEYS,
  applyPunctuationSetting,
  clampBotSpeed,
  formatNickname,
  sortByScoreDesc
} from '../components/raceUtils';
import { appAlert, appConfirm, blockReloadKeys } from '@/lib/appDialog';

// "방언 - 표준어" 문제를 방언(칠 부분)과 표준어(뜻)로 나눔
// 카운트다운을 우리말로 (3 → 셋, 2 → 둘, 1 → 하나, 0 → 시작!)
const COUNTDOWN_WORDS = ['시작!', '하나', '둘', '셋'];

const splitDialectPair = (text: string) => {
  const idx = text.indexOf(' - ');
  return idx === -1 ? { dialect: text, standard: '' } : { dialect: text.slice(0, idx), standard: text.slice(idx + 3) };
};

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// 대기실에서 sessionStorage로 넘겨준 문장·설정·참가자 로드 (기록은 0부터 다시 시작)
const loadRaceData = () => {
  const problemSet = readJson<string[]>(RACE_STORAGE_KEYS.PROBLEM_SET) || [];
  const settings: RaceSettings = { ...DEFAULT_SETTINGS, ...(readJson<RaceSettings>(RACE_STORAGE_KEYS.SETTINGS) || {}) };
  const participants = (readJson<Participant[]>(RACE_STORAGE_KEYS.PARTICIPANTS) || []).map(p => ({
    ...p,
    progress: 0,
    cpm: 0,
    accuracy: 100,
    score: 0,
    combo: 0,
    currentIdx: 0,
    completedAt: undefined
  }));
  const isValid = problemSet.length > 0 && participants.some(p => p.id === MY_ID);
  return { problemSet, settings, participants, isValid };
};

export default function RacePlay({ onRestart }: { onRestart: () => void }) {
  const router = useRouter();

  const [raceData] = useState(loadRaceData);
  const { problemSet, settings, isValid } = raceData;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [isEngModeWarning, setIsEngModeWarning] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [cpm, setCpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(raceData.participants);
  const [maxCpm, setMaxCpm] = useState(0);
  const [minCpm, setMinCpm] = useState(9999);
  const [showStudentReportModal, setShowStudentReportModal] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [countdownFinished, setCountdownFinished] = useState(false);

  const [cumulativeCorrect, setCumulativeCorrect] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [backspaceCount, setBackspaceCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false); // 오타 발생 가이드 경고 상태

  const inputRef = useRef<HTMLInputElement>(null);
  const participantsRef = useRef<Participant[]>(raceData.participants); // setInterval 클로저 방지용 Ref 참조 객체
  const botProgressRef = useRef<{ [botId: string]: number }>({});

  const isFinished = problemSet.length > 0 && currentIdx >= problemSet.length;
  // 문제는 "방언 - 표준어" 형식: 방언만 치고, 뜻(표준어)은 아래에 작게 보여 줌
  const currentPair = splitDialectPair(problemSet[currentIdx] || "");
  const targetText = isFinished ? "" : applyPunctuationSetting(currentPair.dialect, settings.removePunctuation);
  const targetMeaning = isFinished ? "" : currentPair.standard;
  const botsRunning = participants.some(p => p.isBot && (p.currentIdx || 0) < problemSet.length);

  // 참가자 목록 변동 시 최신 참조 주입
  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // 1. 대기실 데이터가 없으면 대기실로 돌려보냄
  useEffect(() => {
    if (!isValid) {
      appAlert("연습 세션이 유효하지 않습니다. 대기실로 이동합니다.");
      router.replace('/race');
    }
  }, [isValid, router]);

  // 2. 게임 중 새로고침/탭닫기/뒤로가기 실수 방지용 브라우저 경고
  useEffect(() => {
    if (!countdownFinished || isFinished) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // 크롬/사파리 기본 안내 경고
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    const unblockReloadKeys = blockReloadKeys('새로고침하면 진행 중인 게임이 초기화되어요. 새로고침을 막았습니다.');
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      unblockReloadKeys();
    };
  }, [countdownFinished, isFinished]);

  // 내 달리기 진행 상태를 로컬 참가자 목록에 반영
  const updateMe = (patch: Partial<Participant>) => {
    setParticipants(prev => prev.map(p => p.id === MY_ID ? { ...p, ...patch } : p));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setTotalKeystrokes(prev => prev + 1);

    // 한글 조합 중(isComposing) 브라우저가 e.key를 'Process'로 매핑하는 IME 표준 스펙 한계를 극복하기 위해
    // 물리적 키 코드(e.code) 및 가상 키코드(e.keyCode)를 다중 검증하여 백스페이스를 확실히 포착합니다.
    if (e.key === 'Backspace' || e.code === 'Backspace' || e.keyCode === 8) {
      setBackspaceCount(prev => prev + 1);
    }
    // 문장을 다 친 후 엔터 키를 누를 때 판정 처리
    if (e.key === 'Enter') {
      e.preventDefault();
      if (isComposing) return;
      handleSentenceSubmit();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;

    // 영문 자판 감지 시 2벌식 한글로 자동 변환
    if (/[a-zA-Z]/.test(value)) {
      setIsEngModeWarning(true);
      value = convertEngToKor(value);
    } else if (isEngModeWarning) {
      setIsEngModeWarning(false);
    }

    setUserInput(value);
    if (!startTime && value.length > 0) setStartTime(Date.now());

    const currentChars = value.length;
    let currentCorrect = 0;
    value.split('').forEach((char, i) => {
      // 1. 마지막 글자이면서 조합 중(isComposing)일 때는 예외
      if (i === value.length - 1 && isComposing) {
        return;
      }
      // 2. 단일 자음/모음(초성/중성 단독) 상태이고 마지막 글자이면 예외
      const isJaso = /[ㄱ-ㅎㅏ-ㅣ]/.test(char);
      if (isJaso && i === value.length - 1) {
        return;
      }

      if (char === targetText[i]) {
        currentCorrect++;
      }
    });

    const elapsedMinutes = (Date.now() - (startTime || Date.now())) / 60000;
    const currentCpm = elapsedMinutes > 0 ? Math.floor(((cumulativeCorrect + currentCorrect) * 3) / elapsedMinutes) : 0;

    // 정확도 연산 (백스페이스 누적을 활용한 정타 확률 판정)
    const totalCorrect = cumulativeCorrect + currentCorrect;
    const totalTypo = totalErrors + backspaceCount;
    const currentAcc = (totalCorrect + totalTypo) > 0
      ? Math.max(0, Math.floor((totalCorrect / (totalCorrect + totalTypo)) * 100))
      : 100;

    setCpm(currentCpm);
    if (currentCpm > 0) {
      setMaxCpm(prev => Math.max(prev, currentCpm));
      setMinCpm(prev => Math.min(prev, currentCpm));
    }
    if (currentIdx === 0 && value.length === 0) {
      if (maxCpm !== 0) setMaxCpm(0);
      if (minCpm !== 9999) setMinCpm(9999);
    }
    setAccuracy(currentAcc);

    const currentIsError = value.split('').some((char, i) => char !== targetText[i]);
    setIsError(currentIsError);

    // 사용자가 수정 입력을 시도하면 오타 경고 가이드를 숨김
    if (showWarning) setShowWarning(false);

    const overallProgress = problemSet.length > 0
      ? ((currentIdx / problemSet.length) * 100) + ((currentChars / targetText.length) * (100 / problemSet.length))
      : 0;

    updateMe({
      progress: Math.floor(overallProgress),
      cpm: currentCpm,
      accuracy: currentAcc
    });
  };

  // 엔터 입력 시 문장 판정 및 다음 문장 천이 핸들러
  const handleSentenceSubmit = () => {
    if (userInput === targetText) {
      const nextIdx = currentIdx + 1;
      const isLast = nextIdx >= problemSet.length;

      setUserInput('');
      setIsComposing(false);
      setShowWarning(false);
      setIsEngModeWarning(false);
      if (inputRef.current) inputRef.current.value = '';

      const newCombo = (isError || backspaceCount > 0) ? combo : combo + 1;
      setCombo(newCombo);
      setCumulativeCorrect(prev => prev + targetText.length);

      // 문장 완료 시 백스페이스 수 오타 누적 및 리셋
      setTotalErrors(prev => prev + backspaceCount);
      setBackspaceCount(0);

      // 점수 계산 (대기실 설정 flawlessRate % 및 On/Off 활성화 여부 적용)
      const accScoreFactor = (accuracy / 100) * 0.5 + 0.5;
      const baseSentenceScore = Math.floor(targetText.length * accScoreFactor);

      const isFlawless = !isError && backspaceCount === 0;
      const isFlawlessBonusActive = settings.enableFlawlessBonus !== false;
      const flawlessRate = isFlawlessBonusActive ? (settings.comboWeight !== undefined ? settings.comboWeight : 50) / 100 : 0;
      const flawlessBonus = isFlawless ? Math.floor(baseSentenceScore * flawlessRate) : 0;

      const sentenceScore = baseSentenceScore + flawlessBonus + Math.floor(cpm / 15);
      const totalScore = (score || 0) + sentenceScore;
      setScore(totalScore);
      setIsError(false);

      if (!isLast) {
        setCurrentIdx(nextIdx);
        updateMe({
          currentIdx: nextIdx,
          progress: Math.floor((nextIdx / problemSet.length) * 100),
          combo: newCombo,
          score: totalScore,
          cpm,
          accuracy
        });
      } else {
        setCurrentIdx(problemSet.length);
        updateMe({
          progress: 100,
          currentIdx: problemSet.length,
          combo: newCombo,
          score: totalScore,
          cpm,
          accuracy,
          completedAt: Date.now()
        });
        // 학생 브라우저 로컬스토리지에 완주 기록 안전 보관
        saveStudentRecord({
          cpm,
          accuracy,
          contentTitle: `${problemSet.length}문장 타자`
        });
      }
    } else {
      // 불일치 시 오타 경고 가이드 노출
      setShowWarning(true);
      setIsError(true);
    }
  };

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => setIsComposing(false);

  const handleLeave = async () => {
    if (isFinished || await appConfirm("정말 게임을 나가 대기실로 돌아가시겠습니까?")) {
      router.push('/race');
    }
  };

  // 3. 카운트다운 똑딱이 (셋 → 둘 → 하나 → 시작! → 입력 시작)
  useEffect(() => {
    if (countdown === null) return;
    const timer = setTimeout(() => {
      if (countdown > 0) {
        setCountdown(countdown - 1);
      } else {
        setCountdown(null);
        setCountdownFinished(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 3-1. 카운트다운 종료 후 입력창 자동 포커싱
  useEffect(() => {
    if (countdownFinished) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [countdownFinished]);

  // 4. AI 팡 친구 시뮬레이션 인터벌 구동 (Ref를 사용해 클로저 해결, 내가 완주한 뒤에도 친구는 끝까지 달림)
  const botSpeeds = settings.botSpeeds;
  useEffect(() => {
    if (problemSet.length === 0 || !countdownFinished || !botsRunning) return;
    const botInterval = setInterval(() => {
      const botUpdates = new Map<string, Partial<Participant>>();

      participantsRef.current.forEach(p => {
        if (!p.isBot || (p.currentIdx || 0) >= problemSet.length) return;
        const botIdx = p.currentIdx || 0;

        // 봇별 로컬 소수점 진행률 없으면 이전 값이나 0으로 초기화
        if (botProgressRef.current[p.id] === undefined) {
          botProgressRef.current[p.id] = p.progress || 0;
        }
        const currentBotProgress = botProgressRef.current[p.id];

        // 1. 문장 읽기 딜레이 계수 보정
        const sentenceStartThreshold = (botIdx / problemSet.length) * 100;
        if (currentBotProgress <= sentenceStartThreshold + 0.3) {
          if (Math.random() > 0.4) return;
        }

        // 2. 난이도별 타수(CPM) 기준 로드 (대기실 슬라이더 범위와 동일하게 제한)
        const level = p.botLevel || 'easy';
        const limit = BOT_SPEED_LIMITS[level];
        const baseSpeed = clampBotSpeed(level, botSpeeds[level] || (level === 'easy' ? 100 : level === 'medium' ? 220 : 400));

        // 3. 리듬 계수
        const rhythm = 0.85 + Math.random() * 0.3;
        const targetCPM = baseSpeed * rhythm;

        const currentTargetText = splitDialectPair(problemSet[botIdx] || "").dialect;
        const expectedStrokesPerSec = targetCPM / 60;
        const totalStrokesForSentence = currentTargetText.length * 3;
        const sentenceProgressStep = (expectedStrokesPerSec / totalStrokesForSentence) * (100 / problemSet.length);

        const nextProgress = Math.min(100, currentBotProgress + sentenceProgressStep);
        botProgressRef.current[p.id] = nextProgress;

        const sentenceThreshold = ((botIdx + 1) / problemSet.length) * 100;

        if (nextProgress >= sentenceThreshold) {
          botProgressRef.current[p.id] = sentenceThreshold; // 다음 문장 천이 시 소수점 누적값 보정
          const botAccuracy = 85 + Math.floor(Math.random() * 14);
          const botScore = (p.score || 0) + Math.floor((currentTargetText.length * (botAccuracy / 100)) + (targetCPM / 67));
          const isBotDone = botIdx + 1 >= problemSet.length;

          botUpdates.set(p.id, {
            progress: Math.floor(sentenceThreshold),
            currentIdx: botIdx + 1,
            cpm: Math.min(limit.max, Math.max(limit.min, Math.floor(baseSpeed * (0.9 + Math.random() * 0.2)))),
            accuracy: botAccuracy,
            score: botScore,
            completedAt: isBotDone ? Date.now() : undefined // 봇 완주 타임스탬프 기록
          });
        } else {
          botUpdates.set(p.id, {
            progress: Math.floor(nextProgress), // 진행도 소수점 버림 처리
            cpm: Math.min(limit.max, Math.max(limit.min, Math.floor(baseSpeed * (0.8 + Math.random() * 0.4))))
          });
        }
      });

      if (botUpdates.size > 0) {
        setParticipants(prev => prev.map(p => {
          const update = botUpdates.get(p.id);
          return update ? { ...p, ...update } : p;
        }));
      }
    }, 1000);
    return () => clearInterval(botInterval);
  }, [problemSet, countdownFinished, botsRunning, botSpeeds]);

  if (!isValid) {
    return (
      <main className="min-h-screen bg-[#FFF59D] flex items-center justify-center">
        <p className="font-black text-slate-600">대기실로 이동하는 중...</p>
      </main>
    );
  }

  const rankedParticipants = [...participants].sort(sortByScoreDesc);
  const timeSortedList = [...participants].sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
  // 참가자별 배움팡 (예전 기록처럼 skinId가 없으면 나는 고른 캐릭터, 친구는 들어온 순서대로)
  const skinOf = (p: Participant) => {
    if (p.skinId) return getSkinById(p.skinId);
    if (p.id === MY_ID) return getPlayerSkin();
    const idx = timeSortedList.findIndex(x => x.id === p.id);
    return PLAYER_SKINS[Math.max(0, idx) % PLAYER_SKINS.length];
  };

  return (
    <main className={`bg-[#FFF59D] p-2 flex flex-col justify-between ${isFinished
        ? 'min-h-screen overflow-y-auto h-auto'
        : 'h-screen overflow-hidden'
      }`}>
      {/* 상단 바 (로고 및 모드, 스탯 통합) */}
      <div className="flex justify-between items-center bg-white py-2 px-4 rounded-[20px] border-4 border-black shadow-[4px_4px_0px_#000] mb-2 w-full gap-3">
        <TajaPangLogo size="sm" />

        <div className="hidden xl:flex flex-1 justify-center mx-6 gap-3">
          <StatCard label="현재 타수" value={Math.floor(cpm)} subLabel="타" color="text-indigo-600" bgColor="bg-[#FFDE4D]" rotation="-rotate-1" compact />
          <StatCard label="정확도" value={`${Math.floor(accuracy)}%`} color="text-emerald-600" bgColor="bg-[#FFB0B0]" rotation="rotate-1" compact />
          <StatCard label="무결점 성공" value={combo} subLabel="회" color="text-amber-600" bgColor="bg-[#BFF6C3]" rotation="-rotate-1" compact />
          <StatCard label="누적 점수" value={Math.floor(score).toLocaleString()} color="text-rose-600" bgColor="bg-[#E2F1AF]" rotation="rotate-1" compact />
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="bg-slate-100 border-4 border-black px-5 py-2 rounded-xl text-center leading-none shadow-[3px_3px_0px_#000]">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-0.5">모드</span>
            <span className="text-2xl font-black text-indigo-600 tracking-wider whitespace-nowrap">개인 연습</span>
          </div>

          {/* 나가기 버튼 (대기실로) */}
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
        {/* 학생용 플레이 및 결과창 화면 */}
        <div className="flex-1 flex gap-2.5 overflow-hidden">
          <div className="flex-1 flex flex-col gap-2 relative">
            {/* 좁은 화면(1280px 미만)에서 노출되는 스탯 카드 영역 (넓은 화면은 상단 바 헤더로 통합) */}
            <div className="flex justify-center gap-1.5 xl:hidden">
              <StatCard label="현재 타수" value={Math.floor(cpm)} subLabel="타" color="text-indigo-600" bgColor="bg-[#FFDE4D]" rotation="-rotate-1" />
              <StatCard label="정확도" value={`${Math.floor(accuracy)}%`} color="text-emerald-500" bgColor="bg-[#FFB0B0]" rotation="rotate-2" />
              <StatCard label="무결점 성공" value={combo} subLabel="회" color="text-amber-500" bgColor="bg-[#BFF6C3]" rotation="-rotate-2" />
              <StatCard label="누적 점수" value={Math.floor(score).toLocaleString()} color="text-rose-500" bgColor="bg-[#E2F1AF]" rotation="rotate-1" />
            </div>
            <div
              onClick={() => { if (!isFinished) inputRef.current?.focus(); }}
              className="flex-1 max-h-[320px] bg-classroom-chalkboard rounded-[24px] border-[6px] border-black shadow-[6px_6px_0px_#000] p-4 md:p-5 flex flex-col items-center justify-center relative overflow-hidden cursor-pointer"
            >
              <div className="absolute inset-0 opacity-10 bg-chalk-dust"></div>
              {/* 칠판 구석에 띄우는 백스페이스 누적 카운트 (이의제기 방지용) */}
              {!isFinished && (
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

              {isFinished ? (
                /* 완주 후: 결과 리포트 열기 / 다시 도전 / 대기실로 */
                <div className="text-center z-10 text-white flex flex-col gap-3.5 items-center justify-center py-2">
                  <span className="text-2xl font-black text-[#FFF59D] drop-shadow-[2.5px_2.5px_0px_#000] animate-pulse">🏁 완주 성공!</span>
                  <p className="text-white/60 text-xs font-bold -mt-1.5 mb-1">학습 분석 리포트가 생성되었습니다.</p>

                  <div className="flex flex-wrap justify-center gap-3">
                    <button
                      onClick={() => setShowStudentReportModal(true)}
                      className="bg-[#00F0FF] text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-[#33f3ff]"
                    >
                      📊 결과 리포트 보기
                    </button>
                    <button
                      onClick={onRestart}
                      className="bg-[#FFDE4D] text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-[#ffe775]"
                    >
                      🔁 다시 도전
                    </button>
                    <button
                      onClick={() => router.push('/race')}
                      className="bg-white text-slate-900 border-4 border-black px-5 py-2 rounded-full font-black text-xs shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer hover:bg-slate-100"
                    >
                      🏠 대기실로
                    </button>
                  </div>
                </div>
              ) : (/* 학생 실시간 타이핑 중 */
                <div className="w-full max-w-5xl xl:max-w-6xl z-10 space-y-3">
                  <p className="text-2xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-snug flex flex-wrap justify-center gap-x-1 text-white text-center">
                    {(() => {
                      const letters = targetText.split('').map((char, index) => {
                        // 친 글자: 흐린 흰색(맞음) / 빨간색(틀림), 아직 안 친 글자: 노란색 (방언 대결 필살 문장과 같은 방식)
                        let finalClass = "font-black text-[#FFE600] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]";
                        if (index < userInput.length) {
                          finalClass = userInput[index] === char ? "text-white/35" : "text-red-400";
                        } else if (index === userInput.length) {
                          finalClass = "font-black text-[#FFE600] underline decoration-4 underline-offset-8 decoration-[#FFE600] drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]";
                        }

                        if (char === ' ') {
                          return (
                            <span key={index} className={finalClass}>
                              {settings.showSpace ? '␣' : ' '}
                            </span>
                          );
                        }
                        return (
                          <span key={index} className={finalClass}>
                            {char}
                          </span>
                        );
                      });

                      // 마지막 글자 바로 뒤에 엔터 가이드 기호 (↵) 추가
                      const isAllTyped = userInput.length === targetText.length;
                      const enterSymbolClass = isAllTyped
                        ? "text-[#FFE600] font-black drop-shadow-[0_0_8px_rgba(255,230,0,0.6)] animate-pulse pl-1.5"
                        : "text-white/10 font-normal pl-1.5";

                      letters.push(
                        <span key="enter-guide-symbol" className={enterSymbolClass} style={{ verticalAlign: 'middle' }}>
                          ↵
                        </span>
                      );

                      return letters;
                    })()}
                  </p>
                  {targetMeaning && (
                    <p className="text-sm md:text-lg font-bold text-white/60 text-center -mt-1">= {targetMeaning}</p>
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
                    onCompositionStart={handleCompositionStart}
                    onCompositionEnd={handleCompositionEnd}
                    onBlur={(e) => {
                      if (!isFinished && countdownFinished) {
                        setTimeout(() => e.target.focus(), 10);
                      }
                    }}
                    disabled={!countdownFinished}
                    className={`w-full bg-white/5 border-b-4 ${isError ? 'border-red-400' : 'border-white/10'} text-white text-3xl md:text-4xl p-3 md:p-4 outline-none focus:border-amber-300 transition-all text-center font-bold placeholder:opacity-5`}
                    placeholder={countdown !== null ? "카운트다운 완료 후 시작합니다!" : "여기에 입력하세요"}
                    autoComplete="off"
                    autoFocus
                  />
                  {/* 영문 자판 감지 시 자동 변환 안내 배너 */}
                  {isEngModeWarning && (
                    <div className="bg-[#FFF59D] text-slate-900 border-2 border-black px-4 py-1.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_#000] mx-auto w-fit animate-bounce-subtle flex items-center justify-center gap-1.5">
                      <span>💡</span>
                      <span>영문 자판이 감지되어 한글로 자동 변환 중입니다! [한/영] 키를 눌러주세요.</span>
                    </div>
                  )}
                  {showWarning && (
                    <p className="text-red-400 text-lg font-black mt-2 text-center animate-bounce-subtle">
                      ⚠️ 문장이 일치하지 않습니다. 오타를 수정하고 엔터를 눌러주세요!
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 우측 실시간 랭킹 (5위 크기로 축소 및 스크롤) */}
          <div className="hidden lg:flex w-72 bg-[#BFF6C3] rounded-[24px] border-4 border-black p-3 text-black flex-col gap-2 overflow-hidden shadow-[4px_4px_0px_#000] max-h-[320px]">
            <h3 className="text-[10px] font-black uppercase tracking-widest border-b-2 border-black pb-1.5 flex flex-col gap-1"><div className="flex items-center gap-1.5"><span>🏆 실시간 총점 순위</span><span className="text-[8px] font-bold text-slate-500 normal-case">(총점 기준)</span></div><span className="text-[8px] font-bold text-indigo-700 block leading-none">※ 점수 = 글자수/정확도/보너스 합산</span></h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar max-h-[240px]">
              {rankedParticipants.map((p, idx) => {
                const isMe = p.id === MY_ID;
                return (
                  <div key={`student-rank-${p.id}`} className={`p-2 rounded-xl flex items-center justify-between border-2 border-black ${isMe ? 'bg-[#FFF59D] shadow-[2px_2px_0px_#000]' : 'bg-white shadow-[2px_2px_0px_#000]'}`}>
                    <span className="text-xs font-black truncate max-w-[120px]">{idx + 1}. {p.nickname || '학생'}</span>
                    <span className="text-xs font-black text-indigo-600">{Math.floor(p.score || 0).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 학생 종합 결과 리포트 오버레이 모달 (스크롤 차단 팝업 - 닫기 기능 탑재) */}
        {isFinished && showStudentReportModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-2xl bg-classroom-chalkboard rounded-[32px] border-[8px] border-black shadow-[12px_12px_0px_#000] p-5 md:p-6 flex flex-col justify-between relative overflow-hidden animate-in zoom-in duration-300">
              <div className="absolute inset-0 opacity-10 bg-chalk-dust"></div>

              {/* 모달 닫기 버튼 */}
              <button
                onClick={() => setShowStudentReportModal(false)}
                className="absolute top-4 right-4 bg-rose-500 hover:bg-rose-600 text-white w-8 h-8 rounded-full border-4 border-black flex items-center justify-center font-black text-sm shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all cursor-pointer z-30 animate-bounce-subtle"
                title="닫기"
              >
                ✕
              </button>

              <div className="text-center mb-4 z-10">
                <h2 className="text-3xl font-black text-[#FFF59D] drop-shadow-[2.5px_2.5px_0px_#000] tracking-wider">🏆 완주 성공!</h2>
                <p className="text-white text-[11px] opacity-80 mt-1 font-bold">학습 분석 리포트가 생성되었습니다.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10 mb-4">
                {/* 종합 스탯 */}
                <div className="md:col-span-2 bg-[#FFDE4D] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3.5 flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1 mb-2">📊 종합 타이핑 스탯</span>
                  <div className="grid grid-cols-2 gap-2.5 flex-1">
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">평균 속도</span>
                      <span className="text-xl font-black text-indigo-600 leading-none">{Math.floor(cpm)} <span className="text-[10px]">타/분</span></span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">최종 정확도</span>
                      <span className="text-xl font-black text-emerald-600 leading-none">{Math.floor(accuracy)}%</span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">무결점 성공</span>
                      <span className="text-xl font-black text-amber-600 leading-none">{combo}회</span>
                      <span className="text-[9px] font-bold text-slate-500 mt-1 leading-none">(지우기: {totalErrors}회)</span>
                    </div>
                    <div className="bg-white border-2 border-black rounded-lg p-2 flex flex-col justify-between shadow-[1.5px_1.5px_0px_#000]">
                      <span className="text-[8px] font-black text-slate-500">누적 획득 점수</span>
                      <span className="text-lg font-black text-rose-600 leading-none truncate">{Math.floor(score).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* 순위 및 타속 기록 */}
                <div className="flex flex-col gap-3">
                  <div className="flex-1 bg-[#FFB0B0] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col justify-between min-h-[75px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1.5">👑 최종 순위</span>
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-2xl font-black text-slate-900 leading-none">
                        {(() => {
                          const rank = rankedParticipants.findIndex(p => p.id === MY_ID) + 1;
                          return rank > 0 ? `${rank}등` : '집계중';
                        })()}
                      </span>
                      <span className="text-[10px] text-slate-700 ml-1 font-black">/ {participants.length}명</span>
                    </div>
                  </div>

                  <div className="flex-1 bg-[#BFF6C3] text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col justify-between min-h-[75px]">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1.5">📈 타속 기록</span>
                    <div className="flex-grow flex flex-col gap-1 justify-center px-1">
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="text-slate-600 text-[9px]">최고 타수:</span>
                        <span className="text-indigo-600 text-sm">{maxCpm} <span className="text-[8px]">타</span></span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-black">
                        <span className="text-slate-600 text-[9px]">최저 타수:</span>
                        <span className="text-rose-500 text-sm">{minCpm === 9999 ? 0 : minCpm} <span className="text-[8px]">타</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 타이핑 진단 (정해진 규칙으로 만든 조언, 실제 AI 아님) */}
              <div className="bg-white text-black border-4 border-black shadow-[3px_3px_0px_#000] rounded-[20px] p-3 flex flex-col justify-between z-10">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b-2 border-black pb-1 mb-1.5">🩺 타이핑 진단</span>
                <div className="text-[11px] font-bold text-slate-800 leading-relaxed">
                  {(() => {
                    if (totalKeystrokes === 0) return "💡 입력된 타이핑 데이터가 존재하지 않습니다. 문장을 완타하여 타이핑 분석 진단을 받아보세요!";
                    if (accuracy < 85) return "💡 오타율이 높은 편입니다. 정확한 자리 연습에 더 집중하면 타수가 비약적으로 상승할 수 있습니다! 천천히 치더라도 정확도를 90% 이상으로 유지해보세요.";
                    if (backspaceCount > totalKeystrokes * 0.15) return `💡 수정 키(Backspace) 입력 횟수(${backspaceCount}회)가 전체 입력 대비 높은 편입니다. 조급하게 치기보단 한 글자씩 확실히 누르는 연습이 효과적입니다!`;
                    if (cpm > 350) return `💡 대단합니다! 속도(${Math.floor(cpm)}타)와 정확도(${Math.floor(accuracy)}%) 모두 최상위 수준입니다. 리듬감을 유지하며 긴 문장 연습으로 지구력을 강화해보세요.`;
                    return "💡 훌륭한 타이핑 밸런스입니다! 속도와 정확도가 고르게 발달하고 있습니다. 오타가 전혀 없는 '무결점 보너스'를 늘리는 데 도전해보세요.";
                  })()}
                </div>
                <div className="flex gap-3.5 mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] text-slate-500 font-black">
                  <span>총 키 입력: {totalKeystrokes}타</span>
                  <span>오타수: {totalErrors}회</span>
                  <span>지움(Backspace): {backspaceCount}회</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 달리기 트랙 영역 (3줄 줌인 + 우측 세로 미니맵) */}
        <div
          className="bg-white p-3 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col overflow-hidden relative transition-all duration-300 w-full flex-1 min-h-[260px]"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-carbon-stripe opacity-30"></div>
          <div className="flex-1 flex gap-2 overflow-hidden h-full">
            {/* 왼쪽: 메인 3선 줌인 트랙 */}
            <div className="flex-grow flex-1 bg-[#E8875A] rounded-2xl relative overflow-hidden border-2 border-black shadow-inner">
              {/* 운동장 달리기 트랙: 주황빛 바닥 + 흰 줄 (줄 사이 점선이 흘러가며 달리는 느낌) */}
              <div className="absolute inset-x-0 top-[35%] h-[3px] bg-white/70" />
              <div className="absolute inset-x-0 top-[65%] h-[3px] bg-white/70" />
              <div className="absolute inset-0 flex flex-col justify-around py-4 opacity-25">
                {[1, 2, 3].map(i => (
                  <div key={i} className={`h-1 w-full flex gap-8 ${isFinished ? '' : 'animate-road-flow'}`}>
                    {Array.from({ length: 20 }).map((_, j) => (
                      <div key={j} className="w-12 h-full bg-white rounded-full"></div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="absolute right-0 top-0 bottom-0 w-10 z-10 flex items-center justify-center">
                {/* 격자 무늬 배경만 투명도 20% 부여 */}
                <div className="absolute inset-0 bg-[repeating-conic-gradient(#fff_0_90deg,#000_0_180deg)] bg-[length:20px_20px] opacity-20"></div>

                {/* 안내 문구는 투명도 영향 없이 100% 뚜렷한 진한 검정색으로 노출 */}
                <div className="relative text-[14px] font-black text-black leading-tight text-center select-none flex flex-col gap-1 items-center z-20">
                  <span>문</span>
                  <span>장</span>
                  <span>진</span>
                  <span>행</span>
                  <span>완</span>
                  <span>료</span>
                </div>
              </div>
              <div className="absolute inset-0 pr-12 pl-10">
                {(() => {
                  // 아직 완주하지 않고 주행 중인 라이벌 필터 (단, 나는 반드시 포함)
                  const runningParticipants = rankedParticipants.filter(p => (p.progress || 0) < 100 || p.id === MY_ID);
                  const myIndexInRunning = runningParticipants.findIndex(p => p.id === MY_ID);

                  let displayParticipants: Participant[] = [];

                  if (rankedParticipants.length <= 3) {
                    displayParticipants = rankedParticipants;
                  } else {
                    // 주행 중인 사람들 중에서 나를 중앙에 두는 윈도우 추출
                    let runningWindow: Participant[] = [];
                    if (runningParticipants.length <= 3) {
                      runningWindow = runningParticipants;
                    } else {
                      if (myIndexInRunning <= 0) {
                        runningWindow = runningParticipants.slice(0, 3);
                      } else if (myIndexInRunning >= runningParticipants.length - 1) {
                        runningWindow = runningParticipants.slice(runningParticipants.length - 3);
                      } else {
                        runningWindow = [
                          runningParticipants[myIndexInRunning - 1],
                          runningParticipants[myIndexInRunning],
                          runningParticipants[myIndexInRunning + 1]
                        ];
                      }
                    }

                    // 주행 윈도우가 3대 미만일 시, 전체 정렬 리스트에서 부족한 수만큼 백필(Backfill)하여 3차선 벌크를 보존
                    displayParticipants = [...runningWindow];
                    if (displayParticipants.length < 3) {
                      for (const p of rankedParticipants) {
                        if (displayParticipants.length >= 3) break;
                        if (!displayParticipants.some(x => x.id === p.id)) {
                          if ((p.progress || 0) >= 100) {
                            displayParticipants.unshift(p); // 완주한 친구는 트랙 위쪽 줄에 먼저 배치
                          } else {
                            displayParticipants.push(p);
                          }
                        }
                      }
                    }
                  }

                  const myRankInList = rankedParticipants.findIndex(x => x.id === MY_ID);
                  // 3명 이하면 줄을 고정해서 모두 보여 줌 (친구 최대 2명)
                  const fixedLanes = rankedParticipants.length <= 3;
                  const friendOrder = timeSortedList.filter(x => x.id !== MY_ID).map(x => x.id);
                  const isLeader = !fixedLanes && myRankInList === 0;
                  const isChaser = !fixedLanes && rankedParticipants.length > 1 && myRankInList === rankedParticipants.length - 1;

                  return (
                    <>
                      {isLeader && (
                        <div className="absolute left-1/2 top-[20%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 text-2xl font-black text-yellow-500/20 select-none pointer-events-none">
                          <span>👑 선두</span>
                        </div>
                      )}
                      {isChaser && (
                        <div className="absolute left-1/2 top-[80%] -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 text-2xl font-black text-rose-500/20 select-none pointer-events-none">
                          <span>🔥 추격 중</span>
                        </div>
                      )}
                      {rankedParticipants.map((p) => {
                        const isMe = p.id === MY_ID;

                        const displayIdx = displayParticipants.findIndex(x => x.id === p.id);
                        const progressVal = Math.floor(p.progress || 0);
                        const offsetScale = Math.max(0, 1 - (progressVal / 100));

                        let opacityVal = 0;
                        let scaleClass = 'scale-[0.88]';

                        const pRank = rankedParticipants.findIndex(x => x.id === p.id);
                        let laneIdx = 1;
                        if (fixedLanes) {
                          // 3명 이하: 나는 가운데 줄, 먼저 부른 친구는 위 줄, 나중에 부른 친구는 아래 줄에 고정 (모두 항상 보임)
                          if (!isMe) laneIdx = friendOrder.indexOf(p.id) === 0 ? 0 : 2;
                        } else if (!isMe) {
                          // 4명 이상(예전 멀티 구조): 나는 가운데, 바로 앞 친구는 위, 바로 뒤 친구는 아래
                          laneIdx = pRank < myRankInList ? 0 : 2;
                        }
                        const verticalPositions = [20, 50, 80];
                        const verticalPos = verticalPositions[laneIdx];

                        if (fixedLanes || (displayIdx !== -1 && (isMe || pRank === myRankInList - 1 || pRank === myRankInList + 1))) {
                          // 1. 활성 윈도우 참가자: 부드러운 노출
                          opacityVal = 1;
                          if (isMe) scaleClass = 'scale-110';
                        } else {
                          // 2. 비활성 참가자: 자연스러운 제자리 페이드아웃을 위해 opacity만 0으로 처리
                          opacityVal = 0;
                        }

                        const horizontalOffset = ((laneIdx % 3) * -16) * offsetScale;
                        // 출발선·결승선에서 캐릭터가 트랙 밖으로 잘리지 않게 양 끝 34px 안쪽으로 묶음
                        const leftStyle = `clamp(34px, calc(${progressVal}% + ${horizontalOffset}px), calc(100% - 34px))`;

                        return (
                          <div
                            key={`zoom-car-${p.id}`}
                            className="absolute flex items-center"
                            style={{
                              left: leftStyle,
                              top: `${verticalPos}%`,
                              transform: 'translate(-50%, -50%)',
                              zIndex: isMe ? 50 : 20, transitionProperty: 'left, opacity', transitionDuration: '1000ms, 400ms', transitionTimingFunction: 'ease-out',
                              opacity: opacityVal,
                              pointerEvents: opacityVal === 0 ? 'none' : 'auto'
                            }}
                          >
                            <RunnerPang
                              skin={skinOf(p)}
                              nickname={formatNickname(p.nickname)}
                              isMe={isMe}
                              levelEmoji={p.isBot ? p.emoji : undefined}
                              running={countdownFinished && progressVal < 100}
                              finished={progressVal >= 100}
                              size={52}
                              scaleClass={scaleClass}
                              tooltipPosition={verticalPos < 25 ? 'bottom' : 'top'}
                            />
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>

            {/* 우측 미니맵 */}
            <div className="w-12 flex flex-col items-center justify-between border-l-4 border-black/10 pl-2 py-2 relative h-full">
              <div className="w-2.5 bg-slate-300 rounded-full h-full relative border-2 border-black shadow-inner">
                <div className="absolute top-0 bottom-0 left-0 right-0 bg-slate-400 opacity-20 bg-[repeating-linear-gradient(0deg,#fff,#fff_4px,transparent_4px,transparent_8px)] rounded-full"></div>
                {rankedParticipants.map((p, idx) => {
                  const isMe = p.id === MY_ID;
                  const progressVal = Math.min(94, Math.max(6, p.progress || 0));
                  // 미니맵 점 색은 그 친구의 배움팡 몸 색
                  const dotColor = skinOf(p).color;

                  const total = rankedParticipants.length;
                  const horizontalOffset = total > 1 ? Math.max(-10, Math.min(10, (idx - (total - 1) / 2) * 2.5)) : 0;

                  return (
                    <div
                      key={`minimap-dot-${p.id}`}
                      style={{
                        bottom: `${progressVal}%`,
                        left: `calc(50% + ${horizontalOffset}px)`,
                        transform: 'translateX(-50%)'
                      }}
                      className={`absolute w-4 h-4 rounded-full border-2 border-black flex items-center justify-center transition-all duration-1000 ease-out z-10 ${isMe ? 'bg-yellow-300 scale-125 ring-2 ring-amber-500 animate-pulse' : 'bg-white'
                        }`}
                    >
                      {isMe ? (
                        <span className="text-[7px] font-black text-amber-800 leading-none">나</span>
                      ) : (
                        <div style={{ backgroundColor: dotColor }} className="w-1.5 h-1.5 rounded-full"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
