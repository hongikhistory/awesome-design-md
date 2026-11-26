import { describe, expect, it } from "vitest";
import { josa } from "./josa";

describe("josa", () => {
  it("picks particles by final consonant", () => {
    expect(josa("교체", "을/를")).toBe("교체를");
    expect(josa("보결", "을/를")).toBe("보결을");
    expect(josa("보결", "으로/로")).toBe("보결로");
    expect(josa("수업", "으로/로")).toBe("수업으로");
    expect(josa("지도교사", "이/가")).toBe("지도교사가");
  });
  it("reads digits as Sino-Korean numerals", () => {
    expect(josa("3", "으로/로")).toBe("3으로");
    expect(josa("2", "으로/로")).toBe("2로");
    expect(josa("1", "으로/로")).toBe("1로");
    expect(josa("4", "이/가")).toBe("4가");
  });
});
