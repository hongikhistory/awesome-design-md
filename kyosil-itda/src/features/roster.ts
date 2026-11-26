import { useMemo } from "react";
import type { RecordEvent } from "../core/engine";
import { ROOM } from "../core/seed";
import { useApp } from "../state";

/** Fictional names used when this device has no class roster. */
export const DEMO_NAMES = ["강민준", "김서연", "박지호", "이하은", "정우진", "최수아", "한도윤", "윤지민", "임예준", "오채원", "서지안", "신유나", "장하람", "조은호", "배서윤", "류시우", "문가온", "남다인", "홍준서", "송아린", "권태오", "황보미", "안소율", "전이안"];

/** The homeroom roster from 학생 상담·기록 (after the latest fresh start), or the demo names. */
export function useClassRoster(): { names: string[]; source: string } {
  const { view } = useApp();
  return useMemo(() => {
    const ev = view(ROOM.class21)?.events ?? [];
    let from = 0;
    ev.forEach((e, i) => { if (e.payload.type === "rec.reset") from = i + 1; });
    let names: string[] | null = null;
    for (const e of ev.slice(from)) { const p = e.payload as RecordEvent; if (p.type === "rec.roster") names = p.students.map((s) => s.name); }
    return names?.length ? { names, source: "학급 명렬표" } : { names: DEMO_NAMES, source: "가상 명단" };
  }, [view]);
}
