"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { DIALECT_REVIEWS, DIALECT_SOURCES, type DialectSourceId } from './dialect/data/dialectBosses';

// 출처 표의 짧은 이름
const SOURCE_SHORT_NAMES: Record<DialectSourceId, string> = {
  opendict: '우리말샘',
  dialect: '지역어 종합 정보',
  jejudic: '제주어모바일사전',
  qna: '온라인가나다',
};
import { PlayerCharacter, SkinPickerModal, savePlayerSkin, usePlayerSkin } from './components/PlayerSkin';
import { appAlert } from '@/lib/appDialog';

// 교실 현장 욕설/비속어 방어용 금칙어 사전 (40여종)
const BAD_WORDS = [
  '개새끼', '개세끼', '개색기', '씨발', '시발', '씹알', '십알', '엠창', '엄창', '느금마',
  '지랄', '병신', '빙신', '호로', '존나', '좃나', '새끼', '세끼', '뒈져', '뒤져',
  '또라이', '미친놈', '미친년', '썅', '샹', '아가리', '새키', '세키', '씨바', '시바',
  '닥쳐', '대가리', '머가리', '꺼져', '빡대가리', '썅년', '썅놈', '새끼야', '호로새끼', '존나게'
];

// 닉네임 유효성 검증 도우미 (빈 값은 '나'로 시작하므로 통과)
const validateNickname = (val: string): string => {
  if (!val) return '';
  if (val.length < 2 || val.length > 6) return '닉네임은 2자 이상 6자 이하여야 합니다.';

  // 완성형 한글, 영문, 숫자 조합만 허용 (자음/모음 초성 차단)
  if (!/^[가-힣a-zA-Z0-9]+$/.test(val)) {
    return '완성된 한글, 영문, 숫자만 가능합니다. (초성/특수문자/공백 금지)';
  }

  // 비속어 차단 체크
  if (BAD_WORDS.some(word => val.includes(word))) {
    return '욕설이나 비속어는 닉네임으로 사용할 수 없습니다.';
  }

  return '';
};

export default function Home() {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(false); // 사용 안내 모달 팝업 상태
  const [nickname, setNickname] = useState('');
  const [showSkinPicker, setShowSkinPicker] = useState(false); // 캐릭터 고르기 팝업
  const skin = usePlayerSkin();
  const nicknameError = validateNickname(nickname.trim());

  // 닉네임 저장 후 메뉴로 이동 (개인 연습 / 방언 타자 대결)
  const startMenu = (path: '/race' | '/dialect') => {
    if (nicknameError) {
      appAlert(nicknameError);
      return;
    }
    sessionStorage.setItem('tajapang_nickname', nickname.trim() || '나');
    router.push(path);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#FAF9F5] p-4 relative overflow-hidden">
      {/* 귀여운 장식용 파스텔톤 배경 도형들 */}
      <div className="absolute top-10 left-10 w-24 h-24 bg-[#FFCCD5]/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#D8F3DC]/40 rounded-full blur-xl pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-28 h-28 bg-[#D8E2DC]/40 rounded-full blur-xl pointer-events-none" />

      {/* 메인 랜딩 뷰 (예전 크기의 80%, 그림은 화면 높이에 맞춰 줄어듦) */}
      <div className="card-container !p-5 max-w-[400px] w-full text-center flex flex-col items-center gap-3">
        {/* 일러스트 액자 영역: 화면 높이에서 아래 내용 높이를 뺀 만큼, 최소 200px */}
        <div className="w-[clamp(200px,calc(100dvh-486px),100%)] aspect-square rounded-2xl border-4 border-black shadow-[4px_4px_0px_#000] overflow-hidden bg-[#FAF9F5] relative">
          <Image
            src="/tajapang_dialect_v1.webp"
            alt="타자팡: 방언 대모험"
            fill
            sizes="360px"
            priority
            className="object-cover select-none"
          />
        </div>

        {/* 타이틀 영역 */}
        <div className="bg-[#E8F1F2] border-4 border-black px-4 py-2 rounded-2xl shadow-[4px_4px_0px_#000] inline-block w-full">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 flex items-center justify-center gap-1.5">
            <span>타자팡</span>
            <span className="text-indigo-600 font-extrabold text-base md:text-lg border-l-2 border-slate-400 pl-2">방언 대모험</span>
          </h1>
        </div>

        <p className="text-slate-500 font-extrabold text-[11px] -mt-1.5">
          배움팡 친구들과 달리고, 방언 보스와 타자로 겨루는 우리말 타자 게임!
        </p>

        {/* 닉네임 입력 (선택 사항, 엔터는 맨 위 버튼인 방언 타자 대결과 같게 동작) */}
        <div className="w-full max-w-[300px] flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <label htmlFor="nickname" className="w-[52px] text-xs font-black text-slate-800 text-left flex-shrink-0">닉네임</label>
            <input
              id="nickname"
              type="text"
              spellCheck={false}
              autoComplete="off"
              placeholder="비워 두면 '나'로 시작해요"
              className={`flex-grow min-w-0 px-3 py-1.5 rounded-xl border-4 text-sm outline-none transition-all focus:bg-indigo-50/50 shadow-[2px_2px_0px_#000] text-center font-black ${nicknameError ? 'border-rose-500 focus:border-rose-500' : 'border-black'}`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) startMenu('/dialect'); }}
            />
          </div>
          {nicknameError && (
            <div className="text-[10px] font-black text-rose-500 bg-rose-50 border-2 border-rose-500 px-3 py-1.5 rounded-xl shadow-[1.5px_1.5px_0px_#f43f5e] text-center animate-pulse">
              {nicknameError}
            </div>
          )}
        </div>

        {/* 캐릭터 고르기 (누르면 10종 팝업) */}
        <div className="w-full max-w-[300px] flex items-center gap-2">
          <span className="w-[52px] text-xs font-black text-slate-800 text-left flex-shrink-0">캐릭터</span>
          <button
            onClick={() => setShowSkinPicker(true)}
            className="flex-grow min-w-0 flex items-center justify-center gap-2 px-3 py-1 rounded-xl border-4 border-black bg-white shadow-[2px_2px_0px_#000] hover:bg-indigo-50 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:scale-95 transition-all cursor-pointer"
          >
            <span className="w-9 h-9 flex items-end justify-center pt-1">
              {skin && <PlayerCharacter skin={skin} size={32} />}
            </span>
            <span className="text-sm font-black text-slate-800">{skin?.name ?? ' '}</span>
            <span className="text-[11px] font-black text-indigo-600">바꾸기 ▸</span>
          </button>
        </div>

        {/* 메뉴 버튼 */}
        <div className="w-full max-w-[300px] flex flex-col gap-2.5 mt-0.5">
          <button
            onClick={() => startMenu('/dialect')}
            className="w-full bg-[#FFD6A5] text-slate-800 border-4 border-black px-5 py-2.5 rounded-2xl font-black text-base transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:scale-95 cursor-pointer text-center"
          >
            ⚔️ 방언 타자 대결
          </button>
          <button
            onClick={() => startMenu('/race')}
            className="w-full bg-[#D8F3DC] text-slate-800 border-4 border-black px-5 py-2.5 rounded-2xl font-black text-base transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:scale-95 cursor-pointer text-center"
          >
            🎯 개인 연습
          </button>
          <button
            onClick={() => setShowGuide(true)}
            className="w-full bg-[#FFE5EC] text-slate-800 border-4 border-black px-5 py-2 rounded-2xl font-black text-sm transition-all shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:scale-95 cursor-pointer text-center"
          >
            사용 안내 📖
          </button>
        </div>
      </div>

      {showSkinPicker && (
        <SkinPickerModal
          selectedId={skin?.id ?? null}
          onSelect={savePlayerSkin}
          onClose={() => setShowSkinPicker(false)}
        />
      )}

      {/* 사용 안내 모달 팝업 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="max-w-[620px] w-full bg-[#FAF9F6] border-4 border-black rounded-3xl p-6 shadow-[6px_6px_0px_#000] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            {/* 헤더 */}
            <div className="flex justify-between items-center border-b-4 border-black pb-2 mb-1">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                <span>📖 타자팡: 방언 대모험 사용 설명서</span>
              </h2>
              <button
                onClick={() => setShowGuide(false)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center bg-[#FFE5EC] font-black shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] active:scale-90 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 내용 */}
            <div className="text-slate-700 text-sm font-extrabold flex flex-col gap-4 max-h-[440px] overflow-y-auto pr-1 break-keep">
              {/* 소개 */}
              <div className="bg-[#E8F1F2] border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-indigo-800 font-black text-sm mb-1.5">🎮 타자팡: 방언 대모험 소개</p>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  제주·충청·전라·경상·강원 방언을 타자로 치며 익히는 우리말 타자 게임이에요.
                  <strong> 방언 타자 대결</strong>에서 지역 보스와 겨루고, <strong>개인 연습</strong>에서 배움팡 친구들과 달리기 시합을 해요.
                  로그인 없이 내 브라우저에서만 동작하고, 기록도 이 브라우저에만 저장돼요.
                </p>
              </div>

              {/* 1. 방언 타자 대결 */}
              <div className="bg-[#FFE5EC]/70 border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-rose-700 font-black text-sm mb-2">⚔️ 1. 방언 타자 대결 (타자 가위바위보)</p>
                <ol className="list-decimal list-inside text-[11px] text-slate-600 font-bold flex flex-col gap-1 leading-relaxed">
                  <li>제주 → 충청 → 전라 → 경상 → 강원 순서로 보스와 겨뤄요. 이기면 다음 보스가 열려요.</li>
                  <li>가위·바위·보 카드에 방언 문장이 나와요. 낼 카드의 <strong>첫 글자</strong>를 치면 그 카드가 골라지고, 끝까지 친 뒤 <strong>엔터</strong>를 눌러요.</li>
                  <li>&ldquo;가위! 바위! 보!&rdquo; 뒤에 보스와 동시에 공개해요. 이기면 보스에게 피해를 주고, 지거나 시간이 다 되면 공격을 받아요. 비기면 더 빨리 친 쪽이 작은 피해를 줘요.</li>
                  <li>💡 <strong>제한시간이 많이 남았을 때, 지우기 없이 무결점으로</strong> 칠수록 이겼을 때 더 큰 피해를 줘요.</li>
                  <li>🔥 무결점 문장 3개를 모으면 다음 라운드에 <strong>필살 문장</strong>이 나와요. 시간 안에 치면 큰 피해를 줘요.</li>
                  <li>📈 같은 보스를 이길 때마다 다음 도전에서 <strong>보스 레벨</strong>이 올라 더 빨라져요(최고 레벨 5). 한 판은 보통 10라운드 안팎이에요.</li>
                  <li>📖 공개 뒤에는 카드 문장의 뜻(표준어)이 나와요. 보스 대사의 뜻은 <strong>그 보스를 이기면</strong> 공개돼요.</li>
                  <li>✨ 다섯 보스를 모두 이기면 <strong>숨겨진 보스(표준어 광장의 표준어 박사)</strong>가 나타나요. 다섯 지역 방언 카드를 보고 <strong>표준어 풀이</strong>를 쳐서 겨뤄요. 지역 보스 기록을 하나라도 지우면 다시 잠겨요.</li>
                  <li>보스 고르기 화면 위쪽의 <strong>[📜 규칙 보기]</strong>로 규칙을 크게 볼 수 있어요(처음 들어가면 한 번 자동으로 열려요).</li>
                </ol>
              </div>

              {/* 2. 개인 연습 */}
              <div className="bg-[#D8F3DC]/60 border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-[#2D6A4F] font-black text-sm mb-2">🎯 2. 개인 연습 (배움팡 달리기)</p>
                <ol className="list-decimal list-inside text-[11px] text-slate-600 font-bold flex flex-col gap-1 leading-relaxed">
                  <li>대기실에서 함께 달릴 <strong>AI 팡 친구</strong>를 최대 2명까지 불러요. 초급 🐢(50~200타)·중급 🐇(200~400타)·고급 🐆(400~800타) 중에 고르고, 슬라이더로 속도를 맞춰요.</li>
                  <li><strong>[꾸러미 고르고 시작하기]</strong>에서 지역과 문장 수를 정해요.</li>
                  <li>셋·둘·하나 카운트다운이 끝나면 칠판의 <strong>방언 문장</strong>을 치고 엔터를 눌러요. 틀린 글자는 빨간색으로 보여요.</li>
                  <li>마지막 문장까지 치면 완주 성공! 결과 리포트에서 타수·정확도·순위·타이핑 진단을 볼 수 있어요.</li>
                </ol>
              </div>

              {/* 3. 지역별 방언 꾸러미 */}
              <div className="bg-[#FFF3B0]/60 border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-[#B27D12] font-black text-sm mb-2">🗺️ 3. 지역별 방언 꾸러미</p>
                <ul className="list-disc list-inside text-[11px] text-slate-600 font-bold flex flex-col gap-1 leading-relaxed">
                  <li>제주·충청·전라·경상·강원 지역마다 <strong>30문장</strong>이 있어요. 방언 타자 대결의 카드·필살 문장·보스 대사에 연습용 문장을 더했어요.</li>
                  <li>타자는 <strong>방언만</strong> 치고, 뜻(표준어)은 문장 아래에 작게 보여 줘요.</li>
                  <li><strong>[🔍 미리보기]</strong>로 방언과 뜻을 먼저 살펴보고, 문장 수(5~30개)를 정해 연습 시간을 조절해요.</li>
                </ul>
              </div>

              {/* 4. 설정과 도움 기능 */}
              <div className="bg-[#D8F3DC]/30 border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-[#2D6A4F] font-black text-sm mb-2">⚙️ 4. 설정과 도움 기능</p>
                <div className="flex flex-col gap-2.5 text-[11px] text-slate-600 font-bold leading-relaxed">
                  <div>
                    <span className="text-xs font-black text-[#1B4332] block">⚔️ 대결 설정 (보스 고르기 화면 위쪽 [⚙️ 대결 설정])</span>
                    <ul className="list-disc list-inside mt-0.5 flex flex-col gap-0.5">
                      <li><strong>🛡️ 방패:</strong> 무결점 2번마다 방패 1개. 진 라운드의 피해를 한 번 막아 줘요.</li>
                      <li><strong>🔤 띄어쓰기 기호:</strong> 띄어쓰기 자리에 ␣를 보여 줘요.</li>
                      <li><strong>📖 카드 뜻 미리 보기:</strong> 카드를 고를 때 뜻을 흐리게 보여 줘요.</li>
                      <li><strong>⌛ 여유 모드:</strong> 제한시간이 5초 늘어나요. 이겨도 보스 레벨은 그대로예요.</li>
                      <li><strong>⏩ 연출 빠르게 · 🔊 효과음:</strong> 구호와 공개 시간을 줄이거나, 효과음을 켜고 꺼요.</li>
                    </ul>
                  </div>
                  <div className="border-t border-black/10 pt-2">
                    <span className="text-xs font-black text-[#1B4332] block">🎯 연습 규칙 (개인 연습 대기실)</span>
                    <ul className="list-disc list-inside mt-0.5 flex flex-col gap-0.5">
                      <li><strong>띄어쓰기 기호 표시:</strong> 띄어쓰기 자리에 ␣를 보여 줘요.</li>
                      <li><strong>문장부호 제외(기본 켜짐):</strong> 마침표·물음표 같은 문장 부호를 빼고 글자만 연습해요.</li>
                      <li><strong>무결점 보너스:</strong> 지우기 없이 한 번에 문장을 완성하면 보너스 점수를 받아요.</li>
                    </ul>
                  </div>
                  <div className="border-t border-black/10 pt-2">
                    <span className="text-xs font-black text-[#1B4332] block">⌨️ 한/영 자동 변환</span>
                    <span className="block mt-0.5">영문 자판으로 치면 한글로 바꿔 주고 안내가 나와요. [한/영] 키를 눌러 한글 입력으로 바꿔 주세요.</span>
                  </div>
                </div>
              </div>

              {/* 5. 방언 출처 및 검토처 (맨 마지막) */}
              <div className="bg-slate-50 border-2 border-black rounded-2xl p-3.5 shadow-[2px_2px_0px_#000]">
                <p className="text-slate-800 font-black text-sm mb-2">🔎 5. 방언 출처 및 검토처</p>
                <ul className="text-[11px] text-slate-600 font-bold flex flex-col gap-1 leading-relaxed">
                  {DIALECT_SOURCES.map(src => (
                    <li key={src.id}>
                      • <a href={src.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800">{src.name}</a> — {src.desc}
                    </li>
                  ))}
                </ul>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {DIALECT_REVIEWS.map(r => (
                    <div key={r.region} className="bg-white border border-black/20 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-600 leading-relaxed">
                      <span className="font-black text-slate-900">{r.region}</span>
                      <span className="text-slate-400"> · {r.sources.map(id => SOURCE_SHORT_NAMES[id]).join(' · ')}</span>
                      <p>{r.note}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-2 leading-relaxed">
                  ※ 지역별 내용은 검토한 낱말의 대표 예시예요. 첫 화면 그림 속 말풍선 글자는 꾸밈용이라 게임 문장과 다를 수 있어요.
                </p>
              </div>
            </div>

            {/* 하단 버튼 */}
            <button
              onClick={() => setShowGuide(false)}
              className="w-full bg-[#E8F1F2] text-slate-800 border-4 border-black py-3 rounded-2xl font-black text-sm shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] active:scale-95 cursor-pointer"
            >
              확인했어요!
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
