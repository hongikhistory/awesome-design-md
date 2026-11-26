import { describe, expect, it } from "vitest";
import { assignRoles, DEFAULT_ROLES, fairInt, fairShuffle, makeLadder, parsePeople, rotateRoles, SAMPLE_TWO_TRUTHS, SAMPLE_WHO, segmentAt, trace, wheelAngle } from "./classtools";
import { contrast, searchUrl, STUDIOS, studioForSubject } from "./studio";

const names = Array.from({ length: 25 }, (_, i) => `학생${i + 1}`);

describe("fair randomness", () => {
  it("stays in range and has no modulo bias trap", () => {
    for (let i = 0; i < 200; i++) expect(fairInt(7)).toBeLessThan(7);
    let calls = 0;
    // first value lands in the biased tail and must be rejected
    const fake = (b: Uint32Array) => { b[0] = calls++ === 0 ? 0xffffffff : 10; return b; };
    expect(fairInt(3, fake)).toBe(1);
    expect(calls).toBe(2);
  });
  it("shuffles without losing anyone", () => {
    expect([...fairShuffle(names)].sort()).toEqual([...names].sort());
  });
});

describe("1인 1역", () => {
  it("gives every student exactly one role and numbers repeats", () => {
    const r = assignRoles(names, DEFAULT_ROLES);
    expect(r).toHaveLength(25);
    expect(new Set(r.map((x) => x.name)).size).toBe(25);
    expect(r.some((x) => /2$/.test(x.role))).toBe(true);
  });
  it("rotates roles so nobody keeps the same job", () => {
    const r = assignRoles(names.slice(0, 5), DEFAULT_ROLES.slice(0, 5));
    const next = rotateRoles(r);
    next.forEach((x, i) => expect(x.role).not.toBe(r[i].role));
    expect([...next.map((x) => x.role)].sort()).toEqual([...r.map((x) => x.role)].sort());
  });
});

describe("사다리타기", () => {
  it("is always a one-to-one match and every gap has a rung", () => {
    for (let k = 0; k < 30; k++) {
      const l = makeLadder(6);
      const ends = Array.from({ length: 6 }, (_, i) => trace(l, i).end);
      expect([...ends].sort()).toEqual([0, 1, 2, 3, 4, 5]);
      for (let c = 0; c < 5; c++) expect(l.rungs.some((r) => r.includes(c))).toBe(true);
      for (const r of l.rungs) for (const c of r) expect(r.includes(c + 1)).toBe(false);
    }
  });
});

describe("룰렛", () => {
  it("lands on the chosen segment", () => {
    for (const n of [2, 5, 8, 12]) for (let i = 0; i < n; i++) expect(segmentAt(n, wheelAngle(n, i, 1234))).toBe(i);
  });
});

describe("인물 퀴즈 · 진진가", () => {
  it("reads people and marks the false statement", () => {
    expect(parsePeople(SAMPLE_WHO)).toHaveLength(3);
    const t = parsePeople(SAMPLE_TWO_TRUTHS);
    expect(t[0]).toMatchObject({ name: "정우진", fake: 2 });
    expect(t[1].fake).toBe(0);
    expect(t[1].lines[0]).not.toContain("가짜");
  });
});

describe("과목별 스튜디오", () => {
  it("every studio colour meets WCAG AA (white on primary, accent text on white and on its tint)", () => {
    for (const s of Object.values(STUDIOS)) {
      expect(contrast("#FFFFFF", s.colors.primary), `${s.id} primary`).toBeGreaterThanOrEqual(4.5);
      expect(contrast("#FFFFFF", s.colors.hover), `${s.id} hover`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.colors.text, "#FFFFFF"), `${s.id} text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(s.colors.text, s.colors.bg), `${s.id} text on tint`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("maps subjects and builds search links only where the format is known", () => {
    expect(studioForSubject("역사")).toBe("history");
    expect(studioForSubject("기술·가정")).toBe("default");
    const commons = STUDIOS.history.assets.find((a) => a.search)!;
    expect(searchUrl(commons, "사발통문")).toBe("https://commons.wikimedia.org/w/index.php?search=%EC%82%AC%EB%B0%9C%ED%86%B5%EB%AC%B8");
    const emuseum = STUDIOS.history.assets[0];
    expect(searchUrl(emuseum, "사발통문")).toBe("https://www.emuseum.go.kr");
  });
});
