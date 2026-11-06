import { PlayerCharacter, type PlayerSkin } from '../../components/PlayerSkin';

// 트랙 위를 콩콩 뛰어가는 배움팡 (개인 연습 달리기용, 예전 자동차 자리)
const RunnerPang = ({ skin, nickname, isMe, levelEmoji, running, finished, size = 56, scaleClass, tooltipPosition = 'top' }: {
  skin: PlayerSkin;
  nickname: string; // 트랙 이름표 (3글자로 줄인 이름)
  isMe: boolean;
  levelEmoji?: string; // 팡 친구 난이도 표시 (🐢 🐇 🐆)
  running: boolean; // 달리는 중이면 콩콩 뜀
  finished: boolean; // 완주하면 웃는 얼굴
  size?: number;
  scaleClass?: string;
  tooltipPosition?: 'top' | 'bottom';
}) => {
  return (
    <div className={`relative flex flex-col items-center transition-all origin-center group cursor-pointer ${scaleClass || 'scale-100'}`}>
      {/* 마우스를 올리면 떠오르는 이름표 (위쪽 줄은 아래로, 아래쪽 줄은 위로) */}
      <div className={tooltipPosition === 'bottom'
        ? "absolute top-full mt-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-lg border-2 border-white font-black text-lg shadow-[4px_4px_0px_#000] opacity-0 group-hover:opacity-100 group-hover:mt-5 pointer-events-none transition-all duration-200 z-[999] whitespace-nowrap"
        : "absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-1.5 rounded-lg border-2 border-white font-black text-lg shadow-[4px_4px_0px_#000] opacity-0 group-hover:opacity-100 group-hover:-top-16 pointer-events-none transition-all duration-200 z-[999] whitespace-nowrap"
      }>
        {nickname}
      </div>

      <div
        className={`relative ${running ? 'animate-pang-run' : ''}`}
        style={{ filter: isMe ? 'drop-shadow(0 0 5px #FFE600)' : undefined }}
      >
        <PlayerCharacter skin={skin} size={size} mood={finished ? 'happy' : 'idle'} />
        {levelEmoji && (
          <span className="absolute -right-2 bottom-1 text-sm leading-none bg-white border-2 border-black rounded-full w-6 h-6 flex items-center justify-center shadow-[1px_1px_0px_#000]">
            {levelEmoji}
          </span>
        )}
      </div>

      <span className={`-mt-1 px-1.5 py-0.5 rounded-md border-2 border-black text-[10px] font-black leading-none whitespace-nowrap shadow-[1px_1px_0px_#000] ${isMe ? 'bg-[#FFE600] text-black' : 'bg-white text-slate-800'}`}>
        {nickname}
      </span>
    </div>
  );
};

export default RunnerPang;
