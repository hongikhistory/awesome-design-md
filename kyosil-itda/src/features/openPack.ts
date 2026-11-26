import type { Go } from "../App";
import { getMe, saveMe } from "../core/profile";
import { withTeacher, type Pack } from "../core/packs";
import { STUDIOS } from "../core/studio";
import { useApp } from "../state";

/** Opens a lesson pack in 수업 슬라이드 or 학생 활동 만들기, and (if asked) dresses the app in that subject's studio. */
export function useOpenPack(go: Go) {
  const { me, setHandoff } = useApp();
  return (p: Pack, to: "slides" | "activities", teacher: string, switchStudio = true) => {
    if (switchStudio && p.studio in STUDIOS) saveMe(me.id, { ...getMe(me.id), studio: p.studio });
    const plan = withTeacher(p.plan, teacher);
    setHandoff({
      to, name: p.topic, markdown: plan,
      pack: to === "activities" ? { subject: p.subject, quiz: p.quiz, evidence: p.evidence, exit: p.exit, titles: { quiz: `${p.topic} 확인 문제`, evidence: plan.split("\n")[0].replace(/^#\s*/, "").split(/[?？]/)[0] + "?", exit: `${p.topic} 출구 카드` } } : undefined,
    });
    go(to);
  };
}
