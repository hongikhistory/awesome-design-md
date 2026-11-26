// 학급 도구함: small classroom programs a teacher runs on the classroom screen.
// Every draw uses the browser's cryptographic random source, so no outcome is predictable or
// rigged, and nothing about students leaves this device.

/** Uniform integer in [0, n) from crypto.getRandomValues, without modulo bias. */
export function fairInt(n: number, rand: (buf: Uint32Array) => Uint32Array = (b) => crypto.getRandomValues(b)): number {
  if (!Number.isInteger(n) || n <= 0) throw Error("n must be a positive integer");
  const limit = Math.floor(0x100000000 / n) * n;
  const buf = new Uint32Array(1);
  for (;;) {
    rand(buf);
    if (buf[0] < limit) return buf[0] % n;
  }
}

export function fairShuffle<T>(xs: T[], int: (n: number) => number = fairInt): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = int(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ------------------------------------------------------------------ 1인 1역

export const DEFAULT_ROLES = ["칠판 정리", "우유·급식 도우미", "분리수거", "컴퓨터·TV 끄기", "창문·환기", "화분 물 주기", "게시판 관리", "출결 도우미", "교과서 배부", "청소 도구 점검", "학급 문고", "모둠 바구니"];

/** Every student gets exactly one role; roles repeat (numbered) when there are more students than roles. */
export function assignRoles(students: string[], roles: string[], int: (n: number) => number = fairInt) {
  const list = roles.filter(Boolean);
  if (!list.length) return [];
  const slots = students.map((_, i) => {
    const r = list[i % list.length];
    const round = Math.floor(i / list.length);
    return round ? `${r} ${round + 1}` : r;
  });
  const order = fairShuffle(students, int);
  return order.map((name, i) => ({ name, role: slots[i] }));
}

/** Next week: everyone moves to the next role, so the jobs rotate fairly. */
export function rotateRoles(pairs: { name: string; role: string }[]) {
  if (pairs.length < 2) return pairs;
  const roles = pairs.map((p) => p.role);
  return pairs.map((p, i) => ({ name: p.name, role: roles[(i + 1) % roles.length] }));
}

// ------------------------------------------------------------------ 사다리타기

export interface Ladder {
  cols: number;
  levels: number;
  /** rungs[level] holds the left column index of each rung at that level */
  rungs: number[][];
}

/** Random rungs, never two touching at one level, at least one rung per gap so every column can move. */
export function makeLadder(cols: number, levels = 10, int: (n: number) => number = fairInt): Ladder {
  const rungs: number[][] = Array.from({ length: levels }, () => []);
  for (let l = 0; l < levels; l++) {
    for (let c = 0; c < cols - 1; c++) {
      if (rungs[l].includes(c - 1)) continue;
      if (int(100) < 42) rungs[l].push(c);
    }
  }
  for (let c = 0; c < cols - 1; c++) {
    if (rungs.some((r) => r.includes(c))) continue;
    const free = rungs.map((r, l) => (!r.includes(c - 1) && !r.includes(c + 1) ? l : -1)).filter((l) => l >= 0);
    const l = free.length ? free[int(free.length)] : 0;
    rungs[l] = rungs[l].filter((x) => x !== c - 1 && x !== c + 1);
    rungs[l].push(c);
  }
  return { cols, levels, rungs };
}

/** Follow a column down; returns the bottom column and the path as [col, level] steps. */
export function trace(l: Ladder, start: number) {
  let c = start;
  const path: { col: number; level: number; move: -1 | 0 | 1 }[] = [];
  for (let lv = 0; lv < l.levels; lv++) {
    let move: -1 | 0 | 1 = 0;
    if (l.rungs[lv].includes(c)) move = 1;
    else if (l.rungs[lv].includes(c - 1)) move = -1;
    path.push({ col: c, level: lv, move });
    c += move;
  }
  return { end: c, path };
}

// ------------------------------------------------------------------ 룰렛

/** Rotation (deg, clockwise) that brings segment `index` under a pointer at the top, after `turns` full turns. */
export function wheelAngle(count: number, index: number, current = 0, turns = 6) {
  const seg = 360 / count;
  const target = 360 - (index + 0.5) * seg;
  const base = current - (current % 360) + turns * 360;
  return base + target;
}

/** Which segment is under the top pointer for a given rotation. */
export function segmentAt(count: number, rotation: number) {
  const seg = 360 / count;
  const r = ((rotation % 360) + 360) % 360;
  return Math.floor(((360 - r) % 360) / seg) % count;
}

// ------------------------------------------------------------------ 인물 퀴즈 · 진진가

export interface Person { name: string; lines: string[]; fake?: number }

/**
 *   ## 이름
 *   - 단서 또는 문장
 *   - 가짜 문장 (가짜)      ← 진진가: ‘(가짜)’ 또는 줄 끝 ‘*’
 */
export function parsePeople(text: string): Person[] {
  const out: Person[] = [];
  let cur: Person | null = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const l = raw.trim();
    if (/^#{1,3}\s+/.test(l)) {
      cur = { name: l.replace(/^#{1,3}\s+/, "").trim(), lines: [] };
      out.push(cur);
    } else if (cur && /^[-*•]\s+/.test(l)) {
      let line = l.replace(/^[-*•]\s+/, "");
      if (/\s*(\(가짜\)|（가짜）|\*)$/.test(line)) {
        line = line.replace(/\s*(\(가짜\)|（가짜）|\*)$/, "");
        cur.fake = cur.lines.length;
      }
      cur.lines.push(line);
    }
  }
  return out.filter((p) => p.name && p.lines.length);
}

export const SAMPLE_WHO = `## 김서연
- 좋아하는 과목은 과학이에요
- 주말마다 강아지와 한강을 걸어요
- 커서 동물병원을 열고 싶어요
## 박지호
- 축구부 골키퍼예요
- 매운 떡볶이를 제일 좋아해요
- 작년에 학급 회장을 했어요
## 이하은
- 그림 그리기를 좋아해요
- 동생이 쌍둥이예요
- 수학 문제 푸는 게 재미있어요`;

export const SAMPLE_TWO_TRUTHS = `## 정우진
- 나는 제주도에서 태어났다
- 나는 피아노를 5년 동안 배웠다
- 나는 고양이를 세 마리 키운다 (가짜)
## 최수아
- 나는 줄넘기 2단 뛰기를 100번 한다 (가짜)
- 나는 역사 박물관에 가는 것을 좋아한다
- 나는 오빠가 한 명 있다`;
