// End-to-end path: device keys -> sealed room keys -> signed ciphertext on the relay -> decrypt.
import { beforeEach, describe, expect, it } from "vitest";
import { changeMembers, createRoom, enrol, post, readAll, resetCaches, seal } from "./engine";
import { relay } from "./relay";

const texts = async (me: string, roomId: string) =>
  (await readAll(me)).find((v) => v.room.roomId === roomId)?.events.map((e) => (e.payload.type === "msg" ? e.payload.text : e.payload.type)) ?? null;

describe("engine", () => {
  beforeEach(async () => {
    relay.reset();
    resetCaches();
    await enrol(["t1", "t2", "t3", "t4"]);
  });

  it("members read, non-members get nothing", async () => {
    const r = await createRoom({ name: "협의", kind: "chat", members: ["t2"], by: "t1" });
    await post(r.roomId, "t1", { type: "msg", text: "안녕하세요" });
    expect(await texts("t2", r.roomId)).toEqual(["안녕하세요"]);
    expect(await texts("t3", r.roomId)).toBeNull();
    // the relay holds ciphertext only
    expect(JSON.stringify(relay.snapshot().envelopes)).not.toContain("안녕하세요");
  });

  it("rotating membership locks out removed members and hides history from new ones", async () => {
    const r = await createRoom({ name: "협의", kind: "chat", members: ["t2"], by: "t1" });
    await post(r.roomId, "t1", { type: "msg", text: "이전 대화" });
    await changeMembers(r.roomId, "t1", ["t3"]); // t2 out, t3 in
    await post(r.roomId, "t1", { type: "msg", text: "새 대화" });
    const room = relay.snapshot().rooms.find((x) => x.roomId === r.roomId)!;
    expect(room.keys["2"].t2).toBeUndefined();
    expect(await texts("t2", r.roomId)).toBeNull();
    const t3 = (await readAll("t3")).find((v) => v.room.roomId === r.roomId)!;
    expect(t3.events.map((e) => (e.payload.type === "msg" ? e.payload.text : ""))).toContain("새 대화");
    expect(t3.events.some((e) => e.payload.type === "msg" && e.payload.text === "이전 대화")).toBe(false);
    expect(t3.unreadable).toBe(1);
  });

  it("drops forged, tampered and future-dated envelopes", async () => {
    const r = await createRoom({ name: "업무", kind: "workflow", members: ["t2", "t3"], by: "t1" });
    const real = await post(r.roomId, "t2", { type: "msg", text: "원본" });
    relay.inject({ ...real, id: "forged", sender: "t3" }); // impersonation
    relay.inject({ ...real, id: "tampered", ct: real.ct.slice(0, -4) + "AAAA" });
    relay.append(await seal(r.roomId, "t2", { type: "msg", text: "미래" }, Date.now() + 60 * 60_000));
    const v = (await readAll("t1")).find((x) => x.room.roomId === r.roomId)!;
    expect(v.events.map((e) => e.id)).toEqual([real.id]);
    expect(v.unreadable).toBe(3);
  });

  it("concurrent appends are all kept (per-record storage)", async () => {
    const r = await createRoom({ name: "동시", kind: "chat", members: ["t2"], by: "t1" });
    await Promise.all(Array.from({ length: 30 }, (_, i) => post(r.roomId, i % 2 ? "t1" : "t2", { type: "msg", text: `m${i}` })));
    expect((await texts("t1", r.roomId))?.length).toBe(30);
  });
});
