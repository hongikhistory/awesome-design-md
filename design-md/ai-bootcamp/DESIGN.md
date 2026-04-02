# Design System: AI Bootcamp

## 1. Visual Theme & Atmosphere

AI Bootcamp's design is inspired by Figma's typographic sophistication and gallery-like pacing. The interface layer is strictly black-and-white, creating a clean canvas where vibrant multi-color gradients in the hero and CTA sections serve as the primary visual energy. The overall feeling is that of a modern design tool — precise, minimal, and confident.

Korean typography (Noto Sans KR) pairs with Space Mono for technical labels, creating a bilingual hierarchy that feels native in both languages. The pill-shaped button geometry and negative letter-spacing throughout give every element a polished, tool-like quality.

**Key Characteristics:**
- Strictly black-and-white interface chrome — color exists only in gradient sections
- Noto Sans KR for Korean body text with weight range 300–700
- Space Mono for uppercase technical labels with wide letter-spacing
- Pill (50px) button geometry throughout
- Dashed 2px focus outlines (Figma signature pattern)
- Vibrant multi-color hero gradients (green, purple, orange, blue)
- Animated gradient backgrounds with smooth 8s transitions
- Gallery-like section pacing with generous whitespace

## 2. Color Palette & Roles

### Primary
- **Pure Black** (`#000000`): All text, solid buttons, featured card backgrounds
- **Pure White** (`#ffffff`): Page background, card surfaces, text on dark surfaces

### Surface & Background
- **Page White** (`#ffffff`): Primary page background
- **Card Dark** (`#141414`): Dark mode card surfaces
- **Dark Page** (`#0a0a0a`): Dark mode page background
- **Glass Dark** (`rgba(0, 0, 0, 0.08)`): Subtle overlay for badges, secondary elements
- **Glass Light** (`rgba(255, 255, 255, 0.16)`): Frosted glass for buttons on gradient/dark surfaces

### Gradient System
- **Hero Gradient**: `linear-gradient(135deg, #0acf83 0%, #a259ff 30%, #f24e1e 50%, #ff7262 65%, #1abcfe 80%, #0acf83 100%)` — Figma's signature multi-color palette
- **CTA Gradient**: `linear-gradient(135deg, #a259ff 0%, #f24e1e 40%, #ff7262 60%, #1abcfe 100%)` — Warmer variant for closing sections

### Accent Dots (Schedule)
- **Green** (`#0acf83`): Week 1 indicator
- **Purple** (`#a259ff`): Week 2 indicator
- **Red-Orange** (`#f24e1e`): Week 3 indicator
- **Blue** (`#1abcfe`): Week 4 indicator

### Border & Muted
- **Border** (`rgba(0, 0, 0, 0.12)`): Card borders, dividers
- **Border Subtle** (`rgba(0, 0, 0, 0.06)`): Section dividers
- **Text Muted** (`rgba(0, 0, 0, 0.5)`): Secondary text, descriptions

## 3. Typography Rules

### Font Family
- **Primary**: `'Noto Sans KR', system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`
- **Monospace / Labels**: `'Space Mono', 'SF Mono', Menlo, monospace`

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
|------|------|------|--------|-------------|----------------|-------|
| Hero Heading | Noto Sans KR | 64px | 700 | 1.10 | -1.5px | Maximum impact |
| Section Title | Noto Sans KR | 42px | 700 | 1.15 | -0.96px | Major sections |
| CTA Heading | Noto Sans KR | 48px | 700 | 1.15 | -1.2px | Closing section |
| Review Heading | Noto Sans KR | 36px | 700 | 1.20 | -0.96px | Banner heading |
| Card Heading | Noto Sans KR | 26px | 700 | 1.25 | -0.5px | Activity cards |
| Sub Heading | Noto Sans KR | 22px | 700 | 1.30 | -0.26px | Location cards |
| Card Title | Noto Sans KR | 18px | 700 | 1.30 | -0.26px | Schedule cards |
| Body Large | Noto Sans KR | 20px | 300 | 1.50 | -0.1px | Hero description |
| Body / Desc | Noto Sans KR | 18px | 300 | 1.60 | -0.1px | Section descriptions |
| Body Standard | Noto Sans KR | 15–16px | 400 | 1.45 | -0.14px | Navigation, buttons |
| Body Light | Noto Sans KR | 14–15px | 300 | 1.50–1.60 | normal | Card descriptions |
| Mono Label | Space Mono | 13px | 400 | 1.00 | 0.6px | Section labels (uppercase) |
| Mono Small | Space Mono | 12px | 700 | 1.00 | 0.6px | Week labels, tags (uppercase) |

### Principles
- Light weight (300) as the default for descriptions creates an airy, modern feel
- Bold (700) reserved for headings and emphasis only
- Negative letter-spacing on all Korean body text (-0.1px to -1.5px)
- Positive letter-spacing on monospace labels (+0.54px to +0.6px)
- Monospace always uppercase for structural signposting

## 4. Component Stylings

### Buttons

**Black Pill (Primary CTA)**
- Background: `#000000`
- Text: `#ffffff`
- Padding: 10px 24px
- Radius: 50px
- Focus: dashed 2px outline, offset 3px
- Hover: translateY(-1px)

**White Pill (CTA on gradients)**
- Background: `#ffffff`
- Text: `#000000`
- Padding: 14px 32px (hero) / 16px 40px (CTA section)
- Radius: 50px
- Focus: dashed 2px outline

**Glass Pill (Secondary on gradients)**
- Background: `rgba(255, 255, 255, 0.16)`
- Text: `#ffffff`
- Border: 1px solid `rgba(255, 255, 255, 0.24)`
- Radius: 50px

### Cards

**Schedule Card**
- Background: white (light) / `#141414` (dark)
- Border: 1px solid `rgba(0, 0, 0, 0.12)`
- Radius: 12px
- Padding: 28px 24px
- Hover: translateY(-4px), shadow `0 12px 40px rgba(0,0,0,0.08)`
- Color dot: 8px circle, absolute top-right

**Location Card**
- Same base style as schedule card
- Padding: 32px
- Includes pill tag and pill badge

**Activity Card**
- Padding: 40px 32px
- Featured variant: inverted colors (black bg in light mode, white bg in dark mode)

### Navigation
- Sticky top with blur backdrop
- Background: `rgba(255, 255, 255, 0.92)` / `rgba(10, 10, 10, 0.92)`
- Border bottom: 1px solid border-color
- Links: 15px, weight 400, hover opacity 0.6
- Brand: 18px, weight 700

### Badges & Tags
- Pill shape (50px radius)
- Mono font, uppercase, small (12–13px)
- Border: 1px solid border-color
- Hero badge: glass background with backdrop-filter blur

## 5. Layout Principles

### Spacing System
- Base unit: 8px
- Section padding: 100px vertical (desktop), 56px (mobile)
- Card gap: 16px
- Inner card padding: 24px–40px

### Grid & Container
- Max content width: 1120px, centered
- Schedule: 4-column grid (desktop) → 2-col (tablet) → 1-col (mobile)
- Location: 2-column grid → 1-col (mobile)
- Activity: 2-column grid → 1-col (mobile)
- Review banner: 2-column grid → 1-col (tablet)

### Whitespace Philosophy
- Gallery-like pacing: each section breathes as its own exhibit
- Gradient sections (hero, CTA) provide chromatic relief between monochrome content
- Horizontal dividers between sections at 1px subtle opacity

### Border Radius Scale
- Subtle (8px): Images, small elements
- Comfortable (12px): All cards
- Banner (16px): Review banner
- Pill (50px): Buttons, tags, badges
- Circle (50%): Color dots, icons

## 6. Depth & Elevation

| Level | Treatment | Use |
|-------|-----------|-----|
| Flat (Level 0) | No shadow | Page background, text, dividers |
| Surface (Level 1) | Card with 1px border | Schedule, location, activity cards |
| Hover (Level 2) | translateY(-4px) + shadow `0 12px 40px rgba(0,0,0,0.08)` | Card hover states |
| Elevated (Level 3) | Gradient background sections | Hero, CTA — using color as depth |

**Shadow Philosophy**: Depth comes primarily from borders, background contrast, and subtle hover elevation. Shadows are minimal and only appear on interaction.

## 7. Do's and Don'ts

### Do
- Keep the interface strictly black-and-white — color comes from gradient sections only
- Use pill (50px) radius for all interactive elements and badges
- Apply dashed 2px focus outlines for accessibility
- Use light weight (300) for descriptions, bold (700) for headings
- Use Space Mono in uppercase with positive letter-spacing for section labels
- Apply negative letter-spacing on Korean body text
- Animate gradients subtly (8s ease infinite)

### Don't
- Don't add interface colors to chrome — the monochrome palette is absolute
- Don't use sharp corners on buttons — pill geometry only
- Don't use solid focus outlines — dashed is the signature
- Don't use font weights between 400–600 for body text — keep it light (300) or standard (400)
- Don't use positive letter-spacing on body text
- Don't add heavy shadows — depth comes from borders and color contrast
- Don't use emoji or icons in navigation — plain text only

## 8. Responsive Behavior

### Breakpoints
| Name | Width | Key Changes |
|------|-------|-------------|
| Mobile | <640px | Single column, nav links hidden, reduced padding |
| Tablet | 640–960px | 2-column schedule, stacked review banner |
| Desktop | 960–1280px | Full 4-column schedule, all grids active |
| Large | >1280px | Maximum content width 1120px |

### Collapsing Strategy
- Hero text: 64px → 48px → 36px
- Section titles: 42px → 34px → 28px
- Schedule grid: 4-col → 2-col → 1-col
- Location/Activity: 2-col → 1-col
- Review banner: 2-col → 1-col
- Nav links: visible → hidden (mobile hamburger area)
- Section padding: 100px → 72px → 56px

## 9. Agent Prompt Guide

### Quick Color Reference
- Interface: Pure Black (`#000000`) and Pure White (`#ffffff`)
- Glass: `rgba(0,0,0,0.08)` (dark), `rgba(255,255,255,0.16)` (light)
- Gradient: `#0acf83`, `#a259ff`, `#f24e1e`, `#ff7262`, `#1abcfe`
- Dark mode page: `#0a0a0a`, cards: `#141414`

### Example Component Prompts
- "Create a hero section with animated multi-color gradient (green→purple→orange→blue). 64px Noto Sans KR weight 700, -1.5px tracking. White text centered. Two pill buttons: white solid + glass."
- "Build a 4-column schedule card grid. Each card: white bg, 12px radius, 1px border. Color dot (8px circle) top-right. Hover: translateY(-4px) with soft shadow."
- "Design a section label: Space Mono 13px, uppercase, letter-spacing 0.6px, 50% opacity black text."
- "Create a featured activity card: black background, white text, 12px radius. Include pill tag and bullet list with green dots."

### Iteration Guide
1. Interface is always black + white — never add colors to chrome
2. All buttons use pill geometry (50px radius)
3. Dashed focus outlines, not solid
4. Light font weight (300) for body, bold (700) for headings
5. Monospace labels are always uppercase with positive letter-spacing
6. Cards hover with translateY(-4px) + subtle shadow
7. Gradient sections animate at 8s ease infinite
