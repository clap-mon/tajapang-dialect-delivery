import React from 'react';

interface TajaPangLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showAi?: boolean;
  className?: string;
}

export default function TajaPangLogo({ size = 'md', showAi = false, className = '' }: TajaPangLogoProps) {
  // Taja와 Pang 간격을 더욱 미세하게 조절하여 viewBox 너비를 202 (showAi 시 242)로 조정
  const viewBoxWidth = showAi ? 242 : 202;
  const viewBox = `0 0 ${viewBoxWidth} 55`;
  
  const ratio = viewBoxWidth / 55;
  const dimensions = {
    sm: { width: Math.round(38.5 * ratio), height: 38.5 },
    md: { width: Math.round(55 * ratio), height: 55 },
    lg: { width: Math.round(82.5 * ratio), height: 82.5 }
  };

  const { width, height } = dimensions[size];
  
  return (
    <div className={`inline-block select-none ${className}`} style={{ width, height }}>
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
      >
        <defs>
          {/* 그림자 및 텍스트 효과 필터 */}
        </defs>

        {/* ==================== 1. 오프셋 3D 그림자 레이어 (블랙) ==================== */}
        <text
          x="14"
          y="44"
          fill="#000000"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Taja
        </text>
        <text
          x="104"
          y="44"
          fill="#000000"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Pang
        </text>
        {showAi && (
          <text
            x="187"
            y="44"
            fill="#000000"
            fontSize="22"
            fontWeight="900"
            fontFamily="'Arial Black', sans-serif"
          >
            .ai
          </text>
        )}

        {/* ==================== 2. 굵은 검은색 테두리(외곽선) 레이어 ==================== */}
        <text
          x="10"
          y="40"
          fill="#000000"
          stroke="#000000"
          strokeWidth="8"
          strokeLinejoin="miter"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Taja
        </text>
        <text
          x="100"
          y="40"
          fill="#000000"
          stroke="#000000"
          strokeWidth="8"
          strokeLinejoin="miter"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Pang
        </text>
        {showAi && (
          <text
            x="183"
            y="40"
            fill="#000000"
            stroke="#000000"
            strokeWidth="6"
            strokeLinejoin="miter"
            fontSize="22"
            fontWeight="900"
            fontFamily="'Arial Black', sans-serif"
          >
            .ai
          </text>
        )}

        {/* ==================== 3. 전면 본문 색상 레이어 (파랑 / 노랑) ==================== */}
        {/* Taja: 일렉트릭 네온 블루 */}
        <text
          x="10"
          y="40"
          fill="#5d5bfd"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Taja
        </text>
        {/* Pang: 선명한 옐로우 골드 */}
        <text
          x="100"
          y="40"
          fill="#ffc800"
          fontSize="38"
          fontWeight="900"
          fontFamily="'Arial Black', sans-serif"
          letterSpacing="-1px"
        >
          Pang
        </text>
        {showAi && (
          <text
            x="183"
            y="40"
            fill="#BFF6C3"
            fontSize="22"
            fontWeight="900"
            fontFamily="'Arial Black', sans-serif"
          >
            .ai
          </text>
        )}
      </svg>
    </div>
  );
}
