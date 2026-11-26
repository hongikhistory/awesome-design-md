// 모둠 편성·자리 배치: seeded shuffles that respect “keep these two apart” and “front row” wishes.
// Seeded so the same draw can be shown again (e.g. on the classroom screen) and reproduced.

export interface Member { no: number; name: string }

export const ROLES = ["이끔이", "기록이", "발표이", "지킴이"] as const;

/** mulberry32: small, fast, good enough for classroom shuffles. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pairKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`);

export interface GroupResult {
  groups: { members: Member[]; roles: string[] }[];
  /** apart pairs that could not be separated (only when the constraints are impossible) */
  broken: [number, number][];
}

/** Split into groups of about `size` (sizes differ by at most one), keeping `apart` pairs in different groups. */
export function makeGroups(members: Member[], size: number, apart: [number, number][], seed: number): GroupResult {
  const n = members.length;
  const count = Math.max(1, Math.round(n / Math.max(2, size)));
  const bad = new Set(apart.map(([a, b]) => pairKey(a, b)));
  const r = rng(seed);
  let best: Member[][] = [], bestBroken: [number, number][] = [];
  for (let tries = 0; tries < 400; tries++) {
    const order = shuffle(members, r);
    const gs: Member[][] = Array.from({ length: count }, () => []);
    order.forEach((m, i) => gs[i % count].push(m));
    const broken: [number, number][] = [];
    for (const g of gs) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (bad.has(pairKey(g[i].no, g[j].no))) broken.push([g[i].no, g[j].no]);
    if (!best.length || broken.length < bestBroken.length) [best, bestBroken] = [gs, broken];
    if (!broken.length) break;
  }
  return {
    groups: best.map((g) => ({ members: g, roles: g.map((_, i) => ROLES[i % ROLES.length]) })),
    broken: bestBroken,
  };
}

export interface Seating {
  rows: number;
  cols: number;
  /** row-major, row 0 is nearest the board; null = empty seat */
  seats: (Member | null)[];
  broken: [number, number][];
}

/** Seat in pairs of desks (two columns per pair). `front` students get row 0 or 1; `apart` pairs never share a desk pair. */
export function makeSeating(members: Member[], cols: number, front: number[], apart: [number, number][], seed: number): Seating {
  const rows = Math.ceil(members.length / cols);
  const bad = new Set(apart.map(([a, b]) => pairKey(a, b)));
  const frontSet = new Set(front);
  const r = rng(seed);
  let best: Seating | null = null;
  for (let tries = 0; tries < 400; tries++) {
    const fronts = shuffle(members.filter((m) => frontSet.has(m.no)), r);
    const rest = shuffle(members.filter((m) => !frontSet.has(m.no)), r);
    const seats: (Member | null)[] = [...fronts, ...rest];
    while (seats.length < rows * cols) seats.push(null);
    const broken: [number, number][] = [];
    for (let row = 0; row < rows; row++)
      for (let c = 0; c + 1 < cols; c += 2) {
        const a = seats[row * cols + c], b = seats[row * cols + c + 1];
        if (a && b && bad.has(pairKey(a.no, b.no))) broken.push([a.no, b.no]);
      }
    if (!best || broken.length < best.broken.length) best = { rows, cols, seats, broken };
    if (!broken.length) break;
  }
  return best!;
}

/** Markdown tables for printing or saving as HWPX/XLSX. */
export function groupsMarkdown(title: string, g: GroupResult) {
  return [`# ${title} 모둠 편성`, "", "| 모둠 | 구성원(역할) |", "| --- | --- |", ...g.groups.map((x, i) => `| ${i + 1}모둠 | ${x.members.map((m, j) => `${m.name}(${x.roles[j]})`).join(", ")} |`)].join("\n");
}

export function seatingMarkdown(title: string, s: Seating) {
  const head = Array.from({ length: s.cols }, (_, i) => `${i + 1}열`);
  const rows = Array.from({ length: s.rows }, (_, r) => `| ${s.seats.slice(r * s.cols, r * s.cols + s.cols).map((m) => (m ? m.name : "")).join(" | ")} |`);
  return [`# ${title} 자리 배치`, "", "(교탁 쪽이 위)", "", `| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows].join("\n");
}
