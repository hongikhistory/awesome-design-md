import { FileDown, Maximize2, Minimize2, Plus, Printer, Shuffle, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { download, kordoc } from "../core/docs/engine";
import { markdownToXlsx } from "../core/docs/writers";
import type { RecordEvent } from "../core/engine";
import { groupsMarkdown, makeGroups, makeSeating, seatingMarkdown, type Member } from "../core/groups";
import { useMyProfile } from "../core/profile";
import { ROOM } from "../core/seed";
import { useApp } from "../state";
import { Illustrated, inFrame, Notice, useToast } from "../ui/common";

// Used when this device has no class roster (e.g. not the homeroom teacher). Fictional names.
const DEMO = ["강민준", "김서연", "박지호", "이하은", "정우진", "최수아", "한도윤", "윤지민", "임예준", "오채원", "서지안", "신유나", "장하람", "조은호", "배서윤", "류시우", "문가온", "남다인", "홍준서", "송아린", "권태오", "황보미", "안소율", "전이안"].map((name, i) => ({ no: i + 1, name }));
const COLORS = ["#256EF4", "#2A9D86", "#E85A38", "#6C5CE7", "#C93D73", "#9E6A00", "#0B7285", "#5F5888"];

export function Groups() {
  const { view, me } = useApp();
  const homeroom = useMyProfile(me.id).homeroom || "2-1";
  const roster = useMemo(() => {
    let students: Member[] | null = null, from = 0;
    const ev = view(ROOM.class21)?.events ?? [];
    ev.forEach((e, i) => { if (e.payload.type === "rec.reset") from = i + 1; });
    for (const e of ev.slice(from)) { const p = e.payload as RecordEvent; if (p.type === "rec.roster") students = p.students; }
    return students;
  }, [view]);
  const [pasted, setPasted] = useState("");
  const members: Member[] = useMemo(() => {
    const names = pasted.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
    if (names.length >= 2) return names.map((name, i) => ({ no: i + 1, name }));
    return roster?.length ? roster : DEMO;
  }, [pasted, roster]);
  const source = pasted.trim() ? "붙여 넣은 명단" : roster?.length ? `${homeroom} 명렬표(학생 기록)` : "가상 명단";

  const [mode, setMode] = useState<"groups" | "seats">("groups");
  const [size, setSize] = useState(4);
  const [cols, setCols] = useState(6);
  const [seed, setSeed] = useState(1);
  const [apart, setApart] = useState<[number, number][]>([]);
  const [front, setFront] = useState<number[]>([]);
  const [pick, setPick] = useState<[number, number]>([0, 0]);
  const [big, setBig] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const g = useMemo(() => makeGroups(members, size, apart, seed), [members, size, apart, seed]);
  const s = useMemo(() => makeSeating(members, cols, front, apart, seed), [members, cols, front, apart, seed]);
  const name = (no: number) => members.find((m) => m.no === no)?.name ?? `${no}번`;
  const broken = mode === "groups" ? g.broken : s.broken;
  const title = `${homeroom.replace("-", "학년 ")}반`;

  const save = async (fmt: "hwpx" | "xlsx") => {
    const md = mode === "groups" ? groupsMarkdown(title, g) : seatingMarkdown(title, s);
    if (fmt === "xlsx") download(`${title}_${mode === "groups" ? "모둠" : "자리"}.xlsx`, (await markdownToXlsx(md)) as BlobPart);
    else download(`${title}_${mode === "groups" ? "모둠" : "자리"}.hwpx`, await (await kordoc()).markdownToHwpx(md));
  };

  const toggleBig = async () => {
    const el = stage.current;
    if (!big && el?.requestFullscreen && !inFrame) { try { await el.requestFullscreen(); } catch { /* fall back to the in-page view */ } }
    else if (big && document.fullscreenElement) await document.exitFullscreen();
    setBig(!big);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업·문서 · 모둠·자리</div>
          <h1>모둠 편성·자리 배치</h1>
          <p className="lead">명렬표로 모둠을 나누고 역할(이끔이·기록이·발표이·지킴이)을 정하거나, 자리를 배치합니다. 떨어뜨릴 짝과 앞자리가 필요한 학생을 지키고, 편성 번호로 같은 결과를 다시 띄울 수 있습니다.</p>
        </div>
        <div className="row">
          <button className="btn primary" onClick={() => { setSeed((x) => x + 1); toast.show("다시 섞었습니다."); }}><Shuffle className="ico sm" aria-hidden /> 다시 섞기</button>
          <button className="btn" onClick={() => void toggleBig()}>{big ? <Minimize2 className="ico sm" aria-hidden /> : <Maximize2 className="ico sm" aria-hidden />} {big ? "작게" : "교실 화면에 크게"}</button>
        </div>
      </div>

      <div className="tabs" role="tablist" aria-label="편성 방식" style={{ marginBottom: 16 }}>
        <button role="tab" aria-selected={mode === "groups"} onClick={() => setMode("groups")}>모둠 편성</button>
        <button role="tab" aria-selected={mode === "seats"} onClick={() => setMode("seats")}>자리 배치</button>
      </div>

      <div className="grp-layout">
        <section className="panel" aria-labelledby="grp-set">
          <div className="panel-head"><h2 id="grp-set">조건</h2><span className="meta">{members.length}명 · {source}</span></div>
          <div className="panel-body stack">
            {mode === "groups" ? (
              <label className="field">모둠 인원<select id="grp-size" value={size} onChange={(e) => setSize(Number(e.target.value))}>{[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}명 안팎 ({Math.max(1, Math.round(members.length / n))}모둠)</option>)}</select></label>
            ) : (
              <label className="field">한 줄 자리 수 <span className="hint">짝 단위로 앉습니다</span><select id="grp-cols" value={cols} onChange={(e) => setCols(Number(e.target.value))}>{[4, 6, 8].map((n) => <option key={n} value={n}>{n}자리</option>)}</select></label>
            )}
            <fieldset className="grp-fs">
              <legend>떨어뜨릴 짝</legend>
              <div className="row nowrap">
                {[0, 1].map((k) => (
                  <select key={k} aria-label={`떨어뜨릴 학생 ${k + 1}`} value={pick[k]} onChange={(e) => setPick(k === 0 ? [Number(e.target.value), pick[1]] : [pick[0], Number(e.target.value)])}>
                    <option value={0}>학생 선택</option>
                    {members.map((m) => <option key={m.no} value={m.no}>{m.no}. {m.name}</option>)}
                  </select>
                ))}
                <button className="btn sm" aria-label="떨어뜨릴 짝 추가" disabled={!pick[0] || !pick[1] || pick[0] === pick[1]} onClick={() => { setApart([...apart, pick]); setPick([0, 0]); }}><Plus className="ico sm" aria-hidden /></button>
              </div>
              {apart.length > 0 && <ul className="chips">{apart.map(([a, b], i) => <li key={i}>{name(a)} ↔ {name(b)} <button className="btn sm text" aria-label={`${name(a)}, ${name(b)} 조건 삭제`} onClick={() => setApart(apart.filter((_, j) => j !== i))}><X className="ico sm" aria-hidden /></button></li>)}</ul>}
            </fieldset>
            {mode === "seats" && (
              <fieldset className="grp-fs">
                <legend>앞자리 배정 <span className="meta">사유는 적지 않습니다</span></legend>
                <div className="chip-pick">{members.map((m) => <label key={m.no} className="choice"><input type="checkbox" checked={front.includes(m.no)} onChange={(e) => setFront(e.target.checked ? [...front, m.no] : front.filter((x) => x !== m.no))} />{m.name}</label>)}</div>
              </fieldset>
            )}
            <details>
              <summary className="act-summary">다른 명단 쓰기</summary>
              <label className="field" style={{ marginTop: 8 }}>이름을 줄마다 또는 쉼표로<textarea id="grp-paste" rows={4} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="예: 가온, 나래, 다솜 …" /></label>
            </details>
            <p className="meta">편성 번호 {seed}. 같은 번호와 조건이면 같은 결과가 나옵니다. 명단은 이 기기 밖으로 나가지 않습니다.</p>
            <div className="row">
              <button className="btn sm" onClick={() => void save("hwpx")}><FileDown className="ico sm" aria-hidden /> HWPX</button>
              <button className="btn sm" onClick={() => void save("xlsx")}><FileDown className="ico sm" aria-hidden /> XLSX</button>
              {!inFrame && <button className="btn sm" onClick={() => window.print()}><Printer className="ico sm" aria-hidden /> 인쇄</button>}
            </div>
          </div>
        </section>

        <section ref={stage} className={`grp-stage ${big ? "big" : ""}`} aria-label={mode === "groups" ? "모둠 편성 결과" : "자리 배치 결과"}>
          {big && <button className="btn sm grp-close" onClick={() => void toggleBig()}><Minimize2 className="ico sm" aria-hidden /> 닫기</button>}
          {broken.length > 0 && <Notice kind="warn">조건을 모두 지킬 수 없어 {broken.map(([a, b]) => `${name(a)}·${name(b)}`).join(", ")}이(가) 함께 있습니다. 모둠 수나 조건을 바꿔 보세요.</Notice>}
          {mode === "groups" ? (
            <div className="grp-grid" key={`g${seed}-${size}`}>
              {g.groups.map((x, i) => (
                <article key={i} className="grp-card" style={{ ["--c" as string]: COLORS[i % COLORS.length], animationDelay: `${i * 50}ms` }}>
                  <h3>{i + 1}모둠</h3>
                  <ul>{x.members.map((m, j) => <li key={m.no}><Illustrated seed={m.name} color={COLORS[i % COLORS.length]} size={32} /><span className="grp-name">{m.name}</span><span className="badge">{x.roles[j]}</span></li>)}</ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="seat-wrap" key={`s${seed}-${cols}`}>
              <div className="seat-board">교탁 · 칠판</div>
              <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                {s.seats.map((m, i) => <div key={i} className={`seat ${m ? "" : "empty"} ${i % 2 ? "right" : "left"} ${m && front.includes(m.no) ? "front" : ""}`} style={{ animationDelay: `${(i % 12) * 25}ms` }}>{m ? m.name : ""}</div>)}
              </div>
            </div>
          )}
        </section>
      </div>
      {toast.node}
    </>
  );
}
