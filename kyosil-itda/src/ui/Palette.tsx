import { CornerDownLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";

export interface PaletteItem { id: string; label: string; group: string; keywords: string; Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }

/** Ctrl+K quick find: type a few letters of what you want to do (“룰렛”, “세특”, “hwp”) and press Enter. */
export function Palette({ items, onPick, onClose }: { items: PaletteItem[]; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { input.current?.focus(); }, []);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!t) return items;
    return items.filter((i) => `${i.label}${i.group}${i.keywords}`.toLowerCase().replace(/\s+/g, "").includes(t));
  }, [q, items]);
  useEffect(() => setAt(0), [q]);
  const key = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && list[at]) onPick(list[at].id);
    else if (e.key === "Escape") onClose();
  };
  return (
    <div className="sheet-backdrop palette-backdrop" onClick={onClose}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="빠른 찾기" onClick={(e) => e.stopPropagation()}>
        <div className="palette-input">
          <Search className="ico sm" aria-hidden />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={key} placeholder="무엇을 할까요? 예: 룰렛, 세특, 통신문, hwp" aria-label="빠른 찾기" role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={list[at] ? `pal-${list[at].id}` : undefined} />
          <kbd>Esc</kbd>
        </div>
        <ul id="palette-list" role="listbox" className="palette-list">
          {list.map((i, n) => (
            <li key={i.id} id={`pal-${i.id}`} role="option" aria-selected={n === at} onMouseEnter={() => setAt(n)} onClick={() => onPick(i.id)}>
              <i.Icon className="ico sm" aria-hidden />
              <span className="pal-label">{i.label}</span>
              <span className="meta">{i.group || "홈"}</span>
              {n === at && <CornerDownLeft className="ico sm pal-enter" aria-hidden />}
            </li>
          ))}
          {!list.length && <li className="meta" style={{ padding: 14 }}>맞는 화면이 없습니다.</li>}
        </ul>
      </div>
    </div>
  );
}
