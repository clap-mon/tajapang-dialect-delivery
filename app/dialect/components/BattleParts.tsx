import type { DialectBoss, DialectLine } from '../data/dialectBosses';
import { splitLine } from '../data/dialectBosses';

export type BossMood = 'idle' | 'hurt' | 'happy' | 'ko';

// 이모지에 없거나 작게 보이는 소품은 이름으로 표시하고 직접 그림
// (충청 호두 장군의 투구, 전라 비빔 대감의 갓, 경상 첨성대 박사의 첨성대, 강원 설악 산신령의 눈 덮인 봉우리, 표준어 박사의 학사모)
export const HELMET = 'helmet';
export const GAT = 'gat';
export const CHEOMSEONGDAE = 'cheomseongdae';
export const SNOW_PEAK = 'snowpeak';
export const MORTARBOARD = 'mortarboard';
const DRAWN_ACCESSORIES = [HELMET, GAT, CHEOMSEONGDAE, SNOW_PEAK, MORTARBOARD];

// 보스 머리 위 소품: 이모지는 그대로, 갓은 검은 흑립 그림
export function BossAccessory({ accessory, size = 32 }: { accessory: string; size?: number }) {
  if (accessory === GAT) {
    return (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" role="img" aria-label="갓">
        {/* 넓은 양태(챙): 대오리로 엮은 반투명 느낌 */}
        <ellipse cx="50" cy="44" rx="47" ry="11" fill="rgba(17,17,17,0.82)" stroke="#111" strokeWidth="3" />
        <ellipse cx="50" cy="42" rx="40" ry="7" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
        {/* 대우(모자 몸통) */}
        <path d="M33,42 L35,14 Q50,8 65,14 L67,42 Z" fill="#111" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M38,18 Q50,14 60,17" stroke="rgba(255,255,255,0.3)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* 갓끈 */}
        <path d="M30,46 Q26,56 32,59 M70,46 Q74,56 68,59" stroke="#7c2d12" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (accessory === HELMET) {
    return (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" role="img" aria-label="장군 투구">
        {/* 붉은 술과 꼭지 */}
        <rect x="46" y="9" width="8" height="8" fill="#A8A29E" stroke="#111" strokeWidth="2" />
        <ellipse cx="50" cy="8" rx="10" ry="6" fill="#DC2626" stroke="#111" strokeWidth="2.5" />
        {/* 둥근 투구 몸통 */}
        <path d="M21,46 Q21,15 50,15 Q79,15 79,46 Z" fill="#57534E" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M30,32 Q33,22 44,19" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" strokeLinecap="round" />
        {/* 챙 */}
        <rect x="12" y="42" width="76" height="11" rx="5.5" fill="#A16207" stroke="#111" strokeWidth="3" />
        {/* 이마의 호두 장식 */}
        <ellipse cx="50" cy="32" rx="8" ry="9" fill="#C2410C" stroke="#111" strokeWidth="2" />
        <path d="M50,24 L50,40 M45,28 Q47,32 45,36 M55,28 Q53,32 55,36" stroke="#7C2D12" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (accessory === CHEOMSEONGDAE) {
    return (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" role="img" aria-label="첨성대">
        {/* 받침돌 */}
        <rect x="27" y="50" width="46" height="8" rx="1" fill="#A8A29E" stroke="#111" strokeWidth="2.5" />
        {/* 병 모양 몸통 */}
        <path d="M33,50 Q28,32 40,16 L60,16 Q72,32 67,50 Z" fill="#E7E5E4" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M32,42 L68,42 M31,34 L69,34 M35,25 L65,25" stroke="#A8A29E" strokeWidth="1.5" />
        {/* 가운데 네모 창 */}
        <rect x="45" y="27" width="10" height="9" fill="#44403C" stroke="#111" strokeWidth="1.5" />
        {/* 꼭대기 우물 정(井) 자 돌 */}
        <rect x="35" y="7" width="30" height="9" fill="#D6D3D1" stroke="#111" strokeWidth="2.5" />
        <path d="M45,7 L45,16 M55,7 L55,16" stroke="#111" strokeWidth="2" />
        {/* 반짝이는 별 */}
        <path d="M84,8 L86,13 L91,14 L86,16 L84,21 L82,16 L77,14 L82,13 Z" fill="#FACC15" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (accessory === SNOW_PEAK) {
    return (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" role="img" aria-label="눈 덮인 봉우리">
        {/* 바위 봉우리 두 개 */}
        <path d="M8,55 L34,18 L48,36 L64,8 L92,55 Z" fill="#78716C" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M64,8 L72,22" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round" />
        {/* 흰 눈 */}
        <path d="M64,8 L55,24 L60,21 L64,26 L68,21 L74,24 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        <path d="M34,18 L27,28 L31,26 L35,30 L38,26 L41,27 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
        {/* 산허리 구름 */}
        <path d="M14,52 Q12,44 20,44 Q22,38 29,41 Q34,38 37,44 Q43,45 41,52 Z" fill="#fff" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (accessory === MORTARBOARD) {
    return (
      <svg viewBox="0 0 100 60" width={size} height={size * 0.6} className="drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)]" role="img" aria-label="학사모">
        {/* 머리에 닿는 모자 몸통 */}
        <path d="M27,28 L27,45 Q50,56 73,45 L73,28 Z" fill="#312E81" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        {/* 네모난 판 */}
        <path d="M50,5 L96,21 L50,37 L4,21 Z" fill="#1E1B4B" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        <path d="M50,10 L84,21" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
        {/* 술 */}
        <circle cx="50" cy="21" r="3.5" fill="#FACC15" stroke="#111" strokeWidth="1.5" />
        <path d="M50,21 L82,27 L82,44" stroke="#FACC15" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="78" y="43" width="8" height="11" rx="2" fill="#FACC15" stroke="#111" strokeWidth="1.5" />
      </svg>
    );
  }
  return <span style={{ fontSize: size }} className="leading-none">{accessory}</span>;
}

// 보스 캐릭터 (말랑한 몸통 + 표정 + 머리 위 소품)
export function BossAvatar({ boss, mood = 'idle', size = 120 }: { boss: DialectBoss; mood?: BossMood; size?: number }) {
  const { main, light } = boss.color;
  const eyeY = 52;

  const eyes = (() => {
    if (mood === 'hurt' || mood === 'ko') {
      // 질끈 감은 X 눈
      return (
        <g stroke="#111" strokeWidth="4" strokeLinecap="round">
          <path d="M36,46 L48,58 M48,46 L36,58" />
          <path d="M72,46 L84,58 M84,46 L72,58" />
        </g>
      );
    }
    if (mood === 'happy') {
      // 웃는 눈 (^ ^)
      return (
        <g stroke="#111" strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M35,56 Q42,44 49,56" />
          <path d="M71,56 Q78,44 85,56" />
        </g>
      );
    }
    return (
      <g>
        <circle cx="42" cy={eyeY} r="7" fill="#111" />
        <circle cx="78" cy={eyeY} r="7" fill="#111" />
        <circle cx="44.5" cy={eyeY - 2.5} r="2.2" fill="#fff" />
        <circle cx="80.5" cy={eyeY - 2.5} r="2.2" fill="#fff" />
      </g>
    );
  })();

  const mouth = (() => {
    if (mood === 'hurt') return <ellipse cx="60" cy="78" rx="8" ry="10" fill="#7f1d1d" stroke="#111" strokeWidth="3" />;
    if (mood === 'ko') return <path d="M46,82 Q53,74 60,82 Q67,90 74,82" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />;
    if (mood === 'happy') return <path d="M42,72 Q60,94 78,72 Z" fill="#7f1d1d" stroke="#111" strokeWidth="3" strokeLinejoin="round" />;
    return <path d="M48,76 Q60,84 72,76" stroke="#111" strokeWidth="4" fill="none" strokeLinecap="round" />;
  })();

  return (
    <div className="relative inline-flex flex-col items-center select-none" style={{ width: size, height: size }}>
      {DRAWN_ACCESSORIES.includes(boss.accessory) ? (
        <span className="absolute -top-[12%] left-1/2 -translate-x-1/2 z-10">
          <BossAccessory accessory={boss.accessory} size={size * 0.62} />
        </span>
      ) : (
        <span className="absolute -top-[18%] left-1/2 -translate-x-1/2 drop-shadow-[2px_2px_0px_rgba(0,0,0,0.3)] z-10" style={{ fontSize: size * 0.32 }}>
          {boss.accessory}
        </span>
      )}
      <svg viewBox="0 0 120 120" width={size} height={size} className={mood === 'ko' ? 'opacity-70 rotate-6 transition-all duration-500' : 'transition-all duration-300'}>
        <ellipse cx="60" cy="114" rx="38" ry="5" fill="rgba(0,0,0,0.15)" />
        <path d="M14,70 C14,30 34,14 60,14 C86,14 106,30 106,70 C106,100 88,110 60,110 C32,110 14,100 14,70 Z" fill={main} stroke="#111" strokeWidth="4" />
        <path d="M28,48 C30,34 40,26 52,24" stroke="rgba(255,255,255,0.45)" strokeWidth="5" fill="none" strokeLinecap="round" />
        <circle cx="30" cy="70" r="7" fill={light} opacity="0.8" />
        <circle cx="90" cy="70" r="7" fill={light} opacity="0.8" />
        {eyes}
        {mouth}
      </svg>
    </div>
  );
}

// 체력바 (줄어들 때 흰색 잔상이 뒤따라오는 애니메이션)
export function HpBar({ label, hp, maxHp, align = 'left' }: { label: string; hp: number; maxHp: number; align?: 'left' | 'right' }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const color = ratio > 0.5 ? 'bg-emerald-500' : ratio > 0.25 ? 'bg-amber-400' : 'bg-rose-500';
  return (
    <div className="w-full">
      {/* 이름·체력 글씨 뒤 반투명 흰 바탕 (경상 밤하늘처럼 어두운 배경에서도 잘 보이게) */}
      {/* 높이를 늘리지 않도록 위아래 여백 없이, 아래 간격도 줄임 (바탕을 넣기 전보다 오히려 2px 낮음) */}
      <div className={`flex items-baseline justify-between gap-2 mb-0.5 bg-white/80 rounded-md px-1.5 leading-tight ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span className="text-xs md:text-sm font-black text-slate-900 truncate">{label}</span>
        <span className="text-[11px] font-black text-slate-600 shrink-0">❤️ {Math.max(0, hp)} / {maxHp}</span>
      </div>
      <div className="h-4 md:h-5 bg-slate-200 border-[3px] border-black rounded-full overflow-hidden relative shadow-[2px_2px_0px_#000]">
        <div className="absolute inset-y-0 left-0 bg-white transition-all duration-1000 delay-300 ease-out" style={{ width: `${ratio * 100}%` }} />
        <div className={`absolute inset-y-0 left-0 ${color} transition-all duration-500 ease-out`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  );
}

// 문장 끝(!, ?, .) 뒤에서 나눠 한 문장씩 한 줄로 (예: "혼저 옵서예! 하르방이 기다렸수다" → 두 줄)
export const splitSentences = (text: string) => text.split(/(?<=[!?.])\s+/).filter(Boolean);

// 보스 말풍선 (방언 대사, 그 보스를 이긴 뒤에만 아래에 표준어 풀이)
// compact: 브라우저 창이 낮을 때 뜻 풀이를 한 줄로 줄여 말풍선 높이를 낮춤 (체력바가 무대 밖으로 밀리지 않게)
export function SpeechBubble({ line, color, showStandard, compact = false }: { line: DialectLine; color: string; showStandard: boolean; compact?: boolean }) {
  const { dialect, standard } = splitLine(line);
  return (
    <div className={`relative bg-white border-4 border-black rounded-2xl px-3 shadow-[3px_3px_0px_#000] max-w-[260px] animate-shout-pop ${compact ? 'py-1' : 'py-2'}`}>
      {splitSentences(dialect).map((sentence, i) => (
        <p key={i} className={`font-black break-keep ${compact ? 'text-sm leading-tight' : 'text-sm md:text-base leading-snug'}`} style={{ color }}>{sentence}</p>
      ))}
      {showStandard && standard && (
        compact ? (
          <p className="mt-0.5 pt-0.5 border-t border-slate-200 text-[10px] font-bold text-slate-500 leading-tight truncate">= {standard}</p>
        ) : (
          <div className="mt-1 pt-1 border-t border-slate-200">
            {splitSentences(standard).map((sentence, i) => (
              <p key={i} className="text-[10px] md:text-[11px] font-bold text-slate-500 leading-snug break-keep">{i === 0 ? '= ' : ''}{sentence}</p>
            ))}
          </div>
        )
      )}
      <span className="absolute -bottom-[14px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[10px] border-r-[10px] border-t-[12px] border-l-transparent border-r-transparent border-t-black" />
      <span className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-white" />
    </div>
  );
}
