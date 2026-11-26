import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { reduceRequests, type CoverRequest, type Stamped, type WorkflowEvent } from "./core/approval";
import { post, readAll, resetCaches, type AppEvent, type Decrypted, type RoomView } from "./core/engine";
import { clearDeviceKeys } from "./core/keystore";
import { relay } from "./core/relay";
import { PEOPLE, person, type Person } from "./core/school";
import { ensureSeed, ROOM } from "./core/seed";

interface AppState {
  ready: boolean;
  error: string;
  me: Person;
  setMe: (id: string) => void;
  views: RoomView[];
  view: (roomId: string) => RoomView | undefined;
  send: (roomId: string, payload: AppEvent) => Promise<void>;
  requests: CoverRequest[];
  resetDemo: () => Promise<void>;
  /** bumps whenever the relay changes (used by the transparency view) */
  tick: number;
  /** a document handed from one tool to another (e.g. 문서 변환 → 수업 슬라이드); in memory only */
  handoff: Handoff | null;
  setHandoff: (h: Handoff | null) => void;
}

export interface Handoff {
  to: "slides" | "letters" | "activities";
  name: string;
  markdown: string;
  /** a whole lesson pack from 과목별 수업 만들기 / 챗봇: fills all three activity kinds at once */
  pack?: { subject: string; quiz: string; evidence: string; exit: string; titles: { quiz: string; evidence: string; exit: string } };
}

const Ctx = createContext<AppState | null>(null);

const ME_KEY = "kyosil:me";
function initialMe() {
  try {
    const q = new URLSearchParams(location.search).get("as");
    if (q && person(q)) return q;
    return sessionStorage.getItem(ME_KEY) || "t1";
  } catch {
    return "t1";
  }
}

async function withBootLock<T>(fn: () => Promise<T>): Promise<T> {
  // Two tabs opened at once must not create two different key sets for one person.
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  return locks ? (locks.request("kyosil-boot", fn) as Promise<T>) : fn();
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [meId, setMeId] = useState(initialMe);
  const [views, setViews] = useState<RoomView[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    const n = ++seq.current;
    try {
      const v = await readAll(meId);
      if (n === seq.current) setViews(v);
    } catch (e) {
      setError(String((e as Error).message || e));
    }
    setTick((t) => t + 1);
  }, [meId]);

  useEffect(() => {
    let alive = true;
    withBootLock(async () => {
      relay.sweep();
      await ensureSeed();
    })
      .then(() => alive && setReady(true))
      .catch((e) => alive && setError(String(e?.message || e)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refresh();
    return relay.subscribe(() => void refresh());
  }, [ready, refresh]);

  const setMe = useCallback((id: string) => {
    try {
      sessionStorage.setItem(ME_KEY, id);
    } catch {
      /* ignore */
    }
    setMeId(id);
  }, []);

  const send = useCallback(async (roomId: string, payload: AppEvent) => {
    await post(roomId, meId, payload);
  }, [meId]);

  const requests = useMemo(() => {
    const wf = views.find((v) => v.room.roomId === ROOM.workflow);
    if (!wf) return [];
    const log: Stamped<WorkflowEvent>[] = wf.events
      .filter((e): e is Decrypted & { payload: WorkflowEvent } => e.payload.type.startsWith("cover."))
      .map((e) => ({ event: e.payload, actor: { id: e.sender, role: person(e.sender)?.role ?? "teacher" }, at: e.at, id: e.id }));
    return [...reduceRequests(log).values()].sort((a, b) => b.createdAt - a.createdAt);
  }, [views]);

  const resetDemo = useCallback(async () => {
    relay.reset();
    await clearDeviceKeys();
    resetCaches();
    await withBootLock(ensureSeed);
    await refresh();
  }, [refresh]);

  const value: AppState = {
    ready,
    error,
    me: person(meId) ?? PEOPLE[0],
    setMe,
    views,
    view: (id) => views.find((v) => v.room.roomId === id),
    send,
    requests,
    resetDemo,
    tick,
    handoff,
    setHandoff,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw Error("AppProvider missing");
  return v;
}

export const timeLabel = (at: number) =>
  new Date(at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
