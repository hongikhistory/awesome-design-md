import { FileDown, LoaderCircle, Plus, Printer, Upload, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { download, formatOf, kordoc } from "../core/docs/engine";
import { renderPreview } from "../core/docs/markdown";
import { markdownToDocx } from "../core/docs/writers";
import { fmtDate, letterMarkdown, plainHints, sampleLetter, type Audience, type LetterData } from "../core/letters";
import { useApp } from "../state";
import { Empty, inFrame, Notice, useToast } from "../ui/common";

type Mode = "builtin" | "school";

interface FormField {
  label: string;
  value: string;
  type: string;
  required?: boolean;
  empty: boolean;
}

export function Letters() {
  const [mode, setMode] = useState<Mode>("builtin");
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업·문서 · 가정통신문</div>
          <h1>가정통신문</h1>
          <p className="lead">내용만 넣으면 발행 정보, 일정 표, 학교장 이름, 회신서까지 갖춘 통신문이 됩니다. 학교에서 쓰는 한글(HWPX) 양식이 있으면 그 양식의 빈칸을 그대로 채웁니다.</p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="작성 방식" style={{ marginBottom: 16 }}>
        <button role="tab" aria-selected={mode === "builtin"} onClick={() => setMode("builtin")}>기본 양식으로 만들기</button>
        <button role="tab" aria-selected={mode === "school"} onClick={() => setMode("school")}>우리 학교 양식 채우기</button>
      </div>
      {mode === "builtin" ? <Builtin /> : <SchoolForm />}
    </>
  );
}

function Builtin() {
  const { handoff, setHandoff } = useApp();
  const [l, setL] = useState<LetterData>(sampleLetter);
  const [lint, setLint] = useState<{ message: string; match?: string }[]>([]);
  const [busy, setBusy] = useState("");
  const toast = useToast();
  const md = useMemo(() => letterMarkdown(l), [l]);
  const hints = useMemo(() => plainHints(`${l.title}\n${l.body}`), [l.title, l.body]);
  const set = <K extends keyof LetterData>(k: K, v: LetterData[K]) => setL((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (handoff?.to === "letters") {
      const lines = handoff.markdown.split("\n");
      const title = lines.find((x) => x.startsWith("# "))?.slice(2).trim();
      setL((x) => ({ ...x, title: title ?? x.title, body: lines.filter((x) => !x.startsWith("# ")).join("\n").trim() }));
      setHandoff(null);
    }
  }, [handoff, setHandoff]);

  // 공공언어 검수 (kordoc lintGongmunText), debounced
  useEffect(() => {
    const id = setTimeout(async () => {
      try {
        const k = await kordoc();
        const r = k.lintGongmunText(`${l.title}\n${l.body}`);
        setLint(r.map((f) => ({ message: f.suggest ? `${f.message} (제안: ${f.suggest})` : f.message, match: f.match })));
      } catch {
        setLint([]);
      }
    }, 600);
    return () => clearTimeout(id);
  }, [l.title, l.body]);

  const save = async (kind: "hwpx" | "docx" | "md") => {
    setBusy(kind);
    try {
      const name = `${fmtDate(l.date).replace(/\.\s?/g, "")}_${l.title}`;
      if (kind === "md") download(`${name}.md`, md, "text/markdown;charset=utf-8");
      else if (kind === "docx") download(`${name}.docx`, (await markdownToDocx(md, { title: l.title })) as BlobPart);
      else download(`${name}.hwpx`, await (await kordoc()).markdownToHwpx(md));
    } catch (e) {
      toast.show(`저장하지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="letter-layout">
      <section className="panel no-print" aria-labelledby="lf-h">
        <div className="panel-head"><h2 id="lf-h">내용</h2><button className="btn sm text" onClick={() => setL(sampleLetter())}>예시로 되돌리기</button></div>
        <div className="panel-body stack">
          <div className="grid two">
            <label className="field">학교 이름<input id="lt-school" type="text" value={l.school} onChange={(e) => set("school", e.target.value)} /></label>
            <label className="field">받는 사람
              <select id="lt-aud" value={l.audience} onChange={(e) => set("audience", e.target.value as Audience)}>
                {(["학부모", "학생", "학부모·학생"] as Audience[]).map((a) => <option key={a}>{a}</option>)}
              </select>
            </label>
            <label className="field">문서 번호<input id="lt-no" type="text" value={l.docNo} onChange={(e) => set("docNo", e.target.value)} /></label>
            <label className="field">발행일<input id="lt-date" type="date" value={l.date} onChange={(e) => set("date", e.target.value)} /></label>
          </div>
          <label className="field">제목<input id="lt-title" type="text" value={l.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label className="field">본문 <span className="hint">빈 줄로 문단을 나눕니다</span><textarea id="lt-body" rows={7} value={l.body} onChange={(e) => set("body", e.target.value)} /></label>
          <div className="field">
            <span>안내 표</span>
            <div className="stack tight">
              {l.schedule.map((r, i) => (
                <div key={i} className="kv-edit">
                  <input type="text" aria-label={`${i + 1}번째 항목 이름`} value={r.label} onChange={(e) => set("schedule", l.schedule.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input type="text" aria-label={`${i + 1}번째 항목 내용`} value={r.value} onChange={(e) => set("schedule", l.schedule.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button className="btn sm text" aria-label={`${r.label} 줄 삭제`} onClick={() => set("schedule", l.schedule.filter((_, j) => j !== i))}><X className="ico sm" aria-hidden /></button>
                </div>
              ))}
              <div><button className="btn sm" onClick={() => set("schedule", [...l.schedule, { label: "", value: "" }])}><Plus className="ico sm" aria-hidden /> 줄 추가</button></div>
            </div>
          </div>
          <div className="grid three">
            <label className="field">담당 부서<input id="lt-dept" type="text" value={l.dept} onChange={(e) => set("dept", e.target.value)} /></label>
            <label className="field">담당 교사<input id="lt-teacher" type="text" value={l.teacher} onChange={(e) => set("teacher", e.target.value)} /></label>
            <label className="field">문의 전화<input id="lt-phone" type="text" value={l.phone} onChange={(e) => set("phone", e.target.value)} /></label>
          </div>
          <fieldset className="panel sub" style={{ border: 0, margin: 0 }}>
            <div className="panel-body stack tight">
              <label className="row" style={{ fontWeight: 700 }}><input type="checkbox" checked={l.reply.enabled} onChange={(e) => set("reply", { ...l.reply, enabled: e.target.checked })} /> 회신서 붙이기</label>
              {l.reply.enabled && (
                <div className="grid two">
                  <label className="field">묻는 내용<input id="lt-rq" type="text" value={l.reply.question} onChange={(e) => set("reply", { ...l.reply, question: e.target.value })} /></label>
                  <label className="field">회신 기한<input id="lt-rd" type="date" value={l.reply.deadline} onChange={(e) => set("reply", { ...l.reply, deadline: e.target.value })} /></label>
                  <label className="field" style={{ gridColumn: "1 / -1" }}>선택지 <span className="hint">쉼표로 구분</span><input id="lt-ro" type="text" value={l.reply.options.join(", ")} onChange={(e) => set("reply", { ...l.reply, options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} /></label>
                </div>
              )}
            </div>
          </fieldset>
          <section aria-labelledby="chk-h" className="stack tight">
            <h3 id="chk-h">읽기 쉬운 말 점검 <span className="meta">{hints.length + lint.length}건</span></h3>
            {hints.length + lint.length === 0 ? <p className="meta">고칠 만한 표현을 찾지 못했습니다.</p> : (
              <ul className="hint-list">
                {hints.map((h, i) => <li key={`h${i}`}><b>{h.match}</b> → {h.suggestion} <span className="meta">{h.reason}</span></li>)}
                {lint.map((f, i) => <li key={`k${i}`}>{f.match && <b>{f.match} </b>}{f.message} <span className="meta">공공언어 검수</span></li>)}
              </ul>
            )}
          </section>
        </div>
      </section>

      <section className="stack" aria-label="미리보기">
        <div className="row no-print">
          {(["hwpx", "docx", "md"] as const).map((k) => (
            <button key={k} className={`btn ${k === "hwpx" ? "primary" : ""}`} disabled={!!busy} onClick={() => void save(k)}>{busy === k ? <LoaderCircle className="ico sm spin" aria-hidden /> : <FileDown className="ico sm" aria-hidden />} {k === "hwpx" ? "한글(HWPX)" : k.toUpperCase()}</button>
          ))}
          {!inFrame && <button className="btn" onClick={() => window.print()}><Printer className="ico sm" aria-hidden /> 인쇄</button>}
        </div>
        <article className="paper" aria-label="가정통신문 미리보기">
          <header className="paper-head">
            <div className="paper-school"><span className="paper-logo" aria-hidden>{l.school.slice(0, 1)}</span>{l.school}</div>
            <table className="paper-meta">
              <tbody>
                <tr><th>발행</th><td>{l.docNo}</td><th>발행일</th><td>{fmtDate(l.date)}</td></tr>
                <tr><th>담당</th><td>{l.dept} {l.teacher}</td><th>문의</th><td>{l.phone}</td></tr>
              </tbody>
            </table>
          </header>
          <div className="paper-kicker">{l.audience === "학생" ? "학생 안내문" : "가정통신문"}</div>
          <h2 className="paper-title">{l.title}</h2>
          <p className="paper-greet">{l.audience === "학생" ? "학생 여러분, 안녕하세요." : l.audience === "학부모·학생" ? "학부모님과 학생 여러분께" : "학부모님께"}</p>
          <div className="prose paper-body" dangerouslySetInnerHTML={{ __html: renderPreview(l.body) }} />
          {l.schedule.length > 0 && (
            <table className="paper-table"><tbody>{l.schedule.map((r, i) => <tr key={i}><th>{r.label}</th><td>{r.value}</td></tr>)}</tbody></table>
          )}
          <p className="paper-date">{fmtDate(l.date)}</p>
          <p className="paper-sign">{l.school}장 <span className="stamp paper-seal" aria-label="직인">직인</span></p>
          {l.reply.enabled && (
            <section className="paper-reply" aria-label="회신서">
              <div className="cut"><span>자르는 선</span></div>
              <h3>{l.title} 회신서</h3>
              <p>{l.reply.question}: {l.reply.options.map((o) => <span key={o} className="box-opt">□ {o}</span>)}</p>
              <table className="paper-table"><thead><tr>{["학년", "반", "번호", "학생 이름", "보호자 이름", "서명"].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody><tr>{Array.from({ length: 6 }, (_, i) => <td key={i}>&nbsp;</td>)}</tr></tbody></table>
              <p className="meta">회신 기한: {fmtDate(l.reply.deadline)}까지 담임 선생님께 제출해 주십시오.</p>
            </section>
          )}
        </article>
      </section>
      {toast.node}
    </div>
  );
}

const SAMPLE_FORM_MD = `# 교외체험학습 신청서

| 학년·반 |  | 번호 |  |
| --- | --- | --- | --- |
| 학생 이름 |  | 보호자 이름 |  |
| 보호자 연락처 |  | 체험 기간 |  |
| 체험 장소 |  | 체험 형태 |  |
| 체험 계획 |  |  |  |
`;

function SchoolForm() {
  const [file, setFile] = useState<{ name: string; buf: ArrayBuffer } | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [conf, setConf] = useState(0);
  const [result, setResult] = useState<{ filled: number; unmatched: string[] } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const load = async (name: string, buf: ArrayBuffer) => {
    setBusy("read");
    setErr("");
    setResult(null);
    try {
      const k = await kordoc();
      const r = await k.parse(buf.slice(0));
      if (!r.success) throw Error(r.error);
      const schema = k.extractFormSchema(r.blocks);
      const fs = schema.fields.map((f) => ({ label: f.label, value: f.value, type: f.type, required: f.required, empty: f.empty }));
      setFile({ name, buf });
      setFields(fs);
      setConf(schema.confidence);
      setValues(Object.fromEntries(fs.map((f) => [f.label, f.empty ? "" : f.value])));
      if (!fs.length) setErr("이 문서에서 채울 칸을 찾지 못했습니다. ‘항목 이름 | 빈칸’ 형태의 표가 있는 양식이 잘 맞습니다.");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const sample = async () => {
    const k = await kordoc();
    await load("교외체험학습 신청서(예시).hwpx", await k.markdownToHwpx(SAMPLE_FORM_MD));
  };

  const fill = async () => {
    if (!file) return;
    setBusy("fill");
    try {
      const k = await kordoc();
      const vals = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
      const hwpx = formatOf(file.name) === "hwpx";
      const r = await k.fillForm(file.buf.slice(0), vals, hwpx ? "hwpx-preserve" : "hwpx");
      setResult({ filled: r.fill.filled.length, unmatched: r.fill.unmatched });
      download(file.name.replace(/\.[^.]+$/, "") + "_작성.hwpx", r.output as ArrayBuffer);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grid two" style={{ alignItems: "start" }}>
      <section className="panel" aria-labelledby="sf-h">
        <div className="panel-head"><h2 id="sf-h">① 양식 올리기</h2></div>
        <div className="panel-body stack">
          <div className="drop">
            <Upload className="ico lg" aria-hidden />
            <b>학교 양식 파일(HWPX 권장, HWP·DOCX 가능)</b>
            <span className="meta">HWPX는 원래 서식(테두리·글꼴·병합 칸)을 그대로 두고 값만 채웁니다.</span>
            <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
              <button className="btn primary" onClick={() => input.current?.click()} disabled={busy === "read"}>{busy === "read" ? <LoaderCircle className="ico sm spin" aria-hidden /> : null} 양식 고르기</button>
              <button className="btn" onClick={() => void sample()}>예시 양식으로 해 보기</button>
            </div>
            <input ref={input} type="file" hidden accept=".hwpx,.hwp,.docx" aria-label="학교 양식 파일" onChange={(e) => { const f = e.target.files?.[0]; if (f) void f.arrayBuffer().then((b) => load(f.name, b)); e.target.value = ""; }} />
          </div>
          {err && <Notice kind="warn" role="alert">{err}</Notice>}
          {file && fields.length > 0 && <Notice kind="ok"><b>{file.name}</b>에서 채울 칸 {fields.length}개를 찾았습니다(양식 확신도 {Math.round(conf * 100)}%).</Notice>}
          <p className="meta">칸 찾기와 채우기는 kordoc의 양식 인식 기능을 씁니다. 파일은 이 브라우저 밖으로 나가지 않습니다.</p>
        </div>
      </section>
      <section className="panel" aria-labelledby="sv-h">
        <div className="panel-head"><h2 id="sv-h">② 값 넣기</h2>{fields.length > 0 && <span className="meta">비어 있던 칸 {fields.filter((f) => f.empty).length}개</span>}</div>
        <div className="panel-body stack">
          {!fields.length ? <Empty>양식을 올리면 칸 이름이 여기에 나옵니다.</Empty> : (
            <>
              <div className="grid two">
                {fields.map((f, i) => (
                  <label key={`${f.label}-${i}`} className="field">
                    <span>{f.label}{f.required && <span style={{ color: "var(--danger)" }}> *</span>} <span className="hint">{f.type !== "text" ? f.type : ""}</span></span>
                    <input type={f.type === "date" ? "date" : "text"} value={values[f.label] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))} />
                  </label>
                ))}
              </div>
              <div className="row">
                <button className="btn primary" disabled={busy === "fill"} onClick={() => void fill()}>{busy === "fill" ? <LoaderCircle className="ico sm spin" aria-hidden /> : <Wand2 className="ico sm" aria-hidden />} 양식에 채워 저장</button>
                {result && <span className="meta">{result.filled}칸 채움{result.unmatched.length ? ` · 못 찾은 칸: ${result.unmatched.join(", ")}` : ""}</span>}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
