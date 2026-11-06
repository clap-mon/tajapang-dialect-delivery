"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { PLAYER_SKINS, PlayerCharacter, getPlayerSkin, getSkinById } from '../components/PlayerSkin';
import TajaPangLogo from '../components/TajaPangLogo';
import type { BotLevel, BotSpeeds, Participant, RaceSettings } from './components/types';
import {
  BOT_LEVEL_EMOJI,
  BOT_LEVEL_LABEL,
  BOT_SPEED_LIMITS,
  DEFAULT_SETTINGS,
  MAX_BOTS,
  MY_ID,
  RACE_STORAGE_KEYS,
  clampBotSpeed
} from './components/raceUtils';
import { appAlert, appConfirm } from '@/lib/appDialog';

const ContentSelector = dynamic(() => import('../components/ContentSelector'), {
  ssr: false,
  loading: () => <div className="text-center font-black text-slate-500 py-10">꾸러미 선택기를 불러오는 중...</div>
});

const EMOJIS = [
  '🐶', '🐱', '🦁', '🐯', '🦊', '🐻', '🐼', '🐨', '🐰', '🐹',
  '🐭', '🐸', '🐷', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅'
];

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

// 아직 아무도 쓰지 않는 배움팡 하나를 무작위로 고름 (모두 쓰였으면 아무거나)
const pickFreeSkinId = (usedIds: (string | undefined)[]) => {
  const free = PLAYER_SKINS.filter(s => !usedIds.includes(s.id));
  const pool = free.length > 0 ? free : PLAYER_SKINS;
  return pool[Math.floor(Math.random() * pool.length)].id;
};

// 나(본인) 참가자 정보 + 지난 판에 부른 팡 친구 복원
const loadInitialParticipants = (): Participant[] => {
  const nickname = sessionStorage.getItem('tajapang_nickname') || '나';
  let emoji = sessionStorage.getItem('tajapang_emoji');
  if (!emoji) {
    emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    sessionStorage.setItem('tajapang_emoji', emoji);
  }

  // joinedAt 0: 참가 순서 기준 목록에서 내가 항상 첫 번째가 되도록 고정
  const me: Participant = { id: MY_ID, nickname, emoji, joinedAt: 0, skinId: getPlayerSkin().id };
  const used: (string | undefined)[] = [me.skinId];
  // 예전 기록의 친구(로봇)는 배움팡이 없으므로 겹치지 않게 하나씩 정해 줌
  const prevBots = (readJson<Participant[]>(RACE_STORAGE_KEYS.PARTICIPANTS) || [])
    .filter(p => p.isBot)
    .map(p => {
      const skinId = p.skinId && !used.includes(p.skinId) ? p.skinId : pickFreeSkinId(used);
      used.push(skinId);
      return { ...p, skinId, nickname: getSkinById(skinId).name };
    })
    .slice(0, MAX_BOTS); // 예전에 3명까지 불렀던 기록은 최대 인원에 맞춰 자름
  return [me, ...prevBots];
};

const loadInitialSettings = (): RaceSettings => ({
  ...DEFAULT_SETTINGS,
  ...(readJson<RaceSettings>(RACE_STORAGE_KEYS.SETTINGS) || {})
});

export default function RaceLobby() {
  const router = useRouter();

  const [view, setView] = useState<'waiting' | 'preparing'>('waiting');
  const [participants, setParticipants] = useState<Participant[]>(loadInitialParticipants);
  const [initialSettings] = useState<RaceSettings>(loadInitialSettings);
  const [botSpeeds, setBotSpeeds] = useState<BotSpeeds>(initialSettings.botSpeeds);
  const [showSpace, setShowSpace] = useState(initialSettings.showSpace);
  const [removePunctuation, setRemovePunctuation] = useState(initialSettings.removePunctuation);
  const [enableFlawlessBonus, setEnableFlawlessBonus] = useState(initialSettings.enableFlawlessBonus);
  const comboWeight = initialSettings.comboWeight;

  const botList = participants.filter(p => p.isBot);
  const [mySkin] = useState(getPlayerSkin); // 첫 화면에서 고른 캐릭터

  const handleAddBot = (level: BotLevel) => {
    if (botList.length >= MAX_BOTS) {
      appAlert(`팡 친구는 최대 ${MAX_BOTS}명까지 함께 달릴 수 있어요.`);
      return;
    }

    // 나와 다른 친구들이 쓰지 않는 배움팡을 골라 이름으로 씀 (예: 반짝팡)
    const skinId = pickFreeSkinId(participants.map(p => p.skinId));
    const botData: Participant = {
      id: `bot_${Math.random().toString(36).substring(2, 7)}`,
      nickname: getSkinById(skinId).name,
      emoji: BOT_LEVEL_EMOJI[level],
      skinId,
      joinedAt: Date.now(),
      isBot: true,
      botLevel: level
    };

    setParticipants(prev => [...prev, botData]);
  };

  const removeParticipant = (id: string) => {
    setParticipants(prev => prev.filter(p => p.id !== id));
  };

  const updateBotSpeed = (level: BotLevel, speed: number) => {
    setBotSpeeds(prev => ({ ...prev, [level]: clampBotSpeed(level, speed) }));
  };

  // 꾸러미 선택 완료 시 sessionStorage로 게임 화면에 전달
  const handleStartRace = (problemSet: string[], contentOption: 'sentence' | 'word') => {
    const settings: RaceSettings = {
      botSpeeds,
      comboWeight,
      enableFlawlessBonus,
      showSpace,
      removePunctuation,
      contentOption
    };

    sessionStorage.setItem(RACE_STORAGE_KEYS.PROBLEM_SET, JSON.stringify(problemSet));
    sessionStorage.setItem(RACE_STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    sessionStorage.setItem(RACE_STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));

    router.push('/race/play');
  };

  if (view === 'preparing') {
    return (
      <main className="min-h-screen bg-[#FFF59D] p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-5xl bg-white rounded-[32px] border-4 border-black shadow-[10px_10px_0px_#000] p-8 md:p-10 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <h2 className="text-3xl font-black text-slate-950 flex items-center gap-3">
              <span className="text-4xl bg-indigo-50 border-2 border-black w-16 h-16 flex items-center justify-center rounded-2xl shadow-[2px_2px_0px_#000]">📚</span>
              타자팡 꾸러미 고르기
            </h2>
            <button
              onClick={() => setView('waiting')}
              className="flex items-center gap-2 bg-slate-900 text-white border-2 border-black px-6 py-3 rounded-2xl font-black hover:bg-[#FF007F] transition-all shadow-[3px_3px_0px_#000] active:translate-y-[1px] active:shadow-[2px_2px_0px_#000] cursor-pointer"
            >
              🏠 대기실로 돌아가기
            </button>
          </div>
          <ContentSelector onStart={handleStartRace} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FFF59D] p-3 md:p-4 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto space-y-3.5 w-full">
        {/* 헤더 섹션 */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full flex-1 justify-between">
            <div className="flex flex-col items-center sm:items-start">
              <TajaPangLogo size="md" />
              <span className="mt-1 bg-indigo-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                🎯 개인 연습
              </span>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full sm:border-l-4 lg:border-r-4 sm:border-black sm:mx-6 sm:px-6 py-0.5">
              <div className="text-center sm:text-left">
                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-0.5 leading-none">연습 모드</h2>
                <span className="text-2xl md:text-4xl font-black text-indigo-950 tracking-tight leading-none whitespace-nowrap">
                  개인 연습방
                </span>
              </div>
              <button
                onClick={async () => {
                  if (await appConfirm('대기실을 나가 첫 화면으로 돌아가시겠습니까?')) {
                    router.push('/');
                  }
                }}
                className="bg-rose-500 text-white text-sm px-6 py-2.5 rounded-xl border-4 border-black whitespace-nowrap shrink-0 hover:bg-rose-600 hover:-translate-y-0.5 transition-all font-black cursor-pointer shadow-[3px_3px_0px_#000] active:translate-y-0 active:shadow-[1px_1px_0px_#000]"
              >
                🚪 나가기
              </button>
            </div>
          </div>

          {/* 함께 달릴 팡 친구 수 */}
          <div className="text-center lg:text-right bg-[#00F0FF] px-8 py-3 rounded-[20px] border-4 border-black shadow-[4px_4px_0px_#000] min-w-[150px]">
            <p className="text-slate-900 font-black text-sm uppercase tracking-widest mb-1.5">함께 달릴 친구</p>
            <p className="text-3xl font-black text-slate-900 leading-none">
              {botList.length} <span className="text-sm font-bold text-slate-800">/ {MAX_BOTS}</span>
            </p>
          </div>
        </div>

        {/* 출발선 무대: 운동장 트랙 위에 나와 팡 친구가 나란히 서서 출발을 기다림 (친구는 ✕로 내보내기) */}
        <div className="relative bg-[#E8875A] rounded-[28px] border-4 border-black shadow-[6px_6px_0px_#000] overflow-hidden px-4 pt-7 pb-4">
          <div className="absolute inset-x-0 top-[38%] h-[3px] bg-white/60" />
          <div className="absolute inset-x-0 top-[72%] h-[3px] bg-white/60" />
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-[repeating-conic-gradient(#fff_0_90deg,#000_0_180deg)] bg-[length:12px_12px] opacity-40" />
          <span className="absolute top-2 left-9 bg-white border-2 border-black rounded-full px-2.5 py-0.5 text-[11px] font-black shadow-[2px_2px_0px_#000]">🏁 출발선</span>

          <div className="relative flex items-end justify-center gap-8 md:gap-14">
            {participants.map((p) => (
              <div key={p.id} className="flex flex-col items-center gap-1 animate-in fade-in zoom-in duration-300 group relative">
                {p.isBot && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    title="친구 내보내기"
                    className="absolute -top-1 -right-2 w-6 h-6 bg-red-500 text-white border-2 border-black rounded-full text-[11px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-md font-black cursor-pointer hover:bg-black"
                  >
                    ✕
                  </button>
                )}
                <div className="relative pt-3">
                  <PlayerCharacter skin={p.isBot && p.skinId ? getSkinById(p.skinId) : mySkin} size={68} />
                </div>
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border-2 border-black shadow-[1.5px_1.5px_0px_#000] whitespace-nowrap ${!p.isBot ? 'bg-[#FFE600] text-black' : 'bg-white text-slate-900'}`}>
                  {p.isBot || p.nickname === '나' ? p.nickname : `${p.nickname} (나)`}
                </span>
                <span className="text-[10px] font-black text-white drop-shadow-[1px_1px_0px_#000] whitespace-nowrap">
                  {p.isBot && p.botLevel
                    ? `${p.emoji} ${BOT_LEVEL_LABEL[p.botLevel]} · ${botSpeeds[p.botLevel]}타`
                    : mySkin.name}
                </span>
              </div>
            ))}
            {/* 나 1칸 + 팡 친구 MAX_BOTS칸만 보여 줌 */}
            {Array.from({ length: Math.max(0, 1 + MAX_BOTS - participants.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-1">
                <div className="pt-3">
                  <div className="w-[68px] h-[68px] rounded-full border-4 border-dashed border-white/80 bg-white/15 flex items-center justify-center text-2xl font-black text-white">
                    +
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-black text-white border-2 border-dashed border-white/80 whitespace-nowrap">
                  친구 자리
                </span>
                <span className="text-[10px] font-black text-white/80 whitespace-nowrap">아래에서 불러요</span>
              </div>
            ))}
          </div>
        </div>

        {/* 설정 섹션 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* AI 팡 친구 부르기 */}
          <div className="bg-white p-4 md:p-5 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col h-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-indigo-600 border-2 border-black rounded-xl flex items-center justify-center text-lg shadow-[2px_2px_0px_#000]">🏃</div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">AI 팡 친구 부르기</h3>
                <p className="text-xs font-bold text-slate-500">함께 달릴 팡 친구를 최대 {MAX_BOTS}명까지 불러요</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 flex-1">
              {(['easy', 'medium', 'hard'] as const).map(lvl => (
                <div key={lvl} className="flex flex-col justify-between p-3 rounded-2xl border-3 border-black bg-slate-50 gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">
                      {BOT_LEVEL_EMOJI[lvl]} {BOT_LEVEL_LABEL[lvl]}
                    </span>
                    <span className="text-[11px] font-black text-indigo-600 font-mono">
                      {botSpeeds[lvl]}타
                    </span>
                  </div>
                  <input
                    type="range"
                    min={BOT_SPEED_LIMITS[lvl].min}
                    max={BOT_SPEED_LIMITS[lvl].max}
                    step={10}
                    value={botSpeeds[lvl]}
                    onChange={(e) => updateBotSpeed(lvl, Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <button
                    onClick={() => handleAddBot(lvl)}
                    className="w-full py-1.5 bg-white border-2 border-black rounded-xl font-black text-xs hover:bg-[#FFE600] active:translate-y-[1px] shadow-[2px_2px_0px_#000] transition-all cursor-pointer"
                  >
                    + 친구 부르기
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 게임 플레이 세부 옵션 */}
          <div className="bg-white p-4 md:p-5 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] flex flex-col justify-between">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-[#FF007F] border-2 border-black rounded-xl flex items-center justify-center text-lg shadow-[2px_2px_0px_#000]">⚙️</div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">게임 규칙 설정</h3>
                <p className="text-xs font-bold text-slate-500">내 실력에 맞게 옵션을 조정하세요</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border-2 border-black cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={showSpace}
                  onChange={(e) => setShowSpace(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-black">띄어쓰기 기호 표시</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border-2 border-black cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={removePunctuation}
                  onChange={(e) => setRemovePunctuation(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-black">문장부호 제외</span>
              </label>
              <label className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border-2 border-black cursor-pointer hover:bg-slate-100">
                <input
                  type="checkbox"
                  checked={enableFlawlessBonus}
                  onChange={(e) => setEnableFlawlessBonus(e.target.checked)}
                  className="w-4 h-4 accent-indigo-600"
                />
                <span className="text-xs font-black">무결점 보너스 켜기</span>
              </label>
            </div>

            {/* 시작 버튼 */}
            <button
              onClick={() => setView('preparing')}
              className="w-full py-4 bg-[#FFE600] text-slate-950 font-black text-xl rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] hover:bg-[#FFD600] active:translate-y-[2px] active:shadow-[2px_2px_0px_#000] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>📚 꾸러미 고르고 시작하기</span>
              <span className="text-2xl">🚀</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
