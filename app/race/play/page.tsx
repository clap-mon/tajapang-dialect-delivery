"use client";

import { useState } from 'react';
import dynamic from 'next/dynamic';

// sessionStorage를 첫 렌더에서 바로 읽기 위해 클라이언트 전용으로 렌더링
const RacePlay = dynamic(() => import('./RacePlay'), { ssr: false });

export default function RacePlayPage() {
  // '다시 도전' 시 key를 바꿔 같은 문제로 게임 화면을 처음부터 다시 마운트
  const [runId, setRunId] = useState(0);
  return <RacePlay key={runId} onRestart={() => setRunId(n => n + 1)} />;
}
