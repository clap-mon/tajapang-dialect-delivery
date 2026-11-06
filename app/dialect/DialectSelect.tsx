"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TajaPangLogo from '../components/TajaPangLogo';
import { clearDialectBossRecord, getDialectClears, getDialectProgress, hasSeenDialectRules, markDialectRulesSeen, saveDialectProgress, type DialectProgress } from '@/lib/storage';
import { BATTLE_RULES, DIALECT_BOSSES, HIDDEN_BOSS, bossCpmAtLevel, bossLevel, finisherDamageFor, isHiddenUnlocked, splitLine, type DialectBoss } from './data/dialectBosses';
import { BossAvatar, splitSentences } from './components/BattleParts';
import { isMuted, setMuted } from './components/sound';
import { appConfirm } from '@/lib/appDialog';

type OptionKey = 'shieldOption' | 'showSpace' | 'previewMeaning' | 'relaxedMode' | 'fastMode';

// 대결 설정 체크 항목 (효과음은 따로 저장)
const SETTING_OPTIONS: { key: OptionKey; label: string; desc: string }[] = [
  { key: 'shieldOption', label: '🛡️ 방패 사용', desc: `무결점 ${BATTLE_RULES.shieldEvery}번마다 방패 1개(최대 1개). 진 라운드의 피해를 한 번 막아 줘요.` },
  { key: 'showSpace', label: '🔤 띄어쓰기 기호(␣) 표시', desc: '카드와 필살 문장의 띄어쓰기를 ␣ 기호로 보여 줘요.' },
  { key: 'previewMeaning', label: '📖 카드 뜻 미리 보기', desc: '카드를 고를 때 방언 아래에 표준어 뜻을 흐리게 보여 줘요.' },
  { key: 'relaxedMode', label: '⌛ 여유 모드', desc: `제한시간이 ${BATTLE_RULES.relaxedBonusSec}초 늘어나요. 이겨도 보스 레벨은 오르지 않아요.` },
  { key: 'fastMode', label: '⏩ 연출 빠르게', desc: '"가위! 바위! 보!" 구호와 결과 공개 시간을 절반으로 줄여요.' },
];

export default function DialectSelect() {
  const router = useRouter();
  const [progress, setProgress] = useState<DialectProgress>(getDialectProgress);
  const [muted, setMutedState] = useState(isMuted);

  const clearedCount = DIALECT_BOSSES.filter(b => progress.cleared[b.id]).length;
  // 숨겨진 보스: 다섯 지역 보스를 모두 이기면 오른쪽 위 상자가 도전 버튼으로 바뀜
  const hiddenUnlocked = isHiddenUnlocked(progress.cleared);
  const hiddenRecord = progress.cleared[HIDDEN_BOSS.id];
  const [showHidden, setShowHidden] = useState(false);

  // 이 화면에 처음 들어오면 규칙 팝업을 한 번 자동으로 열어 줌
  const [showRules, setShowRules] = useState(() => !hasSeenDialectRules());
  const [showSettings, setShowSettings] = useState(false); // 대결 설정 팝업

  const closeRules = () => {
    markDialectRulesSeen();
    setShowRules(false);
  };

  // 켜져 있는 설정 아이콘 (헤더 버튼에 작게 표시)
  const activeIcons = [
    ...SETTING_OPTIONS.filter(opt => progress[opt.key]).map(opt => opt.label.split(' ')[0]),
    ...(muted ? ['🔇'] : []),
  ];

  const toggleOption = (key: OptionKey) => {
    const updated = { ...progress, [key]: !progress[key] };
    saveDialectProgress(updated);
    setProgress(updated);
  };

  // 보스 하나의 클리어 기록·LV·뜻 공개만 처음으로 (이미 열린 다음 보스는 그대로 열림)
  const clearRecord = async (bossId: string, region: string) => {
    const relock = hiddenUnlocked && bossId !== HIDDEN_BOSS.id
      ? `\n${HIDDEN_BOSS.name}도 다시 잠겨요. (${HIDDEN_BOSS.name} 기록은 그대로 남아요)`
      : '';
    if (!await appConfirm(`${region} 보스의 클리어 기록을 지울까요?\n최소 라운드 기록과 레벨이 처음으로 돌아가고, 보스 대사의 뜻도 다시 가려져요.${relock}`)) return;
    setProgress(clearDialectBossRecord(bossId));
  };

  const toggleMute = () => {
    setMuted(!muted);
    setMutedState(!muted);
  };

  return (
    <main className="min-h-screen bg-[#FFF59D] p-3 md:p-4 flex flex-col justify-center">
      <div className="max-w-6xl mx-auto space-y-3.5 w-full">
        {/* 헤더 섹션 */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4 bg-white p-4 rounded-[28px] border-4 border-black shadow-[8px_8px_0px_#000] animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full flex-1 justify-between">
            <div className="flex flex-col items-center sm:items-start">
              <TajaPangLogo size="md" />
              <span className="mt-1 bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border-2 border-black shadow-[1.5px_1.5px_0px_#000]">
                ⚔️ 방언 타자 대결
              </span>
            </div>

            <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-4 w-full sm:border-l-4 lg:border-r-4 sm:border-black sm:mx-6 sm:px-6 py-0.5">
              <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                <span className="text-2xl md:text-4xl font-black text-indigo-950 tracking-tight leading-none whitespace-nowrap">
                  보스 고르기
                </span>
                <button
                  onClick={() => setShowRules(true)}
                  className="bg-[#FFE600] text-slate-900 border-4 border-black px-4 py-2 rounded-xl font-black text-sm shadow-[3px_3px_0px_#000] hover:bg-[#FFD600] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  📜 규칙 보기
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-white text-slate-900 border-4 border-black px-4 py-2 rounded-xl font-black text-sm shadow-[3px_3px_0px_#000] hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                >
                  ⚙️ 대결 설정
                  {/* 켜 둔 설정을 작은 아이콘으로 보여 줌 */}
                  {activeIcons.length > 0 && (
                    <span className="text-xs bg-slate-100 border-2 border-black rounded-full px-1.5 leading-tight">{activeIcons.join('')}</span>
                  )}
                </button>
              </div>
              <button
                onClick={() => router.push('/')}
                className="bg-rose-500 text-white text-sm px-6 py-2.5 rounded-xl border-4 border-black whitespace-nowrap shrink-0 hover:bg-rose-600 hover:-translate-y-0.5 transition-all font-black cursor-pointer shadow-[3px_3px_0px_#000] active:translate-y-0 active:shadow-[1px_1px_0px_#000]"
              >
                🚪 나가기
              </button>
            </div>
          </div>

          {/* 물리친 보스 수 → 다섯 보스를 모두 이기면 숨겨진 보스 도전 버튼 → 숨겨진 보스까지 이기면 모두 정복 */}
          {!hiddenUnlocked ? (
            <div className="text-center bg-[#00F0FF] px-6 py-2.5 rounded-[20px] border-4 border-black shadow-[4px_4px_0px_#000] min-w-[150px]">
              <p className="text-slate-900 font-black text-sm uppercase tracking-widest mb-1">물리친 보스</p>
              <p className="text-3xl font-black text-slate-900 leading-none">
                {clearedCount} <span className="text-sm font-bold text-slate-800">/ {DIALECT_BOSSES.length}</span>
              </p>
              <p className="mt-1.5 text-[10px] font-black text-slate-700 whitespace-nowrap">❓ 다섯 보스를 모두 이기면…</p>
            </div>
          ) : (
            <button
              onClick={() => setShowHidden(true)}
              className={`text-center px-4 py-2.5 rounded-[20px] border-4 border-black min-w-[150px] cursor-pointer transition-transform hover:-translate-y-0.5 active:scale-95 ${hiddenRecord
                ? 'bg-[#FFE600] text-slate-900 shadow-[4px_4px_0px_#000]'
                : 'bg-gradient-to-br from-violet-500 to-indigo-700 text-white animate-hidden-glow'
                }`}
            >
              {hiddenRecord ? (
                <>
                  <p className="font-black text-sm tracking-widest mb-1">🏆 모두 정복!</p>
                  <p className="text-3xl font-black leading-none">
                    {DIALECT_BOSSES.length + 1} <span className="text-sm font-bold">/ {DIALECT_BOSSES.length + 1}</span>
                  </p>
                  <p className="mt-1.5 text-[10px] font-black text-slate-700 whitespace-nowrap">🎓 {HIDDEN_BOSS.name} 다시 도전</p>
                </>
              ) : (
                <>
                  <p className="font-black text-xs mb-1 text-violet-100 whitespace-nowrap">✨ 숨겨진 보스 등장!</p>
                  <div className="text-xl font-black leading-tight whitespace-nowrap flex items-center justify-center gap-1.5">
                    {/* 보라 버튼에 보라 캐릭터가 묻히지 않도록 흰 동그라미 받침 */}
                    <span className="w-11 h-11 shrink-0 rounded-full bg-white border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-end justify-center pb-0.5">
                      <BossAvatar boss={HIDDEN_BOSS} size={30} />
                    </span>
                    {HIDDEN_BOSS.name}
                  </div>
                  <p className="mt-1 text-[11px] font-black text-[#FFE600] whitespace-nowrap">⚔️ 눌러서 도전하기</p>
                </>
              )}
            </button>
          )}
        </div>

        {/* 보스 카드 목록 (제주 → 충청 → 전라 → 경상 → 강원) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DIALECT_BOSSES.map(boss => {
            const locked = boss.order > progress.unlocked;
            const record = progress.cleared[boss.id];
            const level = bossLevel(getDialectClears(record)); // 이 보스를 이긴 횟수만큼 다음 도전 LV 상승
            // 새로 열린 보스: 지금까지 열린 보스 중 가장 뒤에 있고 아직 이기지 못한 보스
            const isNew = !locked && !record && boss.order > 1 && boss.order === progress.unlocked;
            const intro = splitLine(boss.intro);
            return (
              <div
                key={boss.id}
                className={`relative bg-white rounded-[24px] border-4 border-black shadow-[6px_6px_0px_#000] p-3.5 flex flex-col gap-2.5 overflow-hidden ${locked ? '' : 'hover:-translate-y-1 transition-transform'}`}
              >
                <div className="absolute inset-x-0 top-0 h-24 border-b-4 border-black" style={{ backgroundColor: boss.color.light }} />
                <div className="relative flex items-start justify-between">
                  <span className="flex items-center gap-1">
                    <span className="bg-black text-white text-[10px] font-black px-2 py-0.5 rounded-md">{boss.order}단계</span>
                    {isNew && <span className="bg-rose-500 text-white border-2 border-black text-[9px] font-black px-1.5 py-0.5 rounded-md animate-bounce-subtle">새로 열림</span>}
                  </span>
                  <span className="bg-white border-[3px] border-black text-base font-black px-3 py-1 rounded-lg shadow-[2px_2px_0px_#000] leading-none" style={{ color: boss.color.dark }}>
                    {boss.region}
                  </span>
                </div>
                <div className="relative flex justify-center -mt-1">
                  <BossAvatar boss={boss} size={88} mood={record ? 'happy' : 'idle'} />
                </div>
                <div className="relative text-center">
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{boss.name}</h3>
                  <div className="text-[10px] font-bold text-slate-500 leading-snug mt-1 min-h-[28px] break-keep">
                    {boss.concept.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                  </div>
                </div>
                <div className="bg-slate-50 border-2 border-black rounded-xl px-2.5 py-1.5 text-center">
                  {splitSentences(intro.dialect).map((sentence, i) => (
                    <p key={i} className="text-[11px] font-black leading-snug" style={{ color: boss.color.dark }}>{sentence}</p>
                  ))}
                  {record ? (
                    <p className="text-[9px] font-bold text-slate-500 leading-snug mt-0.5">= {intro.standard}</p>
                  ) : (
                    <p className="text-[9px] font-bold text-slate-400 leading-snug mt-0.5">🔒 이기면 뜻이 공개돼요</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] font-black text-slate-700">
                  <span className="bg-slate-100 border border-black rounded-md px-1.5 py-0.5">⏱️ {boss.stats.timeLimit}초</span>
                  <span className="bg-slate-100 border border-black rounded-md px-1.5 py-0.5">⚡ {bossCpmAtLevel(boss, level)}타</span>
                  <span className="bg-slate-100 border border-black rounded-md px-1.5 py-0.5">❤️ {boss.stats.hp}</span>
                  <span className="bg-slate-100 border border-black rounded-md px-1.5 py-0.5">💥 {boss.stats.attack}</span>
                </div>
                {record && (
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-[10px] font-black text-amber-700 whitespace-nowrap">⭐ 클리어! 최소 {record.bestRounds}라운드</p>
                    <button
                      onClick={() => clearRecord(boss.id, boss.region)}
                      title={`${boss.region} 클리어 기록 지우기`}
                      className="text-[9px] font-black text-slate-500 bg-white border border-slate-400 rounded-md px-1.5 py-0.5 hover:text-rose-600 hover:border-rose-500 cursor-pointer"
                    >
                      🗑️ 기록 지우기
                    </button>
                  </div>
                )}
                <button
                  disabled={locked}
                  onClick={() => router.push(`/dialect/play?boss=${boss.id}`)}
                  className="mt-auto w-full py-2.5 border-4 border-black rounded-xl font-black text-sm shadow-[3px_3px_0px_#000] transition-all cursor-pointer hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  style={{ backgroundColor: locked ? '#E2E8F0' : boss.color.main, color: locked ? '#475569' : '#fff' }}
                >
                  {locked ? '🔒 잠김' : record ? '🔁 다시 도전' : '⚔️ 도전하기'}
                </button>
                {level >= 2 && (
                  <p className="-mt-1 text-[10px] font-black text-indigo-700 text-center">레벨 {level} · 타수 +{(level - 1) * BATTLE_RULES.levelCpmStep}{level === BATTLE_RULES.maxLevel ? ' (최고 레벨)' : ''}</p>
                )}
                {locked && (
                  <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 text-center p-4 break-keep">
                    <span className="text-4xl">🔒</span>
                    <span className="bg-white border-2 border-black rounded-xl px-3 py-1.5 text-[11px] font-black text-slate-800 shadow-[2px_2px_0px_#000]">
                      이전 보스를 이기면 열려요
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showRules && <RulesModal onClose={closeRules} />}

      {/* 숨겨진 보스 소개 팝업 */}
      {showHidden && hiddenUnlocked && (
        <HiddenBossModal
          boss={HIDDEN_BOSS}
          progress={progress}
          onClose={() => setShowHidden(false)}
          onStart={() => router.push(`/dialect/play?boss=${HIDDEN_BOSS.id}`)}
          onClearRecord={() => clearRecord(HIDDEN_BOSS.id, HIDDEN_BOSS.name)}
        />
      )}

      {/* 대결 설정 팝업 (체크하면 바로 저장) */}
      {showSettings && (
        <ModalFrame label="대결 설정" onClose={() => setShowSettings(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {SETTING_OPTIONS.map(opt => (
              <label key={opt.key} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border-2 border-black cursor-pointer hover:bg-slate-100">
                <input type="checkbox" checked={progress[opt.key]} onChange={() => toggleOption(opt.key)} className="w-5 h-5 mt-0.5 accent-indigo-600 shrink-0" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-black">{opt.label}</span>
                  <span className="text-xs font-bold text-slate-500 leading-snug">{opt.desc}</span>
                </span>
              </label>
            ))}
            <label className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border-2 border-black cursor-pointer hover:bg-slate-100">
              <input type="checkbox" checked={!muted} onChange={toggleMute} className="w-5 h-5 mt-0.5 accent-indigo-600 shrink-0" />
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-black">{muted ? '🔇' : '🔊'} 효과음 켜기</span>
                <span className="text-xs font-bold text-slate-500 leading-snug">가위바위보 구호, 공격, 승패 효과음을 들려줘요.</span>
              </span>
            </label>
          </div>
        </ModalFrame>
      )}
    </main>
  );
}

// 타자 가위바위보 규칙 팝업 (Esc 또는 바깥을 눌러 닫기)
function RulesModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const firstBoss = DIALECT_BOSSES[0];
  const lastBoss = DIALECT_BOSSES[DIALECT_BOSSES.length - 1];
  const rules = [
    { title: '카드 고르기', text: <>카드 3장 가운데 하나의 <strong>첫 글자</strong>를 치면 그 카드가 골라져요. 끝까지 친 뒤 <strong>엔터</strong>로 확정해요.</> },
    { title: '제한시간', text: <>시간 안에 못 치면 진 걸로 쳐요. 보스는 라운드가 시작될 때 낼 손을 미리 정해 둬요.</> },
    { title: '이기면 공격, 지면 피해', text: <>빨리 칠수록, 무결점(지우기 없이)일수록 보스에게 큰 피해를 줘요. 지면 보스의 공격을 받아요.</> },
    { title: '비기면', text: <>더 빨리 친 쪽이 작은 피해({BATTLE_RULES.drawDamage})를 줘요.</> },
    { title: '필살기', text: <>무결점 문장 {BATTLE_RULES.gaugeMax}개를 모으면 다음 라운드에 필살 문장이 나와요. 필살 문장을 {BATTLE_RULES.finisherTimeLimit}초 안에 끝까지 치면 보스 체력의 1/3만큼 피해를 줘요({firstBoss.region} {finisherDamageFor(firstBoss)} ~ {lastBoss.region} {finisherDamageFor(lastBoss)}).</> },
    { title: '보스 레벨', text: <>같은 보스를 이길 때마다 다음 도전에서 레벨이 올라 +{BATTLE_RULES.levelCpmStep}타씩 빨라져요(최고 레벨 {BATTLE_RULES.maxLevel}). 여유 모드로 이기면 레벨은 그대로예요.</> },
    { title: '뜻 풀이', text: <>결과가 나오면 카드 문장의 표준어 뜻을 보여 줘요. 보스 대사의 뜻은 그 보스를 이기면 공개돼요.</> },
    { title: '숨겨진 보스', text: <>다섯 지역 보스를 모두 이기면 숨겨진 보스 <strong>{HIDDEN_BOSS.name}</strong>가 나타나요. 다섯 지역 방언 카드를 보고 <strong>표준어 풀이</strong>를 쳐서 겨뤄요. 지역 보스 기록을 하나라도 지우면 다시 잠겨요.</> },
  ];

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="타자 가위바위보 규칙"
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-[28px] shadow-[8px_8px_0px_#000] p-5 md:p-7 flex flex-col gap-3 break-keep animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b-4 border-black">
          <h3 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight">타자 가위바위보 규칙</h3>
          <button
            onClick={onClose}
            aria-label="규칙 닫기"
            className="w-10 h-10 shrink-0 bg-rose-500 text-white border-4 border-black rounded-xl font-black shadow-[3px_3px_0px_#000] hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>
        <ol className="flex flex-col divide-y-2 divide-slate-200">
          {rules.map((r, i) => (
            <li key={r.title} className="flex gap-3.5 py-3">
              <span className="w-7 h-7 shrink-0 rounded-full bg-indigo-950 text-white text-sm font-black flex items-center justify-center mt-0.5">{i + 1}</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-base md:text-lg font-black text-slate-900">{r.title}</span>
                <p className="text-sm md:text-base font-medium text-slate-600 leading-relaxed">{r.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <button
          onClick={onClose}
          className="self-center mt-1 bg-[#FFE600] text-slate-900 border-4 border-black px-8 py-2.5 rounded-xl font-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
        >
          알겠어요!
        </button>
      </div>
    </div>
  );
}

// 공용 팝업 틀 (Esc·바깥 누르기·✕·[다 됐어요]로 닫힘)
function ModalFrame({ label, icon = '⚙️', closeLabel = '다 됐어요!', onClose, children }: { label: string; icon?: string; closeLabel?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-4 border-black rounded-[28px] shadow-[8px_8px_0px_#000] p-5 md:p-7 flex flex-col gap-4 break-keep animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b-4 border-black">
          <h3 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-tight">{icon} {label}</h3>
          <button
            onClick={onClose}
            aria-label={`${label} 닫기`}
            className="w-10 h-10 shrink-0 bg-rose-500 text-white border-4 border-black rounded-xl font-black shadow-[3px_3px_0px_#000] hover:bg-rose-600 active:scale-95 transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>
        {children}
        <button
          onClick={onClose}
          className="self-center mt-1 bg-[#FFE600] text-slate-900 border-4 border-black px-8 py-2.5 rounded-xl font-black shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
        >
          {closeLabel}
        </button>
      </div>
    </div>
  );
}

// 숨겨진 보스 소개 팝업 (소개·능력치·레벨·기록 지우기·도전하기)
function HiddenBossModal({ boss, progress, onClose, onStart, onClearRecord }: {
  boss: DialectBoss;
  progress: DialectProgress;
  onClose: () => void;
  onStart: () => void;
  onClearRecord: () => void;
}) {
  const record = progress.cleared[boss.id];
  const level = bossLevel(getDialectClears(record));
  return (
    <ModalFrame label={`숨겨진 보스 · ${boss.stage}`} icon="✨" closeLabel="닫기" onClose={onClose}>
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
        <div className="shrink-0 rounded-[24px] border-4 border-black px-6 pt-6 pb-3 shadow-[4px_4px_0px_#000]" style={{ backgroundColor: boss.color.light }}>
          <BossAvatar boss={boss} size={110} mood={record ? 'happy' : 'idle'} />
        </div>
        <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
          <h4 className="text-2xl font-black" style={{ color: boss.color.dark }}>{boss.name}</h4>
          <div className="text-sm font-bold text-slate-600 leading-snug">
            {boss.concept.split('\n').map((line, i) => <p key={i}>{line}</p>)}
          </div>
          <div className="bg-slate-50 border-2 border-black rounded-xl px-3 py-2">
            {splitSentences(splitLine(boss.intro).dialect).map((sentence, i) => (
              <p key={i} className="text-sm font-black leading-snug" style={{ color: boss.color.dark }}>{sentence}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-violet-50 border-2 border-black rounded-xl px-4 py-3 text-sm font-bold text-slate-700 leading-relaxed">
        <p className="font-black text-violet-800 mb-0.5">🎯 이렇게 겨뤄요</p>
        <p>다섯 지역 방언 카드가 나와요.</p>
        <p>카드 아래의 <strong>표준어 풀이</strong>를 끝까지 치고 엔터! 필살 문장도 표준어로 쳐요.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-black text-slate-700">
        <span className="bg-slate-100 border-2 border-black rounded-lg px-2 py-1 text-center">⏱️ {boss.stats.timeLimit}초</span>
        <span className="bg-slate-100 border-2 border-black rounded-lg px-2 py-1 text-center">⚡ {bossCpmAtLevel(boss, level)}타</span>
        <span className="bg-slate-100 border-2 border-black rounded-lg px-2 py-1 text-center">❤️ {boss.stats.hp}</span>
        <span className="bg-slate-100 border-2 border-black rounded-lg px-2 py-1 text-center">💥 {boss.stats.attack}</span>
      </div>

      {(record || level >= 2) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {record && <p className="text-xs font-black text-amber-700">⭐ 클리어! 최소 {record.bestRounds}라운드</p>}
          {level >= 2 && (
            <p className="text-xs font-black text-indigo-700">레벨 {level} · 타수 +{(level - 1) * BATTLE_RULES.levelCpmStep}{level === BATTLE_RULES.maxLevel ? ' (최고 레벨)' : ''}</p>
          )}
          {record && (
            <button
              onClick={onClearRecord}
              className="text-[11px] font-black text-slate-500 bg-white border border-slate-400 rounded-md px-2 py-0.5 hover:text-rose-600 hover:border-rose-500 cursor-pointer"
            >
              🗑️ 기록 지우기
            </button>
          )}
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-3 border-4 border-black rounded-xl font-black text-base text-white shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#000] active:scale-95 transition-all cursor-pointer"
        style={{ backgroundColor: boss.color.main }}
      >
        {record ? '🔁 다시 도전' : '⚔️ 도전하기'}
      </button>
    </ModalFrame>
  );
}
