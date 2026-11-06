"use client";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDialectClears, getDialectProgress } from '@/lib/storage';
import { DIALECT_BOSSES, bossLevel, getBossById, isHiddenUnlocked, type BossId } from '../data/dialectBosses';
import DialectBattle from './DialectBattle';

export default function DialectPlayRoot() {
  const router = useRouter();
  // 주소의 ?boss= 값은 Next 라우터에서 읽음
  // (window.location은 화면 이동 직후 아직 이전 주소라, 두 번째 입장부터 보스를 못 찾고 선택 화면으로 되돌아가던 문제)
  const searchParams = useSearchParams();
  const bossId = searchParams.get('boss');
  // 재도전 시 key를 바꿔 대결 화면을 처음부터 다시 마운트
  const [runId, setRunId] = useState(0);

  const boss = getBossById(bossId);
  const progress = getDialectProgress();
  // 숨겨진 보스는 다섯 지역 보스를 모두 이겼을 때만 (하나라도 기록을 지우면 다시 잠김)
  const isPlayable = !!boss && (boss.hidden ? isHiddenUnlocked(progress.cleared) : boss.order <= progress.unlocked);

  // 없는 보스이거나 아직 잠긴 보스면 보스 선택 화면으로 돌려보냄
  useEffect(() => {
    if (!isPlayable) router.replace('/dialect');
  }, [isPlayable, router]);

  if (!boss || !isPlayable) {
    return (
      <main className="min-h-screen bg-[#FFF59D] flex items-center justify-center">
        <p className="font-black text-slate-600">보스 선택 화면으로 이동하는 중...</p>
      </main>
    );
  }

  // 이 보스를 이긴 횟수만큼 이번 도전의 LV이 오름 (보스마다 따로)
  const clears = getDialectClears(progress.cleared[boss.id]);

  const changeBoss = (id: BossId) => {
    window.history.replaceState(null, '', `/dialect/play?boss=${id}`); // useSearchParams도 함께 바뀜
    setRunId(n => n + 1);
  };

  return (
    <DialectBattle
      key={`${boss.id}-${runId}`}
      boss={boss}
      prevBoss={boss.hidden ? undefined : DIALECT_BOSSES.find(b => b.order === boss.order - 1)}
      nextBoss={boss.hidden ? undefined : DIALECT_BOSSES.find(b => b.order === boss.order + 1)}
      level={bossLevel(clears)}
      alreadyCleared={!!progress.cleared[boss.id]}
      shieldOption={progress.shieldOption}
      showSpace={progress.showSpace}
      previewMeaning={progress.previewMeaning}
      relaxedMode={progress.relaxedMode}
      fastMode={progress.fastMode}
      onRestart={() => setRunId(n => n + 1)}
      onChangeBoss={changeBoss}
    />
  );
}
