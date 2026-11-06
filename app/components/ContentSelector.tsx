"use client";

import React, { useState } from 'react';
import { DIALECT_BOSSES, practiceLinesFor, splitLine, type BossId } from '../dialect/data/dialectBosses';
import { BossAccessory } from '../dialect/components/BattleParts';
import { appAlert } from '@/lib/appDialog';

type ContentMode = 'sentence' | 'word';

interface ContentSelectorProps {
  // 꾸러미 선택 완료 시 무작위로 뽑은 문제 목록("방언 - 표준어")과 모드를 전달
  onStart: (problemSet: string[], contentOption: ContentMode) => void;
}

const PROBLEM_COUNTS = [5, 10, 15, 20, 25, 30];

// 지역별 방언 꾸러미 (제주 · 충청 · 전라 · 경상 · 강원)
const REGION_PACKS = DIALECT_BOSSES.map(boss => ({
  id: boss.id,
  region: boss.region,
  icon: boss.accessory,
  color: boss.color,
  lines: practiceLinesFor(boss),
}));

export default function ContentSelector({ onStart }: ContentSelectorProps) {
  const [problemCount, setProblemCount] = useState(10);
  const [selectedId, setSelectedId] = useState<BossId>(REGION_PACKS[0].id);
  const [previewId, setPreviewId] = useState<BossId | null>(null);

  const selected = REGION_PACKS.find(p => p.id === selectedId) ?? REGION_PACKS[0];
  const preview = REGION_PACKS.find(p => p.id === previewId);
  const realCount = Math.min(problemCount, selected.lines.length);

  const handleStartGame = () => {
    const finalProblemSet = [...selected.lines]
      .sort(() => Math.random() - 0.5)
      .slice(0, problemCount)
      .map(l => l.text);
    if (finalProblemSet.length === 0) {
      return appAlert('선택한 꾸러미에 문제가 없습니다. 다른 꾸러미를 골라주세요!');
    }
    onStart(finalProblemSet, 'sentence');
  };

  return (
    <div className="space-y-6">
      {/* 탭 메뉴 */}
      <div className="flex p-1.5 bg-white border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rounded-xl w-fit mx-auto">
        <span className="px-6 py-3 rounded-lg font-black text-sm bg-[#FFE600] text-black border-2 border-black">
          🗺️ 지역별 방언 꾸러미
        </span>
      </div>

      {/* 지역 꾸러미 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {REGION_PACKS.map(pack => {
          const isSelected = pack.id === selectedId;
          return (
            <div
              key={pack.id}
              onClick={() => setSelectedId(pack.id)}
              className={`p-4 rounded-xl border-3 border-black transition-all cursor-pointer text-left shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-2 ${isSelected ? 'bg-[#FFE600]' : 'bg-white hover:bg-slate-50'}`}
            >
              <div className="flex items-center justify-between">
                <span className="h-10 flex items-center"><BossAccessory accessory={pack.icon} size={36} /></span>
                <span className="text-[11px] font-black text-slate-700 bg-white border-2 border-black rounded-md px-1.5 py-0.5">{pack.lines.length}문장</span>
              </div>
              <h3 className="text-xl font-black" style={{ color: pack.color.dark }}>{pack.region} 방언</h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewId(pack.id);
                }}
                className="self-start inline-flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-black rounded-md text-xs font-black text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all"
              >
                🔍 미리보기
              </button>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] font-black text-slate-400 text-center select-none">
        ℹ️ 방언 문장은 국립국어원 우리말샘·지역어 종합 정보 등으로 검토했어요. 방언만 치고, 뜻은 아래에 작게 나와요.
      </p>

      {/* 미리보기 모달 */}
      {preview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-100" onClick={() => setPreviewId(null)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg p-8 animate-in fade-in duration-100 text-left">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-2xl font-black text-black">
                <span className="inline-flex align-middle mr-1"><BossAccessory accessory={preview.icon} size={28} /></span>{preview.region} 방언 (총 {preview.lines.length}문장)
              </h4>
              <button onClick={() => setPreviewId(null)} className="text-black hover:scale-110 text-2xl font-black">✕</button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {preview.lines.map((l, i) => {
                const { dialect, standard } = splitLine(l);
                return (
                  <div key={i} className="bg-slate-50 px-4 py-2.5 rounded-xl border-2 border-black">
                    <p className="font-black text-black">{i + 1}. {dialect}</p>
                    <p className="text-xs font-bold text-slate-500">= {standard}</p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => setPreviewId(null)}
              className="w-full mt-8 bg-[#FFE600] text-black border-3 border-black py-4 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div className="h-[3px] bg-black w-full"></div>

      {/* 하단 옵션 설정 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-6 rounded-3xl border-3 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex flex-col gap-4 w-full md:w-auto">
          <div className="flex flex-col items-start gap-3">
            <div className="flex justify-between w-full gap-6">
              <span className="text-sm font-black text-black uppercase tracking-widest ml-1">
                학습 문장 수 <span className="text-[11px] text-slate-500 normal-case tracking-normal">({selected.region} 최대 {selected.lines.length}문장)</span>
              </span>
              <span className="text-xl font-black text-black">{realCount}문장</span>
            </div>
            <input
              type="range"
              min="0"
              max={PROBLEM_COUNTS.length - 1}
              step="1"
              value={Math.max(0, PROBLEM_COUNTS.indexOf(problemCount))}
              onChange={(e) => setProblemCount(PROBLEM_COUNTS[Number(e.target.value)])}
              className="w-full md:w-64 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
            <div className="flex justify-between w-full text-[9px] font-black text-black px-1">
              {PROBLEM_COUNTS.map(n => <span key={n}>{n}</span>)}
            </div>
          </div>
        </div>

        <button
          onClick={handleStartGame}
          className="w-full md:w-auto px-10 py-4 rounded-2xl bg-[#FFE600] text-black text-2xl font-black border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center justify-center gap-3"
        >
          {selected.region} 방언 시작하기! 🚀
        </button>
      </div>
    </div>
  );
}
