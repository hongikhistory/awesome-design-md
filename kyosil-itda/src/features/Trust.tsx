import { useEffect, useMemo, useState } from "react";
import { fingerprint } from "../core/crypto";
import { readAll } from "../core/engine";
import { deviceKeys } from "../core/keystore";
import { relay, type Envelope } from "../core/relay";
import { nameOf, PEOPLE } from "../core/school";
import { timeLabel, useApp } from "../state";
import { Avatar } from "../ui/common";

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
      setExportResult("⚠ 내보내기에 성공했습니다(예상과 다름).");
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
      `${new Date().toLocaleTimeString("ko-KR")} · ${kind === "tamper" ? "암호문 1글자 변조" : "보낸 사람을 ‘박민지(시간표 담당)’로 사칭"} → ‘${mine.room.name}’에 주입 · ${shown ? "⚠ 화면에 표시됨" : `✅ 차단: 서명·인증 검증 실패로 표시되지 않음 (열 수 없는 메시지 ${before}→${after?.unreadable ?? "?"}건)`}`,
      ...l,
    ]);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>서버가 보는 것</h1>
          <p>운영자 화면을 그대로 보여 줍니다. 서버는 방 이름·참여자·시각 같은 최소한의 메타데이터와 암호문만 갖고, 내용은 볼 수 없습니다.</p>
        </div>
        <span className="pill gray">중계 저장소 {Math.round(totalBytes / 1024)} KB</span>
      </div>

      <div className="grid two">
        <section className="card" aria-labelledby="see-h">
          <h2 id="see-h">볼 수 있는 것 / 없는 것</h2>
          <table className="data" style={{ marginTop: 10 }}>
            <thead><tr><th>정보</th><th>서버</th><th>방 구성원</th></tr></thead>
            <tbody>
              <tr><td>메시지·위젯·카드·참관 기록 내용</td><td>❌ 암호문</td><td>✅</td></tr>
              <tr><td>루브릭 점수·피드백·성찰</td><td>❌ 암호문</td><td>✅ 두 사람만</td></tr>
              <tr><td>방 이름, 참여자 목록</td><td>⚠ 보임</td><td>✅</td></tr>
              <tr><td>보낸 시각, 보낸 사람 ID</td><td>⚠ 보임</td><td>✅</td></tr>
              <tr><td>개인 키</td><td>❌ 없음</td><td>❌ 자기 기기에만</td></tr>
            </tbody>
          </table>
          <p className="tiny muted" style={{ marginTop: 8 }}>메타데이터 노출은 숨기지 않고 표시합니다. 방 이름에 민감한 정보를 넣지 마세요.</p>
        </section>

        <section className="card" aria-labelledby="dev-h">
          <h2 id="dev-h">기기 키 확인</h2>
          <p className="small muted" style={{ marginTop: 6 }}>만나서 서로의 안전 번호를 비교하면 중간에 키가 바뀌지 않았음을 확인할 수 있습니다.</p>
          <div className="stack" style={{ marginTop: 10 }}>
            {PEOPLE.map((p) => (
              <div key={p.id} className="row" style={{ flexWrap: "nowrap" }}>
                <Avatar id={p.id} />
                <span style={{ minWidth: 56 }} className="small">{p.name}</span>
                <span className="mono faint" style={{ flex: 1 }}>{prints[p.id] ?? "…"}</span>
                {p.id === me.id && <span className="pill">나</span>}
              </div>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 12 }} onClick={tryExport}>내 개인 키 내보내기 시도</button>
          {exportResult && <p className="note-box ok small" style={{ marginTop: 8 }} role="status">{exportResult}</p>}
        </section>
      </div>

      <section className="card" aria-labelledby="lab-h" style={{ marginTop: 14 }}>
        <h2 id="lab-h">공격 실험실</h2>
        <p className="small muted" style={{ marginTop: 6 }}>서버(또는 서버를 장악한 공격자)가 할 수 있는 일을 직접 해 봅니다. 위조된 메시지는 서명 검증과 AES-GCM 인증에서 걸러집니다.</p>
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn" onClick={() => attack("tamper")}>암호문 변조 주입</button>
          <button className="btn" onClick={() => attack("impersonate")}>시간표 담당 사칭 주입</button>
        </div>
        {lab.length > 0 && <ul className="small" style={{ marginTop: 10 }}>{lab.map((l, i) => <li key={i}>{l}</li>)}</ul>}
      </section>

      <section className="card" aria-labelledby="rooms-h" style={{ marginTop: 14 }}>
        <h2 id="rooms-h">서버에 저장된 방</h2>
        <div className="scroll-x">
          <table className="data" style={{ marginTop: 8 }}>
            <thead><tr><th>방 이름</th><th>참여자</th><th>키 세대</th><th>봉인된 키</th><th>자동 삭제</th><th>{me.name} 열람</th></tr></thead>
            <tbody>
              {snap.rooms.map((r) => (
                <tr key={r.roomId}>
                  <td>{r.name}</td>
                  <td className="small">{r.members.map(nameOf).join(", ")}</td>
                  <td>{r.epoch}</td>
                  <td className="small">{Object.values(r.keys).reduce((n, k) => n + Object.keys(k).length, 0)}개</td>
                  <td className="small">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString("ko-KR") : "—"}</td>
                  <td>{readable.has(r.roomId) ? <span className="pill ok">가능</span> : <span className="pill gray">불가</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="env-h" style={{ marginTop: 14 }}>
        <h2 id="env-h">최근 암호문 {snap.envelopes.length}건 중 12건</h2>
        <div className="scroll-x">
          <table className="data" style={{ marginTop: 8 }}>
            <thead><tr><th>시각</th><th>방</th><th>보낸 사람</th><th>암호문 (AES-256-GCM)</th></tr></thead>
            <tbody>
              {latest.map((e) => (
                <tr key={e.id}>
                  <td className="small" style={{ whiteSpace: "nowrap" }}>{timeLabel(e.at)}</td>
                  <td className="small">{snap.rooms.find((r) => r.roomId === e.roomId)?.name ?? e.roomId}</td>
                  <td className="small">{nameOf(e.sender)}</td>
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
