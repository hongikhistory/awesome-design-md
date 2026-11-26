import { CircleAlert, Eye, EyeOff, FileDown, LoaderCircle, Presentation, ScrollText, Sparkles, Trash2, Upload } from "lucide-react";
import { useMemo, useRef, useState, type DragEvent } from "react";
import type { Go } from "../App";
import { aiReady, download, FORMAT_LABEL, formatOf, kordoc, toMarkdown, type DocFormat } from "../core/docs/engine";
import { renderPreview } from "../core/docs/markdown";
import { markdownToDocx, markdownToXlsx } from "../core/docs/writers";
import { useApp } from "../state";
import { Empty, Notice, useToast } from "../ui/common";

interface Item {
  id: string;
  name: string;
  size: number;
  format: DocFormat;
  status: "working" | "done" | "error";
  markdown: string;
  error?: string;
  ms?: number;
  warnings: string[];
}

const ACCEPT = ".hwp,.hwpx,.docx,.xlsx,.xls,.pptx,.pdf,.csv,.md,.markdown,.txt";
const SAMPLE_MD = `# 2학년 국어 교수·학습 지도안

| 단원 | 3. 시의 표현 |
| --- | --- |
| 대상 | 2학년 1반 |
| 학습 목표 | 비유의 뜻을 알고, 비유의 효과를 설명할 수 있다 |

| 단계 | 교수·학습 활동 | 시간 |
| --- | --- | --- |
| 도입 | 생활 속 비유 찾기 | 5분 |
| 전개 | 시 낭독하고 비유 표현에 밑줄 긋기 | 15분 |
|  | 모둠별로 비유를 찾아 효과 말하기 | 15분 |
| 정리 | 비유 만들기 출구 카드 | 10분 |

발문: 마음이 호수라면 어떤 마음일까?
평가: 비유를 넣어 한 문장 쓰기
준비물: 활동지, 모둠 보드, 색연필
`;

const sizeLabel = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(n / 1024))}KB`);
const base = (name: string) => name.replace(/\.[^.]+$/, "");

export function Docs({ go }: { go: Go }) {
  const { setHandoff } = useApp();
  const [items, setItems] = useState<Item[]>([]);
  const [sel, setSel] = useState("");
  const [view, setView] = useState<"preview" | "markdown">("preview");
  const [masked, setMasked] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const cur = items.find((i) => i.id === sel) ?? items.find((i) => i.status === "done");
  const shown = cur ? (masked[cur.id] ?? cur.markdown) : "";
  const preview = useMemo(() => (shown ? renderPreview(shown) : ""), [shown]);

  const add = async (files: File[]) => {
    const fresh = files.map((f) => ({ id: crypto.randomUUID(), name: f.name, size: f.size, format: formatOf(f.name), status: "working" as const, markdown: "", warnings: [] }));
    setItems((xs) => [...fresh, ...xs]);
    if (fresh[0]) setSel(fresh[0].id);
    await Promise.all(
      files.map(async (f, i) => {
        const id = fresh[i].id;
        try {
          const r = await toMarkdown(f);
          setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "done", markdown: r.markdown, ms: r.ms, warnings: r.warnings } : x)));
        } catch (e) {
          setItems((xs) => xs.map((x) => (x.id === id ? { ...x, status: "error", error: (e as Error).message } : x)));
        }
      }),
    );
  };

  const addSample = async () => {
    const bytes = await markdownToDocx(SAMPLE_MD, { title: "2학년 국어 지도안" });
    await add([new File([bytes as BlobPart], "2학년 국어 지도안(예시).docx")]);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const files = [...e.dataTransfer.files];
    if (files.length) void add(files);
  };

  const edit = (markdown: string) => {
    if (!cur) return;
    setItems((xs) => xs.map((x) => (x.id === cur.id ? { ...x, markdown } : x)));
    setMasked((m) => { const n = { ...m }; delete n[cur.id]; return n; });
  };

  const toggleMask = async () => {
    if (!cur) return;
    if (masked[cur.id] !== undefined) return setMasked((m) => { const n = { ...m }; delete n[cur.id]; return n; });
    const k = await kordoc();
    const r = k.redactText(cur.markdown);
    setMasked((m) => ({ ...m, [cur.id]: r.text }));
    toast.show(r.hits.length ? `개인정보 ${r.hits.length}곳을 가렸습니다.` : "가릴 개인정보를 찾지 못했습니다.");
  };

  const copyAi = async () => {
    if (!cur) return;
    // Personal information is masked by default before anything goes to an outside AI service.
    let body = shown, hits = 0;
    if (masked[cur.id] === undefined) {
      const r = (await kordoc()).redactText(cur.markdown);
      body = r.text;
      hits = r.hits.length;
    }
    const text = aiReady(body, { name: cur.name, format: cur.format });
    try {
      await navigator.clipboard.writeText(text);
      toast.show(hits ? `개인정보로 보이는 ${hits}곳을 가린 뒤 복사했습니다. 학생 이름은 직접 확인하세요.` : "AI에 붙여 넣기 좋은 형태로 복사했습니다. 학생 이름이 남아 있지 않은지 확인하세요.");
    } catch {
      toast.show("복사하지 못했습니다. Markdown 탭에서 직접 선택해 복사해 주세요.");
    }
  };

  const save = async (kind: "hwpx" | "docx" | "xlsx" | "md") => {
    if (!cur) return;
    setBusy(kind);
    try {
      const name = base(cur.name);
      if (kind === "md") download(`${name}.md`, shown, "text/markdown;charset=utf-8");
      else if (kind === "docx") download(`${name}.docx`, (await markdownToDocx(shown, { title: name })) as BlobPart);
      else if (kind === "xlsx") download(`${name}.xlsx`, (await markdownToXlsx(shown)) as BlobPart);
      else download(`${name}.hwpx`, await (await kordoc()).markdownToHwpx(shown));
    } catch (e) {
      toast.show(`저장하지 못했습니다: ${(e as Error).message}`);
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업·문서 · 문서 변환</div>
          <h1>문서 변환</h1>
          <p className="lead">한글·워드·엑셀·파워포인트·PDF를 AI가 가장 잘 읽는 Markdown으로 바꾸고, 고친 내용을 다시 원하는 형식으로 저장합니다. 파일은 이 브라우저 안에서만 처리되고 서버로 보내지 않습니다.</p>
        </div>
      </div>

      <div className="docs">
        <section className="stack" aria-label="파일 목록">
          <div className={`drop ${over ? "over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={onDrop}>
            <Upload className="ico lg" aria-hidden />
            <b>파일을 여기에 끌어다 놓으세요</b>
            <span className="meta">HWP · HWPX · DOCX · XLSX · PPTX · PDF · CSV · MD, 여러 개 동시에</span>
            <div className="row" style={{ justifyContent: "center", marginTop: 6 }}>
              <button className="btn primary" onClick={() => input.current?.click()}>파일 고르기</button>
              <button className="btn" onClick={() => void addSample()}>예시 지도안으로 해 보기</button>
            </div>
            <input ref={input} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { void add([...(e.target.files ?? [])]); e.target.value = ""; }} aria-label="변환할 파일" />
          </div>
          {items.length === 0 ? (
            <Empty art="docs">아직 변환한 파일이 없습니다.</Empty>
          ) : (
            <ul className="file-list" aria-label="변환한 파일">
              {items.map((it) => (
                <li key={it.id}>
                  <button className="file-item" aria-current={cur?.id === it.id} onClick={() => setSel(it.id)} disabled={it.status !== "done"}>
                    <span className={`fmt fmt-${it.format}`}>{it.format.toUpperCase()}</span>
                    <span className="file-meta">
                      <b>{it.name}</b>
                      <span className="meta">
                        {FORMAT_LABEL[it.format]} · {sizeLabel(it.size)}
                        {it.status === "done" && ` · ${Math.round(it.ms ?? 0)}ms · ${it.markdown.length.toLocaleString()}자`}
                      </span>
                      {it.status === "error" && <span className="meta" style={{ color: "var(--danger)" }}>{it.error}</span>}
                    </span>
                    {it.status === "working" && <LoaderCircle className="ico spin" aria-label="변환 중" />}
                    {it.status === "error" && <CircleAlert className="ico" style={{ color: "var(--danger)" }} aria-label="실패" />}
                  </button>
                  <button className="btn sm text" aria-label={`${it.name} 목록에서 빼기`} onClick={() => setItems((xs) => xs.filter((x) => x.id !== it.id))}><Trash2 className="ico sm" aria-hidden /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="meta">변환 엔진: <b>kordoc</b> 4.24.66(MIT, 브라우저용으로 묶음). 이미지 글자 인식(OCR)은 지원하지 않습니다.</p>
        </section>

        <section className="panel docs-work" aria-label="변환 결과">
          {!cur ? (
            <div className="panel-body"><Empty art="docs">왼쪽에서 파일을 올리면 결과가 여기에 나옵니다.</Empty></div>
          ) : (
            <>
              <div className="panel-head">
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur.name}</h2>
                  <span className="meta">{FORMAT_LABEL[cur.format]} → Markdown{masked[cur.id] !== undefined ? " · 개인정보 가림" : ""}</span>
                </div>
                <div className="tabs" role="tablist" aria-label="보기 방식" style={{ border: 0 }}>
                  <button role="tab" aria-selected={view === "preview"} onClick={() => setView("preview")}>미리보기</button>
                  <button role="tab" aria-selected={view === "markdown"} onClick={() => setView("markdown")}>Markdown</button>
                </div>
              </div>
              <div className="toolbar">
                <button className="btn sm" onClick={() => void toggleMask()} aria-pressed={masked[cur.id] !== undefined}>
                  {masked[cur.id] !== undefined ? <EyeOff className="ico sm" aria-hidden /> : <Eye className="ico sm" aria-hidden />} 개인정보 가리기
                </button>
                <button className="btn sm primary" onClick={() => void copyAi()}><Sparkles className="ico sm" aria-hidden /> AI용으로 복사(개인정보 가림)</button>
                <span className="toolbar-sep" aria-hidden />
                <span className="meta">저장</span>
                {(["hwpx", "docx", "xlsx", "md"] as const).map((k) => (
                  <button key={k} className="btn sm" disabled={!!busy} onClick={() => void save(k)}>
                    {busy === k ? <LoaderCircle className="ico sm spin" aria-hidden /> : <FileDown className="ico sm" aria-hidden />} {k.toUpperCase()}
                  </button>
                ))}
                <span className="toolbar-sep" aria-hidden />
                <button className="btn sm" onClick={() => { setHandoff({ to: "slides", name: cur.name, markdown: shown }); go("slides"); }}><Presentation className="ico sm" aria-hidden /> 수업 슬라이드로</button>
                <button className="btn sm" onClick={() => { setHandoff({ to: "letters", name: cur.name, markdown: shown }); go("letters"); }}><ScrollText className="ico sm" aria-hidden /> 가정통신문으로</button>
              </div>
              {cur.warnings.length > 0 && <div style={{ padding: "0 20px" }}><Notice kind="warn">{cur.warnings.slice(0, 3).join(" · ")}</Notice></div>}
              <div className="panel-body">
                {view === "preview" ? (
                  <article className="prose" dangerouslySetInnerHTML={{ __html: preview }} />
                ) : (
                  <label className="field" style={{ fontWeight: 400 }}>
                    <span className="sr">Markdown 편집</span>
                    <textarea className="md-editor" value={shown} onChange={(e) => edit(e.target.value)} spellCheck={false} />
                  </label>
                )}
              </div>
            </>
          )}
        </section>
      </div>
      {toast.node}
    </>
  );
}
