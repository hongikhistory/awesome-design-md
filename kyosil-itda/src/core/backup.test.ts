import { describe, expect, it } from "vitest";
import { checkPassphrase, openBackup, sealBackup, type RecordsSnapshot } from "./backup";

const snap: RecordsSnapshot = {
  app: "kyosil-itda", kind: "records", version: 1, classId: "2-1", exportedAt: "2026-11-26T00:00:00Z",
  events: [{ type: "rec.roster", classId: "2-1", students: [{ no: 1, name: "가나다" }] }, { type: "rec.obs", id: "o1", no: 1, date: "2026-11-01", area: "subject", subject: "국어", text: "발표함." }],
};

describe("records backup", () => {
  it("round-trips with the right passphrase and refuses a wrong one", async () => {
    const file = await sealBackup(snap, "홍익중 2-1 백업 암호", 100_000);
    expect(file).not.toContain("가나다");
    expect((await openBackup(file, "홍익중 2-1 백업 암호", )).events).toEqual(snap.events);
    await expect(openBackup(file, "틀린 암호입니다만")).rejects.toThrow(/암호/);
  });
  it("rejects tampered files and weak passphrases", async () => {
    const env = JSON.parse(await sealBackup(snap, "충분히 긴 암호문장", 100_000));
    env.data = env.data.slice(0, -8) + "AAAAAAA=";
    await expect(openBackup(JSON.stringify(env), "충분히 긴 암호문장")).rejects.toThrow();
    await expect(openBackup("{}", "x")).rejects.toThrow(/백업 파일/);
    expect(checkPassphrase("1234")).not.toBe("");
    expect(checkPassphrase("우리반 기록 2026 가을")).toBe("");
  });
});
