# IDENTITY (contract; every later phase obeys this file)

DIRECTION: D5 kiln
GROUND: #181210 espresso
SURFACE: #221a14
DEEP: #2c211a
LINE: #3d2f25
INK: #f3ece4
ACCENT: #cd7a52 clay
ON_ACCENT: #181210
SECOND: #8a9a5b olive
OK: #69a56f
WARN: #e0b84e
BAD: #ef6a5a
FONT_DISPLAY: F7 Zilla Slab (next/font/google: Zilla_Slab, weight: ["500", "600", "700"] is required)
FONT_BODY: Karla (next/font/google: Karla)
FONT_MONO: none
STRUCTURE: S4 app-shell
ARCHETYPE: L6 rail
MOTION: M1 rise, prefix volutra-
KIT: K6 three
RADIUS: soft
HEADER: solid ground, border-b in LINE, sticky
LOGO_POLICY: brand-mark

## Why

The farm assigned this identity so that no two projects share a look, a route map or an interaction style. The most recent projects it differs from: Arbiter Hacks V1 (D1, S3, L5, K5); PhysTech 2027: Physical Activity and Technology Hack Day (D12, S6, L3, K4); Arbitrum Open House São Paulo: Online Buildathon (D13, S1, L7, K1). It is not a suggestion. Tie the product's own nouns to it; do not swap any row for a familiar one.

## Direction: D5 kiln

Espresso and clay dark, matte fired-earth warmth, zero glow.

Surface treatment: Matte flat panels in brown steps, clay-colored thick underlines, grainy texture via a subtle repeating gradient, no glow and no gradients on type.

Every hex in app/globals.css comes from the key block above. RADIUS soft means 0.375rem on every card, panel and control. ON_ACCENT is the text color on an ACCENT fill. The semantic colors (OK, WARN, BAD) mark state only, never brand.

## Structure: S4 app-shell

A persistent application shell with a rail on every route; no marketing page anywhere.

Route map (name the bracketed parts with the product's own words):
- `/` : the overview with a welcome state built from the seed
- `/<entities>` : the list of the product's main records, with filter and search
- `/<entities>/[id]` : the record detail, where the core action happens
- `/activity` : the history of what happened (or `/settings` when history makes no sense)

Rules:
- the rail (mark, sections, one primary action) persists on every route and collapses to a bottom bar on mobile
- the overview is useful on first load: seeded records, one obvious next action
- list and detail are real routes; a detail link can be opened cold

## Archetype: L6 rail (the composition of the home route)

A persistent left rail (mark, nav, ONE CTA) with the content pane on the right; the home route IS the app shell with a welcome state; no marketing hero exists.

MUSTs: the rail persists across routes; the welcome state uses real seed data; the rail holds the only CTA.
Bans: a marketing hero above the shell; a second nav in a header.

## Motion: M1 rise (the entrance signature)

translateY(18px) to 0 plus fade, cubic-bezier(0.16, 1, 0.3, 1), 500ms. One keyframe block implements it; every keyframe name starts with `volutra-`. A `prefers-reduced-motion: reduce` block disables it.

## Interaction kit: K6 three

React Three Fiber: one interactive 3D object that embodies the product.

Packages for package.json dependencies: "three": "^0.187.0", "@react-three/fiber": "^9.8.2", "@react-three/drei": "^10.7.9". devDependencies: "@types/three": "^0.187.0".

Typical import: `import { Canvas, useFrame } from "@react-three/fiber"; import { OrbitControls, Float } from "@react-three/drei";`

Signature interactions (the scaffold ships the first; all three exist by the end of the frontend phase):
1. ONE interactive 3D object on the first screen that embodies the product's core noun, built from primitives (boxes, cylinders, extrusions), orbitable or pointer-reactive, no external model files
2. the object reacts to real product state: a seed value drives its scale, color or position, and changing the demo input updates the scene
3. a step-linked or scroll-linked camera move between two viewpoints

Rules:
- the Canvas component loads through `next/dynamic` with `ssr: false` from inside a client component
- an error boundary wraps it and falls back to the SVG illustration; the page must work without WebGL
- use `frameloop="demand"` or pause offscreen; render a static frame under reduced motion
- materials and lights use IDENTITY colors only; all text stays in HTML, never inside WebGL
- add the packages above to package.json `dependencies` (and `devDependencies` where listed) with exactly these ranges; the runner installs them
- every import of a kit package lives in a component that starts with `"use client"`
- server HTML must be readable with JavaScript off: never server-render content at opacity 0 or off screen; animate from the visible state or on interaction
- honor `prefers-reduced-motion: reduce`: the content and every control stay usable with motion off
- every interaction is driven by the real seed data; a decorative animation with no product meaning does not count as a signature

## Amendments (append-only; later phases add dated lines here, never edit anything above)

- 2026-11-25: Phase 5 adds rail section anchors on the overview (Coil, What today says, How it is measured; md and up, IntersectionObserver, aria-current="location"), two coil camera views ("As drawn" top-down and "Side relief" low oblique, stepped by the session phase with a reduced-motion snap), and scene slots 4 (idle pad on /spirals/new) and 5 (closing panel on /activity). No axis changed.
