// Shared in-room widgets (checklist, poll) as a tiny state-based CRDT.
// Each field is a last-writer-wins register ordered by (at, actor). Ops are
// commutative and idempotent, so devices converge regardless of delivery order —
// the property a peer-to-peer (WebRTC / BroadcastChannel) transport needs.

export type WidgetKind = "checklist" | "poll";

export type WidgetOp =
  | { type: "widget.create"; widgetId: string; kind: WidgetKind; title: string; options?: string[] }
  | { type: "widget.item"; widgetId: string; itemId: string; text: string }
  | { type: "widget.check"; widgetId: string; itemId: string; done: boolean }
  | { type: "widget.remove"; widgetId: string; itemId: string }
  | { type: "widget.vote"; widgetId: string; option: number | null };

export interface Clock {
  at: number;
  actor: string;
}

const newer = (a: Clock, b: Clock | undefined) => !b || a.at > b.at || (a.at === b.at && a.actor > b.actor);

interface Reg<T> {
  value: T;
  clock: Clock;
}

export interface ChecklistItem {
  itemId: string;
  text: string;
  done: boolean;
  doneBy?: string;
  removed: boolean;
  addedBy: string;
  order: Clock;
}

export interface WidgetState {
  widgetId: string;
  kind: WidgetKind;
  title: string;
  createdBy: string;
  options: string[];
  items: ChecklistItem[];
  votes: Record<string, number>; // actor -> option index
}

interface Internal {
  meta?: { kind: WidgetKind; title: string; options: string[]; clock: Clock };
  text: Map<string, Reg<string> & { order: Clock; addedBy: string }>;
  done: Map<string, Reg<boolean>>;
  removed: Map<string, Reg<boolean>>;
  votes: Map<string, Reg<number | null>>;
}

export function reduceWidgets(ops: { op: WidgetOp; clock: Clock }[]): WidgetState[] {
  const all = new Map<string, Internal>();
  const get = (id: string) => {
    let w = all.get(id);
    if (!w) all.set(id, (w = { text: new Map(), done: new Map(), removed: new Map(), votes: new Map() }));
    return w;
  };
  for (const { op, clock } of ops) {
    const w = get(op.widgetId);
    switch (op.type) {
      case "widget.create":
        if (!w.meta || clock.at < w.meta.clock.at) w.meta = { kind: op.kind, title: op.title, options: op.options ?? [], clock };
        break;
      case "widget.item": {
        const prev = w.text.get(op.itemId);
        if (newer(clock, prev?.clock))
          w.text.set(op.itemId, { value: op.text, clock, order: prev?.order ?? clock, addedBy: prev?.addedBy ?? clock.actor });
        break;
      }
      case "widget.check":
        if (newer(clock, w.done.get(op.itemId)?.clock)) w.done.set(op.itemId, { value: op.done, clock });
        break;
      case "widget.remove":
        if (newer(clock, w.removed.get(op.itemId)?.clock)) w.removed.set(op.itemId, { value: true, clock });
        break;
      case "widget.vote":
        if (newer(clock, w.votes.get(clock.actor)?.clock)) w.votes.set(clock.actor, { value: op.option, clock });
        break;
    }
  }
  const out: WidgetState[] = [];
  for (const [widgetId, w] of all) {
    if (!w.meta) continue;
    const items = [...w.text.entries()]
      .map(([itemId, t]) => {
        const d = w.done.get(itemId);
        return {
          itemId,
          text: t.value,
          done: !!d?.value,
          doneBy: d?.value ? d.clock.actor : undefined,
          removed: !!w.removed.get(itemId)?.value,
          addedBy: t.addedBy,
          order: t.order,
        };
      })
      .sort((a, b) => a.order.at - b.order.at || a.order.actor.localeCompare(b.order.actor));
    const votes: Record<string, number> = {};
    for (const [actor, r] of w.votes) if (r.value !== null) votes[actor] = r.value;
    out.push({ widgetId, kind: w.meta.kind, title: w.meta.title, createdBy: w.meta.clock.actor, options: w.meta.options, items, votes });
  }
  return out;
}
