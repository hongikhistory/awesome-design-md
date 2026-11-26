// Cover / swap request workflow as a pure reducer over an append-only event log.
// requested -> (cover teacher consents) -> awaiting coordinator -> applied
// Every transition is checked against the actor's role; rejected transitions are
// kept in an audit trail instead of silently disappearing.

import type { Factor } from "./cover";
import type { Role } from "./school";

export type RequestStatus =
  | "AWAITING_CONSENT"
  | "AWAITING_COORDINATOR"
  | "APPLIED"
  | "DECLINED"
  | "REJECTED"
  | "CANCELLED";

export const STATUS_LABEL: Record<RequestStatus, string> = {
  AWAITING_CONSENT: "상대 교사 동의 대기",
  AWAITING_COORDINATOR: "시간표 담당 결재 대기",
  APPLIED: "결재 완료 · 시간표 반영",
  DECLINED: "상대 교사 사양",
  REJECTED: "담당 반려",
  CANCELLED: "요청 취소",
};

export interface HandoffCard {
  goal: string;
  progress: string;
  activity: string;
  materials: string;
  notes: string;
}

export interface CoverRequestCreated {
  type: "cover.request";
  reqId: string;
  /** "cover": candidate teaches the absent lesson. "swap": the two lessons trade places. */
  kind?: "cover" | "swap";
  /** for swaps: the candidate's lesson the absent teacher takes over */
  swapWith?: { day: number; period: number; classId: string; subject: string };
  absentId: string;
  day: number;
  period: number;
  classId: string;
  subject: string;
  candidateId: string;
  score: number;
  factors: Factor[];
  card: HandoffCard;
}

export type WorkflowEvent =
  | CoverRequestCreated
  | { type: "cover.consent"; reqId: string; accept: boolean; comment?: string }
  | { type: "cover.decide"; reqId: string; approve: boolean; reason?: string; skipConsent?: boolean }
  | { type: "cover.cancel"; reqId: string };

export interface Actor {
  id: string;
  role: Role;
}

export interface Stamped<E> {
  event: E;
  actor: Actor;
  at: number;
  id: string;
}

export interface AuditEntry {
  at: number;
  actorId: string;
  text: string;
  ok: boolean;
}

export interface CoverRequest extends Omit<CoverRequestCreated, "type"> {
  requesterId: string;
  status: RequestStatus;
  createdAt: number;
  updatedAt: number;
  audit: AuditEntry[];
  consentSkipped?: string; // reason, when coordinator approved without consent
}

export function reduceRequests(log: Stamped<WorkflowEvent>[]): Map<string, CoverRequest> {
  const out = new Map<string, CoverRequest>();
  const sorted = [...log].sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  for (const { event: e, actor, at } of sorted) {
    if (e.type === "cover.request") {
      if (out.has(e.reqId) || actor.role === "student-teacher") continue;
      const { type: _t, ...rest } = e;
      out.set(e.reqId, {
        ...rest,
        requesterId: actor.id,
        status: "AWAITING_CONSENT",
        createdAt: at,
        updatedAt: at,
        audit: [{ at, actorId: actor.id, text: e.kind === "swap" ? "교체 요청" : "대강 요청 · 인수인계 카드 전달", ok: true }],
      });
      continue;
    }
    const r = out.get(e.reqId);
    if (!r) continue;
    const deny = (text: string) => r.audit.push({ at, actorId: actor.id, text: `거부된 시도: ${text}`, ok: false });
    const move = (status: RequestStatus, text: string) => {
      r.status = status;
      r.updatedAt = at;
      r.audit.push({ at, actorId: actor.id, text, ok: true });
    };
    switch (e.type) {
      case "cover.consent":
        if (actor.id !== r.candidateId) deny("대강 교사가 아닌 사람의 동의");
        else if (r.status !== "AWAITING_CONSENT") deny("동의 단계가 아님");
        else if (e.accept) move("AWAITING_COORDINATOR", `동의${e.comment ? ` · “${e.comment}”` : ""}`);
        else move("DECLINED", `사양${e.comment ? ` · “${e.comment}”` : ""}`);
        break;
      case "cover.decide":
        if (actor.role !== "coordinator") deny("시간표 담당이 아닌 사람의 승인");
        else if (r.status === "AWAITING_COORDINATOR") move(e.approve ? "APPLIED" : "REJECTED", e.approve ? "결재 · 시간표 반영" : `반려${e.reason ? ` · ${e.reason}` : ""}`);
        else if (r.status === "AWAITING_CONSENT" && e.approve && e.skipConsent) {
          if (!e.reason?.trim()) deny("동의 생략 사유 없음");
          else {
            r.consentSkipped = e.reason.trim();
            move("APPLIED", `동의 생략 승인 · 사유: ${r.consentSkipped}`);
          }
        } else deny("승인할 수 없는 단계");
        break;
      case "cover.cancel":
        if (actor.id !== r.requesterId) deny("요청자가 아닌 사람의 취소");
        else if (r.status === "APPLIED") deny("이미 반영된 요청");
        else move("CANCELLED", "요청 취소");
        break;
    }
  }
  return out;
}

export const isOpen = (s: RequestStatus) => s === "AWAITING_CONSENT" || s === "AWAITING_COORDINATOR";
