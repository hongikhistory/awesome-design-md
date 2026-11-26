import { ArchiveRestore, ClipboardCopy, FileDown, KeyRound, LoaderCircle, Lock, Plus, Save, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { download, kordoc, toMarkdown } from "../core/docs/engine";
import { parseBlocks } from "../core/docs/markdown";
import { markdownToDocx, markdownToXlsx } from "../core/docs/writers";
import type { Decrypted, RecordArea, RecordEvent } from "../core/engine";
import { checkRecord, draftPrompt, ITEM_LABEL, limitFor, neisBytes, type Confidence, type SchoolYear } from "../core/records";
import { checkPassphrase, openBackup, sealBackup } from "../core/backup";
import { useMyProfile, useSchool } from "../core/profile";
import { ROOM } from "../core/seed";
import { timeLabel, useApp } from "../state";
import { Empty, Notice, useToast } from "../ui/common";

interface Student { no: number; name: string }
interface Obs { id: string; no: number; date: string; area: RecordArea; subject?: string; text: string; at: number }
interface Counsel { id: string; no: number; date: string; with: string; method: string; topics: string[]; content: string; followUp: string; next?: string; kind?: "정기" | "수시" | "위기" | "추수"; referral?: boolean; at: number }
interface Draft { no: number; item: RecordArea; subject?: string; year: SchoolYear; text: string; at: number }

const AREAS: RecordArea[] = ["subject", "individual", "behavior", "autonomy", "club", "career"];
const TOPICS = ["학업", "진로", "교우", "가정", "건강", "생활"];
const CONF_LABEL: Record<Confidence, string> = { official: "기재요령 확인", verify: "원문 대조 필요", custom: "관례" };
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID().slice(0, 8);

function collect(events: Decrypted[]) {
  let students: Student[] = [];
  const obs: Obs[] = [], counsel: Counsel[] = [], drafts = new Map<string, Draft>();
  const deleted = new Set<string>();
  // a fresh start or a restore hides everything recorded before it
  let from = 0;
  events.forEach((e, i) => { if (e.payload.type === "rec.reset") from = i + 1; });
  events = events.slice(from);
  for (const e of events) if (e.payload.type === "rec.delete") deleted.add(e.payload.id);
  for (const e of events) {
    const p = e.payload as RecordEvent;
    if (p.type === "rec.roster") students = p.students;
    else if (p.type === "rec.obs" && !deleted.has(p.id)) obs.push({ ...p, at: e.at });
    else if (p.type === "rec.counsel" && !deleted.has(p.id)) counsel.push({ ...p, at: e.at });
    else if (p.type === "rec.draft") drafts.set(`${p.no}:${p.item}:${p.subject ?? ""}`, { ...p, at: e.at });
  }
  return { students, obs: obs.sort((a, b) => b.date.localeCompare(a.date)), counsel: counsel.sort((a, b) => b.date.localeCompare(a.date)), drafts };
}

export function Students() {
  const { view, me } = useApp();
  const v = view(ROOM.class21);
  if (!v) {
    return (
      <>
        <div className="page-head"><div><div className="crumb">학생 · 학생 기록</div><h1>학생 상담·기록</h1></div></div>
        <Notice kind="plain">
          <b>{me.name} 님의 기기에는 열 수 있는 학급 기록이 없습니다.</b>
          <p className="muted" style={{ marginTop: 4 }}>학급 기록은 담임 교사의 기기에서만 복호화됩니다. 같은 학교 교사도, 서버도 내용을 볼 수 없습니다. 시연에서는 2학년 1반 담임 <b>곽민혁</b>으로 바꿔 보세요.</p>
        </Notice>
      </>
    );
  }
  return <ClassRecords events={v.events} />;
}

function ClassRecords({ events }: { events: Decrypted[] }) {
  const { send, me } = useApp();
  const homeroom = useMyProfile(me.id).homeroom.trim() || "2-1";
  const [gr, cl] = homeroom.split(/[-\s·.]/);
  const classLabel = cl ? `${gr}학년 ${cl}반` : homeroom;
  const [showBackup, setShowBackup] = useState(false);
  const data = useMemo(() => collect(events), [events]);
  const [sel, setSel] = useState(data.students[0]?.no ?? 1);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"obs" | "counsel" | "record" | "overview">("record");
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const student = data.students.find((s) => s.no === sel);
  const list = data.students.filter((s) => !q.trim() || s.name.includes(q.trim()) || String(s.no) === q.trim());
  const post = (ev: RecordEvent) => send(ROOM.class21, ev);

  const importRoster = async (f: File) => {
    setBusy("roster");
    try {
      const r = await toMarkdown(f);
      const table = parseBlocks(r.markdown).find((b) => b.type === "table");
      if (!table || table.type !== "table") throw Error("표를 찾지 못했습니다. ‘번호’와 ‘이름’ 열이 있는 명렬표를 올려 주세요.");
      const h = table.header.map((x) => x.replace(/\s/g, ""));
      const iNo = h.findIndex((x) => /번호|번/.test(x)), iName = h.findIndex((x) => /이름|성명/.test(x));
      if (iName < 0) throw Error("‘이름’(또는 ‘성명’) 열이 없습니다.");
      const students = table.rows.map((row, i) => ({ no: Number(row[iNo] ?? i + 1) || i + 1, name: (row[iName] ?? "").trim() })).filter((s) => s.name);
      await post({ type: "rec.roster", classId: homeroom, students });
      toast.show(`명렬표 ${students.length}명을 불러왔습니다.`);
    } catch (e) {
      toast.show((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const exportNeis = async () => {
    const rows = [...data.drafts.values()].sort((a, b) => a.no - b.no);
    const md = ["| 번호 | 이름 | 항목 | 과목 | 학년도 | 내용 | 바이트 |", "| --- | --- | --- | --- | --- | --- | --- |", ...rows.map((d) => `| ${d.no} | ${data.students.find((s) => s.no === d.no)?.name ?? ""} | ${ITEM_LABEL[d.item]} | ${d.subject ?? ""} | ${d.year} | ${d.text.replace(/\n/g, " ").replace(/\|/g, "\\|")} | ${neisBytes(d.text)} |`)].join("\n");
    download(`${classLabel.replace(/\s/g, "")}_생기부_입력용.xlsx`, (await markdownToXlsx(`# 생기부 입력용\n\n${md}`)) as BlobPart);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">학생 · 학생 기록</div>
          <h1>{classLabel} 상담·기록</h1>
          <p className="lead">관찰한 사실을 그때그때 남기고, 학기 말에 그 기록으로 생기부를 씁니다. 학급 기록은 담임 기기에서만 열리도록 암호화됩니다.</p>
        </div>
        <div className="row">
          <span className="badge ok"><Lock className="ico sm" aria-hidden /> 담임만 열람</span>
          <button className="btn" onClick={() => input.current?.click()} disabled={busy === "roster"}>{busy === "roster" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <Upload className="ico sm" aria-hidden />} 명렬표 불러오기</button>
          <button className="btn" aria-expanded={showBackup} onClick={() => setShowBackup((x) => !x)}><KeyRound className="ico sm" aria-hidden /> 백업·새 학급</button>
          <input ref={input} type="file" hidden accept=".xlsx,.xls,.csv,.hwpx,.hwp,.docx" aria-label="명렬표 파일" onChange={(e) => { const f = e.target.files?.[0]; if (f) void importRoster(f); e.target.value = ""; }} />
        </div>
      </div>
      {showBackup && <BackupPanel classId={homeroom} classLabel={classLabel} data={data} post={post} onDone={(m) => { toast.show(m); setShowBackup(false); }} />}

      <div className="students">
        <aside className="panel student-list" aria-label="학생 목록">
          <div className="panel-body" style={{ paddingBottom: 8 }}>
            <label className="search"><Search className="ico sm" aria-hidden /><span className="sr">학생 찾기</span><input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름·번호" /></label>
          </div>
          <ul>
            {list.map((s) => {
              const o = data.obs.filter((x) => x.no === s.no).length, c = data.counsel.filter((x) => x.no === s.no).length;
              const d = [...data.drafts.values()].filter((x) => x.no === s.no).length;
              return (
                <li key={s.no}>
                  <button className="student-item" aria-current={s.no === sel} onClick={() => { setSel(s.no); if (tab === "overview") setTab("record"); }}>
                    <span className="student-no">{s.no}</span>
                    <span className="student-name">{s.name}</span>
                    <span className="meta">{o ? `기록 ${o}` : ""}{o && c ? " · " : ""}{c ? `상담 ${c}` : ""}</span>
                    <span className={`dot ${d ? "on" : ""}`} title={d ? `생기부 초안 ${d}개` : "생기부 미작성"} />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="panel" aria-label={student ? `${student.no}번 ${student.name}` : "학생"}>
          <div className="panel-head">
            <h2>{tab === "overview" ? "기재 현황" : student ? `${student.no}번 ${student.name}` : "학생을 고르세요"}</h2>
            <div className="tabs" role="tablist" aria-label="기록 종류" style={{ border: 0 }}>
              {([["record", "생기부 기재"], ["obs", "누가기록"], ["counsel", "상담"], ["overview", "기재 현황"]] as const).map(([k, l]) => (
                <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="panel-body">
            {tab === "overview" ? <Overview data={data} onOpen={(no) => { setSel(no); setTab("record"); }} onExport={() => void exportNeis()} />
              : !student ? <Empty art="people">왼쪽에서 학생을 고르세요. 명렬표가 없으면 위의 ‘명렬표 불러오기’로 NEIS에서 받은 엑셀을 올리세요.</Empty>
              : tab === "obs" ? <ObsTab key={sel} student={student} obs={data.obs.filter((x) => x.no === sel)} post={post} />
              : tab === "counsel" ? <CounselTab key={sel} student={student} items={data.counsel.filter((x) => x.no === sel)} post={post} />
              : <RecordTab key={sel} classmates={data.students.map((x) => x.name)} student={student} obs={data.obs.filter((x) => x.no === sel)} drafts={[...data.drafts.values()].filter((x) => x.no === sel)} post={post} />}
          </div>
        </section>
      </div>
      {toast.node}
    </>
  );
}

function ObsTab({ student, obs, post }: { student: Student; obs: Obs[]; post: (e: RecordEvent) => Promise<void> }) {
  const [f, setF] = useState({ date: today(), area: "subject" as RecordArea, subject: "역사", text: "" });
  const warn = useMemo(() => checkRecord(f.text).filter((x) => x.level === "금지"), [f.text]);
  return (
    <div className="stack">
      <form className="panel sub" onSubmit={(e) => { e.preventDefault(); if (!f.text.trim()) return; void post({ type: "rec.obs", id: uid(), no: student.no, date: f.date, area: f.area, subject: f.area === "subject" ? f.subject : undefined, text: f.text.trim() }); setF({ ...f, text: "" }); }}>
        <div className="panel-body stack">
          <div className="grid three">
            <label className="field">날짜<input id="ob-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="field">영역<select id="ob-area" value={f.area} onChange={(e) => setF({ ...f, area: e.target.value as RecordArea })}>{AREAS.map((a) => <option key={a} value={a}>{ITEM_LABEL[a]}</option>)}</select></label>
            {f.area === "subject" && <label className="field">과목<input id="ob-subj" type="text" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} /></label>}
          </div>
          <label className="field">관찰한 사실 <span className="hint">판단보다 행동과 장면을 적습니다</span><textarea id="ob-text" rows={3} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} placeholder="예: 모둠 토의에서 친구들의 의견을 표로 정리해 발표를 이끔." /></label>
          {warn.length > 0 && <Notice kind="warn">{warn.map((w) => `“${w.match}” ${w.reason}`).join(" ")}</Notice>}
          <div><button className="btn primary" type="submit" disabled={!f.text.trim()}><Plus className="ico sm" aria-hidden /> 기록 남기기</button></div>
        </div>
      </form>
      {obs.length === 0 ? <Empty art="notes">아직 누가기록이 없습니다. 수업 중 눈에 띈 장면을 한 줄로 남겨 보세요.</Empty> : (
        <ol className="timeline-list">
          {obs.map((o) => (
            <li key={o.id}>
              <div className="tl-date">{o.date}</div>
              <div className="tl-body">
                <span className="badge">{ITEM_LABEL[o.area]}{o.subject ? ` · ${o.subject}` : ""}</span>
                <p className="body">{o.text}</p>
              </div>
              <button className="btn sm text" onClick={() => void post({ type: "rec.delete", id: o.id })} aria-label={`${o.date} 기록 삭제`}>삭제</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function CounselTab({ student, items, post }: { student: Student; items: Counsel[]; post: (e: RecordEvent) => Promise<void> }) {
  const [f, setF] = useState({ date: today(), with: "학생" as "학생" | "학부모" | "교사", method: "대면" as "대면" | "전화" | "온라인", kind: "수시" as "정기" | "수시" | "위기" | "추수", referral: false, topics: [] as string[], content: "", followUp: "", next: "" });
  const sensitive = f.topics.some((t) => t === "건강" || t === "가정") || /진단|약물|병원|치료|자해|이혼|수급|장애/.test(f.content);
  const [busy, setBusy] = useState("");
  const save = async (kind: "hwpx" | "docx") => {
    setBusy(kind);
    const md = [`# 상담 기록부 · ${student.no}번 ${student.name}`, "", "| 날짜 | 구분 | 대상 | 방식 | 영역 | 상담 내용 | 후속 조치 |", "| --- | --- | --- | --- | --- | --- | --- |", ...items.map((c) => `| ${c.date} | ${c.kind ?? ""}${c.referral ? "(Wee 연계)" : ""} | ${c.with} | ${c.method} | ${c.topics.join(", ")} | ${c.content.replace(/\|/g, "\\|")} | ${c.followUp.replace(/\|/g, "\\|")} |`)].join("\n");
    try {
      const name = `상담기록부_${student.no}번`;
      if (kind === "docx") download(`${name}.docx`, (await markdownToDocx(md)) as BlobPart);
      else download(`${name}.hwpx`, await (await kordoc()).markdownToHwpx(md));
    } finally {
      setBusy("");
    }
  };
  return (
    <div className="stack">
      <form className="panel sub" onSubmit={(e) => { e.preventDefault(); if (!f.content.trim()) return; void post({ type: "rec.counsel", id: uid(), no: student.no, date: f.date, with: f.with, method: f.method, topics: f.topics, content: f.content.trim(), followUp: f.followUp.trim(), next: f.next || undefined, kind: f.kind, referral: f.referral || undefined }); setF({ ...f, content: "", followUp: "", next: "", topics: [], referral: false }); }}>
        <div className="panel-body stack">
          <div className="grid three">
            <label className="field">날짜<input id="cs-date" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></label>
            <label className="field">대상<select id="cs-with" value={f.with} onChange={(e) => setF({ ...f, with: e.target.value as typeof f.with })}>{["학생", "학부모", "교사"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="field">방식<select id="cs-method" value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as typeof f.method })}>{["대면", "전화", "온라인"].map((x) => <option key={x}>{x}</option>)}</select></label>
            <label className="field">구분<select id="cs-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as typeof f.kind })}>{["정기", "수시", "위기", "추수"].map((x) => <option key={x}>{x}</option>)}</select></label>
          </div>
          {f.kind === "위기" && <Notice kind="warn">위기 상담은 혼자 맡지 말고 학교 위기관리위원회·Wee클래스(전문상담교사)와 바로 공유하세요. 아래 ‘Wee클래스 연계’를 표시해 두면 기록부에 남습니다.</Notice>}
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field" style={{ marginBottom: 6 }}>상담 영역</legend>
            <div className="row">{TOPICS.map((t) => <label key={t} className="choice"><input type="checkbox" checked={f.topics.includes(t)} onChange={(e) => setF({ ...f, topics: e.target.checked ? [...f.topics, t] : f.topics.filter((x) => x !== t) })} />{t}</label>)}</div>
          </fieldset>
          <label className="field">상담 내용 <span className="hint">사실과 합의한 내용 중심으로, 꼭 필요한 만큼만</span><textarea id="cs-content" rows={3} value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></label>
          {sensitive && <Notice kind="plain">건강·가정 형편 같은 민감정보는 원칙적으로 처리가 제한됩니다(개인정보 보호법 제23조). 상담에 꼭 필요한 사실만 쓰고, 진단명·병원·가족 사정의 세부는 적지 않는 것을 권합니다.</Notice>}
          <label className="row" style={{ fontWeight: 600 }}><input type="checkbox" checked={f.referral} onChange={(e) => setF({ ...f, referral: e.target.checked })} /> Wee클래스(전문상담교사) 연계</label>
          <div className="grid two">
            <label className="field">후속 조치<input id="cs-follow" type="text" value={f.followUp} onChange={(e) => setF({ ...f, followUp: e.target.value })} /></label>
            <label className="field">다음 상담일 <span className="hint">선택</span><input id="cs-next" type="date" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></label>
          </div>
          <div className="row">
            <button className="btn primary" type="submit" disabled={!f.content.trim()}><Plus className="ico sm" aria-hidden /> 상담 기록</button>
            <span className="toolbar-sep" aria-hidden />
            <button type="button" className="btn sm" disabled={!items.length || !!busy} onClick={() => void save("hwpx")}><FileDown className="ico sm" aria-hidden /> 상담 기록부 HWPX</button>
            <button type="button" className="btn sm" disabled={!items.length || !!busy} onClick={() => void save("docx")}><FileDown className="ico sm" aria-hidden /> DOCX</button>
          </div>
        </div>
      </form>
      {items.length === 0 ? <Empty art="people">아직 상담 기록이 없습니다.</Empty> : (
        <ol className="timeline-list">
          {items.map((c) => (
            <li key={c.id}>
              <div className="tl-date">{c.date}</div>
              <div className="tl-body">
                <div className="row"><span className={`badge ${c.kind === "위기" ? "danger" : ""}`}>{c.kind ? `${c.kind} · ` : ""}{c.with} · {c.method}</span>{c.referral && <span className="badge info">Wee 연계</span>}{c.topics.map((t) => <span key={t} className="badge info">{t}</span>)}{c.next && <span className="badge warn">다음 상담 {c.next}</span>}</div>
                <p className="body">{c.content}</p>
                {c.followUp && <p className="meta">후속 조치: {c.followUp}</p>}
              </div>
              <button className="btn sm text" onClick={() => void post({ type: "rec.delete", id: c.id })} aria-label={`${c.date} 상담 삭제`}>삭제</button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function RecordTab({ student, obs, drafts, post, classmates }: { student: Student; obs: Obs[]; drafts: Draft[]; post: (e: RecordEvent) => Promise<void>; classmates: string[] }) {
  const first = drafts[0];
  const [item, setItem] = useState<RecordArea>(first?.item ?? "subject");
  const [subject, setSubject] = useState(first?.subject ?? "역사");
  const school = useSchool();
  const { me } = useApp();
  const homeroom = useMyProfile(me.id).homeroom;
  const [year, setYear] = useState<SchoolYear>(school.year <= 2025 ? 2025 : 2026);
  const key = (it: RecordArea, sub: string) => drafts.find((d) => d.item === it && (it !== "subject" || d.subject === sub));
  const [text, setText] = useState(key(item, subject)?.text ?? "");
  const toast = useToast();
  const limit = limitFor(school.level, year, item);
  const bytes = neisBytes(text), max = limit.chars * 3, pct = Math.round((bytes / max) * 100);
  const findings = useMemo(() => checkRecord(text, { studentName: student.name }), [text, student.name]);
  const related = obs.filter((o) => o.area === item && (item !== "subject" || o.subject === subject));
  const saved = key(item, subject);

  const switchTo = (it: RecordArea, sub = subject) => { setItem(it); setSubject(sub); setText(key(it, sub)?.text ?? ""); };
  const copyPrompt = async () => {
    const p = draftPrompt({ item, subject: item === "subject" ? subject : undefined, year, observations: related.map((o) => ({ date: o.date, text: o.text })), studentName: student.name, classmates, schoolName: school.school, level: school.level, grade: `${school.level === "중" ? "중학교" : "고등학교"}${/^\d/.test(homeroom) ? ` ${homeroom[0]}학년` : ""}` });
    try { await navigator.clipboard.writeText(p); toast.show("이름·학교·전화번호를 가린 AI 요청문을 복사했습니다. 결과는 반드시 직접 확인하고 고쳐 쓰세요."); } catch { toast.show("복사하지 못했습니다."); }
  };

  return (
    <div className="record-layout">
      <div className="stack">
        <div className="row">
          <div className="seg" role="radiogroup" aria-label="항목">
            {AREAS.map((a) => <button key={a} role="radio" aria-checked={item === a} onClick={() => switchTo(a)}>{ITEM_LABEL[a]}</button>)}
          </div>
        </div>
        <div className="row">
          {item === "subject" && <label className="row" style={{ fontWeight: 600 }}>과목 <input type="text" value={subject} onChange={(e) => switchTo("subject", e.target.value)} style={{ width: 110 }} aria-label="과목" /></label>}
          <label className="row" style={{ fontWeight: 600 }}>기준 학년도
            <select value={year} onChange={(e) => setYear(Number(e.target.value) as SchoolYear)} aria-label="기준 학년도" style={{ width: 110 }}><option value={2026}>2026</option><option value={2025}>2025</option></select>
          </label>
          <span className="meta">{ITEM_LABEL[item]} 최대 {limit.chars}자 <span className="conf">{CONF_LABEL[limit.confidence]}</span> {limit.note}</span>
        </div>
        <label className="field">
          <span className="sr">기재 내용</span>
          <textarea className="record-editor" rows={9} value={text} onChange={(e) => setText(e.target.value)} placeholder="관찰 기록을 바탕으로 직접 씁니다. 문장은 ‘…함’, ‘…임’으로 끝냅니다." />
        </label>
        <div className={`meter ${pct > 100 ? "over" : pct > 90 ? "near" : ""}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={bytes} aria-label="NEIS 바이트">
          <span className="meter-bar"><span style={{ width: `${Math.min(100, pct)}%` }} /></span>
          <span className="meter-text"><b>{bytes.toLocaleString()}</b> / {max.toLocaleString()} 바이트 · {[...text].length}자 {pct > 100 && <b>· {(bytes - max).toLocaleString()}바이트 초과</b>}</span>
        </div>
        <div className="row">
          <button className="btn primary" disabled={!text.trim()} onClick={() => void post({ type: "rec.draft", no: student.no, item, subject: item === "subject" ? subject : undefined, year, text }).then(() => toast.show("저장했습니다(담임 기기에서만 열림)."))}><Save className="ico sm" aria-hidden /> 저장</button>
          <button className="btn" onClick={() => void copyPrompt()}><ClipboardCopy className="ico sm" aria-hidden /> AI 초안 요청문 복사</button>
          {saved && <span className="meta">마지막 저장 {timeLabel(saved.at)}</span>}
        </div>
        {item === "behavior" && <Notice kind="plain">행동특성은 단정하기보다 관찰한 장면과 변화를 씁니다. 부정적인 특성을 쓸 때는 그 근거가 되는 누가기록을 구체적으로 남겨 두세요(2026 개정 보도 기준).</Notice>}
        <Notice kind="info">
          <b>2026학년도 기재요령의 금지 행위</b>: “AI를 활용하여 생성한 자료를 학교생활기록부의 서술형 항목에 그대로 입력하는 행위”, 그리고 학생에게 기재할 내용을 써서 내게 하는 행위. 윤문 등 보조로 썼다면 입력 전에 학생의 실제 수행과 무관한 허위·과장이 없는지 확인해야 합니다. 요청문에는 이름·학교·반·번호를 넣지 않습니다(경기도교육청 교사용 생성형 AI 가이드의 가명 처리 권고).
        </Notice>
      </div>

      <div className="stack">
        <section aria-labelledby="ck-h">
          <h3 id="ck-h" style={{ marginBottom: 8 }}>기재 점검 <span className="meta">{findings.length}건{findings.some((f) => f.confidence !== "official") ? ` · 원문 대조 필요·관례 ${findings.filter((f) => f.confidence !== "official").length}건` : ""}</span></h3>
          {findings.length === 0 ? <p className="meta">걸리는 내용이 없습니다. 최종 판단은 학교 기재요령과 교사가 합니다.</p> : (
            <ul className="finding-list">
              {findings.map((f, i) => (
                <li key={i} className={`lv-${f.level}`}>
                  <span className={`badge ${f.level === "금지" ? "danger" : f.level === "주의" ? "warn" : ""}`}>{f.level}</span>
                  <div><b>{f.rule}</b> · “{f.match}”<p className="meta">{f.reason} <span className="conf">{CONF_LABEL[f.confidence]}</span></p></div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section aria-labelledby="rel-h">
          <h3 id="rel-h" style={{ marginBottom: 8 }}>관련 누가기록 <span className="meta">{related.length}건</span></h3>
          {related.length === 0 ? <p className="meta">이 항목의 관찰 기록이 없습니다. ‘누가기록’ 탭에서 먼저 남겨 주세요.</p> : (
            <ul className="obs-pick">
              {related.map((o) => (
                <li key={o.id}>
                  <span className="meta">{o.date}</span>
                  <p className="small">{o.text}</p>
                  <button className="btn sm" onClick={() => setText((t) => (t ? `${t} ${o.text}` : o.text))}>본문에 넣기</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {toast.node}
    </div>
  );
}

function Overview({ data, onOpen, onExport }: { data: ReturnType<typeof collect>; onOpen: (no: number) => void; onExport: () => void }) {
  const level = useSchool().level;
  const cols: RecordArea[] = ["subject", "behavior", "autonomy", "club", "career"];
  return (
    <div className="stack">
      <div className="row between">
        <p className="meta">칸의 숫자는 2026학년도 기준 바이트 사용률입니다. 줄을 누르면 해당 학생의 기재 화면으로 갑니다.</p>
        <button className="btn" onClick={onExport}><FileDown className="ico sm" aria-hidden /> NEIS 입력용 엑셀</button>
      </div>
      <div className="scroll-x">
        <table className="sheet">
          <thead><tr><th scope="col">번호</th><th scope="col">이름</th>{cols.map((c) => <th key={c} scope="col">{ITEM_LABEL[c]}</th>)}<th scope="col" className="num">상담</th></tr></thead>
          <tbody>
            {data.students.map((s) => (
              <tr key={s.no} className="clickable" onClick={() => onOpen(s.no)}>
                <td>{s.no}</td><td>{s.name}</td>
                {cols.map((c) => {
                  const d = [...data.drafts.values()].find((x) => x.no === s.no && x.item === c);
                  if (!d) return <td key={c}><span className="meta">—</span></td>;
                  const pct = Math.round((neisBytes(d.text) / (limitFor(level, 2026, c).chars * 3)) * 100);
                  const bad = checkRecord(d.text, { studentName: s.name }).filter((f) => f.level === "금지").length;
                  return <td key={c}><span className={`badge ${pct > 100 || bad ? "danger" : "ok"}`}>{pct}%{bad ? ` · 금지 ${bad}` : ""}</span></td>;
                })}
                <td className="num">{data.counsel.filter((x) => x.no === s.no).length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BackupPanel({ classId, classLabel, data, post, onDone }: { classId: string; classLabel: string; data: ReturnType<typeof collect>; post: (e: RecordEvent) => Promise<void>; onDone: (msg: string) => void }) {
  const [pass, setPass] = useState(""), [pass2, setPass2] = useState(""), [rpass, setRpass] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(""), [err, setErr] = useState(""), [armFresh, setArmFresh] = useState(false);
  const weak = pass ? checkPassphrase(pass) : "";

  const snapshotEvents = (): RecordEvent[] => [
    { type: "rec.roster", classId, students: data.students },
    ...data.obs.map(({ at: _at, ...o }) => ({ type: "rec.obs" as const, ...o, area: o.area })),
    ...data.counsel.map(({ at: _at, ...c }) => ({ type: "rec.counsel" as const, ...c, with: c.with as "학생", method: c.method as "대면" })),
    ...[...data.drafts.values()].map(({ at: _at, ...d }) => ({ type: "rec.draft" as const, ...d })),
  ];

  const backup = async () => {
    setErr("");
    if (weak) return setErr(weak);
    if (pass !== pass2) return setErr("두 암호가 다릅니다.");
    setBusy("save");
    try {
      const file = await sealBackup({ app: "kyosil-itda", kind: "records", version: 1, classId, exportedAt: new Date().toISOString(), events: snapshotEvents() }, pass);
      download(`${classLabel.replace(/\s/g, "")}_학생기록_${new Date().toISOString().slice(0, 10)}.kyosil`, file, "application/json");
      setPass(""); setPass2("");
      onDone("암호 백업 파일을 저장했습니다. 암호는 따로 적어 두세요. 잃어버리면 아무도 열 수 없습니다.");
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); }
  };

  const restore = async () => {
    if (!file) return;
    setErr(""); setBusy("restore");
    try {
      const snap = await openBackup(await file.text(), rpass);
      await post({ type: "rec.reset", reason: "restore" });
      for (const e of snap.events) await post(e);
      onDone(`${snap.exportedAt.slice(0, 10)}에 만든 백업에서 기록 ${snap.events.length - 1}건을 복원했습니다.`);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(""); setRpass(""); }
  };

  const fresh = async () => {
    await post({ type: "rec.reset", reason: "fresh" });
    onDone("새 학급으로 시작합니다. 명렬표를 불러오세요.");
  };

  return (
    <section className="panel sub backup" aria-labelledby="bk-h" style={{ marginBottom: 16 }}>
      <div className="panel-body stack">
        <h2 id="bk-h">백업·복원·새 학급</h2>
        <div className="grid three" style={{ alignItems: "start" }}>
          <form className="stack tight" onSubmit={(e) => { e.preventDefault(); void backup(); }}>
            <h3>암호 백업 내려받기</h3>
            <p className="meta">명렬표·누가기록·상담·생기부 초안을 정한 암호로 잠근 파일(.kyosil)로 저장합니다.</p>
            <label className="field">암호 <span className="hint">10자 이상</span><input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} /></label>
            <label className="field">암호 확인<input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} /></label>
            {weak && <span className="meta" style={{ color: "var(--danger)" }}>{weak}</span>}
            <div><button className="btn primary" disabled={!pass || busy === "save"}>{busy === "save" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <FileDown className="ico sm" aria-hidden />} 백업 저장</button></div>
          </form>
          <form className="stack tight" onSubmit={(e) => { e.preventDefault(); void restore(); }}>
            <h3>백업에서 복원</h3>
            <p className="meta">지금 기록을 백업 내용으로 바꿉니다. 지금 기록은 화면에서 사라지니 먼저 백업하세요.</p>
            <label className="field">백업 파일<input type="file" accept=".kyosil,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
            <label className="field">암호<input type="password" autoComplete="current-password" value={rpass} onChange={(e) => setRpass(e.target.value)} /></label>
            <div><button className="btn" disabled={!file || !rpass || busy === "restore"}>{busy === "restore" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <ArchiveRestore className="ico sm" aria-hidden />} 복원</button></div>
          </form>
          <div className="stack tight">
            <h3>새 학급으로 시작</h3>
            <p className="meta">시연 기록이나 지난 학년도 기록을 화면에서 치우고 빈 학급으로 시작합니다. 먼저 백업해 두면 언제든 복원할 수 있습니다.</p>
            <div className="row">
              {armFresh ? <><button className="btn danger" onClick={() => void fresh()}>정말 비우기</button><button className="btn text" onClick={() => setArmFresh(false)}>취소</button></> : <button className="btn" onClick={() => setArmFresh(true)}>빈 학급으로 시작</button>}
            </div>
          </div>
        </div>
        {err && <Notice kind="warn" role="alert">{err}</Notice>}
      </div>
    </section>
  );
}
