"use client";

import dynamic from 'next/dynamic';

// 주소의 ?boss= 값과 localStorage 해금 기록을 첫 렌더에서 바로 읽기 위해 클라이언트 전용으로 렌더링
const DialectPlayRoot = dynamic(() => import('./DialectPlayRoot'), { ssr: false });

export default function DialectPlayPage() {
  return <DialectPlayRoot />;
}
