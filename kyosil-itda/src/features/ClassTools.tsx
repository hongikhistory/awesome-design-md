import { Armchair, Dices, Eye, FileDown, Gift, Maximize2, Minimize2, RefreshCw, RotateCw, Sparkles, Spline, UserRoundSearch, UsersRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { assignRoles, DEFAULT_ROLES, fairInt, fairShuffle, makeLadder, parsePeople, rotateRoles, SAMPLE_TWO_TRUTHS, SAMPLE_WHO, trace, wheelAngle, type Ladder, type Person } from "../core/classtools";
import { download, kordoc } from "../core/docs/engine";
import { Illustrated, inFrame, Notice } from "../ui/common";
import { useClassRoster } from "./roster";

type Tool = "roles" | "draw" | "wheel" | "ladder" | "who" | "truths";
const TOOLS: { id: Tool; name: string; what: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>; color: string }[] = [
  { id: "roles", name: "1인 1역", what: "모두에게 한 가지 역할, 매주 돌리기", Icon: UsersRound, color: "#256EF4" },
  { id: "draw", name: "경품 추첨기", what: "중복 없이 공정하게 뽑기", Icon: Gift, color: "#E85A38" },
  { id: "wheel", name: "룰렛", what: "발표자·모둠 순서 정하기", Icon: RotateCw, color: "#2A9D86" },
  { id: "ladder", name: "사다리타기", what: "역할·순서를 사다리로", Icon: Spline, color: "#6C5CE7" },
  { id: "who", name: "인물 퀴즈", what: "학기 초 ‘나는 누구일까요?’", Icon: UserRoundSearch, color: "#C93D73" },
  { id: "truths", name: "진진가", what: "진짜 둘, 가짜 하나 맞히기", Icon: Dices, color: "#9E6A00" },
];
const PALETTE = ["#256EF4", "#E85A38", "#2A9D86", "#6C5CE7", "#C93D73", "#9E6A00", "#0B7285", "#5F5888"];

function Confetti({ fire }: { fire: number }) {
  const bits = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1.6 + Math.random() * 1.2, rot: Math.random() * 360, color: PALETTE[i % PALETTE.length], w: 6 + Math.random() * 6 })), [fire]);
  if (!fire) return null;
  return (
    <div className="confetti" aria-hidden="true" key={fire}>
      {bits.map((b, i) => <span key={i} style={{ left: `${b.left}%`, background: b.color, width: b.w, height: b.w * 0.45, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  );
}

/** Space / Enter runs the tool's main action, except while typing in a field. */
function useSpace(action: () => void) {
  const ref = useRef(action);
  ref.current = action;
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.code !== "Space" || /INPUT|TEXTAREA|SELECT|BUTTON/.test(t.tagName)) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
}

export function ClassTools() {
  const { names, source } = useClassRoster();
  const [tool, setTool] = useState<Tool>("wheel");
  const [big, setBig] = useState(false);
  const [fire, setFire] = useState(0);
  const celebrate = useCallback(() => setFire((x) => x + 1), []);
  const stage = useRef<HTMLDivElement>(null);
  const t = TOOLS.find((x) => x.id === tool)!;

  const toggleBig = async () => {
    const el = stage.current;
    if (!big && el?.requestFullscreen && !inFrame) { try { await el.requestFullscreen(); } catch { /* in-page */ } }
    else if (big && document.fullscreenElement) await document.exitFullscreen();
    setBig(!big);
    // Space must drive the tool, not press this button again
    requestAnimationFrame(() => stage.current?.focus());
  };
  useEffect(() => {
    const off = () => { if (!document.fullscreenElement) setBig(false); };
    document.addEventListener("fullscreenchange", off);
    return () => document.removeEventListener("fullscreenchange", off);
  }, []);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">학급 · 학급 도구함</div>
          <h1>학급 도구함</h1>
          <p className="lead">1인 1역, 경품 추첨, 룰렛, 사다리타기, 학기 초 인물 퀴즈와 진진가. 교실 화면에 크게 띄우고 스페이스바로 진행합니다. 뽑기는 브라우저의 암호 난수를 써서 누구도 결과를 미리 알 수 없습니다.</p>
        </div>
        <div className="row"><span className="badge ok">{source} {names.length}명</span><a className="btn" href="#groups"><Armchair className="ico sm" aria-hidden /> 자리 배정</a></div>
      </div>

      <div className="tool-tabs" role="tablist" aria-label="학급 도구">
        {TOOLS.map((x) => (
          <button key={x.id} role="tab" aria-selected={tool === x.id} className="tool-tab" style={{ ["--c" as string]: x.color }} onClick={() => setTool(x.id)}>
            <span className="tool-tab-ico"><x.Icon className="ico" aria-hidden /></span>
            <span><b>{x.name}</b><span className="meta">{x.what}</span></span>
          </button>
        ))}
      </div>

      <section ref={stage} tabIndex={-1} className={`ct-stage ${big ? "big" : ""}`} style={{ ["--c" as string]: t.color }} aria-label={t.name}>
        <div className="ct-head">
          <h2><t.Icon className="ico" aria-hidden /> {t.name}</h2>
          <button className="btn sm" onClick={() => void toggleBig()}>{big ? <Minimize2 className="ico sm" aria-hidden /> : <Maximize2 className="ico sm" aria-hidden />} {big ? "작게" : "교실 화면에 크게"}</button>
        </div>
        {tool === "roles" && <Roles names={names} onDone={celebrate} />}
        {tool === "draw" && <Draw names={names} onDone={celebrate} />}
        {tool === "wheel" && <Wheel names={names} onDone={celebrate} />}
        {tool === "ladder" && <LadderTool names={names} onDone={celebrate} />}
        {tool === "who" && <Who onDone={celebrate} />}
        {tool === "truths" && <Truths onDone={celebrate} />}
        <Confetti fire={fire} />
      </section>
    </>
  );
}

// ------------------------------------------------------------------ 1인 1역

function Roles({ names, onDone }: { names: string[]; onDone: () => void }) {
  const [roles, setRoles] = useState(DEFAULT_ROLES.join("\n"));
  const [pairs, setPairs] = useState(() => assignRoles(names, DEFAULT_ROLES));
  const [week, setWeek] = useState(1);
  const run = () => { setPairs(assignRoles(names, roles.split("\n").map((x) => x.trim()))); setWeek(1); onDone(); };
  useSpace(run);
  const save = async () => {
    const md = [`# 1인 1역 (${week}주차)`, "", "| 역할 | 이름 |", "| --- | --- |", ...pairs.map((p) => `| ${p.role} | ${p.name} |`)].join("\n");
    download(`1인1역_${week}주차.hwpx`, await (await kordoc()).markdownToHwpx(md));
  };
  return (
    <div className="ct-split">
      <label className="field ct-side">역할 목록 <span className="hint">한 줄에 하나, 사람이 더 많으면 번호를 붙여 나눕니다</span><textarea rows={12} value={roles} onChange={(e) => setRoles(e.target.value)} /></label>
      <div className="stack">
        <div className="row">
          <button className="btn primary" onClick={run}><Sparkles className="ico sm" aria-hidden /> 역할 배정</button>
          <button className="btn" onClick={() => { setPairs(rotateRoles(pairs)); setWeek((w) => w + 1); }}><RefreshCw className="ico sm" aria-hidden /> 다음 주로 돌리기</button>
          <button className="btn" onClick={() => void save()}><FileDown className="ico sm" aria-hidden /> HWPX</button>
          <span className="meta">{week}주차</span>
        </div>
        <div className="role-grid" key={`${week}-${pairs.map((p) => p.name).join()}`}>
          {pairs.map((p, i) => <div key={p.name} className="role-card" style={{ animationDelay: `${i * 30}ms` }}><span className="role-name">{p.role}</span><b>{p.name}</b></div>)}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 경품 추첨기

function Draw({ names, onDone }: { names: string[]; onDone: () => void }) {
  const [prize, setPrize] = useState("간식 쿠폰");
  const [count, setCount] = useState(3);
  const [exclude, setExclude] = useState(true);
  const [won, setWon] = useState<{ prize: string; names: string[] }[]>([]);
  const [rolling, setRolling] = useState("");
  const [result, setResult] = useState<string[]>([]);
  const busy = useRef(false);
  const pool = names.filter((n) => !exclude || !won.some((w) => w.names.includes(n)));
  const run = () => {
    if (busy.current || !pool.length) return;
    busy.current = true;
    setResult([]);
    const winners = fairShuffle(pool).slice(0, Math.min(count, pool.length));
    let n = 0;
    const iv = setInterval(() => setRolling(pool[fairInt(pool.length)]), 70);
    setTimeout(() => {
      clearInterval(iv);
      setRolling("");
      const reveal = () => {
        n++;
        setResult(winners.slice(0, n));
        if (n < winners.length) setTimeout(reveal, 450);
        else { setWon((w) => [...w, { prize, names: winners }]); busy.current = false; onDone(); }
      };
      reveal();
    }, 1600);
  };
  useSpace(run);
  return (
    <div className="ct-split">
      <div className="stack ct-side">
        <label className="field">경품<input type="text" value={prize} onChange={(e) => setPrize(e.target.value)} /></label>
        <label className="field">뽑을 인원<input type="number" min={1} max={names.length} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} /></label>
        <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} /> 이미 당첨된 학생 빼기</label>
        <p className="meta">남은 후보 {pool.length}명</p>
        {won.length > 0 && <ol className="draw-log">{won.map((w, i) => <li key={i}><b>{w.prize}</b> {w.names.join(", ")}</li>)}</ol>}
      </div>
      <div className="draw-stage">
        <p className="draw-prize">{prize}</p>
        {rolling ? <p className="draw-roll" aria-live="off">{rolling}</p> : result.length ? (
          <ul className="draw-win" aria-live="polite">{result.map((n) => <li key={n}><Illustrated seed={n} color="#E85A38" size={56} /><b>{n}</b></li>)}</ul>
        ) : <p className="draw-roll idle">스페이스바 또는 아래 버튼</p>}
        <button className="btn primary lg" onClick={run} disabled={!pool.length}><Gift className="ico sm" aria-hidden /> 추첨하기</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 룰렛

function Wheel({ names, onDone }: { names: string[]; onDone: () => void }) {
  const [mode, setMode] = useState<"names" | "custom">("names");
  const [custom, setCustom] = useState("1모둠\n2모둠\n3모둠\n4모둠\n5모둠\n6모둠");
  const [removed, setRemoved] = useState<string[]>([]);
  const [drop, setDrop] = useState(true);
  const items = (mode === "names" ? names : custom.split("\n").map((x) => x.trim()).filter(Boolean)).filter((x) => !removed.includes(x)).slice(0, 30);
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState("");
  const target = useRef(-1);
  const spin = () => {
    if (spinning || items.length < 2) return;
    const i = fairInt(items.length);
    target.current = i;
    setWinner("");
    setSpinning(true);
    setRot((r) => wheelAngle(items.length, i, r));
  };
  useSpace(spin);
  const end = () => {
    if (!spinning) return;
    setSpinning(false);
    const w = items[target.current];
    setWinner(w);
    onDone();
  };
  const seg = 360 / Math.max(items.length, 1);
  const R = 200;
  const arc = (k: number) => {
    const a0 = ((k * seg - 90) * Math.PI) / 180, a1 = (((k + 1) * seg - 90) * Math.PI) / 180;
    return `M0 0L${R * Math.cos(a0)} ${R * Math.sin(a0)}A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}Z`;
  };
  return (
    <div className="ct-split">
      <div className="stack ct-side">
        <div className="seg" role="radiogroup" aria-label="룰렛 항목">
          <button role="radio" aria-checked={mode === "names"} onClick={() => { setMode("names"); setRemoved([]); }}>학생 이름</button>
          <button role="radio" aria-checked={mode === "custom"} onClick={() => { setMode("custom"); setRemoved([]); }}>직접 입력</button>
        </div>
        {mode === "custom" && <label className="field">항목 <span className="hint">한 줄에 하나, 30개까지</span><textarea rows={8} value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
        <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" checked={drop} onChange={(e) => setDrop(e.target.checked)} /> 뽑힌 항목은 다음 판에서 빼기</label>
        {removed.length > 0 && <p className="meta">뺀 항목: {removed.join(", ")} <button className="btn sm text" onClick={() => setRemoved([])}>모두 되돌리기</button></p>}
      </div>
      <div className="wheel-wrap">
        <div className="wheel-pointer" aria-hidden="true" />
        <svg className="wheel" viewBox="-210 -210 420 420" role="img" aria-label={`룰렛 ${items.length}칸`} style={{ transform: `rotate(${rot}deg)` }} onTransitionEnd={end}>
          {items.map((x, k) => {
            const mid = (k + 0.5) * seg;
            return (
              <g key={`${x}-${k}`}>
                <path d={arc(k)} fill={PALETTE[k % PALETTE.length]} stroke="#fff" strokeWidth="2" />
                <text transform={`rotate(${mid}) translate(0 -${R * 0.62}) rotate(90)`} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={items.length > 16 ? 12 : 16} fontWeight="800">{x.length > 6 ? `${x.slice(0, 6)}…` : x}</text>
              </g>
            );
          })}
          <circle r="34" fill="#fff" stroke="#10203F" strokeWidth="4" />
        </svg>
        <div className="wheel-result" aria-live="polite">{winner ? <><span className="meta">당첨</span><b>{winner}</b></> : <span className="meta">{items.length < 2 ? "항목이 둘 이상 필요합니다" : "스페이스바로 돌리기"}</span>}</div>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn primary lg" onClick={spin} disabled={spinning || items.length < 2}><RotateCw className="ico sm" aria-hidden /> 돌리기</button>
          {winner && drop && <button className="btn" onClick={() => { setRemoved([...removed, winner]); setWinner(""); }}>‘{winner}’ 빼고 다시</button>}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 사다리타기

function LadderTool({ names, onDone }: { names: string[]; onDone: () => void }) {
  const [tops, setTops] = useState(names.slice(0, 6).join("\n"));
  const [bottoms, setBottoms] = useState("칠판 정리\n발표 1번\n간식 당번\n통과\n통과\n모둠 기록");
  const players = tops.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 10);
  const prizes = bottoms.split("\n").map((x) => x.trim()).filter(Boolean);
  const n = players.length;
  const [ladder, setLadder] = useState<Ladder>(() => makeLadder(Math.max(2, n)));
  const [shown, setShown] = useState<number[]>([]);
  const [hidden, setHidden] = useState(true);
  useEffect(() => { setLadder(makeLadder(Math.max(2, n))); setShown([]); setHidden(true); }, [n]);
  const W = 640, H = 420, top = 40, bot = 380, gap = W / (n + 1);
  const x = (c: number) => gap * (c + 1);
  const y = (lv: number) => top + ((bot - top) * (lv + 0.5)) / ladder.levels;
  const pathOf = (i: number) => {
    const t = trace(ladder, i);
    let d = `M${x(i)} ${top}`;
    for (const s of t.path) { d += `L${x(s.col)} ${y(s.level)}`; if (s.move) d += `L${x(s.col + s.move)} ${y(s.level)}`; }
    return { d: `${d}L${x(t.end)} ${bot}`, end: t.end };
  };
  const go = (i: number) => { if (!shown.includes(i)) { setShown([...shown, i]); onDone(); } };
  useSpace(() => { const next = players.findIndex((_, i) => !shown.includes(i)); if (next >= 0) go(next); });
  return (
    <div className="ct-split">
      <div className="stack ct-side">
        <div className="grid two">
          <label className="field">참가자 <span className="hint">10명까지</span><textarea rows={7} value={tops} onChange={(e) => setTops(e.target.value)} /></label>
          <label className="field">결과<textarea rows={7} value={bottoms} onChange={(e) => setBottoms(e.target.value)} /></label>
        </div>
        <div className="row">
          <button className="btn" onClick={() => { setLadder(makeLadder(Math.max(2, n))); setShown([]); setHidden(true); }}><Dices className="ico sm" aria-hidden /> 새 사다리</button>
          <button className="btn" onClick={() => setHidden(!hidden)}><Eye className="ico sm" aria-hidden /> 가로줄 {hidden ? "보이기" : "가리기"}</button>
          <button className="btn" onClick={() => setShown(players.map((_, i) => i))}>모두 공개</button>
        </div>
        <p className="meta">이름을 누르면 길이 그려집니다. 가로줄을 가린 채 결과를 먼저 보여 주면 더 긴장감 있습니다.</p>
      </div>
      <div className="ladder-wrap">
        <svg className="ladder" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`사다리 ${n}줄`}>
          {players.map((_, i) => <line key={i} x1={x(i)} y1={top} x2={x(i)} y2={bot} stroke="#10203F" strokeWidth="4" strokeLinecap="round" />)}
          <g className={hidden && shown.length < n ? "rungs hide" : "rungs"}>
            {ladder.rungs.map((r, lv) => r.filter((c) => c < n - 1).map((c) => <line key={`${lv}-${c}`} x1={x(c)} y1={y(lv)} x2={x(c + 1)} y2={y(lv)} stroke="#10203F" strokeWidth="4" strokeLinecap="round" />))}
          </g>
          {shown.map((i) => { const p = pathOf(i); return <path key={i} className="ladder-path" d={p.d} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />; })}
        </svg>
        <div className="ladder-tops" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {players.map((p, i) => <button key={i} className="ladder-name" style={{ ["--c" as string]: PALETTE[i % PALETTE.length] }} aria-pressed={shown.includes(i)} onClick={() => go(i)}>{p}</button>)}
        </div>
        <div className="ladder-bottoms" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {Array.from({ length: n }, (_, c) => {
            const who = shown.find((i) => pathOf(i).end === c);
            return <div key={c} className={`ladder-prize ${who !== undefined ? "on" : ""}`} style={{ ["--c" as string]: who !== undefined ? PALETTE[who % PALETTE.length] : "#C9D4E6" }}>{prizes[c] ?? "통과"}{who !== undefined && <small>{players[who]}</small>}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ 인물 퀴즈 · 진진가

function PeopleEditor({ text, setText, hint, children }: { text: string; setText: (s: string) => void; hint: string; children: ReactNode }) {
  return (
    <div className="ct-split">
      <div className="stack ct-side">
        <label className="field">학생이 낸 문장 <span className="hint">{hint}</span><textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} /></label>
        <Notice kind="plain">학생이 직접 쓰고 공개에 동의한 내용만 넣으세요. 이 화면의 내용은 저장하지 않으며 새로 고치면 사라집니다.</Notice>
      </div>
      {children}
    </div>
  );
}

function Who({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState(SAMPLE_WHO);
  const people = useMemo(() => fairShuffle(parsePeople(text)), [text]);
  const [i, setI] = useState(0);
  const [hints, setHints] = useState(1);
  const [open, setOpen] = useState(false);
  const p: Person | undefined = people[i % Math.max(people.length, 1)];
  const step = () => { if (!p) return; if (hints < p.lines.length) setHints(hints + 1); else if (!open) { setOpen(true); onDone(); } else { setI(i + 1); setHints(1); setOpen(false); } };
  useSpace(step);
  return (
    <PeopleEditor text={text} setText={(s) => { setText(s); setI(0); setHints(1); setOpen(false); }} hint="‘## 이름’ 아래에 ‘- 단서’">
      <div className="who-stage">
        {p ? <>
          <p className="who-q">{open ? "정답!" : "나는 누구일까요?"}</p>
          <ol className="who-hints">{p.lines.slice(0, hints).map((h, k) => <li key={k} style={{ animationDelay: `${k ? 0 : 0}ms` }}><span>단서 {k + 1}</span>{h}</li>)}</ol>
          <div className={`who-card ${open ? "open" : ""}`} aria-live="polite">{open ? <><Illustrated seed={p.name} color="#C93D73" size={88} /><b>{p.name}</b></> : <b>?</b>}</div>
          <button className="btn primary lg" onClick={step}>{hints < p.lines.length ? "단서 더 보기" : open ? "다음 친구" : "정답 공개"}</button>
          <p className="meta">{(i % people.length) + 1} / {people.length}</p>
        </> : <p className="meta">문장을 입력하세요.</p>}
      </div>
    </PeopleEditor>
  );
}

function Truths({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState(SAMPLE_TWO_TRUTHS);
  const people = useMemo(() => parsePeople(text).filter((p) => p.fake !== undefined), [text]);
  const [i, setI] = useState(0);
  const [votes, setVotes] = useState<number[]>([0, 0, 0]);
  const [open, setOpen] = useState(false);
  const p = people[i % Math.max(people.length, 1)];
  const step = () => { if (!p) return; if (!open) { setOpen(true); onDone(); } else { setI(i + 1); setVotes([0, 0, 0]); setOpen(false); } };
  useSpace(step);
  return (
    <PeopleEditor text={text} setText={(s) => { setText(s); setI(0); setOpen(false); setVotes([0, 0, 0]); }} hint="가짜 문장 끝에 ‘(가짜)’">
      <div className="truth-stage">
        {p ? <>
          <div className="row" style={{ justifyContent: "center" }}><Illustrated seed={p.name} color="#9E6A00" size={56} /><b className="truth-name">{p.name}의 진진가</b></div>
          <div className="truth-cards">
            {p.lines.map((l, k) => (
              <button key={k} className={`truth-card ${open ? (k === p.fake ? "fake" : "real") : ""}`} onClick={() => !open && setVotes(votes.map((v, j) => (j === k ? v + 1 : v)))} aria-label={`${k + 1}번 문장: ${l}${open ? (k === p.fake ? " (가짜)" : " (진짜)") : `, ${votes[k]}표`}`}>
                <span className="truth-no">{k + 1}</span>
                <span className="truth-text">{l}</span>
                <span className="truth-foot">{open ? (k === p.fake ? "가짜!" : "진짜") : `${votes[k]}표`}</span>
              </button>
            ))}
          </div>
          <button className="btn primary lg" onClick={step}>{open ? "다음 친구" : "정답 공개"}</button>
          <p className="meta">문장을 누르면 그 문장에 한 표. {(i % people.length) + 1} / {people.length}</p>
        </> : <p className="meta">가짜 문장에 ‘(가짜)’ 표시가 있는 학생이 없습니다.</p>}
      </div>
    </PeopleEditor>
  );
}
