"use client";

import React, { useEffect, useState } from "react";

// 휴대폰으로 보는 짧은 변 기준 (가로로 돌려도 짧은 변은 그대로라 세로·가로 모두 막힘)
const PHONE_SHORT_SIDE = 600;

/**
 * 모바일(스마트폰) 접속 차단 가드 컴포넌트
 * - 데스크톱, 노트북, 크롬북(CrOS) 등 큰 화면만 허용
 * - 스마트폰은 세로·가로 모두 전면 차단 화면 표시
 */
export default function MobileBlockGuard() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === "undefined") return;

      const ua = navigator.userAgent || navigator.vendor || (window as Window & { opera?: string }).opera || "";

      // 1. 크롬북(Chromebook)은 무조건 허용 (CrOS)
      if (/CrOS/i.test(ua)) {
        setIsMobile(false);
        return;
      }

      // 2. 모바일 스마트폰 User Agent 체크
      const isMobileUA = /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(ua);

      // 3. 터치 기기이면서 기기 화면의 짧은 변이 휴대폰 크기 → 세로·가로 모두 차단
      //    (데스크톱 모드로 접속해 User Agent가 바뀐 휴대폰도 막기 위한 보조 체크)
      const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const shortSide = Math.min(window.screen.width, window.screen.height);
      const isPhoneSize = shortSide < PHONE_SHORT_SIDE;

      setIsMobile(isMobileUA || (isTouchDevice && isPhoneSize));
    };

    checkDevice();

    window.addEventListener("resize", checkDevice);
    window.addEventListener("orientationchange", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
      window.removeEventListener("orientationchange", checkDevice);
    };
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed inset-0 z-[999999] bg-[#FFF59D] flex flex-col items-center justify-center p-4 text-center select-none overflow-y-auto break-keep">
      <div className="max-w-md w-full bg-white border-4 border-black rounded-[32px] p-6 sm:p-8 shadow-[8px_8px_0px_#000] flex flex-col items-center gap-5 animate-in zoom-in-95 duration-200">
        {/* 기기 제한 뱃지 & 아이콘 */}
        <div className="w-20 h-20 bg-rose-100 border-4 border-black rounded-2xl flex items-center justify-center text-4xl shadow-[3px_3px_0px_#000]">
          🚫📱
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 bg-amber-100 border-2 border-black rounded-full text-xs font-black text-amber-900 shadow-[2px_2px_0px_#000]">
            접속 기기 제한 안내
          </span>
          <h2 className="text-2xl font-black text-slate-900">
            휴대폰으로는 접속할 수 없어요
          </h2>
          <p className="text-sm font-bold text-slate-600 leading-relaxed pt-1.5">
            타자팡: 방언 대모험은 키보드로 타자를 치는 게임이라<br />
            <strong className="text-indigo-600 font-black">데스크톱, 노트북, 크롬북</strong>처럼<br />
            화면이 큰 기기에서만 할 수 있어요.<br />
            휴대폰을 가로로 돌려도 접속할 수 없어요.
          </p>
        </div>

        {/* 안내 상자 */}
        <div className="w-full bg-slate-50 border-2 border-black rounded-xl p-3.5 text-xs font-bold text-slate-700 leading-relaxed">
          ⌨️ 키보드가 있는 데스크톱, 노트북 또는 크롬북으로 다시 접속해 주세요!
        </div>
      </div>
    </div>
  );
}
