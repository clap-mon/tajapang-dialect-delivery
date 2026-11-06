// 대시보드 스탯 카드 (상단 바 compact 형 / 모바일 카드형)
export default function StatCard({ label, value, subLabel, color, bgColor, rotation, compact }: { label: string, value: string | number, subLabel?: string, color: string, bgColor: string, rotation: string, compact?: boolean }) {
  return (
    <div className={`flex-1 bg-white border-4 border-black rounded-[20px] shadow-[4px_4px_0px_#000] flex transition-transform hover:scale-102 ${compact
        ? 'flex-row items-center justify-center gap-2 !py-1.5 !px-3.5 !rounded-xl shadow-[3px_3px_0px_#000]'
        : 'flex-col justify-between items-center text-center p-2.5'
      } ${bgColor} ${rotation}`}>
      {compact ? (
        <div className="flex items-center justify-center gap-1.5 w-full font-black text-slate-900 text-sm md:text-xl lg:text-2xl whitespace-nowrap">
          <span>{label}</span>
          <span className="text-black/30 font-black">:</span>
          <span className={`${color}`}>{value}</span>
          {subLabel && <span className="text-[10px] md:text-sm text-slate-700 font-black">{subLabel}</span>}
        </div>
      ) : (
        <>
          <span className="font-black text-slate-800 uppercase tracking-widest border-b-2 border-black/10 pb-0.5 mb-1.5 w-full text-[10px]">{label}</span>
          <div className="flex items-baseline gap-0.5">
            <span className={`font-black ${color} text-2xl`}>{value}</span>
            {subLabel && <span className="font-bold text-slate-700 text-[10px]">{subLabel}</span>}
          </div>
        </>
      )}
    </div>
  );
}
