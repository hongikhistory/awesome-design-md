import { ClipboardCopy, ListChecks, Presentation, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { Go } from "../App";
import { parseEvidence, parseExit, parseQuiz, quizPrompt } from "../core/activity";
import { parseLessonPlan } from "../core/lesson";
import { makePack, PACKS, withTeacher, type Pack } from "../core/packs";
import { useDisplayName, useStudioId } from "../core/profile";
import { STUDIOS } from "../core/studio";
import { useApp } from "../state";
import { Notice, useToast } from "../ui/common";
import { Mascot } from "../ui/Mascot";
import { useOpenPack } from "./openPack";

export function Packs({ go }: { go: Go }) {
  const { me } = useApp();
  const name = useDisplayName(me.id);
  const mine = useStudioId(me.id);
  const openPack = useOpenPack(go);
  const toast = useToast();
  const [sel, setSel] = useState<Pack>(() => PACKS.find((p) => p.studio === mine) ?? PACKS[0]);
  const [switchStudio, setSwitchStudio] = useState(true);
  const [subject, setSubject] = useState("역사");
  const [topic, setTopic] = useState("");
  const [custom, setCustom] = useState<Pack | null>(null);
  const cur = custom ?? sel;

  const info = useMemo(() => {
    const plan = parseLessonPlan(withTeacher(cur.plan, name));
    const q = parseQuiz(cur.quiz).items, e = parseEvidence(cur.evidence), x = parseExit(cur.exit);
    return { plan, q, e, x };
  }, [cur, name]);

  const copyPrompt = async () => {
    const p = quizPrompt({ subject: cur.subject, grade: "중학교", objectives: info.plan.objectives, content: `${cur.topic}\n${info.plan.steps.map((s) => `${s.phase}: ${s.activities.join(", ")}`).join("\n")}`, count: 5 });
    try { await navigator.clipboard.writeText(p); toast.show("문항 초안 요청문을 복사했습니다. 학교에서 허용한 AI에 붙여 넣고, 답은 학생 활동 만들기에 붙여 넣으세요."); } catch { toast.show("복사하지 못했습니다."); }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="crumb">수업 · 과목별 수업 만들기</div>
          <h1>과목별 수업 만들기</h1>
          <p className="lead">과목을 고르면 지도안, 수업 슬라이드, 확인 문제, 근거 판단 활동, 출구 카드가 한 번에 준비됩니다. 내 과목이 아니어도 눌러 보세요. 화면도 그 과목 스튜디오로 바뀝니다.</p>
        </div>
      </div>

      <section className="pack-grid" aria-label="과목 고르기">
        {PACKS.map((p) => {
          const st = STUDIOS[p.studio];
          return (
            <button key={p.studio} className="pack-tile" aria-pressed={!custom && sel.studio === p.studio} style={{ ["--c" as string]: st.colors.primary }} onClick={() => { setSel(p); setCustom(null); }}>
              <span className="pack-subj">{p.subject}</span>
              <b>{p.topic}</b>
              <span className="meta">{p.grade}</span>
            </button>
          );
        })}
      </section>

      <div className="grid two" style={{ alignItems: "start" }}>
        <section className="panel" aria-labelledby="pk-h">
          <div className="panel-head"><h2 id="pk-h">{info.plan.title}</h2><span className="badge info">{cur.subject}</span></div>
          <div className="panel-body stack">
            <div>
              <p className="meta">학습 목표</p>
              <ul className="pk-list">{info.plan.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
            </div>
            <ol className="pk-steps">
              {info.plan.steps.map((s, i) => <li key={i}><b>{s.phase}{s.minutes ? ` ${s.minutes}분` : ""}</b><span>{s.activities.join(", ")}</span></li>)}
            </ol>
            <div className="pk-include">
              <div><b>{info.q.length}</b><span>확인 문제</span></div>
              <div><b>{info.e.sources.length}</b><span>근거 자료</span></div>
              <div><b>{info.x.prompts.length}</b><span>출구 질문</span></div>
            </div>
            {info.e.question && <p className="pk-q"><Sparkles className="ico sm" aria-hidden /> 근거 판단 질문: {info.e.question}</p>}
            <label className="row" style={{ gap: 8 }}><input type="checkbox" checked={switchStudio} onChange={(e) => setSwitchStudio(e.target.checked)} /> 화면도 {STUDIOS[cur.studio].name}로 바꾸기</label>
            <div className="row">
              <button className="btn primary" onClick={() => openPack(cur, "slides", name, switchStudio && !custom)}><Presentation className="ico sm" aria-hidden /> 슬라이드로 열기</button>
              <button className="btn" onClick={() => openPack(cur, "activities", name, switchStudio && !custom)}><ListChecks className="ico sm" aria-hidden /> 학생 활동으로 열기</button>
            </div>
            {custom ? (
              <Notice kind="warn">‘{custom.topic}’은 준비된 꾸러미가 없어서 같은 모양의 뼈대만 만들었습니다. [ ] 칸을 채우거나, 요청문을 복사해 학교에서 허용한 AI로 문항 초안을 받으세요.</Notice>
            ) : (
              <Notice kind="plain">교과서 수준으로 정리한 예시입니다. 자료는 ‘교사 작성 예시’나 ‘교사 요약’이며 인용문이 아니니, 수업 전에 내용을 확인해 주세요.</Notice>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="panel pk-bot" aria-labelledby="pk-bot-h">
            <div className="panel-body row nowrap" style={{ gap: 14, alignItems: "center" }}>
              <Mascot mood="happy" size={72} />
              <div>
                <h2 id="pk-bot-h" style={{ fontSize: 18 }}>이음이에게 말로 시켜도 돼요</h2>
                <p className="meta">오른쪽 아래 이음이를 누르고 “과학 수업 만들어 줘”라고 적어 보세요.</p>
              </div>
            </div>
          </section>
          <section className="panel" aria-labelledby="own-h">
            <div className="panel-head"><h2 id="own-h">내 주제로 만들기</h2></div>
            <form className="panel-body stack" onSubmit={(e) => { e.preventDefault(); setCustom(makePack(subject, topic, name)); }}>
              <div className="grid two">
                <label className="field">교과<input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={20} /></label>
                <label className="field">주제<input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 임진왜란, 이차방정식" maxLength={40} /></label>
              </div>
              <div className="row">
                <button className="btn" type="submit" disabled={!topic.trim()}><Wand2 className="ico sm" aria-hidden /> 뼈대 만들기</button>
                <button className="btn" type="button" onClick={() => void copyPrompt()}><ClipboardCopy className="ico sm" aria-hidden /> AI 요청문 복사</button>
              </div>
              <p className="meta">널리잇다는 인터넷 AI를 직접 부르지 않습니다. 요청문에는 수업 내용만 들어가고 학생 정보는 들어가지 않습니다.</p>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
