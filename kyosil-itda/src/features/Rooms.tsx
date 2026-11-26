import { useEffect, useMemo, useRef, useState } from "react";
import { changeMembers, createRoom, type Decrypted } from "../core/engine";
import { nameOf, PEOPLE } from "../core/school";
import { reduceWidgets, type WidgetOp, type WidgetState } from "../core/widgets";
import { timeLabel, useApp } from "../state";
import { Avatar, Empty, useToast } from "../ui/common";

const uid = () => crypto.randomUUID().slice(0, 8);

export function Rooms() {
  const { views, me } = useApp();
  const chats = views.filter((v) => v.room.kind === "chat");
  const [sel, setSel] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const current = chats.find((v) => v.room.roomId === sel) ?? chats[0];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>대화방 · 공동 위젯</h1>
          <p>메시지와 위젯은 모두 이 기기에서 암호화된 뒤 전송됩니다. 체크리스트와 투표는 방 안의 모든 사람이 동시에 편집합니다.</p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)}>새 대화방</button>
      </div>
      {creating && <NewRoom onDone={(id) => { setCreating(false); if (id) setSel(id); }} />}
      <div className="rooms">
        <nav className="room-list" aria-label="대화방 목록">
          {chats.map((v) => {
            const last = [...v.events].reverse().find((e) => e.payload.type === "msg");
            return (
              <button key={v.room.roomId} className="room-item" aria-current={current?.room.roomId === v.room.roomId} onClick={() => setSel(v.room.roomId)}>
                <span style={{ fontWeight: 600 }}>{v.room.name}</span>
                <span className="tiny muted" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {last && last.payload.type === "msg" ? `${nameOf(last.sender)}: ${last.payload.text}` : `${v.room.members.length}명`}
                </span>
              </button>
            );
          })}
          {chats.length === 0 && <Empty>{me.name} 님이 참여한 대화방이 없습니다.</Empty>}
        </nav>
        {current ? <Chat key={current.room.roomId} roomId={current.room.roomId} /> : <div className="card">대화방을 선택하세요.</div>}
      </div>
    </>
  );
}

function NewRoom({ onDone }: { onDone: (id?: string) => void }) {
  const { me } = useApp();
  const [name, setName] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h3>새 대화방</h3>
      <div className="stack" style={{ marginTop: 10 }}>
        <label className="field">방 이름 (서버에 보이는 정보입니다)
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 3학년 진로 협의" />
        </label>
        <div className="row">
          {PEOPLE.filter((p) => p.id !== me.id).map((p) => (
            <label key={p.id} className="pill gray" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={members.includes(p.id)} onChange={(e) => setMembers((m) => (e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id)))} />
              {p.name}
            </label>
          ))}
        </div>
        <div className="row">
          <button className="btn primary" disabled={!name.trim() || !members.length || busy} onClick={async () => {
            setBusy(true);
            const r = await createRoom({ name: name.trim(), kind: "chat", members, by: me.id });
            onDone(r.roomId);
          }}>만들기 · 참여자별 키 봉인</button>
          <button className="btn ghost" onClick={() => onDone()}>취소</button>
        </div>
      </div>
    </div>
  );
}

function Chat({ roomId }: { roomId: string }) {
  const { view, me, send } = useApp();
  const v = view(roomId)!;
  const [text, setText] = useState("");
  const [manage, setManage] = useState(false);
  const toast = useToast();
  const bodyRef = useRef<HTMLDivElement>(null);

  const widgets = useMemo(() => {
    const ops = v.events
      .filter((e): e is Decrypted & { payload: WidgetOp } => e.payload.type.startsWith("widget."))
      .map((e) => ({ op: e.payload, clock: { at: e.at, actor: e.sender } }));
    return new Map(reduceWidgets(ops).map((w) => [w.widgetId, w]));
  }, [v.events]);

  const timeline = v.events.filter((e) => e.payload.type === "msg" || e.payload.type === "system" || e.payload.type === "widget.create");

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [timeline.length]);

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText("");
    await send(roomId, { type: "msg", text: t });
  };

  const [draft, setDraft] = useState<{ kind: "checklist" | "poll"; title: string; options: string } | null>(null);
  const createWidget = async () => {
    if (!draft || !draft.title.trim()) return;
    const widgetId = `w_${uid()}`;
    if (draft.kind === "poll") {
      const options = draft.options.split(",").map((s) => s.trim()).filter(Boolean);
      if (options.length < 2) return toast.show("선택지는 쉼표로 구분해 2개 이상 적어 주세요.");
      await send(roomId, { type: "widget.create", widgetId, kind: "poll", title: draft.title.trim(), options });
    } else await send(roomId, { type: "widget.create", widgetId, kind: "checklist", title: draft.title.trim() });
    setDraft(null);
  };

  return (
    <section className="card chat" aria-label={v.room.name}>
      <div className="chat-head">
        <div className="row between">
          <div>
            <h2>{v.room.name}</h2>
            <div className="tiny muted" style={{ marginTop: 2 }}>{v.room.members.map(nameOf).join(", ")}</div>
          </div>
          <div className="row">
            <span className="pill ok" title="AES-256-GCM · 참여자별 ECDH 키 봉인 · ECDSA 서명">🔒 종단간 암호화 · {v.room.epoch}세대 키</span>
            <button className="btn ghost sm" onClick={() => setManage((m) => !m)}>참여자</button>
          </div>
        </div>
        {v.unreadable > 0 && (
          <p className="tiny muted" style={{ marginTop: 6 }}>합류 이전 또는 검증에 실패한 메시지 {v.unreadable}건은 이 기기에서 열 수 없습니다.</p>
        )}
        {manage && <Members roomId={roomId} onDone={() => setManage(false)} />}
      </div>
      <div className="chat-body" ref={bodyRef}>
        {timeline.map((e) => {
          if (e.payload.type === "system") return <div key={e.id} className="sys">{e.payload.text}</div>;
          const mine = e.sender === me.id;
          return (
            <div key={e.id} className={`msg ${mine ? "mine" : ""}`}>
              <Avatar id={e.sender} />
              <div className="bubble" style={{ flex: e.payload.type === "widget.create" ? 1 : undefined }}>
                <div className="tiny muted">{nameOf(e.sender)} · {timeLabel(e.at)}</div>
                {e.payload.type === "msg" ? (
                  <p>{e.payload.text}</p>
                ) : e.payload.type === "widget.create" && widgets.get(e.payload.widgetId) ? (
                  <Widget w={widgets.get(e.payload.widgetId)!} roomId={roomId} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="chat-foot">
        <div className="row">
          <button className="btn sm" aria-pressed={draft?.kind === "checklist"} onClick={() => setDraft(draft?.kind === "checklist" ? null : { kind: "checklist", title: "", options: "" })}>☑ 공동 체크리스트</button>
          <button className="btn sm" aria-pressed={draft?.kind === "poll"} onClick={() => setDraft(draft?.kind === "poll" ? null : { kind: "poll", title: "", options: "" })}>▤ 투표</button>
        </div>
        {draft && (
          <form className="note-box stack" onSubmit={(e) => { e.preventDefault(); void createWidget(); }}>
            <label className="field">{draft.kind === "checklist" ? "체크리스트 제목" : "투표 질문"}
              <input id="widget-title" type="text" autoFocus value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={draft.kind === "checklist" ? "예: 학부모 상담 주간 준비" : "예: 협의회 시간"} />
            </label>
            {draft.kind === "poll" && (
              <label className="field">선택지 (쉼표로 구분)
                <input id="widget-options" type="text" value={draft.options} onChange={(e) => setDraft({ ...draft, options: e.target.value })} placeholder="화요일 5교시, 수요일 3교시" />
              </label>
            )}
            <div className="row">
              <button className="btn primary sm" type="submit" disabled={!draft.title.trim()}>방에 올리기</button>
              <button className="btn ghost sm" type="button" onClick={() => setDraft(null)}>취소</button>
            </div>
          </form>
        )}
        <form className="row" style={{ flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <label className="sr" htmlFor="composer">메시지</label>
          <input id="composer" type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="메시지 입력 · 이 기기에서 암호화됩니다" autoComplete="off" />
          <button className="btn primary" type="submit" disabled={!text.trim()}>보내기</button>
        </form>
      </div>
      {toast.node}
    </section>
  );
}

function Widget({ w, roomId }: { w: WidgetState; roomId: string }) {
  const { me, send } = useApp();
  const [item, setItem] = useState("");
  if (w.kind === "poll") {
    const total = Object.keys(w.votes).length;
    const mine = w.votes[me.id];
    return (
      <div className="widget" role="group" aria-label={`투표: ${w.title}`}>
        <div className="row between"><b>▤ {w.title}</b><span className="pill gray">{total}명 참여</span></div>
        {w.options.map((o, i) => {
          const n = Object.values(w.votes).filter((x) => x === i).length;
          const who = Object.entries(w.votes).filter(([, x]) => x === i).map(([a]) => nameOf(a));
          return (
            <button key={i} className="poll-opt" aria-pressed={mine === i} onClick={() => send(roomId, { type: "widget.vote", widgetId: w.widgetId, option: mine === i ? null : i })}>
              <span className="row between"><span>{o}</span><span className="tiny muted">{n}표</span></span>
              <span className="bar"><span style={{ width: total ? `${(n / total) * 100}%` : 0 }} /></span>
              {who.length > 0 && <span className="tiny faint">{who.join(", ")}</span>}
            </button>
          );
        })}
      </div>
    );
  }
  const live = w.items.filter((i) => !i.removed);
  const done = live.filter((i) => i.done).length;
  return (
    <div className="widget" role="group" aria-label={`체크리스트: ${w.title}`}>
      <div className="row between" style={{ marginBottom: 6 }}>
        <b>☑ {w.title}</b>
        <span className={`pill ${done === live.length && live.length ? "ok" : "gray"}`}>{done}/{live.length}</span>
      </div>
      <div className="bar" style={{ marginBottom: 8 }}><span style={{ width: live.length ? `${(done / live.length) * 100}%` : 0, background: "var(--ok)" }} /></div>
      {live.map((i) => (
        <div key={i.itemId} className="check-row">
          <input type="checkbox" id={`${w.widgetId}-${i.itemId}`} checked={i.done} onChange={(e) => send(roomId, { type: "widget.check", widgetId: w.widgetId, itemId: i.itemId, done: e.target.checked })} />
          <label htmlFor={`${w.widgetId}-${i.itemId}`} style={{ flex: 1 }} className={i.done ? "done" : ""}>{i.text}</label>
          {i.doneBy && <span className="tiny muted">{nameOf(i.doneBy)}</span>}
          <button className="btn ghost sm" aria-label={`${i.text} 삭제`} onClick={() => send(roomId, { type: "widget.remove", widgetId: w.widgetId, itemId: i.itemId })}>×</button>
        </div>
      ))}
      <form className="row" style={{ marginTop: 8, flexWrap: "nowrap" }} onSubmit={(e) => { e.preventDefault(); if (!item.trim()) return; void send(roomId, { type: "widget.item", widgetId: w.widgetId, itemId: `i_${uid()}`, text: item.trim() }); setItem(""); }}>
        <input type="text" value={item} onChange={(e) => setItem(e.target.value)} placeholder="항목 추가" aria-label="체크리스트 항목 추가" />
        <button className="btn sm" type="submit" disabled={!item.trim()}>추가</button>
      </form>
    </div>
  );
}

function Members({ roomId, onDone }: { roomId: string; onDone: () => void }) {
  const { view, me } = useApp();
  const v = view(roomId)!;
  const [members, setMembers] = useState<string[]>(v.room.members);
  const [busy, setBusy] = useState(false);
  return (
    <div className="note-box" style={{ marginTop: 10 }}>
      <p className="small" style={{ marginBottom: 8 }}>참여자를 바꾸면 새 방 키가 만들어집니다. 나간 사람은 이후 메시지를 열 수 없고, 새로 온 사람은 이전 메시지를 볼 수 없습니다.</p>
      <div className="row">
        {PEOPLE.map((p) => (
          <label key={p.id} className="pill gray" style={{ cursor: p.id === me.id ? "default" : "pointer" }}>
            <input type="checkbox" disabled={p.id === me.id} checked={members.includes(p.id)} onChange={(e) => setMembers((m) => (e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id)))} />
            {p.name}
          </label>
        ))}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn primary sm" disabled={busy || JSON.stringify([...members].sort()) === JSON.stringify([...v.room.members].sort())} onClick={async () => {
          setBusy(true);
          try { await changeMembers(roomId, me.id, members); onDone(); } finally { setBusy(false); }
        }}>적용 · 키 교체</button>
        <button className="btn ghost sm" onClick={onDone}>닫기</button>
      </div>
    </div>
  );
}
