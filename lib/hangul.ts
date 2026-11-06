// 글자의 초성 추출 (완성형 음절은 초성, 자모는 그대로) - 방언 카드 첫 글자 판별용
export function getChoseong(ch: string): string {
  const code = ch.charCodeAt(0);
  if (code >= 0xAC00 && code <= 0xD7A3) return CHO[Math.floor((code - 0xAC00) / 588)];
  return ch;
}

// 2벌식 키보드 영타 -> 한글 변환 오토마타
const ENG_KEY_MAP: Record<string, string> = {
  q: 'ㅂ', Q: 'ㅃ', w: 'ㅈ', W: 'ㅉ', e: 'ㄷ', E: 'ㄸ', r: 'ㄱ', R: 'ㄲ', t: 'ㅅ', T: 'ㅆ',
  y: 'ㅛ', u: 'ㅕ', i: 'ㅑ', o: 'ㅐ', O: 'ㅒ', p: 'ㅔ', P: 'ㅖ',
  a: 'ㅁ', s: 'ㄴ', d: 'ㅇ', f: 'ㄹ', g: 'ㅎ',
  h: 'ㅗ', j: 'ㅓ', k: 'ㅏ', l: 'ㅣ',
  z: 'ㅋ', x: 'ㅌ', c: 'ㅊ', v: 'ㅍ', b: 'ㅠ', n: 'ㅜ', m: 'ㅡ'
};

const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['', 'ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

const COMBINED_VOWELS: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ'
};

const COMBINED_FINALS: Record<string, string> = {
  'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ',
  'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ'
};

export function convertEngToKor(text: string): string {
  if (!/[a-zA-Z]/.test(text)) return text;

  // 1단계: 영문 알파벳을 2벌식 한글 자모로 1:1 변환
  let jamos = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    jamos += ENG_KEY_MAP[ch] || ch;
  }

  // 2단계: 자모를 완성형 한글 음절로 조립
  let result = '';
  let i = 0;
  const isCho = (c: string) => CHO.includes(c);
  const isJung = (c: string) => JUNG.includes(c);

  while (i < jamos.length) {
    const c1 = jamos[i];

    // 초성 자음으로 시작하고 바로 뒤에 모음이 오는 경우
    if (isCho(c1) && i + 1 < jamos.length && (isJung(jamos[i + 1]) || COMBINED_VOWELS[jamos[i + 1] + (jamos[i + 2] || '')])) {
      const choIdx = CHO.indexOf(c1);
      let jungChar = jamos[i + 1];
      let consumed = 2;

      // 복합 모음 검사 (예: ㅗ + ㅏ -> ㅘ)
      if (i + 2 < jamos.length && COMBINED_VOWELS[jungChar + jamos[i + 2]]) {
        jungChar = COMBINED_VOWELS[jungChar + jamos[i + 2]];
        consumed = 3;
      }
      const jungIdx = JUNG.indexOf(jungChar);

      if (jungIdx === -1) {
        result += c1;
        i++;
        continue;
      }

      // 종성 자음 검사
      let jongIdx = 0;
      const nextIdx = i + consumed;
      if (nextIdx < jamos.length && JONG.includes(jamos[nextIdx])) {
        // 뒤에 또 다른 모음이 바로 오지 않는 경우에만 종성으로 병합
        const afterNext = nextIdx + 1 < jamos.length ? jamos[nextIdx + 1] : '';
        if (!isJung(afterNext) && !COMBINED_VOWELS[afterNext + (jamos[nextIdx + 2] || '')]) {
          // 복합 종성 검사 (예: ㄳ, ㄵ 등)
          if (nextIdx + 1 < jamos.length && COMBINED_FINALS[jamos[nextIdx] + jamos[nextIdx + 1]]) {
            const afterDouble = nextIdx + 2 < jamos.length ? jamos[nextIdx + 2] : '';
            if (!isJung(afterDouble) && !COMBINED_VOWELS[afterDouble + (jamos[nextIdx + 3] || '')]) {
              const doubleFinal = COMBINED_FINALS[jamos[nextIdx] + jamos[nextIdx + 1]];
              jongIdx = JONG.indexOf(doubleFinal);
              consumed += 2;
            } else {
              jongIdx = JONG.indexOf(jamos[nextIdx]);
              consumed += 1;
            }
          } else {
            jongIdx = JONG.indexOf(jamos[nextIdx]);
            consumed += 1;
          }
        }
      }

      // 유니코드 완성형 한글 음절 계산: 0xAC00 + (cho * 21 + jung) * 28 + jong
      const code = 0xAC00 + (choIdx * 21 + jungIdx) * 28 + jongIdx;
      result += String.fromCharCode(code);
      i += consumed;
    } else {
      result += c1;
      i++;
    }
  }

  return result;
}
