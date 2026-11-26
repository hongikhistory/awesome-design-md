// 학생 활동 만들기: a teacher writes (or pastes from an AI draft) a short text, and it becomes a
// student-facing web page that runs from one HTML file: no login, no server, no student data stored.
//
// Three kinds, in the order a lesson uses them:
//   quiz     — 확인 문제 (형성평가): choice / OX / short answer, instant feedback and explanation
//   evidence — 근거 판단: read sources, decide which claim each supports, choose, give reasons,
//              then answer a counter-argument built from the student's own sorting
//              (the structure of the 1차 작품 “이 사건의 이름은?”, generalised to any subject)
//   exit     — 출구 카드: one-line answers and a self-check against the lesson objectives

export type QuizItem =
  | { type: "choice"; q: string; options: string[]; answer: number; explain?: string }
  | { type: "ox"; q: string; answer: boolean; explain?: string }
  | { type: "short"; q: string; answers: string[]; explain?: string };

export interface Source {
  title: string;
  from: string;
  text: string;
}

export type Activity =
  | { kind: "quiz"; title: string; items: QuizItem[] }
  | { kind: "evidence"; title: string; question: string; claims: string[]; sources: Source[] }
  | { kind: "exit"; title: string; prompts: string[]; checks: string[] };

export type ActivityKind = Activity["kind"];

export const KIND_LABEL: Record<ActivityKind, string> = { quiz: "확인 문제", evidence: "근거 판단", exit: "출구 카드" };

// ------------------------------------------------------------------ text formats

const CIRCLED = "①②③④⑤⑥⑦⑧⑨";
const optIndex = (s: string) => {
  const t = s.trim();
  const c = CIRCLED.indexOf(t[0]);
  if (c >= 0) return c;
  const n = /^(\d)/.exec(t);
  return n ? Number(n[1]) - 1 : -1;
};

/**
 * Quiz text, the same format an AI draft is asked to return:
 *   1. 질문
 *   ① 보기 ② 보기 ③ 보기 ④ 보기      (one line, or one option per line)
 *   정답: ②                          (or O / X, or a word; several words with /)
 *   해설: …
 */
export function parseQuiz(text: string): { items: QuizItem[]; errors: string[] } {
  const items: QuizItem[] = [], errors: string[] = [];
  const blocks = text.replace(/\r\n/g, "\n").split(/\n(?=\s*(?:\d{1,2}[.)]|문제\s*\d+[.:)]?)\s)/);
  for (const raw of blocks) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const head = /^(?:\d{1,2}[.)]|문제\s*\d+[.:)]?)\s*(.+)$/.exec(lines[0]);
    if (!head) continue;
    const q = head[1].trim();
    const options: string[] = [];
    let answer = "", explain = "";
    for (const l of lines.slice(1)) {
      if (/^(정답|답)\s*[:：]/.test(l)) answer = l.replace(/^(정답|답)\s*[:：]\s*/, "").trim();
      else if (/^(해설|풀이)\s*[:：]/.test(l)) explain = l.replace(/^(해설|풀이)\s*[:：]\s*/, "").trim();
      else if (new RegExp(`^[${CIRCLED}]`).test(l)) options.push(...l.split(new RegExp(`(?=[${CIRCLED}])`)).map((o) => o.slice(1).trim()).filter(Boolean));
      else if (/^\(?[1-9][)）]\s/.test(l)) options.push(l.replace(/^\(?[1-9][)）]\s*/, "").trim());
    }
    const where = `${items.length + errors.length + 1}번`;
    if (!answer) { errors.push(`${where}: ‘정답:’ 줄이 없습니다.`); continue; }
    if (options.length >= 2) {
      const i = optIndex(answer);
      if (i < 0 || i >= options.length) { errors.push(`${where}: 정답 번호가 보기 범위를 벗어났습니다.`); continue; }
      items.push({ type: "choice", q, options, answer: i, explain: explain || undefined });
    } else if (/^[OoXx○×]$/.test(answer)) {
      items.push({ type: "ox", q, answer: /^[Oo○]$/.test(answer), explain: explain || undefined });
    } else {
      items.push({ type: "short", q, answers: answer.split(/\s*[/,]\s*/).filter(Boolean), explain: explain || undefined });
    }
  }
  if (!items.length && !errors.length) errors.push("문제를 찾지 못했습니다. ‘1. 질문’ 다음 줄에 보기와 ‘정답:’을 적어 주세요.");
  return { items, errors };
}

/**
 * Evidence text:
 *   질문: 이 일을 무엇이라고 부를까?
 *   선택지: A, B, C
 *   ## 자료 1. 제목 (출처)
 *   본문 …
 */
export function parseEvidence(text: string): { question: string; claims: string[]; sources: Source[]; errors: string[] } {
  const errors: string[] = [];
  let question = "", claims: string[] = [];
  const sources: Source[] = [];
  let cur: Source | null = null;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const l = raw.trim();
    if (/^질문\s*[:：]/.test(l)) question = l.replace(/^질문\s*[:：]\s*/, "");
    else if (/^(선택지|결론|입장)\s*[:：]/.test(l)) claims = l.replace(/^(선택지|결론|입장)\s*[:：]\s*/, "").split(/\s*[,/·]\s*/).filter(Boolean);
    else if (/^#{1,3}\s*/.test(l)) {
      const h = l.replace(/^#{1,3}\s*/, "").replace(/^자료\s*\d+[.:)]?\s*/, "");
      const m = /^(.*?)\s*[(（]([^()（）]+)[)）]\s*$/.exec(h);
      cur = { title: (m ? m[1] : h).trim() || `자료 ${sources.length + 1}`, from: m ? m[2].trim() : "", text: "" };
      sources.push(cur);
    } else if (cur && l) cur.text += (cur.text ? "\n" : "") + l;
  }
  if (!question) errors.push("‘질문:’ 줄이 없습니다.");
  if (claims.length < 2) errors.push("‘선택지:’에 쉼표로 둘 이상 적어 주세요.");
  if (sources.length < 2) errors.push("‘## 자료’로 시작하는 자료가 둘 이상 필요합니다.");
  for (const s of sources) if (!s.text) errors.push(`‘${s.title}’의 본문이 비어 있습니다.`);
  return { question, claims, sources, errors };
}

export function parseExit(text: string): { prompts: string[]; checks: string[] } {
  const prompts: string[] = [], checks: string[] = [];
  for (const raw of text.split("\n")) {
    const l = raw.trim();
    if (/^(점검|자기\s?평가|목표)\s*[:：]/.test(l)) checks.push(l.replace(/^(점검|자기\s?평가|목표)\s*[:：]\s*/, ""));
    else if (/^[-*•]\s+|^\d+[.)]\s+/.test(l)) prompts.push(l.replace(/^[-*•]\s+|^\d+[.)]\s+/, ""));
  }
  return { prompts, checks };
}

// ------------------------------------------------------------------ AI draft prompt (no student data)

export function quizPrompt(o: { subject: string; grade: string; objectives: string[]; content: string; count: number }) {
  return `# 형성평가 문항 초안 요청

- 대상: ${o.grade} ${o.subject}
- 학습 목표: ${o.objectives.join(" / ") || "(미입력)"}
- 문항 수: ${o.count}개 (객관식 위주, OX·단답 1~2개 섞기)

## 수업 내용
${o.content.trim() || "(지도안 내용을 붙여 넣으세요)"}

## 출력 형식 (이 형식을 그대로 지켜 주세요)
1. 질문
① 보기 ② 보기 ③ 보기 ④ 보기
정답: ②
해설: 왜 그런지 한두 문장

2. 질문 (OX)
정답: O
해설: …

3. 질문 (단답)
정답: 낱말 / 다른 표현
해설: …

## 지킬 점
- 위 수업 내용과 학습 목표 안에서만 묻습니다.
- 오답 보기는 학생이 흔히 하는 오개념을 반영합니다.
- 사실 관계가 불확실하면 문항으로 만들지 않습니다.
`;
}

// ------------------------------------------------------------------ worksheet markdown (→ HWPX/DOCX)

export function activityMarkdown(a: Activity): string {
  const out = [`# ${a.title}`, "", "| 학년 | 반 | 번호 | 이름 |", "| --- | --- | --- | --- |", "|  |  |  |  |", ""];
  if (a.kind === "quiz") {
    a.items.forEach((it, i) => {
      out.push(`**${i + 1}. ${it.q}**`, "");
      if (it.type === "choice") out.push(it.options.map((o, j) => `${CIRCLED[j]} ${o}`).join("   "), "");
      else if (it.type === "ox") out.push("( O  /  X )", "");
      else out.push("답: ____________________", "");
    });
  } else if (a.kind === "evidence") {
    out.push(`**질문:** ${a.question}`, "", `**선택지:** ${a.claims.join(", ")}`, "");
    a.sources.forEach((s, i) => {
      out.push(`## 자료 ${i + 1}. ${s.title}${s.from ? ` (${s.from})` : ""}`, "", s.text, "");
      out.push(`이 자료가 뒷받침하는 선택지: ${a.claims.map((c) => `□ ${c}`).join("  ")}  □ 판단 보류`, "", "근거: ______________________________", "");
    });
    out.push("## 나의 결론", "", `내가 고른 선택지: ____________`, "", "이유(자료 번호를 들어): ______________________________", "", "예상 반론과 나의 답: ______________________________");
  } else {
    a.prompts.forEach((p, i) => out.push(`**${i + 1}. ${p}**`, "", "______________________________", ""));
    if (a.checks.length) {
      out.push("## 스스로 점검", "", "| 학습 목표 | 잘 이해함 | 조금 | 어려움 |", "| --- | --- | --- | --- |", ...a.checks.map((c) => `| ${c} | □ | □ | □ |`));
    }
  }
  return out.join("\n");
}

// ------------------------------------------------------------------ student page (one HTML file)

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
/** JSON that is safe inside <script>: no "</script>" or HTML comment openers can close the tag. */
const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");

const PAGE_CSS = `*{box-sizing:border-box}body{margin:0;font:17px/1.65 "Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",system-ui,sans-serif;color:#1b2333;background:#f4f7fc;word-break:keep-all}
main{max-width:760px;margin:0 auto;padding:24px 16px 80px}header{padding:20px 0 8px}h1{font-size:26px;line-height:1.3;margin:6px 0 0}.kick{display:inline-block;font-size:13px;font-weight:700;color:#0b50d0;background:#e3edfe;border-radius:99px;padding:3px 12px}
.card{background:#fff;border:1px solid #d7e0ef;border-radius:16px;padding:20px;margin:14px 0;box-shadow:0 2px 8px rgba(16,32,63,.05)}.card h2{font-size:19px;margin:0 0 10px}.muted{color:#55606f;font-size:15px}
.opts{display:grid;gap:8px;margin-top:10px}.opt{display:flex;gap:10px;align-items:center;width:100%;text-align:left;font:inherit;padding:12px 14px;border:1.5px solid #c9d4e6;border-radius:12px;background:#fff;cursor:pointer;min-height:48px}
.opt:hover{border-color:#256ef4}.opt[aria-pressed=true]{border-color:#256ef4;background:#ecf2fe;font-weight:700}.opt.ok{border-color:#267337;background:#eaf6ec}.opt.no{border-color:#bd2c0f;background:#fdefec}
input[type=text],textarea{width:100%;font:inherit;padding:10px 12px;border:1.5px solid #c9d4e6;border-radius:10px;background:#fff}textarea{min-height:84px;resize:vertical}
.btn{font:inherit;font-weight:700;border:0;border-radius:12px;padding:12px 18px;background:#256ef4;color:#fff;cursor:pointer;min-height:48px}.btn.sub{background:#e3edfe;color:#0b50d0}.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.fb{margin-top:10px;padding:10px 12px;border-radius:10px;font-size:15px}.fb.ok{background:#eaf6ec;color:#1d5a2b}.fb.no{background:#fdefec;color:#8a240f}
.src{white-space:pre-wrap;background:#f8f5ee;border-left:4px solid #c9a86a;padding:12px 14px;border-radius:0 10px 10px 0}.from{font-size:14px;color:#6b5a32;margin-top:6px}
.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.claim{border:2px dashed #c9d4e6;border-radius:14px;padding:12px;min-height:90px}.claim b{display:block;margin-bottom:6px}.chip{display:inline-block;font-size:13px;font-weight:700;background:#fff3db;color:#6b4700;border-radius:8px;padding:2px 8px;margin:2px}
.score{font-size:40px;font-weight:800;color:#0b50d0}.progress{height:8px;background:#e3e9f3;border-radius:4px;overflow:hidden;margin:8px 0 0}.progress>span{display:block;height:100%;background:#256ef4;transition:width .3s}
footer{margin-top:28px;font-size:14px;color:#55606f;text-align:center}:focus-visible{outline:3px solid #ffb703;outline-offset:2px}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}`;

const PAGE_JS = `(()=>{const A=JSON.parse(document.getElementById("data").textContent);const $=(t,p={},...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(p)){if(k==="class")e.className=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?"":v)}for(const x of c.flat())e.append(x?.nodeType?x:document.createTextNode(x??""));return e};
const root=document.getElementById("app");const copy=async(t,b)=>{try{await navigator.clipboard.writeText(t);b.textContent="복사했습니다"}catch{const ta=$("textarea",{},t);document.body.append(ta);ta.select();document.execCommand("copy");ta.remove();b.textContent="복사했습니다"}};
const norm=s=>s.replace(/\\s+/g,"").toLowerCase();
if(A.kind==="quiz"){const res=A.items.map(()=>null);const bar=$("span",{style:"width:0%"});root.append($("div",{class:"progress","aria-hidden":"true"},bar));
const done=()=>{const n=res.filter(x=>x!==null).length;bar.style.width=(n/A.items.length*100)+"%";if(n===A.items.length){const ok=res.filter(Boolean).length;const sum=$("div",{class:"card",role:"status"},$("h2",{},"결과"),$("p",{class:"score"},ok+" / "+A.items.length),$("p",{class:"muted"},ok===A.items.length?"모두 맞혔어요. 해설을 다시 읽고 친구에게 설명해 보세요.":"틀린 문제의 해설을 읽고, 왜 헷갈렸는지 한 줄로 적어 보세요."));const b=$("button",{class:"btn sub",onclick:()=>copy(A.title+" 결과: "+ok+"/"+A.items.length+"\\n"+res.map((r,i)=>(i+1)+"번 "+(r?"O":"X")).join(", "),b)},"결과 복사");sum.append(b);root.append(sum);sum.scrollIntoView({behavior:"smooth"})}};
A.items.forEach((it,i)=>{const card=$("section",{class:"card","aria-labelledby":"q"+i});const fb=$("div",{"aria-live":"polite"});card.append($("h2",{id:"q"+i},(i+1)+". "+it.q));
const mark=(ok,txt)=>{res[i]=ok;fb.replaceChildren($("div",{class:"fb "+(ok?"ok":"no")},(ok?"정답입니다. ":"다시 생각해 볼까요? ")+(txt||"")));done()};
if(it.type==="choice"||it.type==="ox"){const opts=it.type==="ox"?["O","X"]:it.options;const box=$("div",{class:"opts",role:"group","aria-label":(i+1)+"번 보기"});opts.forEach((o,j)=>{const b=$("button",{class:"opt","aria-pressed":"false",onclick:()=>{if(res[i]!==null)return;const right=it.type==="ox"?(j===0)===it.answer:j===it.answer;b.setAttribute("aria-pressed","true");b.classList.add(right?"ok":"no");if(!right){const k=it.type==="ox"?(it.answer?0:1):it.answer;box.children[k].classList.add("ok")}mark(right,it.explain)}},(it.type==="choice"?"①②③④⑤⑥⑦⑧⑨"[j]+" ":"")+o);box.append(b)});card.append(box)}
else{const inp=$("input",{type:"text","aria-label":(i+1)+"번 답"});const go=$("button",{class:"btn",onclick:()=>{if(res[i]!==null||!inp.value.trim())return;const ok=it.answers.some(a=>norm(a)===norm(inp.value));mark(ok,(ok?"":"정답: "+it.answers[0]+". ")+(it.explain||""))}},"확인");card.append($("div",{class:"row"},inp,go))}
card.append(fb);root.append(card)})}
if(A.kind==="evidence"){const pick=A.sources.map(()=>null),why=A.sources.map(()=>"");const board=$("div",{class:"board"});const drawBoard=()=>{board.replaceChildren(...A.claims.map((c,ci)=>$("div",{class:"claim"},$("b",{},c),...pick.map((p,si)=>p===ci?$("span",{class:"chip"},"자료 "+(si+1)):null).filter(Boolean))))};drawBoard();
root.append($("section",{class:"card"},$("h2",{},"질문"),$("p",{},A.question),$("p",{class:"muted"},"자료를 하나씩 읽고, 그 자료가 어느 쪽을 뒷받침하는지 고르세요. 판단판에 근거가 쌓입니다."),board));
A.sources.forEach((s,si)=>{const card=$("section",{class:"card","aria-labelledby":"s"+si});const opts=$("div",{class:"opts",role:"group","aria-label":"자료 "+(si+1)+"이 뒷받침하는 쪽"});[...A.claims,"판단 보류"].forEach((c,ci)=>{const b=$("button",{class:"opt","aria-pressed":"false",onclick:()=>{pick[si]=ci<A.claims.length?ci:-1;[...opts.children].forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed","true");drawBoard()}},c);opts.append(b)});
const t=$("input",{type:"text",placeholder:"근거 한 줄: 자료의 어느 부분 때문인가요?","aria-label":"자료 "+(si+1)+" 근거",oninput:e=>{why[si]=e.target.value}});
card.append($("h2",{id:"s"+si},"자료 "+(si+1)+". "+s.title),$("div",{class:"src"},s.text),s.from?$("p",{class:"from"},"출처: "+s.from):null,$("p",{class:"muted",style:"margin-top:10px"},"누가, 어떤 입장에서 남긴 기록일까요? 그 점을 생각하며 고르세요."),opts,$("div",{style:"margin-top:8px"},t));root.append(card)});
const final=$("div",{class:"opts",role:"group","aria-label":"나의 결론"});let choice=null;A.claims.forEach((c,ci)=>{const b=$("button",{class:"opt","aria-pressed":"false",onclick:()=>{choice=ci;[...final.children].forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed","true");counter()}},c);final.append(b)});
const reason=$("textarea",{"aria-label":"결론의 이유","placeholder":"자료 번호를 들어 이유를 적어 보세요."});const counterBox=$("div",{"aria-live":"polite"});const reply=$("textarea",{"aria-label":"반론에 대한 나의 답","placeholder":"반론에 어떻게 답할지 적어 보세요."});
const counter=()=>{const other=pick.map((p,si)=>p!==null&&p>=0&&p!==choice?si:-1).filter(x=>x>=0);counterBox.replaceChildren($("div",{class:"fb no"},other.length?"반론: 다른 선택지를 고른 친구는 "+other.map(x=>"자료 "+(x+1)).join(", ")+"을(를) 근거로 들 수 있어요. 이 자료를 어떻게 설명할까요?":"반론: 네가 고른 자료는 모두 같은 쪽을 가리켜요. 일부러 반대편 입장에서 자료를 다시 읽어 보면 무엇이 보일까요?"))};
const out=$("button",{class:"btn",onclick:()=>{const txt=A.title+"\\n질문: "+A.question+"\\n"+A.sources.map((s,si)=>"자료 "+(si+1)+" → "+(pick[si]===null?"미선택":pick[si]<0?"판단 보류":A.claims[pick[si]])+(why[si]?" (근거: "+why[si]+")":"")).join("\\n")+"\\n나의 결론: "+(choice===null?"미선택":A.claims[choice])+"\\n이유: "+reason.value+"\\n반론에 대한 답: "+reply.value;copy(txt,out)}},"내 답 복사");
root.append($("section",{class:"card"},$("h2",{},"나의 결론"),final,$("div",{style:"margin-top:10px"},reason),$("div",{style:"margin-top:10px"},counterBox),$("div",{style:"margin-top:10px"},reply),$("div",{class:"row",style:"margin-top:12px"},out)))}
if(A.kind==="exit"){const ans=A.prompts.map(()=>""),chk=A.checks.map(()=>null);A.prompts.forEach((p,i)=>root.append($("section",{class:"card"},$("h2",{},(i+1)+". "+p),$("textarea",{"aria-label":p,oninput:e=>{ans[i]=e.target.value}}))));
if(A.checks.length){const c=$("section",{class:"card"},$("h2",{},"스스로 점검"));A.checks.forEach((g,gi)=>{const box=$("div",{class:"opts",role:"group","aria-label":g});["잘 이해함","조금","어려움"].forEach((l,li)=>{const b=$("button",{class:"opt","aria-pressed":"false",onclick:()=>{chk[gi]=l;[...box.children].forEach(x=>x.setAttribute("aria-pressed","false"));b.setAttribute("aria-pressed","true")}},l);box.append(b)});c.append($("p",{style:"margin:12px 0 0;font-weight:700"},g),box)});root.append(c)}
const b=$("button",{class:"btn",onclick:()=>copy(A.title+"\\n"+A.prompts.map((p,i)=>(i+1)+". "+p+"\\n→ "+ans[i]).join("\\n")+"\\n"+A.checks.map((g,i)=>"- "+g+": "+(chk[i]||"미선택")).join("\\n"),b)},"내 답 복사");root.append($("div",{class:"row"},b))}})();`;

/** A complete student page. All content goes in as JSON data and is inserted as text nodes, never as HTML. */
export function activityHtml(a: Activity, meta: { school?: string; subject?: string } = {}): string {
  const kicker = [meta.school, meta.subject, KIND_LABEL[a.kind]].filter(Boolean).join(" · ");
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(a.title)}</title>
<style>${PAGE_CSS}</style></head><body><main>
<header><span class="kick">${esc(kicker)}</span><h1>${esc(a.title)}</h1></header>
<div id="app"></div>
<footer>이 활동은 답을 어디에도 저장하거나 보내지 않습니다. ‘복사’ 버튼으로 선생님이 안내한 곳에 붙여 넣으세요.</footer>
</main><script id="data" type="application/json">${safeJson(a)}</script><script>${PAGE_JS}</script></body></html>`;
}

// ------------------------------------------------------------------ samples (fictional, no real people or sources)

export const SAMPLE_QUIZ = `1. ‘내 마음은 호수요’에 쓰인 표현 방법은?
① 직유 ② 은유 ③ 의인 ④ 과장
정답: ②
해설: ‘~처럼’, ‘~같이’ 없이 ‘A는 B이다’ 꼴로 빗대었으므로 은유입니다.

2. ‘별처럼 빛나는 눈’은 직유이다.
정답: O
해설: ‘처럼’으로 두 대상을 직접 견주었습니다.

3. 사람이 아닌 것을 사람처럼 표현하는 방법은?
정답: 의인법 / 의인
해설: ‘바람이 속삭인다’처럼 사람의 행동을 빌려 씁니다.`;

export const SAMPLE_EVIDENCE = `질문: 우리 학교 쉬는 시간을 10분에서 15분으로 늘려야 할까?
선택지: 늘린다, 지금대로, 조건부로 늘린다
## 자료 1. 학생회 설문 요약 (가상 자료, 학생회)
쉬는 시간에 화장실과 이동 수업 교실까지 가기 빠듯하다는 답이 많았다. 특히 3층 과학실로 옮겨 가는 반의 불만이 컸다.
## 자료 2. 교무부 안내 (가상 자료, 교무부)
쉬는 시간을 5분 늘리면 하루 일과가 약 30분 늦게 끝난다. 방과후 수업과 통학 버스 시간을 다시 맞춰야 한다.
## 자료 3. 보건실 기록 (가상 자료, 보건 선생님)
점심 직후와 4교시 뒤 쉬는 시간에 보건실 방문이 몰린다. 짧은 휴식으로는 쉬지 못한다는 학생이 있었다.
## 자료 4. 학부모 의견 (가상 자료, 학부모회)
하교가 늦어지면 학원과 돌봄 일정에 차질이 생긴다는 의견과, 아이들이 너무 지쳐 보인다는 의견이 함께 나왔다.`;

export const SAMPLE_EXIT = `- 오늘 배운 비유 표현 하나를 골라 예문을 만들어 보세요.
- 아직 헷갈리는 점을 한 줄로 적어 보세요.
점검: 비유의 뜻을 설명할 수 있다
점검: 비유의 효과를 말할 수 있다`;
