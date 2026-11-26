import { ChevronLeft, ChevronRight, ExternalLink, ImagePlus, Link2, MonitorPlay, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStudioId } from "../core/profile";
import { COMMON_ASSETS, searchUrl, STUDIOS, type AssetLink, type StudioId } from "../core/studio";
import { useApp } from "../state";
import { Notice, useToast } from "../ui/common";

export interface BoardItem {
  id: string;
  title: string;
  url?: string;
  image?: string;
  source: string;
  license: string;
  note?: string;
}

const LICENSES = ["확인 필요", "공공누리 제1유형(출처 표시)", "공공누리 제2유형(상업 금지)", "공공누리 제3유형(변경 금지)", "공공누리 제4유형", "CC BY / CC BY-SA", "퍼블릭 도메인", "직접 촬영·제작"];
const KEY = (id: string) => `kyosil:assets:${id}`;

const COMMONS = STUDIOS.history.assets.find((a) => a.name === "위키미디어 공용")!;
// 역사 시연용 보드: 링크만 담고, 이미지는 교사가 이용 조건을 확인한 뒤 직접 올린다.
const SAMPLE: BoardItem[] = [
  { id: "s1", title: "사발통문 — e뮤지엄에서 찾기", url: "https://www.emuseum.go.kr", source: "e뮤지엄(국립중앙박물관)", license: "확인 필요", note: "검색창에 ‘사발통문’. 소장처와 이용 조건을 확인하고 화면에 띄웁니다." },
  { id: "s2", title: "동학 농민 운동 관련 사진·지도", url: searchUrl(COMMONS, "Donghak Peasant Revolution"), source: "위키미디어 공용", license: "CC BY / CC BY-SA", note: "파일마다 라이선스가 다르므로 출처 표시를 확인합니다." },
  { id: "s3", title: "우금치 전적 — 국가유산포털", url: "https://www.heritage.go.kr", source: "국가유산청", license: "확인 필요", note: "검색창에 ‘우금치’. 2차 봉기 장면을 설명할 때." },
  { id: "s4", title: "동학 농민 운동 연대기", url: "https://contents.history.go.kr", source: "우리역사넷(국사편찬위원회)", license: "확인 필요", note: "도입 단계에서 사건 순서를 확인할 때." },
];

function load(id: string, studio: StudioId): BoardItem[] {
  try {
    const raw = localStorage.getItem(KEY(id));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return studio === "history" ? SAMPLE : [];
}

async function shrink(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw Error("PNG, JPG, WebP, GIF 이미지만 올릴 수 있습니다.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => bad(Error("이미지를 읽지 못했습니다.")); i.src = url; });
    const s = Math.min(1, 1280 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s);
    c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const safeUrl = (u: string) => (/^https?:\/\/[^\s]+$/i.test(u.trim()) ? u.trim() : "");

export function Assets() {
  const { me } = useApp();
  const myStudio = useStudioId(me.id);
  const [view, setView] = useState<StudioId>(myStudio);
  useEffect(() => setView(myStudio), [myStudio]);
  const studio = STUDIOS[view];
  const [q, setQ] = useState(view === "history" ? "사발통문" : "");
  const [items, setItems] = useState<BoardItem[]>(() => load(me.id, myStudio));
  const [form, setForm] = useState({ title: "", url: "", source: "", license: LICENSES[0], note: "", image: "" });
  const [show, setShow] = useState<number | null>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const persist = (next: BoardItem[]) => {
    setItems(next);
    try { localStorage.setItem(KEY(me.id), JSON.stringify(next)); } catch { toast.show("이 기기의 저장 공간이 부족합니다. 큰 이미지를 지워 주세요."); }
  };

  const openAsset = async (a: AssetLink) => {
    if (!a.search && q.trim()) {
      try { await navigator.clipboard.writeText(q.trim()); toast.show(`‘${q.trim()}’을(를) 복사했습니다. ${a.name} 검색창에 붙여 넣으세요.`); } catch { /* still open */ }
    }
  };

  const add = () => {
    const url = safeUrl(form.url);
    if (!form.title.trim() || (!url && !form.image)) return toast.show("제목과, 링크(https://…) 또는 이미지 중 하나가 필요합니다.");
    persist([...items, { id: crypto.randomUUID().slice(0, 8), title: form.title.trim(), url: url || undefined, image: form.image || undefined, source: form.source.trim() || "출처 미입력", license: form.license, note: form.note.trim() || undefined }]);
    setForm({ title: "", url: "", source: "", license: LICENSES[0], note: "", image: "" });
  };

  const others = useMemo(() => (Object.keys(STUDIOS) as StudioId[]).filter((k) => k !== "default"), []);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업 · 수업 에셋</div>
          <h1>수업 에셋</h1>
          <p className="lead">수업 중에 유물 사진이나 지도, 시뮬레이션을 바로 띄울 수 있게 미리 모아 둡니다. 교과별 공식 자료실로 연결하고, 이용 조건을 확인한 자료만 보드에 담아 교실 화면에 크게 보여 줍니다.</p>
        </div>
        <div className="row">
          <button className="btn primary" disabled={!items.length} onClick={() => setShow(0)}><MonitorPlay className="ico sm" aria-hidden /> 수업 중 띄우기</button>
        </div>
      </div>

      <section className="panel" aria-labelledby="as-h">
        <div className="panel-head">
          <h2 id="as-h">{studio.name} 추천 자료실</h2>
          <label className="row" style={{ fontWeight: 600 }}>다른 교과
            <select value={view} onChange={(e) => setView(e.target.value as StudioId)} aria-label="자료실 교과" style={{ width: 170 }}>{others.map((k) => <option key={k} value={k}>{STUDIOS[k].name}</option>)}</select>
          </label>
        </div>
        <div className="panel-body stack">
          <label className="search asset-search"><Search className="ico sm" aria-hidden /><span className="sr">자료 검색어</span><input type="text" value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾을 유물·개념·지명 (예: 사발통문)" /></label>
          <div className="asset-grid">
            {[...studio.assets, ...COMMON_ASSETS].map((a) => (
              <a key={a.name} className="asset-card" href={q.trim() ? searchUrl(a, q) : a.url} target="_blank" rel="noopener noreferrer" onClick={() => void openAsset(a)}>
                <span className="asset-name">{a.name} <ExternalLink className="ico sm" aria-hidden /></span>
                <span className="meta">{a.what}</span>
                <span className="asset-how">{q.trim() ? (a.search ? `‘${q.trim()}’ 바로 검색` : "검색어 복사 후 열기") : "열기"}</span>
              </a>
            ))}
          </div>
          <p className="meta">검색 결과로 바로 가는 곳은 검색 주소가 공개된 사이트(위키미디어 공용·위키백과)뿐입니다. 나머지는 공식 누리집을 열고 검색어를 복사해 드립니다.</p>
        </div>
      </section>

      <section className="panel section" aria-labelledby="bd-h">
        <div className="panel-head"><h2 id="bd-h">수업 에셋 보드</h2><span className="meta">{items.length}개 · 이 기기에만 저장</span></div>
        <div className="panel-body stack">
          {items.length > 0 && (
            <ol className="board-list">
              {items.map((it, i) => (
                <li key={it.id} className="board-item">
                  <button className="board-thumb" onClick={() => setShow(i)} aria-label={`${it.title} 크게 보기`}>
                    {it.image ? <img src={it.image} alt="" /> : <Link2 className="ico lg" aria-hidden />}
                  </button>
                  <div className="board-meta">
                    <b>{it.title}</b>
                    <span className="meta">{it.source} · {it.license}</span>
                    {it.note && <span className="meta">{it.note}</span>}
                  </div>
                  <div className="row nowrap">
                    {it.url && <a className="btn sm" href={it.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="ico sm" aria-hidden /> 열기</a>}
                    <button className="btn sm text" aria-label={`${it.title} 삭제`} onClick={() => persist(items.filter((x) => x.id !== it.id))}><Trash2 className="ico sm" aria-hidden /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
          <form className="panel sub" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <div className="panel-body stack tight">
              <div className="grid two">
                <label className="field">제목<input id="as-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 사발통문" /></label>
                <label className="field">링크 <span className="hint">https://로 시작</span><input id="as-url" type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="자료 페이지 주소" /></label>
                <label className="field">출처<input id="as-src" type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} placeholder="예: 국립중앙박물관" /></label>
                <label className="field">이용 조건<select id="as-lic" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })}>{LICENSES.map((l) => <option key={l}>{l}</option>)}</select></label>
              </div>
              <label className="field">수업 메모 <span className="hint">선택</span><input id="as-note" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="언제, 무엇을 물어볼지" /></label>
              <div className="row">
                <button type="button" className="btn sm" onClick={() => fileIn.current?.click()}><ImagePlus className="ico sm" aria-hidden /> {form.image ? "이미지 바꾸기" : "이미지 올리기"}</button>
                {form.image && <img className="form-thumb" src={form.image} alt="올릴 이미지 미리보기" />}
                <input ref={fileIn} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" aria-label="에셋 이미지 파일" onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; try { setForm({ ...form, image: await shrink(f) }); } catch (er) { toast.show((er as Error).message); } }} />
                <button className="btn primary sm" type="submit"><Plus className="ico sm" aria-hidden /> 보드에 담기</button>
              </div>
            </div>
          </form>
          <Notice kind="plain">박물관·기관 자료는 공공누리 유형이나 라이선스를 확인하고, 화면에 출처를 함께 보여 주세요. 이미지는 이 기기에만 저장되며 1280px로 줄여 둡니다.</Notice>
        </div>
      </section>

      {show !== null && items[show] && <Presenter items={items} at={show} onMove={setShow} onClose={() => setShow(null)} />}
      {toast.node}
    </>
  );
}

function Presenter({ items, at, onMove, onClose }: { items: BoardItem[]; at: number; onMove: (i: number) => void; onClose: () => void }) {
  const it = items[at];
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus();
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onMove(Math.min(items.length - 1, at + 1));
      else if (e.key === "ArrowLeft") onMove(Math.max(0, at - 1));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [at, items.length, onClose, onMove]);
  return (
    <div className="presenter" role="dialog" aria-modal="true" aria-label={`수업 에셋: ${it.title}`}>
      <div className="presenter-top">
        <span className="meta" style={{ color: "#C3D0EC" }}>{at + 1} / {items.length} · ← → 로 넘기기 · Esc 닫기</span>
        <button ref={close} className="btn sm" onClick={onClose}><X className="ico sm" aria-hidden /> 닫기</button>
      </div>
      <div className="presenter-stage" key={it.id}>
        {it.image ? <img src={it.image} alt={it.title} /> : (
          <div className="presenter-link">
            <Link2 className="ico lg" aria-hidden />
            <h2>{it.title}</h2>
            {it.note && <p>{it.note}</p>}
            {it.url && <a className="btn primary lg" href={it.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="ico sm" aria-hidden /> 자료 열기</a>}
          </div>
        )}
      </div>
      <div className="presenter-cap">
        <button className="btn sm" disabled={at === 0} onClick={() => onMove(at - 1)} aria-label="이전 자료"><ChevronLeft className="ico sm" aria-hidden /></button>
        <div><b>{it.title}</b><span>출처: {it.source} · {it.license}</span></div>
        <button className="btn sm" disabled={at === items.length - 1} onClick={() => onMove(at + 1)} aria-label="다음 자료"><ChevronRight className="ico sm" aria-hidden /></button>
      </div>
    </div>
  );
}

