import { describe, expect, it } from "vitest";
import { reduceRequests, type Stamped, type WorkflowEvent } from "./approval";
import { privacyCheck, recommend, slotsFor, DEFAULT_WEIGHTS } from "./cover";
import {
  createDeviceKeys,
  createRoomKey,
  decryptJson,
  encryptJson,
  signEnvelope,
  unwrapRoomKey,
  verifyEnvelope,
  wrapRoomKey,
} from "./crypto";
import { gapAnalysis } from "./practicum";
import { buildTimetable, COVER_HISTORY, DAYS, PEOPLE, PERIODS } from "./school";
import { reduceWidgets, type Clock, type WidgetOp } from "./widgets";

describe("crypto", () => {
  it("wraps a room key for a member and round-trips a message", async () => {
    const alice = await createDeviceKeys();
    const bob = await createDeviceKeys();
    const room = await createRoomKey();
    const w = await wrapRoomKey(room, "alice", alice.privateKey, bob.publicJwk, "r#1");
    const bobKey = await unwrapRoomKey(w, bob.privateKey, alice.publicJwk, "r#1");
    const c = await encryptJson(room, { text: "안녕하세요" }, "r|1|alice|m1");
    expect(await decryptJson(bobKey, c, "r|1|alice|m1")).toEqual({ text: "안녕하세요" });
  });

  it("rejects a ciphertext moved to another room or sender (AAD)", async () => {
    const room = await createRoomKey();
    const c = await encryptJson(room, { text: "x" }, "r|1|alice|m1");
    await expect(decryptJson(room, c, "other|1|alice|m1")).rejects.toThrow();
    await expect(decryptJson(room, c, "r|1|mallory|m1")).rejects.toThrow();
  });

  it("a wrapped key cannot be opened by a non-member or for another epoch", async () => {
    const alice = await createDeviceKeys();
    const bob = await createDeviceKeys();
    const eve = await createDeviceKeys();
    const w = await wrapRoomKey(await createRoomKey(), "alice", alice.privateKey, bob.publicJwk, "r#1");
    await expect(unwrapRoomKey(w, eve.privateKey, alice.publicJwk, "r#1")).rejects.toThrow();
    await expect(unwrapRoomKey(w, bob.privateKey, alice.publicJwk, "r#2")).rejects.toThrow();
  });

  it("private keys are not extractable", async () => {
    const k = await createDeviceKeys();
    expect(k.privateKey.extractable).toBe(false);
    expect(k.signKey.extractable).toBe(false);
  });

  it("signatures detect a forged sender", async () => {
    const alice = await createDeviceKeys();
    const mallory = await createDeviceKeys();
    const c = await encryptJson(await createRoomKey(), { type: "cover.decide" }, "aad");
    const sig = await signEnvelope(mallory.signKey, "aad", c);
    expect(await verifyEnvelope(alice.verifyJwk, "aad", c, sig)).toBe(false);
    expect(await verifyEnvelope(mallory.verifyJwk, "aad", c, sig)).toBe(true);
  });
});

describe("timetable", () => {
  it("never double-books a teacher or a class", () => {
    const tt = buildTimetable();
    for (let d = 0; d < DAYS.length; d++)
      for (let p = 0; p < PERIODS; p++) {
        const classes = Object.values(tt).map((days) => days[d][p]?.classId).filter(Boolean);
        expect(new Set(classes).size).toBe(classes.length);
      }
  });
});

describe("cover recommendation", () => {
  const tt = buildTimetable();
  const ctx = { people: PEOPLE, timetable: tt, history: COVER_HISTORY };
  const slot = slotsFor("t1", 1, tt)[0];

  it("only proposes free, eligible teachers", () => {
    const list = recommend(slot, ctx);
    expect(list.length).toBeGreaterThan(0);
    for (const c of list) {
      expect(c.personId).not.toBe("t1");
      expect(c.personId).not.toBe("s1");
      expect(tt[c.personId][slot.day][slot.period]).toBeNull();
    }
  });

  it("explains every point and stays within 0-100", () => {
    for (const c of recommend(slot, ctx)) {
      expect(c.factors).toHaveLength(5);
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      for (const f of c.factors) expect(f.reason.length).toBeGreaterThan(0);
    }
  });

  it("fairness weight favours people with fewer recent covers", () => {
    const only = { fairness: 100, load: 0, fatigue: 0, subject: 0, familiarity: 0 };
    const list = recommend(slot, ctx, only);
    const hist = list.map((c) => COVER_HISTORY[c.personId] ?? 0);
    expect([...hist].sort((a, b) => a - b)).toEqual(hist);
  });

  it("excludes people already assigned at that time", () => {
    const first = recommend(slot, ctx, DEFAULT_WEIGHTS)[0];
    const again = recommend(slot, { ...ctx, assigned: { [first.personId]: [[slot.day, slot.period]] } });
    expect(again.some((c) => c.personId === first.personId)).toBe(false);
  });
});

describe("privacy check", () => {
  it("flags phone numbers and named students, ignores generic phrases", () => {
    const w = privacyCheck("민수 학생은 010-1234-5678로 연락. 모든 학생 발표.");
    expect(w.map((x) => x.kind).sort()).toEqual(["named-student", "phone"]);
    expect(privacyCheck("모둠 4는 자원 발표로 진행")).toEqual([]);
  });
});

describe("approval workflow", () => {
  const t = (event: WorkflowEvent, id: string, role: "teacher" | "coordinator" | "student-teacher", at: number): Stamped<WorkflowEvent> => ({
    event,
    actor: { id, role },
    at,
    id: `${at}`,
  });
  const req: WorkflowEvent = {
    type: "cover.request",
    reqId: "r1",
    absentId: "t1",
    day: 0,
    period: 0,
    classId: "2-1",
    subject: "국어",
    candidateId: "t5",
    score: 80,
    factors: [],
    card: { goal: "", progress: "", activity: "", materials: "", notes: "" },
  };

  it("runs the three steps in order", () => {
    const r = reduceRequests([
      t(req, "t1", "teacher", 1),
      t({ type: "cover.consent", reqId: "r1", accept: true }, "t5", "teacher", 2),
      t({ type: "cover.decide", reqId: "r1", approve: true }, "t3", "coordinator", 3),
    ]).get("r1")!;
    expect(r.status).toBe("APPLIED");
    expect(r.audit.filter((a) => a.ok)).toHaveLength(3);
  });

  it("refuses consent from the wrong person and approval by a non-coordinator", () => {
    const r = reduceRequests([
      t(req, "t1", "teacher", 1),
      t({ type: "cover.consent", reqId: "r1", accept: true }, "t2", "teacher", 2),
      t({ type: "cover.decide", reqId: "r1", approve: true }, "t2", "teacher", 3),
    ]).get("r1")!;
    expect(r.status).toBe("AWAITING_CONSENT");
    expect(r.audit.filter((a) => !a.ok)).toHaveLength(2);
  });

  it("allows skipping consent only with a written reason", () => {
    const skip = (reason?: string) =>
      reduceRequests([t(req, "t1", "teacher", 1), t({ type: "cover.decide", reqId: "r1", approve: true, skipConsent: true, reason }, "t3", "coordinator", 2)]).get("r1")!;
    expect(skip().status).toBe("AWAITING_CONSENT");
    expect(skip("대강 교사 출장 중, 교감 확인").status).toBe("APPLIED");
  });

  it("is independent of log order (sorted by time)", () => {
    const log = [
      t({ type: "cover.decide", reqId: "r1", approve: true }, "t3", "coordinator", 3),
      t({ type: "cover.consent", reqId: "r1", accept: true }, "t5", "teacher", 2),
      t(req, "t1", "teacher", 1),
    ];
    expect(reduceRequests(log).get("r1")!.status).toBe("APPLIED");
  });
});

describe("shared widgets CRDT", () => {
  const ops: { op: WidgetOp; clock: Clock }[] = [
    { op: { type: "widget.create", widgetId: "w", kind: "checklist", title: "준비물" }, clock: { at: 1, actor: "a" } },
    { op: { type: "widget.item", widgetId: "w", itemId: "i", text: "조끼" }, clock: { at: 2, actor: "a" } },
    { op: { type: "widget.check", widgetId: "w", itemId: "i", done: true }, clock: { at: 3, actor: "b" } },
    { op: { type: "widget.check", widgetId: "w", itemId: "i", done: false }, clock: { at: 3, actor: "c" } },
    { op: { type: "widget.vote", widgetId: "w", option: 1 }, clock: { at: 4, actor: "b" } },
  ];
  it("converges for every delivery order", () => {
    const expected = JSON.stringify(reduceWidgets(ops));
    const perms = (xs: typeof ops): (typeof ops)[] => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p])));
    for (const p of perms(ops)) expect(JSON.stringify(reduceWidgets(p))).toBe(expected);
    expect(reduceWidgets(ops)[0].items[0].done).toBe(false); // tie at=3 broken by actor id: "c" wins
  });
});

describe("practicum gap analysis", () => {
  it("picks the domain with the largest self/mentor gap", () => {
    const g = gapAnalysis({ design: 3, question: 4, material: 3, engagement: 3, time: 2 }, { design: 3, question: 2, material: 4, engagement: 3, time: 2 });
    expect(g.focus?.key).toBe("question");
    expect(g.topic).toContain("발문과 상호작용");
  });
  it("handles a missing side", () => {
    expect(gapAnalysis(undefined, { design: 3 }).focus).toBeUndefined();
  });
});
