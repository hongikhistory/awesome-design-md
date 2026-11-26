# Design System: 교실잇다

Base: [`design-md/notion/DESIGN.md`](../design-md/notion/DESIGN.md). This file records only what 교실잇다 adds or changes.

## 1. Atmosphere
A school staff room on quality paper: warm neutrals, whisper borders (`1px solid rgba(0,0,0,0.1)`), one saturated accent (`#0075de`). Security is shown calmly (green pill, plain tables) rather than with alarm colours.

## 2. Colour roles
| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#ffffff` | `#191919` | page |
| `--tint` | `#f6f5f4` | `#262524` | sidebar, note boxes, empty states |
| `--text-2` | `#615d59` | `#b4aea8` | descriptions |
| `--accent` | `#0075de` | `#3d9bf0` | primary action, current step, mentor marker |
| `--ok` | `#1aae39` | — | consent, applied, encryption pill |
| `--warn` | `#dd5b00` | — | privacy warnings, fatigue penalty, cover lessons |
| `--danger` | `#d13b3b` | — | reject / decline |
| student-teacher marker | `#ff64c8` | — | self-assessment dot (Notion pink) |

## 3. Typography
Inter → Pretendard → Apple SD Gothic Neo → Malgun Gothic. `word-break: keep-all` for Korean. Page title 28px/700 (-0.6px), section 20px/700, body 15px/400, captions 12–13px. Numbers that matter (scores, bundle size) use 26–30px/700 with negative tracking.

## 4. Components
- **Pill** (9999px): status, step labels, counts. Colour = meaning, never decoration.
- **Card** (12px radius, sub-0.05 shadow): one decision or one record per card.
- **Stepper**: three equal cells (동의 → 승인 → 반영); done = green tint, current = blue tint, failed = red tint.
- **Candidate card**: score top-right, five factor rows (label · bar · signed points · reason). Negative factors use the warn colour.
- **Tag pad**: five observation tags, each with its own colour, also reachable with Alt+1…5.
- **Gap track**: 1–4 scale; blue dot = mentor, pink dot = self.

## 5. Layout
Desktop: 248px sidebar + content (max 1180px). ≤860px: sidebar becomes a top bar (persona) and a six-item bottom tab bar; content gutter 16px; no horizontal page scroll.

## 6. Accessibility
Visible focus ring (`2px solid #097fe8`), radio/tab roles on pickers, `aria-live` toasts, every colour-coded state also has a text label.
