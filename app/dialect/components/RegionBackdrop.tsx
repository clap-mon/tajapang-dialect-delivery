import Image from 'next/image';

// 대결 무대 뒤 지역 배경 그림 (원본은 /original 폴더에 보관, 화면용은 public/backgrounds/bg-지역.webp)
// 그림은 대결 무대 비율(크롬북 4.4 ~ 큰 모니터 4.1)에 맞춘 2560×610(4.2:1)이라 꽉 채워도 거의 잘리지 않음
// 서울·경기 배경(bg-seoul, bg-gyeonggi)은 숨겨진 스테이지용으로 미리 넣어 둠 (bg-gyeonggi는 아직 예전 2.8:1 그림)
export function RegionBackdrop({ region }: { region: string }) {
  return (
    <>
      <Image
        src={`/backgrounds/bg-${region}.webp`}
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover object-bottom pointer-events-none select-none"
      />
      {/* 말풍선·체력바 글씨가 잘 보이도록 아주 옅게 덮음 */}
      <div className="absolute inset-0 bg-white/10 pointer-events-none" />
    </>
  );
}
