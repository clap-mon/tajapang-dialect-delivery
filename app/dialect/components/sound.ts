/**
 * 방언 타자 대결 효과음 (Web Audio 오실레이터로 직접 합성 - 외부 음원 파일 없음)
 * 음소거 상태는 브라우저 localStorage에 기억합니다.
 */

const MUTE_KEY = 'tajapang_sound_muted';

let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = typeof window !== 'undefined' && localStorage.getItem(MUTE_KEY) === 'true';
} catch {
  muted = false;
}

export const isMuted = () => muted;

export const setMuted = (value: boolean) => {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, String(value));
  } catch {
    // 저장 실패 시에도 이번 화면에서는 음소거 상태 유지
  }
};

const getContext = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AudioCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    ctx = new AudioCtor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

// 단음 하나 재생 (주파수, 길이, 파형, 음량, 시작 지연, 끝 주파수)
const tone = (freq: number, duration: number, type: OscillatorType = 'square', volume = 0.04, delay = 0, slideTo?: number) => {
  if (muted) return;
  const ac = getContext();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
};

// 짧은 잡음 (타격음)
const noise = (duration: number, volume = 0.12, delay = 0) => {
  if (muted) return;
  const ac = getContext();
  if (!ac) return;
  const start = ac.currentTime + delay;
  const buffer = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  const gain = ac.createGain();
  src.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  src.connect(gain).connect(ac.destination);
  src.start(start);
};

export const sfx = {
  // 키 입력: 아주 짧은 딸깍
  key: () => tone(1400, 0.025, 'square', 0.015),
  // 카운트다운: 3·2·1은 낮게, START는 높게
  countdown: (isStart: boolean) => tone(isStart ? 880 : 440, isStart ? 0.35 : 0.15, 'square', 0.05),
  // "가위! 바위! 보!" 구호마다 한 음씩 올라감
  shout: (step: number) => tone([392, 494, 659][step] ?? 659, 0.16, 'triangle', 0.07),
  // 동시 공개
  reveal: () => {
    tone(523, 0.1, 'square', 0.05);
    tone(784, 0.18, 'square', 0.05, 0.08);
  },
  // 타격 (big: 필살기·마지막 일격)
  hit: (big = false) => {
    noise(big ? 0.35 : 0.15, big ? 0.2 : 0.12);
    tone(big ? 180 : 260, big ? 0.4 : 0.18, 'sawtooth', 0.06, 0, 60);
  },
  // 방패로 막음
  block: () => tone(1200, 0.2, 'triangle', 0.05, 0, 600),
  // 승리 팡파레
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'square', 0.05, i * 0.13)),
  // 패배
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.26, 'triangle', 0.06, i * 0.18)),
  // 오타·잘못된 엔터
  error: () => tone(160, 0.12, 'sawtooth', 0.04),
};
