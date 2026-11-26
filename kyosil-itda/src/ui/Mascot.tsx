import type { Mood } from "../core/chatbot";

/**
 * 이음이: a round seed with a sprout — the app's helper character. The body takes the studio colour
 * (var(--primary)), so it changes with the subject. Pure SVG, animated in CSS (bob, blink, wave);
 * all motion stops under prefers-reduced-motion.
 */
export function Mascot({ mood = "hi", size = 56, title }: { mood?: Mood; size?: number; title?: string }) {
  const eyes =
    mood === "happy" ? (
      <g className="m-eyes" fill="none" stroke="#1E1B18" strokeWidth="3.4" strokeLinecap="round">
        <path d="M41 58q5-6 10 0" /><path d="M69 58q5-6 10 0" />
      </g>
    ) : (
      <g className="m-eyes">
        <ellipse cx={mood === "think" ? 48 : 46} cy={mood === "think" ? 55 : 58} rx="5" ry="6.4" fill="#1E1B18" />
        <ellipse cx={mood === "think" ? 76 : 74} cy={mood === "think" ? 55 : 58} rx="5" ry="6.4" fill="#1E1B18" />
        <circle cx={mood === "think" ? 49.6 : 47.6} cy={mood === "think" ? 52.6 : 55.6} r="1.8" fill="#fff" />
        <circle cx={mood === "think" ? 77.6 : 75.6} cy={mood === "think" ? 52.6 : 55.6} r="1.8" fill="#fff" />
      </g>
    );
  return (
    <svg className={`mascot m-${mood}`} width={size} height={size} viewBox="0 0 120 120" role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <ellipse cx="60" cy="112" rx="30" ry="5" fill="#1E1B18" opacity=".12" className="m-shadow" />
      <g className="m-body">
        {/* sprout */}
        <path d="M60 30 C 60 22, 61 16, 60 10" stroke="#3F8A4E" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path className="m-leaf-l" d="M60 20 C 50 20, 42 14, 41 5 C 51 5, 58 11, 60 20Z" fill="#5DAE6B" />
        <path className="m-leaf-r" d="M60 16 C 69 15, 77 9, 79 1 C 69 1, 62 7, 60 16Z" fill="#7CC489" />
        {/* arms */}
        <path className="m-arm-l" d="M24 74 q-10 4 -12 14" stroke="var(--primary, #A63A26)" strokeWidth="8" strokeLinecap="round" fill="none" />
        <path className="m-arm-r" d="M96 74 q10 -6 12 -18" stroke="var(--primary, #A63A26)" strokeWidth="8" strokeLinecap="round" fill="none" />
        {/* body */}
        <path d="M60 28 C 88 28, 100 50, 100 72 C 100 94, 84 106, 60 106 C 36 106, 20 94, 20 72 C 20 50, 32 28, 60 28Z" fill="var(--primary, #A63A26)" />
        <path d="M60 40 C 82 40, 90 56, 90 72 C 90 88, 78 98, 60 98 C 42 98, 30 88, 30 72 C 30 56, 38 40, 60 40Z" fill="#FFF8EF" />
        {eyes}
        <ellipse cx="38" cy="72" rx="6" ry="3.6" fill="#FF8F7A" opacity=".75" />
        <ellipse cx="82" cy="72" rx="6" ry="3.6" fill="#FF8F7A" opacity=".75" />
        {mood === "oops" ? (
          <path d="M54 78 q6 -4 12 0" stroke="#1E1B18" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M52 72 q8 9 16 0" stroke="#1E1B18" strokeWidth="3" fill={mood === "happy" ? "#E0533D" : "none"} strokeLinecap="round" strokeLinejoin="round" />
        )}
        {mood === "oops" && <path d="M92 44 c4 6 4 10 0 12 c-4 -2 -4 -6 0 -12z" fill="#7FB8E6" />}
        {mood === "think" && <text x="98" y="36" fontSize="20" fontWeight="800" fill="#1E1B18">?</text>}
      </g>
    </svg>
  );
}
