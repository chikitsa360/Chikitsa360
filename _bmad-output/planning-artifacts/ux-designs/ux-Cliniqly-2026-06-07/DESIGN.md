---
name: Chikitsa360
description: >
  Enterprise healthcare SaaS for small and medium clinics. Multi-surface responsive web
  (desktop primary, mobile parity). Multi-tenant: visual identity tokens are CSS custom
  properties injected per client via @chikitsa360/branding; this DESIGN.md specifies the
  Chikitsa360 default brand layer and the token architecture all client themes extend.
status: final
updated: 2026-06-07
colors:
  # --- Core Brand ---
  # All values: hex. Consumed as RGB triplets by the branding system
  # (e.g. "10 110 255") for Tailwind v4 opacity modifier support (bg-primary/50).
  primary: '#0A6EFF'              # Medical Blue — CTAs, active nav, primary actions
  primary-foreground: '#FFFFFF'
  secondary: '#00B8A9'            # Healthcare Teal — secondary actions, success accents
  secondary-foreground: '#FFFFFF'
  accent: '#4FD9FF'               # Soft Cyan — info states, focus rings, highlights
  accent-foreground: '#0A1628'

  # --- Surface & Chrome ---
  background: '#F8FAFC'           # Near-white page canvas (Slate-50 equivalent)
  foreground: '#0F172A'           # Primary text (Slate-950)
  card: '#FFFFFF'
  card-foreground: '#0F172A'
  muted: '#F1F5F9'                # Subtle backgrounds (Slate-100)
  muted-foreground: '#64748B'     # De-emphasized text (Slate-500)
  border: '#E2E8F0'               # All borders (Slate-200)
  input: '#E2E8F0'
  ring: '#0A6EFF'                 # Focus ring = primary

  # --- Semantic States ---
  destructive: '#EF4444'
  destructive-foreground: '#FFFFFF'
  warning: '#F59E0B'
  warning-foreground: '#1A1208'
  success: '#10B981'
  success-foreground: '#FFFFFF'
  info: '#3B82F6'
  info-foreground: '#FFFFFF'

  # --- Dark Mode Counterparts ---
  background-dark: '#0B0F1A'
  foreground-dark: '#F1F5F9'
  card-dark: '#141928'
  card-foreground-dark: '#F1F5F9'
  muted-dark: '#1E2A3B'
  muted-foreground-dark: '#94A3B8'
  border-dark: '#1E2A3B'
  primary-dark: '#3B82F6'
  primary-foreground-dark: '#FFFFFF'
  secondary-dark: '#14B8A6'
  accent-dark: '#67E8F9'

  # --- Appointment Status Semantic Colors ---
  # Always paired with text labels; color alone never carries meaning.
  status-scheduled: '#3B82F6'     # Blue
  status-confirmed: '#10B981'     # Green
  status-waiting: '#8B5CF6'       # Violet
  status-completed: '#6B7280'     # Grey
  status-cancelled: '#EF4444'     # Red
  status-no-show: '#F59E0B'       # Amber

  # --- High Contrast Theme Overrides ---
  # Applied when user selects "High Contrast" in Settings > Appearance.
  # Only deviations from default; unlisted tokens inherit.
  primary-hc: '#0050CC'
  background-hc: '#FFFFFF'
  foreground-hc: '#000000'
  border-hc: '#000000'
  muted-foreground-hc: '#333333'

typography:
  # Display / Hero — Plus Jakarta Sans
  display:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: '32px'
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '-0.02em'
  display-sm:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: '24px'
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: '-0.015em'
  heading:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: '20px'
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '-0.01em'
  subheading:
    fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: '600'
    lineHeight: '1.4'

  # Body System — Inter
  body-lg:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '16px'
    fontWeight: '400'
    lineHeight: '1.6'
  body:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: '400'
    lineHeight: '1.5'
  body-medium:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '14px'
    fontWeight: '500'
    lineHeight: '1.5'
  body-sm:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '13px'
    fontWeight: '400'
    lineHeight: '1.5'
  label:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '11px'
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0.06em'
    textTransform: 'uppercase'
  caption:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '12px'
    fontWeight: '400'
    lineHeight: '1.4'
    color: '{colors.muted-foreground}'
  numeric:
    fontFamily: '"Inter", system-ui, sans-serif'
    fontSize: '28px'
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: '-0.02em'
    fontVariantNumeric: 'tabular-nums'
  code:
    fontFamily: '"Geist Mono", "JetBrains Mono", monospace'
    fontSize: '13px'
    lineHeight: '1.6'

rounded:
  xs: '2px'
  sm: '4px'
  md: '8px'
  lg: '12px'
  xl: '16px'
  '2xl': '20px'
  full: '9999px'

spacing:
  # 8pt base grid
  '0.5': '2px'
  '1': '4px'
  '1.5': '6px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  '10': '40px'
  '12': '48px'
  '16': '64px'
  '20': '80px'
  '24': '96px'
  # Layout constants
  sidebar-width: '240px'
  sidebar-collapsed-width: '56px'
  topbar-height: '56px'
  bottom-tabbar-height: '64px'
  max-content-width: '1280px'
  card-padding: '24px'
  section-gap: '24px'

components:
  # Primary CTA
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
    fontSize: '{typography.body-medium.fontSize}'
    fontWeight: '{typography.body-medium.fontWeight}'
    height: '36px'
    paddingX: '16px'
    hover-background: '#0058CC'
    active-background: '#0044AA'
    disabled-opacity: '0.45'

  button-secondary:
    background: 'transparent'
    foreground: '{colors.secondary}'
    border: '1px solid {colors.secondary}'
    radius: '{rounded.md}'
    height: '36px'
    paddingX: '16px'
    hover-background: '{colors.secondary}/8'

  button-ghost:
    background: 'transparent'
    foreground: '{colors.muted-foreground}'
    radius: '{rounded.md}'
    height: '36px'
    paddingX: '12px'
    hover-background: '{colors.muted}'
    hover-foreground: '{colors.foreground}'

  button-destructive:
    background: '{colors.destructive}'
    foreground: '{colors.destructive-foreground}'
    radius: '{rounded.md}'
    height: '36px'
    paddingX: '16px'

  # Navigation
  sidebar:
    background: '{colors.card}'
    border-right: '1px solid {colors.border}'
    width: '{spacing.sidebar-width}'
    collapsed-width: '{spacing.sidebar-collapsed-width}'

  nav-item:
    height: '36px'
    paddingX: '12px'
    radius: '{rounded.md}'
    foreground-default: '{colors.muted-foreground}'
    foreground-active: '{colors.primary}'
    background-active: '{colors.primary}/8'
    background-hover: '{colors.muted}'
    fontSize: '{typography.body-medium.fontSize}'
    fontWeight: '{typography.body-medium.fontWeight}'
    icon-size: '16px'
    gap: '10px'

  nav-section-label:
    fontSize: '{typography.label.fontSize}'
    fontWeight: '{typography.label.fontWeight}'
    letterSpacing: '{typography.label.letterSpacing}'
    textTransform: '{typography.label.textTransform}'
    foreground: '{colors.muted-foreground}'
    paddingX: '12px'
    paddingY: '8px'

  topbar:
    height: '{spacing.topbar-height}'
    background: '{colors.card}'
    border-bottom: '1px solid {colors.border}'
    paddingX: '24px'

  # Data Display
  stat-card:
    background: '{colors.card}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
    padding: '{spacing.card-padding}'
    value-font: '{typography.numeric}'
    label-font: '{typography.label}'
    trend-positive: '{colors.success}'
    trend-negative: '{colors.destructive}'
    trend-neutral: '{colors.muted-foreground}'

  data-table:
    header-background: '{colors.muted}'
    header-fontSize: '{typography.label.fontSize}'
    header-fontWeight: '{typography.label.fontWeight}'
    header-letterSpacing: '{typography.label.letterSpacing}'
    header-foreground: '{colors.muted-foreground}'
    row-height: '52px'
    row-hover: '{colors.muted}/50'
    row-selected: '{colors.primary}/5'
    row-selected-border-left: '2px solid {colors.primary}'
    border-color: '{colors.border}'
    cell-font: '{typography.body}'
    pagination-foreground: '{colors.muted-foreground}'

  # Patient & Appointment
  patient-avatar:
    background: '{colors.secondary}'
    foreground: '{colors.secondary-foreground}'
    radius: '{rounded.full}'
    font: '{typography.body-medium}'
    size-sm: '32px'
    size-md: '40px'
    size-lg: '56px'
    size-xl: '72px'

  doctor-avatar:
    background: '{colors.primary}/12'
    foreground: '{colors.primary}'
    radius: '{rounded.full}'

  appointment-slot-available:
    background: '{colors.primary}/6'
    border: '1px solid {colors.primary}/20'
    foreground: '{colors.primary}'
    radius: '{rounded.sm}'

  appointment-slot-booked:
    background: '{colors.muted}'
    foreground: '{colors.muted-foreground}'
    radius: '{rounded.sm}'

  appointment-slot-selected:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.sm}'

  appointment-block:
    # Calendar grid blocks — color set by status via status tokens
    radius: '{rounded.sm}'
    padding: '4px 8px'
    fontSize: '{typography.caption.fontSize}'
    border-left-width: '3px'

  status-badge:
    radius: '{rounded.full}'
    paddingX: '8px'
    height: '20px'
    fontSize: '{typography.caption.fontSize}'
    fontWeight: '500'
    # Color pairs derived from status semantic colors above
    scheduled-bg: '{colors.status-scheduled}/10'
    scheduled-fg: '{colors.status-scheduled}'
    confirmed-bg: '{colors.success}/10'
    confirmed-fg: '{colors.success}'
    waiting-bg: '{colors.status-waiting}/10'
    waiting-fg: '{colors.status-waiting}'
    completed-bg: '{colors.status-completed}/10'
    completed-fg: '{colors.status-completed}'
    cancelled-bg: '{colors.destructive}/10'
    cancelled-fg: '{colors.destructive}'
    no-show-bg: '{colors.warning}/10'
    no-show-fg: '{colors.warning}'

  patient-profile-header:
    background: '{colors.card}'
    border-bottom: '1px solid {colors.border}'
    padding: '24px 32px'

  profile-tab:
    active-foreground: '{colors.primary}'
    active-border-bottom: '2px solid {colors.primary}'
    default-foreground: '{colors.muted-foreground}'
    font: '{typography.body-medium}'

  timeline-entry:
    line-color: '{colors.border}'
    node-size: '8px'
    node-background: '{colors.primary}'
    node-ring: '3px solid {colors.primary}/20'
    connector-color: '{colors.border}'

  prescription-card:
    background: '{colors.card}'
    border: '1px solid {colors.border}'
    radius: '{rounded.lg}'
    warning-border: '1px solid {colors.warning}'
    warning-background: '{colors.warning}/5'

  # Forms
  input:
    height: '36px'
    radius: '{rounded.md}'
    border: '1px solid {colors.border}'
    background: '{colors.card}'
    foreground: '{colors.foreground}'
    placeholder-foreground: '{colors.muted-foreground}'
    focus-ring: '2px solid {colors.ring}/30'
    focus-border: '{colors.ring}'
    error-border: '{colors.destructive}'
    error-foreground: '{colors.destructive}'
    label-font: '{typography.body-medium}'
    hint-font: '{typography.caption}'
    padding: '0 12px'

  # Feedback
  toast:
    radius: '{rounded.lg}'
    padding: '12px 16px'
    border: '1px solid'
    font: '{typography.body}'
    success-bg: '{colors.success}/8'
    success-fg: '{colors.success}'
    success-border: '{colors.success}/20'
    error-bg: '{colors.destructive}/8'
    error-fg: '{colors.destructive}'
    error-border: '{colors.destructive}/20'
    info-bg: '{colors.accent}/8'
    info-fg: '{colors.primary}'
    info-border: '{colors.accent}/20'
    warning-bg: '{colors.warning}/8'
    warning-fg: '{colors.warning}'
    warning-border: '{colors.warning}/20'

  skeleton:
    background: '{colors.muted}'
    shimmer-color: '{colors.border}'
    radius: '{rounded.md}'
    animation: 'shimmer 1.5s ease-in-out infinite'

  empty-state:
    icon-color: '{colors.muted-foreground}'
    icon-background: '{colors.muted}'
    icon-radius: '{rounded.full}'
    title-font: '{typography.display-sm}'
    description-font: '{typography.body}'
    description-foreground: '{colors.muted-foreground}'

  modal:
    background: '{colors.card}'
    border: '1px solid {colors.border}'
    radius: '{rounded.xl}'
    overlay: 'rgba(0,0,0,0.4)'
    max-width-sm: '440px'
    max-width-md: '560px'
    max-width-lg: '720px'
    padding: '24px'

  command-palette:
    background: '{colors.card}'
    border: '1px solid {colors.border}'
    radius: '{rounded.xl}'
    shadow: '0 24px 48px rgba(0,0,0,0.12)'
    input-border-bottom: '1px solid {colors.border}'
    result-active-bg: '{colors.primary}/8'
    result-active-fg: '{colors.primary}'
    result-font: '{typography.body}'
    category-label: '{typography.label}'
    max-width: '560px'

  # Theming (multi-tenant)
  theme-preset-card:
    # Used in Settings > Appearance
    background: '{colors.muted}'
    border: '1px solid {colors.border}'
    selected-border: '2px solid {colors.primary}'
    radius: '{rounded.lg}'
    padding: '16px'
---

## Brand & Style

Chikitsa360 is the operating system of the modern clinic. Every visual decision answers one question: *does this help clinic staff work with speed, accuracy, and confidence?* Decoration that does not aid cognition is eliminated. Hierarchy is earned by information importance, not by ornament.

The brand register sits precisely where trust intersects with capability. It should feel like a tool a doctor would respect — not a consumer wellness app, not a legacy HMIS system. The closest reference points are Stripe (trustworthy precision), Linear (performance-grade interface), and Notion (calm spatial organisation) — all rendered through a healthcare lens that adds rigor and reduces error.

**Multi-tenant architecture.** Chikitsa360 is a white-label platform. The Chikitsa360 default brand (Medical Blue, Healthcare Teal, Soft Cyan) is the parent theme. Every client deployment inherits this theme via CSS custom properties (`--chikitsa-*`). Clients override only the tokens they need. The Settings > Appearance surface exposes three levers: preset (Light, Dark, High Contrast), primary color (hex input with WCAG contrast validation), and secondary color. The system rejects combinations that fail AA contrast automatically.

**Personality.** Professional without being cold. Precise without being clinical. The interface should feel like a highly competent colleague who always has the patient's information ready, never asks the same question twice, and never wastes a click.

## Colors

The Chikitsa360 palette is architected in three layers: brand, semantic, and status.

**Brand layer** (client-overridable via CSS custom properties):
- **Medical Blue (`#0A6EFF`)** is the primary action color. Primary buttons, active navigation state, focus rings, links. It carries the meaning "this is the most important thing to do now."
- **Healthcare Teal (`#00B8A9`)** is the secondary brand color. Secondary CTAs, success-state accents, and patient avatar backgrounds. It carries the meaning "healthcare professional context."
- **Soft Cyan (`#4FD9FF`)** is the accent color. Info states, highlights, the "something new is here" signal. Never used as a background; always layered at low opacity or as a foreground accent.

**Surface layer** (fixed per light/dark mode — not overridden per client):
- Page background `#F8FAFC` (Linear-style near-white) lifts cards cleanly.
- Cards `#FFFFFF` sit 1px bordered on the page — no shadow hierarchy, just border + background contrast.
- Dark mode page `#0B0F1A`, cards `#141928` — deep navy that reads clinical after hours.

**Semantic layer**:
- Destructive (`#EF4444`), Warning (`#F59E0B`), Success (`#10B981`), Info (`#3B82F6`) follow industry conventions. Never re-mapped to brand colors.

**Status layer** (appointment states):
- Blue (Scheduled), Green (Confirmed), Violet (Waiting), Grey (Completed), Red (Cancelled), Amber (No-show). Always paired with text labels; color is a redundant cue, not the sole signal.

Avoid: gradient fills on interactive surfaces, more than two brand colors in the same viewport region, using status colors for anything other than their designated status.

## Typography

**Two font families, one purpose each.**

**Plus Jakarta Sans** carries the brand voice. It appears in:
- Page headings (h1, h2)
- Screen titles and section headers
- Stat card values (numeric)
- Empty state headlines
- Greeting moments ("Good morning, Dr. Arjun")

It has slightly more personality than Inter — enough to signal premium SaaS without sacrificing legibility.

**Inter** carries the data. It appears in:
- Body copy, paragraphs
- Table cells, form labels, input text
- Badges, captions, helper text
- All contextual information at dense scan distance

The `numeric` scale (28px, 700 weight, tabular-nums) is reserved for stat card primary values where instant reading is paramount.

Labels use uppercase tracking (0.06em, 11px, 600 weight) to distinguish section/column headers from data — the visual difference that prevents users from confusing a column label for a data value at glance.

**Do not** mix font families in the same sentence. **Do not** use Plus Jakarta Sans for table cells or form labels (it's heavier; will compete with data at high density).

## Layout & Spacing

**8pt base grid.** Every spacing value is a multiple of 4px, with the primary increment being 8px. `{spacing.4}` (16px) is the standard content padding; `{spacing.6}` (24px) is card padding; `{spacing.8}` (32px) is section gaps.

**Desktop layout**:
- Fixed left sidebar (`{spacing.sidebar-width}` = 240px expanded, `{spacing.sidebar-collapsed-width}` = 56px icon-only)
- Fixed top bar (`{spacing.topbar-height}` = 56px)
- Content area: remaining viewport, max-width `{spacing.max-content-width}` = 1280px, centered
- 12-column grid within content area for dashboard widget layout

**Content density philosophy**: generous whitespace in navigation; comfortable density in data tables. A clinic reception staff member scanning 60 patients/day needs content density, not a magazine layout. Tables show 12-15 rows without scrolling on a 1080p screen. Cards breathe.

**Mobile layout**:
- No sidebar. Bottom tab bar (`{spacing.bottom-tabbar-height}` = 64px) with 5 items.
- Full-width content with 16px horizontal margins.
- Sticky elements (tab navigation, action bars) always within thumb reach zone.

## Elevation & Depth

No shadow hierarchy. Depth is communicated through:
1. **Background differentiation**: page (`{colors.background}`) vs card (`{colors.card}`) — `#F8FAFC` vs `#FFFFFF` in light mode
2. **1px borders**: `1px solid {colors.border}` on all cards, table rows, inputs
3. **Subtle tint**: modals and overlays use a white card on `rgba(0,0,0,0.4)` backdrop — not shadow-stacked cards
4. **Focus states**: `2px solid {colors.ring}/30` ring on focused inputs — elevation via attention, not literal depth

The only meaningful shadow in the system: the command palette (`0 24px 48px rgba(0,0,0,0.12)`). Its shadow communicates "this is above everything else" — the one place where literal elevation matters.

Avoid: `box-shadow` on cards, table rows, nav items, or stat cards. If an element needs to "pop," use a solid border-color change, not a shadow.

## Shapes

Consistent corner radius scale reads as a product family:
- `{rounded.sm}` (4px) — status badges, table row selected indicator, appointment calendar blocks
- `{rounded.md}` (8px) — buttons, inputs, nav items, small cards
- `{rounded.lg}` (12px) — content cards, stat cards, profile sections
- `{rounded.xl}` (16px) — modals, bottom sheets, command palette, notification cards
- `{rounded.full}` (9999px) — avatars only

The reasoning: tighter radii (4px, 8px) read as "tool" — fast, precise, enterprise. Rounder elements (avatars at full radius) humanize the patient-facing data. The contrast is intentional.

Do not: use `{rounded.full}` for buttons (pill buttons) or cards. Pills read as consumer/mobile-first; Chikitsa360 is a professional tool.

## Components

Visual specs for brand-layer components. Behavioral rules live in EXPERIENCE.md.

### Navigation

**Sidebar** sits on `{components.sidebar.background}` with `{components.sidebar.border-right}`. It is not a floating panel — it's a structural element of the page, always present on desktop. Active nav items use `{components.nav-item.background-active}` (primary at 8% opacity) with `{components.nav-item.foreground-active}` text — a clear but low-noise active state. Icons are 16px, monochrome, consistent stroke weight (Lucide or equivalent).

**Bottom Tab Bar (mobile)** mirrors the sidebar's top-5 items. Active tab uses primary color; inactive uses muted-foreground. The center slot is always the Quick Action FAB (filled circle, primary background, white "+" icon).

### Data

**Stat cards** (`{components.stat-card}`) are the dashboard's primary scannable element. Value in `{typography.numeric}` (28px, 700 weight). Label in `{typography.label}` above. Trend indicator (↑/↓ percentage) in `{components.stat-card.trend-positive/negative}` below. Fixed height; consistent padding prevents layout shift when values change from 2 to 5 digits.

**Data tables** (`{components.data-table}`) use a sticky header with `{colors.muted}` background to distinguish from content rows. Row height 52px — enough for comfortable scanning without excessive scrolling. Selected rows get a left-border `2px solid {colors.primary}` to mark selection state without heavy fill. Bulk actions appear in a floating bar above the table when ≥1 row is selected.

### Patient & Appointment

**Patient avatar** uses `{components.patient-avatar.background}` (Healthcare Teal) as the default background — distinguishes patient entities from user avatars (which use primary blue at 12% opacity). Initials in `{typography.body-medium}`, white foreground.

**Status badges** are always combination: icon (12px) + text label. Never color alone. See `{components.status-badge}` for the full status palette. Badge height 20px, `{rounded.full}`, padding 8px horizontal.

**Appointment blocks** on the calendar grid have a 3px left border colored by status (not a filled background, which would make text illegible). Background is the status color at 8% opacity; text is status color at full intensity.

### Feedback

**Toasts** slide in from top-right on desktop, bottom on mobile. Success auto-dismisses in 3s. Error is persistent. Warning is persistent. Info auto-dismisses in 5s. All toasts stack vertically with 8px gap. Max 3 visible simultaneously — oldest exits when fourth arrives.

**Empty states** (`{components.empty-state}`) always include: a Lucide icon centered in a circular `{colors.muted}` background, a `{typography.display-sm}` headline naming what is empty (not "No data found" but "No appointments today"), a `{typography.body}` description that explains next action, and a primary button. Never a blank white rectangle.

**Skeleton loaders** match the exact layout of the content they replace — not generic bars. A stat card skeleton has 4 rounded rectangles in the same positions as the real value, label, and trend. This prevents layout shift and gives users orientation while loading.

### Multi-tenancy Theme Switcher

In Settings > Appearance, three sections:
1. **Theme presets**: visual cards showing a mini preview of Light, Dark, High Contrast. Selected card gets `{components.theme-preset-card.selected-border}`.
2. **Brand colors**: two color inputs (Primary, Secondary) with a live preview swatch and WCAG contrast ratio display. Input accepts hex. System shows "AA pass" / "AA fail" in real-time.
3. **Preview pane**: a static mini-render of the dashboard header and a stat card using the current token values — changes update in real-time as the user picks colors.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use `{colors.primary}` only for primary actions and active navigation | Apply primary blue to decorative backgrounds or illustration fills |
| Status badges always: icon + text + color | Status by color alone (accessibility failure) |
| Appointment blocks: left-border color, low-opacity fill | Solid-fill appointment blocks (text becomes illegible) |
| `{typography.numeric}` for stat card values — `{typography.body}` for everything else in cards | Mix heading scales in the same content card |
| Empty states with educating copy and a clear next action | Blank screens, generic "No data" text, or error codes as user-facing messages |
| Skeleton loaders shaped like the real content | Full-page spinner blocking layout |
| 1px border + background contrast for card elevation | `box-shadow` on cards, nav items, or stat cards |
| `{rounded.full}` only for avatars | Pill buttons or pill-shaped input fields |
| Inter for all data; Plus Jakarta Sans for headings only | Plus Jakarta Sans in table cells or form labels |
| Confirm destructive actions with the subject's name ("Delete Priya Kapoor?") | Generic "Are you sure?" confirmation dialogs |
| Theme token overrides via CSS custom properties only | Hardcoded color values in component styles |
| WCAG AA validation before shipping any client color override | Assuming a client-provided color meets contrast requirements |
