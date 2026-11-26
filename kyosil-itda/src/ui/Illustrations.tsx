import type { ReactElement } from "react";

// Original flat illustrations (no third-party artwork). Colours are fixed pastels on purpose:
// they sit on their own rounded backdrop, so they read the same in light and high-contrast themes.

/** Board and desk props that change with the subject studio. */
function BoardArt({ studio }: { studio: string }) {
  switch (studio) {
    case "history": // 두루마리 사료와 연표
      return <>
        <rect x="44" y="48" width="96" height="62" rx="4" fill="#F3E6C8" /><rect x="38" y="44" width="10" height="70" rx="5" fill="#B08F55" /><rect x="136" y="44" width="10" height="70" rx="5" fill="#B08F55" />
        <path className="chalk" d="M56 62h70M56 76h58M56 90h66" stroke="#8A6A3A" strokeWidth="4" strokeLinecap="round" />
        <path d="M152 56v54" stroke="#F3F0E6" strokeWidth="3" /><circle className="chalk-star" cx="152" cy="68" r="5" fill="#FFD25C" /><circle cx="152" cy="96" r="5" fill="#F3F0E6" />
      </>;
    case "math":
      return <>
        <path d="M44 104h132M60 116V44" stroke="#F3F0E6" strokeWidth="3" strokeLinecap="round" />
        <path className="chalk" d="M64 50c20 70 52 70 72 0" fill="none" stroke="#FFD25C" strokeWidth="4" strokeLinecap="round" />
        <circle className="chalk-star" cx="100" cy="100" r="5" fill="#F3F0E6" />
      </>;
    case "science":
      return <>
        <circle cx="96" cy="80" r="8" fill="#FFD25C" className="chalk-star" />
        <g fill="none" stroke="#F3F0E6" strokeWidth="3"><ellipse className="chalk" cx="96" cy="80" rx="44" ry="16" /><ellipse cx="96" cy="80" rx="44" ry="16" transform="rotate(60 96 80)" /><ellipse cx="96" cy="80" rx="44" ry="16" transform="rotate(-60 96 80)" /></g>
      </>;
    case "korean":
      return <>
        <g stroke="#F3F0E6" strokeWidth="1.5" opacity=".7">{[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={46 + i * 22} y="52" width="20" height="20" fill="none" />)}{[0, 1, 2, 3, 4, 5].map((i) => <rect key={`b${i}`} x={46 + i * 22} y="80" width="20" height="20" fill="none" />)}</g>
        <path className="chalk" d="M52 62h8M74 58v10M96 62h8M54 90h8M76 86v10" stroke="#FFD25C" strokeWidth="4" strokeLinecap="round" />
      </>;
    case "social":
      return <>
        <path className="chalk" d="M52 98c10-30 30-44 48-40s30 22 52 6" fill="none" stroke="#F3F0E6" strokeWidth="4" strokeLinecap="round" />
        <path d="M112 50c-8 0-13 6-13 12 0 9 13 22 13 22s13-13 13-22c0-6-5-12-13-12z" fill="#FFD25C" className="chalk-star" /><circle cx="112" cy="62" r="4" fill="#2F5D50" />
      </>;
    case "english":
      return <>
        <text x="56" y="92" fontSize="36" fontWeight="800" fill="#F3F0E6" fontFamily="Georgia, serif">Aa</text>
        <path className="chalk" d="M118 70c10-8 22-8 32 0M118 86c10 8 22 8 32 0" fill="none" stroke="#FFD25C" strokeWidth="4" strokeLinecap="round" />
      </>;
    case "arts":
      return <>
        <path d="M70 100V58l52-10v44" fill="none" stroke="#F3F0E6" strokeWidth="4" /><circle cx="62" cy="100" r="9" fill="#FFD25C" className="chalk-star" /><circle cx="114" cy="92" r="9" fill="#F3F0E6" />
        <path className="chalk" d="M140 60l14 14" stroke="#FF8A65" strokeWidth="5" strokeLinecap="round" />
      </>;
    default:
      return <>
        <path className="chalk" d="M44 62h70M44 80h104M44 98h56" stroke="#F3F0E6" strokeWidth="5" strokeLinecap="round" />
        <path className="chalk-star" d="M160 58l4 9 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#FFD25C" />
      </>;
  }
}

export function HeroClassroom({ studio = "default" }: { studio?: string }) {
  return (
    <svg className="hero-art" viewBox="0 0 320 200" aria-hidden="true">
      <rect x="0" y="0" width="320" height="200" rx="20" fill="#EAF1FE" className="hero-bg" />
      <circle className="float-slow" cx="276" cy="40" r="18" fill="#FFD25C" />
      <rect x="214" y="72" width="78" height="62" rx="8" fill="#fff" />
      <path d="M253 72v62M214 103h78" stroke="#C9D8F5" strokeWidth="3" />
      <path d="M222 126c10-14 18-18 26-8 6-8 14-10 22 0 6-6 12-4 16 8z" fill="#BFE3D0" />
      <rect x="26" y="34" width="168" height="96" rx="10" fill="#2F5D50" />
      <rect x="26" y="34" width="168" height="96" rx="10" fill="none" stroke="#C9A86A" strokeWidth="5" />
      <BoardArt studio={studio} />
      <rect x="18" y="150" width="284" height="10" rx="5" fill="#C9A86A" />
      <rect x="40" y="160" width="8" height="34" rx="3" fill="#B08F55" />
      <rect x="272" y="160" width="8" height="34" rx="3" fill="#B08F55" />
      {studio === "history" ? (
        <g className="float-slow"><path d="M70 150c-8-4-10-14-6-22 2-4 2-8 0-12h20c-2 4-2 8 0 12 4 8 2 18-6 22z" fill="#C2884A" /><path d="M68 126h20" stroke="#8A5A2B" strokeWidth="2" /></g>
      ) : studio === "science" ? (
        <g><path d="M70 110v14l-12 22c-2 4 0 6 4 6h32c4 0 6-2 4-6l-12-22v-14z" fill="#E7F0FF" stroke="#4B8EF7" strokeWidth="2" /><path d="M62 140h32l4 8c1 2 0 4-3 4H61c-3 0-4-2-3-4z" fill="#36B9A0" /></g>
      ) : (
        <>
          <rect x="52" y="128" width="54" height="10" rx="3" fill="#FF8A65" />
          <rect x="56" y="118" width="48" height="10" rx="3" fill="#4B8EF7" />
          <rect x="60" y="108" width="40" height="10" rx="3" fill="#36B9A0" />
        </>
      )}
      <rect x="140" y="112" width="70" height="38" rx="5" fill="#334155" />
      <rect x="145" y="117" width="60" height="28" rx="3" fill="#E7F0FF" />
      <path d="M152 125h30M152 132h42M152 139h22" stroke="#4B8EF7" strokeWidth="3" strokeLinecap="round" />
      <rect x="132" y="150" width="86" height="4" rx="2" fill="#475569" />
      <rect x="236" y="132" width="26" height="18" rx="4" fill="#FF8A65" />
      <path className="sway" d="M249 132c-2-14-12-18-18-16 4 6 10 10 18 16zm0 0c2-16 12-22 20-20-4 8-10 14-20 20zm0 0c0-12 2-20 0-26-4 8-4 16 0 26z" fill="#36B9A0" />
    </svg>
  );
}

const ART: Record<"docs" | "notes" | "people", ReactElement> = {
  docs: (
    <>
      <rect x="14" y="10" width="38" height="50" rx="5" fill="#fff" stroke="#9DB8F0" strokeWidth="2" />
      <path d="M22 24h22M22 32h22M22 40h14" stroke="#9DB8F0" strokeWidth="3" strokeLinecap="round" />
      <path className="nudge" d="M58 35h14m-5-5 5 5-5 5" stroke="#4B8EF7" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="78" y="10" width="38" height="50" rx="5" fill="#EAF1FE" stroke="#4B8EF7" strokeWidth="2" />
      <text x="97" y="41" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0B50D0" fontFamily="sans-serif">MD</text>
    </>
  ),
  notes: (
    <>
      <rect x="34" y="8" width="62" height="54" rx="6" fill="#fff" stroke="#9DB8F0" strokeWidth="2" />
      <path d="M44 22h42M44 32h42M44 42h28" stroke="#C9D8F5" strokeWidth="3" strokeLinecap="round" />
      <path className="nudge" d="M86 46l14-14 6 6-14 14-8 2z" fill="#FFD25C" stroke="#C99A1E" strokeWidth="1.5" />
    </>
  ),
  people: (
    <>
      <circle cx="46" cy="26" r="10" fill="#F6D3B3" /><path d="M30 58c2-12 9-17 16-17s14 5 16 17z" fill="#4B8EF7" />
      <circle cx="84" cy="26" r="10" fill="#EBC09A" /><path d="M68 58c2-12 9-17 16-17s14 5 16 17z" fill="#36B9A0" />
      <path className="nudge" d="M58 14c4-6 10-6 14 0" stroke="#FF8A65" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
};

/** Small illustration for empty states. */
export function EmptyArt({ kind }: { kind: keyof typeof ART }) {
  return (
    <svg className="empty-art" width="130" height="70" viewBox="0 0 130 70" aria-hidden="true">
      {ART[kind]}
    </svg>
  );
}
