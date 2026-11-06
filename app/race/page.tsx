"use client";

import dynamic from 'next/dynamic';

// sessionStorage를 첫 렌더에서 바로 읽기 위해 클라이언트 전용으로 렌더링
const RaceLobby = dynamic(() => import('./RaceLobby'), { ssr: false });

export default function RaceLobbyPage() {
  return <RaceLobby />;
}
