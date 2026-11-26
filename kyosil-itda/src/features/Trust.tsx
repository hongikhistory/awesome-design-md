import { useEffect, useMemo, useState } from "react";
import { fingerprint } from "../core/crypto";
import { readAll } from "../core/engine";
import { deviceKeys } from "../core/keystore";
import { relay, type Envelope } from "../core/relay";
import { nameOf, PEOPLE } from "../core/school";
import { timeLabel, useApp } from "../state";
import { Notice } from "../ui/common";

export function Trust() {
  const { me, views, tick } = useApp();
  const snap = useMemo(() => relay.snapshot(), [tick]);
  const [prints, setPrints] = useState<Record<string, string>>({});
  const [exportResult, setExportResult] = useState("");
  const [lab, setLab] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Record<string, string> = {};
      for (const [id, k] of Object.entries(snap.directory)) out[id] = await fingerprint(k.ecdh);
      if (alive) setPrints(out);
    })();
    return () => { alive = false; };
  }, [snap.directory]);

  const readable = new Set(views.map((v) => v.room.roomId));
  const latest = [...snap.envelopes].sort((a, b) => b.at - a.at).slice(0, 12);
  const totalBytes = new Blob([JSON.stringify(snap)]).size;

  const tryExport = async () => {
    const k = await deviceKeys(me.id);
    try {
      await crypto.subtle.exportKey("jwk", k.privateKey);
      setExportResult("경고: 내보내기에 성공했습니다(예상과 다름).");
    } catch (e) {
      setExportResult(`차단됨 · 브라우저가 거부: ${(e as Error).name}. 개인 키는 이 기기 밖으로 꺼낼 수 없습니다.`);
    }
  };

  const attack = async (kind: "tamper" | "impersonate") => {
    const mine = views.find((v) => v.room.kind === "chat");
    const target = [...snap.envelopes].reverse().find((e) => e.roomId === mine?.room.roomId);
    if (!target || !mine) return;
    const before = mine.unreadable;
    const forged: Envelope = { ...target, id: crypto.randomUUID(), at: Date.now() };
    if (kind === "tamper") {
      const c = forged.ct;
      const i = Math.floor(c.length / 2);
      forged.ct = c.slice(0, i) + (c[i] === "A" ? "B" : "A") + c.slice(i + 1);
    } else {
      forged.sender = "t3"; // pretend to be the timetable coordinator
    }
    relay.inject(forged);
    const after = (await readAll(me.id)).find((v) => v.room.roomId === mine.room.roomId);
    const shown = after?.events.some((e) => e.id === forged.id);
    setLab((l) => [
      `${new Date().toLocaleTimeString("ko-KR")} · ${kind === "tamper" ? "암호문 1글자 변조" : "보낸 사람을 ‘박민지(시간표 담당)’로 사칭"} → ‘${mine.room.name}’에 주입 · ${shown ? "경고: 화면에 표시됨" : `차단됨: 서명·인증 검증에서 걸러져 화면에 나타나지 않음 (열 수 없는 메시지 ${before}→${after?.unreadable ?? "?"}건)`}`,
      ...l,
    ]);
  };

  const yes = <span className="badge ok">열람 가능</span>;
  const no = <span className="badge">암호문만</span>;
  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">정보 · 보안 확인</div>
          <h1>서버가 보는 것</h1>
          <p className="lead">중계 서버 운영자의 화면을 그대로 보여 줍니다. 서버는 방 이름·참여자·시각 같은 최소한의 정보와 암호문만 갖습니다.</p>
        </div>
        <span className="meta">중계 저장소 {Math.round(totalBytes / 1024)} KB · 암호문 {snap.envelopes.length}건</span>
      </div>

      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="panel" aria-labelledby="see-h">
          <div className="panel-head"><h2 id="see-h">누가 무엇을 볼 수 있나</h2></div>
          <div className="panel-body">
            <table className="sheet">
              <thead><tr><th scope="col">정보</th><th scope="col">중계 서버</th><th scope="col">방 구성원</th></tr></thead>
              <tbody>
                <tr><td>메시지, 체크리스트, 인수인계서, 관찰 기록</td><td>{no}</td><td>{yes}</td></tr>
                <tr><td>루브릭 점수, 피드백, 성찰</td><td>{no}</td><td>{yes} <span className="meta">두 사람만</span></td></tr>
                <tr><td>방 이름, 참여자 목록</td><td><span className="badge warn">보임</span></td><td>{yes}</td></tr>
                <tr><td>보낸 시각, 보낸 사람</td><td><span className="badge warn">보임</span></td><td>{yes}</td></tr>
                <tr><td>개인 키</td><td><span className="badge">없음</span></td><td><span className="badge">자기 기기에만</span></td></tr>
              </tbody>
            </table>
            <p className="meta" style={{ marginTop: 8 }}>서버에 보이는 정보도 숨기지 않고 표시합니다. 방 이름에는 민감한 내용을 넣지 마세요.</p>
          </div>
        </section>

        <section className="panel" aria-labelledby="dev-h">
          <div className="panel-head"><h2 id="dev-h">기기 키 확인</h2></div>
          <div className="panel-body stack">
            <p className="small muted">서로 만나 안전 번호를 비교하면, 중간에 키가 바뀌지 않았는지 확인할 수 있습니다.</p>
            <table className="sheet">
              <thead><tr><th scope="col">사람</th><th scope="col">안전 번호</th></tr></thead>
              <tbody>
                {PEOPLE.map((p) => (
                  <tr key={p.id} className={p.id === me.id ? "selected" : ""}>
                    <td style={{ whiteSpace: "nowrap" }}>{p.name}{p.id === me.id ? " (나)" : ""}</td>
                    <td className="mono">{prints[p.id] ?? "…"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div><button className="btn" onClick={tryExport}>내 개인 키 내보내기 시도</button></div>
            {exportResult && <Notice kind="ok" role="status">{exportResult}</Notice>}
            <p className="meta">시연판은 한 브라우저 안에서 모든 사람의 기기를 흉내 냅니다. 실제로는 각자 자기 기기에서 키를 만듭니다.</p>
          </div>
        </section>
      </div>

      <section className="panel section" aria-labelledby="lab-h">
        <div className="panel-head"><h2 id="lab-h">위조 실험</h2><span className="meta">서버를 장악한 공격자가 할 수 있는 일</span></div>
        <div className="panel-body stack">
          <p className="small muted">아래 버튼은 서버에 위조된 메시지를 직접 넣습니다. 받는 쪽 기기는 서명 검증과 AES-GCM 인증으로 이를 걸러 냅니다.</p>
          <div className="row">
            <button className="btn" onClick={() => attack("tamper")}>암호문 한 글자 바꿔 넣기</button>
            <button className="btn" onClick={() => attack("impersonate")}>시간표 담당 명의로 위조해 넣기</button>
          </div>
          {lab.length > 0 && <ul className="small" style={{ margin: 0, paddingLeft: 20 }}>{lab.map((l, i) => <li key={i}>{l}</li>)}</ul>}
        </div>
      </section>

      <section className="panel section" aria-labelledby="rooms-h">
        <div className="panel-head"><h2 id="rooms-h">서버에 저장된 방</h2></div>
        <div className="panel-body scroll-x">
          <table className="sheet">
            <thead><tr><th scope="col">방 이름</th><th scope="col">참여자</th><th scope="col" className="num">키 교체</th><th scope="col" className="num">전달된 방 키</th><th scope="col">자동 삭제</th><th scope="col">{me.name} 열람</th></tr></thead>
            <tbody>
              {snap.rooms.map((r) => (
                <tr key={r.roomId}>
                  <td>{r.name}</td>
                  <td className="meta">{r.members.map(nameOf).join(", ")}</td>
                  <td className="num">{r.epoch - 1}회</td>
                  <td className="num">{Object.values(r.keys).reduce((n, k) => n + Object.keys(k).length, 0)}개</td>
                  <td>{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("ko-KR") : "—"}</td>
                  <td>{readable.has(r.roomId) ? <span className="badge ok">가능</span> : <span className="badge">불가</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel section" aria-labelledby="env-h">
        <div className="panel-head"><h2 id="env-h">최근 암호문 12건</h2></div>
        <div className="panel-body scroll-x">
          <table className="sheet">
            <thead><tr><th scope="col">시각</th><th scope="col">방</th><th scope="col">보낸 사람</th><th scope="col">암호문 (AES-256-GCM)</th></tr></thead>
            <tbody>
              {latest.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{timeLabel(e.at)}</td>
                  <td>{snap.rooms.find((r) => r.roomId === e.roomId)?.name ?? e.roomId}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{nameOf(e.sender)}</td>
                  <td><span className="cipher">{e.ct.slice(0, 120)}{e.ct.length > 120 ? "…" : ""}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
