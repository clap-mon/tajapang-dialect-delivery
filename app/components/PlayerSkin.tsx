"use client";

import React, { useSyncExternalStore } from 'react';

// ───────── 플레이어 기본 스킨 "배움팡" 10종 (보스와 같은 말랑한 몸통 + 색·소품·표정만 다르게) ─────────

export type SkinFace = 'smile' | 'wink' | 'star' | 'grin' | 'tongue' | 'shy' | 'cool' | 'serious' | 'surprised' | 'humming';
export type PlayerMood = 'idle' | 'hurt' | 'happy';

export interface PlayerSkin {
  id: string;
  name: string;
  color: string; // 몸 색
  cheek: string; // 볼 색
  accessory: string; // 머리 위 소품 (보스 소품과 겹치지 않게)
  face: SkinFace; // 평소 표정
}

export const PLAYER_SKINS: PlayerSkin[] = [
  { id: 'sprout', name: '새싹팡', color: '#7BD389', cheek: '#C7F0CF', accessory: '🌱', face: 'smile' },
  { id: 'ribbon', name: '윙크팡', color: '#FF8FB1', cheek: '#FFD0DE', accessory: '💖', face: 'wink' },
  { id: 'star', name: '반짝팡', color: '#A78BFA', cheek: '#DDD3FE', accessory: '⭐', face: 'star' },
  { id: 'sun', name: '햇살팡', color: '#FFD23F', cheek: '#FFEFA8', accessory: '🌻', face: 'grin' },
  { id: 'sea', name: '메롱팡', color: '#5BC0EB', cheek: '#C3E8F8', accessory: '🍭', face: 'tongue' },
  { id: 'snow', name: '수줍팡', color: '#E2E8F0', cheek: '#FDA4AF', accessory: '🌸', face: 'shy' },
  { id: 'space', name: '선글팡', color: '#4F5D95', cheek: '#9AA6D6', accessory: '🕶️', face: 'cool' },
  { id: 'detective', name: '탐정팡', color: '#B08968', cheek: '#DDC7B2', accessory: '🎩', face: 'serious' },
  { id: 'cook', name: '깜짝팡', color: '#FF9F45', cheek: '#FFD3A8', accessory: '👒', face: 'surprised' },
  { id: 'music', name: '랄라팡', color: '#6EE7B7', cheek: '#C4F5E1', accessory: '🎧', face: 'humming' },
];

const SKIN_KEY = 'tajapang_skin';
const SKIN_EVENT = 'tajapang-skin-change';

export const getSkinById = (id: string | null) => PLAYER_SKINS.find(s => s.id === id) ?? PLAYER_SKINS[0];

// 저장된 스킨 id (처음이면 무작위로 하나 정해 저장)
export const getPlayerSkinId = (): string => {
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (saved && PLAYER_SKINS.some(s => s.id === saved)) return saved;
    const picked = PLAYER_SKINS[Math.floor(Math.random() * PLAYER_SKINS.length)].id;
    localStorage.setItem(SKIN_KEY, picked);
    return picked;
  } catch {
    return PLAYER_SKINS[0].id;
  }
};

export const getPlayerSkin = () => getSkinById(getPlayerSkinId());

export const savePlayerSkin = (id: string) => {
  try {
    localStorage.setItem(SKIN_KEY, id);
  } catch {
    // 저장이 막힌 브라우저면 이번 화면에서만 바뀜
  }
  window.dispatchEvent(new Event(SKIN_EVENT));
};

const subscribe = (onChange: () => void) => {
  window.addEventListener(SKIN_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(SKIN_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
};

// 서버 렌더링 중에는 null (첫 화면처럼 서버에서도 그려지는 곳용)
export const usePlayerSkin = (): PlayerSkin | null => {
  const id = useSyncExternalStore(subscribe, getPlayerSkinId, () => null);
  return id ? getSkinById(id) : null;
};

// ───────── 표정 그리기 (보스 캐릭터와 같은 120×120 좌표) ─────────

const DotEye = ({ x }: { x: number }) => (
  <g>
    <circle cx={x} cy="52" r="7" fill="#111" />
    <circle cx={x + 2.5} cy="49.5" r="2.2" fill="#fff" />
  </g>
);
const HappyEye = ({ x }: { x: number }) => <path d={`M${x - 7},56 Q${x},44 ${x + 7},56`} stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />;
const ClosedEye = ({ x }: { x: number }) => <path d={`M${x - 7},52 Q${x},58 ${x + 7},52`} stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />;
const StarEye = ({ x }: { x: number }) => (
  <path d={`M${x},43 L${x + 2.6},49.5 L${x + 9},50 L${x + 4},54.5 L${x + 5.6},61 L${x},57.4 L${x - 5.6},61 L${x - 4},54.5 L${x - 9},50 L${x - 2.6},49.5 Z`} fill="#111" />
);
const RoundEye = ({ x }: { x: number }) => (
  <g>
    <circle cx={x} cy="52" r="8" fill="#fff" stroke="#111" strokeWidth="3" />
    <circle cx={x} cy="52" r="3.5" fill="#111" />
  </g>
);
const XEye = ({ x }: { x: number }) => <path d={`M${x - 6},46 L${x + 6},58 M${x + 6},46 L${x - 6},58`} stroke="#111" strokeWidth="4" strokeLinecap="round" />;

const SMILE = <path d="M48,76 Q60,84 72,76" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />;
const GRIN = <path d="M42,72 Q60,94 78,72 Z" fill="#7f1d1d" stroke="#111" strokeWidth="3" strokeLinejoin="round" />;

const renderFace = (face: SkinFace, mood: PlayerMood) => {
  if (mood === 'hurt') {
    return (
      <>
        <XEye x={42} />
        <XEye x={78} />
        <ellipse cx="60" cy="80" rx="7" ry="9" fill="#7f1d1d" stroke="#111" strokeWidth="3" />
      </>
    );
  }
  if (mood === 'happy') {
    return (
      <>
        <HappyEye x={42} />
        <HappyEye x={78} />
        {GRIN}
      </>
    );
  }
  switch (face) {
    case 'wink':
      return (<><DotEye x={42} /><HappyEye x={78} />{SMILE}</>);
    case 'star':
      return (<><StarEye x={42} /><StarEye x={78} />{GRIN}</>);
    case 'grin':
      return (<><HappyEye x={42} /><HappyEye x={78} />{GRIN}</>);
    case 'tongue':
      return (
        <>
          <DotEye x={42} />
          <DotEye x={78} />
          {SMILE}
          <path d="M55,80 Q60,92 66,80 Z" fill="#f472b6" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" />
        </>
      );
    case 'shy':
      return (
        <>
          <HappyEye x={42} />
          <HappyEye x={78} />
          <ellipse cx="30" cy="68" rx="9" ry="5" fill="#fda4af" />
          <ellipse cx="90" cy="68" rx="9" ry="5" fill="#fda4af" />
          <path d="M52,78 Q60,82 68,78" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      );
    case 'cool':
      return (
        <>
          <rect x="30" y="44" width="25" height="15" rx="6" fill="#111" />
          <rect x="65" y="44" width="25" height="15" rx="6" fill="#111" />
          <path d="M55,50 L65,50" stroke="#111" strokeWidth="4" />
          <path d="M34,48 L42,48" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeLinecap="round" />
          {SMILE}
        </>
      );
    case 'serious':
      return (
        <>
          <DotEye x={42} />
          <DotEye x={78} />
          <path d="M32,38 L52,43 M88,38 L68,43" stroke="#111" strokeWidth="4" strokeLinecap="round" />
          <path d="M50,79 L70,79" stroke="#111" strokeWidth="4" strokeLinecap="round" />
        </>
      );
    case 'surprised':
      return (<><RoundEye x={42} /><RoundEye x={78} /><ellipse cx="60" cy="80" rx="6" ry="7" fill="#7f1d1d" stroke="#111" strokeWidth="3" /></>);
    case 'humming':
      return (<><ClosedEye x={42} /><ClosedEye x={78} /><path d="M50,76 Q60,86 70,76" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" /></>);
    default:
      return (<><HappyEye x={42} /><HappyEye x={78} />{SMILE}</>);
  }
};

// 플레이어 캐릭터 (보스 캐릭터와 같은 모양)
export function PlayerCharacter({ skin, mood = 'idle', size = 96 }: { skin: PlayerSkin; mood?: PlayerMood; size?: number }) {
  // 수줍팡은 표정에 볼터치가 들어 있어 평소엔 볼을 생략
  const showCheeks = skin.face !== 'shy' || mood !== 'idle';
  return (
    <div className="relative inline-flex flex-col items-center select-none shrink-0" style={{ width: size, height: size }}>
      <span className="absolute -top-[18%] left-1/2 -translate-x-1/2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)] z-10 leading-none" style={{ fontSize: size * 0.32 }}>
        {skin.accessory}
      </span>
      <svg
        viewBox="0 0 120 120"
        width={size}
        height={size}
        role="img"
        aria-label={`${skin.name} 캐릭터`}
        className={`transition-all duration-300 ${mood === 'hurt' ? '-rotate-6' : ''}`}
      >
        <ellipse cx="60" cy="114" rx="38" ry="5" fill="rgba(0,0,0,0.15)" />
        <path d="M14,70 C14,30 34,14 60,14 C86,14 106,30 106,70 C106,100 88,110 60,110 C32,110 14,100 14,70 Z" fill={skin.color} stroke="#111" strokeWidth="4" />
        <path d="M28,48 C30,34 40,26 52,24" stroke="rgba(255,255,255,0.45)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {showCheeks && (
          <>
            <circle cx="30" cy="70" r="7" fill={skin.cheek} opacity="0.8" />
            <circle cx="90" cy="70" r="7" fill={skin.cheek} opacity="0.8" />
          </>
        )}
        {renderFace(skin.face, mood)}
      </svg>
    </div>
  );
}

// 캐릭터 고르기 팝업 (Esc·바깥 누르기로 닫힘)
export function SkinPickerModal({ selectedId, onSelect, onClose }: { selectedId: string | null; onSelect: (id: string) => void; onClose: () => void }) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="배움팡 친구 고르기"
        className="max-w-[560px] w-full max-h-[90vh] overflow-y-auto bg-[#FAF9F6] border-4 border-black rounded-3xl p-5 md:p-6 shadow-[6px_6px_0px_#000] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex justify-between items-center border-b-4 border-black pb-2">
          <h2 className="text-xl font-black text-slate-800">배움팡 친구 고르기</h2>
          <button
            onClick={onClose}
            aria-label="배움팡 친구 고르기 닫기"
            className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center bg-[#FFE5EC] font-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:scale-90 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
          {PLAYER_SKINS.map(skin => {
            const selected = skin.id === selectedId;
            return (
              <button
                key={skin.id}
                onClick={() => onSelect(skin.id)}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-1 pt-4 pb-2 rounded-2xl border-4 transition-all cursor-pointer ${selected
                  ? 'border-black bg-[#FFE600] shadow-[3px_3px_0px_#000]'
                  : 'border-transparent bg-white hover:border-black/30'
                  }`}
              >
                <PlayerCharacter skin={skin} size={64} />
                <span className="text-xs font-black text-slate-800">{skin.name}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={onClose}
          className="self-center bg-[#D8F3DC] text-slate-800 border-4 border-black px-8 py-2 rounded-xl font-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
        >
          이 캐릭터로 할래요!
        </button>
      </div>
    </div>
  );
}
