// Korean particle selection (을/를, 이/가, 은/는, 과/와, 으로/로) from the last syllable.
// Digits are read as Sino-Korean numerals (3 → 삼 → "3으로", 2 → 이 → "2로").

const DIGIT_READING = ["영", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];

function lastSyllable(word: string): string {
  const w = word.trim().replace(/[)\]』」’”'".,\s]+$/, "");
  const ch = w.at(-1) ?? "";
  return /\d/.test(ch) ? DIGIT_READING[Number(ch)] : ch;
}

/** 0 = no final consonant, 1 = final ㄹ, 2 = other final consonant, -1 = not Hangul */
function finalKind(word: string): -1 | 0 | 1 | 2 {
  const code = lastSyllable(word).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return -1;
  const jong = code % 28;
  return jong === 0 ? 0 : jong === 8 ? 1 : 2;
}

export type Josa = "을/를" | "이/가" | "은/는" | "과/와" | "으로/로";

export function josa(word: string, pair: Josa): string {
  const [withFinal, withoutFinal] = pair.split("/") as [string, string];
  const k = finalKind(word);
  if (pair === "으로/로") return word + (k === 2 ? "으로" : "로"); // ㄹ-final takes 로
  return word + (k === 0 ? withoutFinal : withFinal);
}
