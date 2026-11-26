# Design System: 널리잇다

## 0. Basis
- **Foundation:** KRDS, the Korean government UI/UX design system (`krds-uiux@1.1.0`, published by NIA, `resources/css/token/krds_tokens.css`). Colour primitives, semantic roles, type scale, radius scale and the high-contrast theme are taken from that file.
- **Not used:** the government emblem, the "공식 전자정부 누리집" banner and any agency branding. This is a school tool that follows KRDS rules; it does not present itself as a government service.
- **Concept:** a staff room's paperwork. Bordered forms, a 결재란 with seals, a printed timetable with bell times, and a 참관록 form. These replace generic SaaS cards, pills and emoji.

## 1. Colour (KRDS token → role)
| Role (CSS var) | KRDS token | Light | High contrast |
|---|---|---|---|
| `--primary` fill, focus | primary-50 | `#256ef4` | `#256ef4` |
| `--primary-hover` | primary-60 | `#0b50d0` | `#0b50d0` |
| `--primary-text` | text-primary (primary-60 / primary-20) | `#0b50d0` | `#b1cefb` |
| `--primary-bg` | surface-primary-subtler (primary-5 / 95) | `#ecf2fe` | `#020f27` |
| `--text` | text-basic (gray-90 / gray-5) | `#1e2124` | `#f4f5f6` |
| `--text-subtle` | text-subtle (gray-70 / gray-20) | `#464c53` | `#cdd1d5` |
| `--text-meta` | gray-60 / gray-30 | `#58616a` | `#b1b8be` |
| `--surface` | surface-white (gray-0 / gray-100) | `#ffffff` | `#000000` |
| `--surface-sub` | surface-gray-subtler (gray-5 / 95) | `#f4f5f6` | `#131416` |
| `--line` | border-gray-light (gray-20 / gray-70) | `#cdd1d5` | `#464c53` |
| `--ok` / `--warn` / `--danger` | text-success / warning / danger (‑60) | `#267337` `#8a5c00` `#bd2c0f` | ‑20 values |
| `--seal` 결재 도장 | point-60 | `#ab2b36` | `#e0858c` |

KRDS ships a high-contrast theme instead of a dark theme. It applies to the OS dark preference, a host `data-theme="dark"`, and the in-app 고대비 toggle (`data-contrast="high"`). `data-contrast="normal"` forces the light theme.

## 2. Typography
- Stack: `Pretendard GOV` (KRDS-specified, used if installed) → `Pretendard Variable` (bundled, dynamic subset, OFL) → Apple SD Gothic Neo → Malgun Gothic.
- KRDS PC scale: heading-medium 24 (page title), heading-small 19 (section), heading-xsmall 17 (panel title), body-medium 17 (reading text), body-small 15 (UI default), body-xsmall 13 (meta). On mobile the title drops to 22.
- `font-variant-numeric: tabular-nums` everywhere: timetables and scores line up.

- **Slides:** Paperlogy (OFL 1.1; 400/600/800, KS X 1001 subset) for every slide. Body text ≥ 26pt at 13.333×7.5 in. Paperlogy never appears in app chrome, which stays on Pretendard.

## 3. Shape and space
- Radius: 4 (badges), 6 (buttons, inputs), 10 (panels), following KRDS small/medium/large.
- Panels are flat: 1px `--line` border, no shadow. Hierarchy comes from the page-title rule (2px `--text-strong`) and table header rules, as on printed forms.
- 8px spacing rhythm. Control height 40px (32px small), the KRDS medium/small sizes.

## 4. Components
- **Buttons** (KRDS): primary (filled), secondary (primary outline), tertiary (gray outline, default), text.
- **Badge**: rectangular, 4px radius, tinted semantic background. Used only for status, never decoration.
- **결재란**: a vertical "결재" label, three columns (요청 · 상대 교사 · 시간표 담당), seal stamps (요청/동의/결재, or a gray 거절/반려), names and dates in the footer row.
- **Timetable**: a bordered grid with bell times (09:00 … 15:20), a lunch row, today's column header inverted, changed periods in warning tint with a note (보결 (강지호)).
- **Comparison sheet**: candidates are table rows with a radio; each factor cell shows signed points and the reason sentence.
- **Step indicator** (KRDS 단계 표시기): numbered circles joined by a line; done = filled primary with ✓.
- **Notice** (KRDS 안내 박스): icon + text, tinted background per meaning.
- **Icons**: Lucide line icons at 18px, stroke 1.8. No emoji.

- **Slide templates** (5): 파스텔 노트 (cream + white rounded cards, coral/mint), 형광펜 (white paper, black type, yellow highlight), 칠판 (green board, chalk yellow), 블루 미니멀 (KRDS primary numbers), 라벤더 (lilac + large circles). Common grammar borrowed from popular classroom templates: oversized title, kicker pill, numbered step cards, phase tracker in the footer, sticky-note closing cards. Every text/background pair is ≥ 4.5:1 (≥ 3:1 for ≥ 18pt or 14pt bold).
- **가정통신문 paper:** A4 ratio sheet on white regardless of theme, double rule under the school header, metadata table, letter-spaced kicker, centred title, 학교장 + seal, dashed cut line with 회신서 table. Print uses `@page A4` and drops app chrome.
- **Records:** NEIS byte meter (primary → warning at 90% → danger over 100%), findings as tinted rows with a level badge (금지/주의/문체) and a confidence chip (기재요령 확인 / 원문 대조 필요 / 관례).
- **Format chips** in the converter use each format's familiar colour (HWP blue, Word blue, Excel green, PowerPoint orange, PDF red) with white 11px bold text.

- **Brand mark:** two seats joined by an arc (the bridge between classroom and staff room) with a spark above, on a primary-blue gradient tile with a 17/64 radius. The arc draws itself once on load; the spark twinkles on hover. `public/icon.svg` is the same mark.
- **People:** original flat avatars generated from the person id (4 hair styles, 5 skin tones, shirt in the person's colour). An uploaded photo replaces the illustration (centre-cropped, 160px, kept on the device).
- **Illustrations:** original SVGs only. A classroom hero (board, desk, laptop, plant) on Today, and small empty-state pictures (document→MD, notebook, two people). Fixed pastels on their own tinted backdrop so they read in both themes.
- **Motion:** 320ms page enter (fade + 8px rise), 50ms stagger on cards, 2px lift on hover for card-buttons, toast slide-in, bottom sheet slide-up, a seal "thunk" when a stamp lands, shimmer skeletons while a tool loads, and slow ambient loops in the hero (sun float, plant sway, chalk lines drawing). Easing `cubic-bezier(.2,.8,.2,1)`. `prefers-reduced-motion: reduce` turns every animation and transition off.
- **Seal on letters:** never drawn. A dashed circle marks where the school stamps after printing, or the letter omits it.

## 5. Accessibility
- WCAG 2.2 AA verified with axe-core on every view × 2 themes: 0 violations (slide thumbnails, settings, consent form included).
- Every radio-like control uses `role="radio"` + `aria-checked`. Visible focus ring is 2px `--primary`. `prefers-reduced-motion` disables transitions.
