# CRM Dashboard Prompt v40

Use this prompt with GPT-5.4 or Codex when you need a **reference-free, spec-grade CRM revenue dashboard** that feels native at full desktop size, not like a shrunken export.

```text
Create a single static responsive HTML file styled only with Tailwind utility classes.

Do not use a custom CSS system.
Do not use component libraries.
Do not redesign the layout.
Do not reinterpret the information architecture.
Do not turn this into a generic SaaS dashboard.
Do not output a reduced-scale mockup.

This is a strict implementation prompt.
Follow it literally.

## Core objective

Generate a light, premium, operational CRM dashboard called:
- Northline CRM
- Revenue command
- Revenue overview

The page must feel like a real internal revenue command center used by:
- VP Sales
- Revenue operations manager

The primary job is:
- review quarter coverage
- inspect commit confidence
- identify interventions needed this week

## Non-negotiable result

The final screen must feel:
- native at full desktop size
- not zoomed out
- not like a screenshot shrunk into the browser
- not airy
- not toy-like
- not generic

If the result looks visually reduced, under-scaled, or over-fitted, it is wrong.

## Rendering target

Optimize specifically for:
- desktop: `1512 × 861`

Secondary check:
- mobile: common 390px width

Desktop composition rule:
- at 1512px width, the dashboard should occupy the canvas confidently
- typography must read naturally at that size
- cards must feel like real UI modules, not miniature thumbnails

## Reasoning mode

Use low or medium reasoning.
Do not overthink.
Do not invent alternatives.

## Visual thesis

The UI should feel:
- calm
- precise
- premium
- operator-facing
- quietly dense
- lightly warm-neutral
- more like a mature product than a concept shot

## Color system

Use Tailwind tokens or very close equivalents only.

Global palette:
- page background: `stone-100`
- app shell background: `stone-50`
- primary board background: `white`
- secondary panel background: `white`
- muted sub-surface: `stone-50`
- borders: `stone-200`
- primary text: `stone-900`
- secondary text: `stone-600`
- muted text: `stone-500`
- micro labels: `stone-400`

Action / active:
- `slate-900`

Semantic:
- positive: `emerald-600`
- caution: `amber-600`
- risk: `rose-600`
- restrained data emphasis: `sky-500`

Forbidden:
- purple
- black UI backgrounds
- blue-heavy branding
- gradients
- glows
- glassmorphism
- colorful card backgrounds

## Typography system

Use exactly 2 font weights:
- regular
- medium

Font size floors on desktop:
- product name: 14px minimum
- subtitle: 12px minimum
- nav items: 14px minimum
- section micro labels: 10px uppercase
- main page title: 20px minimum
- panel titles: 15px minimum
- KPI values: 22px minimum
- KPI helper text: 12px minimum
- table body text: 13px minimum
- table secondary lines: 12px minimum

Do not let text fall below these sizes on desktop.
Do not make the interface look miniaturized by shrinking typography.

Copy length rules:
- helper paragraphs: max 2 lines
- KPI helper lines: max 1 line
- signal card body: max 3 lines
- lens card body: max 3 lines
- action item descriptions: max 2 lines
- table secondary lines: max 2 lines

If text is too long, rewrite shorter copy.
Do not allow layout drift because of long copy.

## Surface system

Border radius:
- 10px or 12px only

Borders:
- 1px appearance only
- all surfaces use the same border strength

Shadow system:
- very subtle soft shadow
- one shadow language only
- no dramatic depth

## Overall shell

Create a full-height app shell using this structure:
- left app sidebar
- right workspace

Overall desktop shell split:
- left sidebar width: 240px to 248px
- right workspace width: remaining width

Important:
- do not use a sidebar narrower than 220px
- do not use a sidebar wider than 256px

The outer app should:
- fill the viewport height
- use a subtle outer border
- avoid decorative margin around the shell

## Left app sidebar

Must remain light.
Never make it dark.

Internal spacing:
- top padding: 16px
- horizontal padding: 12px
- module gap: 16px

### Brand block
Include:
- small monogram chip around 22px to 24px
- `Northline CRM`
- `workspace`

### Workspace nav
Label:
- `Workspace`

Rows:
- Dashboard
- Accounts
- Contacts
- Pipeline
- Renewals
- Tasks

Active row:
- Dashboard
- white background
- subtle border
- medium weight

### Insight & control nav
Label:
- `Insight & control`

Rows:
- Forecast
- Reports
- Analytics
- Workflows

### Bottom card
One compact card only:
- title: `Friday review`
- body: `Nine open deals and six renewals still need a call, next step, or sponsor confirmation before commit lock.`
- button: `Open risk queue`

Bottom card size:
- compact, not oversized
- body text max 3 lines
- button height 36px

## Workspace top strip

Height:
- 54px total

Left side:
- breadcrumb: `Dashboard / Revenue overview`

Right side:
- `This quarter`
- `Export report`

Buttons:
- height 36px
- quiet border
- white background
- compact width

## Main content split

Below top strip:
- one content grid
- left column: `2.5fr`
- right column: `9.5fr`
- gap: 16px
- padding around grid: 16px

## Internal left rail

This is a bordered white panel.
Width target:
- 240px to 260px

It must contain exactly 3 grouped sections:
1. Views
2. Coverage lenses
3. Queues

Header:
- title: `Revenue control`
- helper line: `Saved review scopes and blocker queues used during the weekly forecast call.`

Section 1: Views
- micro label: `Views`
- rows:
  - Revenue overview
  - Commit risk
  - Renewals due this quarter
  - Expansion watch

Section 2: Coverage lenses
- micro label: `Coverage lenses`
- rows:
  - Enterprise / 3.4x target
  - Mid-market / 2.1x target
  - Renewals / $410K at risk

Section 3: Queues
- micro label: `Queues`
- rows:
  - No next step / 9
  - Slip risk / 7
  - Sponsor missing / 5

Density rule:
- keep rows compact
- separators should be quiet
- do not use oversized card styling here

## Main dashboard header

Top line:
- 4 compact view pills:
  - Overview
  - Forecast
  - Renewals
  - Pipeline hygiene

Active pill:
- light bordered active treatment
- not large

Below:
- title: `Revenue overview`
- helper line:
  - `Review coverage by stage, pressure on the commit number, and the accounts that still need action before the weekly call closes.`

Do not add extra chips here.
Do not create a second floating control cluster.

## KPI strip

This is critical.

Desktop rule:
- one single row
- exactly 5 equal columns
- must remain a single row at widths >= 1280px
- no 2+2+1 stacking

Container:
- bordered white surface
- 5 equal internal columns
- vertical separators between KPI cells

Card size:
- min height 110px
- max height 128px
- padding 16px

Metrics and exact values:
1. Open pipeline — `$4.82M`
   - `38 open opportunities`
2. Commit forecast — `$1.34M`
   - `76% of quarterly target`
3. Best case — `$2.08M`
   - `Above plan if late-stage holds`
4. Closed won — `$1.14M`
   - `Quarter to date`
5. Renewal ARR at risk — `$410K`
   - `6 renewals lack sponsor certainty`

KPI design rules:
- micro label at top
- large number beneath
- one short line beneath
- no icon
- no sparkline
- no colored surface

## Analytical row

Create one two-column analytical row:
- left large panel
- right narrower panel

Desktop split:
- left: `1.85fr`
- right: `0.95fr`
- gap: 16px

Both panels must feel complete.
No empty-bottom dead space.

### Left panel: Stage coverage

Panel title:
- `Stage coverage`

Helper:
- `How much healthy pipeline exists at each stage relative to required quarter-end coverage.`

Panel structure in exact order:
1. chart rail
2. stage summary blocks
3. interpretation block

#### Chart rail
Style:
- rounded 10px
- bordered
- lightly muted background
- internal padding 12px

Top rail content:
- left badge:
  - `Quarter safety line at $1.2M weighted in late stages`
- middle inline legend on one line:
  - Required
  - Weighted
  - Deal count
- right text:
  - `38 open opportunities across all stages`

Legend rule:
- must remain one line
- if it wraps, reduce spacing or shorten labels

#### Chart body
Height:
- 184px

Required visual elements:
- left Y labels:
  - `$0`
  - `$500K`
  - `$1.0M`
  - `$1.5M`
- stage names:
  - Discovery
  - Qualified
  - Solution
  - Commit
  - Renewal
- light gray required bars
- sky-blue weighted bars
- dark line for deal count
- dotted dark threshold line
- deal count markers:
  - 8
  - 11
  - 13
  - 7
  - 6

The chart should be crisp and compact.
Do not overscale it.
Do not turn it into a hero.

#### Stage summary blocks
Use exactly 4 stacked blocks:

1. Discovery
- `8 deals · $620K weighted`
- `1.4x coverage`

2. Qualified / Evaluation
- `11 deals · $1.08M weighted`
- `2.3x coverage`

3. Proposal / Commit
- `13 deals · $1.94M weighted`
- `3.6x coverage`

4. Renewals
- `6 accounts due this quarter`
- badge: `$410K at risk`
- three mini cells:
  - Sponsor gaps / 2
  - Owner plans / 4/6
  - Close in 14d / 3
- bottom progress:
  - `Renewals with clear owner plan`
  - `58%`

Block spacing:
- 12px between blocks
- padding 12px to 14px

#### Interpretation block
One two-column compact block:
- left: `Coverage read`
- right: `Pressure points`

Coverage read:
- 3 bullet lines max

Pressure points:
- 3 rows max

If there is any remaining visual gap below this block:
- add `Next actions this week`
- maximum 3 short action lines

Do not leave whitespace.
Do not add another chart.

### Right panel: Forecast confidence

This panel must feel proportionally full.
It should not look tall and empty.

Panel structure:
1. header
2. commit/best-case row
3. call quality module
4. blockers module
5. what changes the call module

Header:
- title: `Forecast confidence`
- helper:
  - `Where the number stands and what is reducing confidence in the current call.`

Commit / best-case row:
- 2 equal mini cards
- Commit: `$1.34M` / `76% of target`
- Best case: `$2.08M` / `Needs clean late-stage close`

Call quality:
- label: `Call quality`
- status badge: `Moderate risk`
- three progress rows:
  - Commit with next step logged — 71%
  - Commit with exec sponsor — 64%
  - Renewals with clear owner plan — 58%

Blockers this week:
- No next step on commit-stage deals — 4
- Renewals missing sponsor confirmation — 2
- Late-stage deal slipped twice — 3

What changes the call:
- Atlas Commerce — `+$184K`
  - Security follow-up would keep the expansion in commit.
- Northforge Logistics — `$318K ARR`
  - Sponsor confirmation protects the renewal from slipping.
- Harbor Health — `+$126K`
  - Executive sponsor alignment would improve commit confidence.

This last section is required.
Use it to close the panel height cleanly.

## Bottom table

Title:
- `Forecast risks`

Helper line:
- `These deals or renewals need a clear next move before the weekly revenue review closes.`

Columns:
- Account / deal
- Owner
- Stage
- Value / ARR
- Coverage issue
- Next step
- Last touch
- Risk

At least 4 rows.

Use exactly these rows:
1. Atlas Commerce · Expansion
2. Northforge Logistics · Renewal
3. Maison Retail Group · Upsell
4. Harbor Health · Expansion

Keep the row descriptions compact.

## Scale correction rules

This is the most important new requirement.

To prevent the output from looking like a reduced-scale screenshot:
- do not reduce font sizes below the defined floors
- do not reduce card heights below the defined minimums
- do not shrink the left sidebar below 240px
- do not shrink the internal left rail below 240px
- do not shrink the KPI row into multiple desktop rows
- keep panel padding around 16px, not 8px
- ensure the main board uses enough width to feel native on 1512px
- avoid too much whitespace, but also avoid micro-scaling

If the result looks miniaturized:
- increase type scale slightly
- increase card height slightly
- reduce copy length
- preserve row structure

## Anti-patterns

Reject:
- dark sidebar
- tiny typography
- overly small cards
- 2+2+1 KPI packing
- generic analytics chart
- decorative color usage
- fluffy copy
- dead whitespace
- loose composition
- mockup-like scaling

## Final quality test

Before finishing, mentally check:
- does this feel native at 1512×861?
- does the KPI strip remain a single row?
- does the sidebar feel like a real product nav, not compressed?
- does the stage panel feel like an operating surface, not infographic art?
- does the right panel end cleanly with no dead space?
- does the whole page feel like a real CRM command center rather than a scaled-down mockup?
```
