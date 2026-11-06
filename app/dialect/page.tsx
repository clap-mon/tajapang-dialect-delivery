"use client";

import dynamic from 'next/dynamic';

// localStorage 진행 기록을 첫 렌더에서 바로 읽기 위해 클라이언트 전용으로 렌더링
const DialectSelect = dynamic(() => import('./DialectSelect'), { ssr: false });

export default function DialectSelectPage() {
  return <DialectSelect />;
}
