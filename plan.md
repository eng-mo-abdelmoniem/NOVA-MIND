# ARES-IV Orbital Med-Bay — Implementation Plan

## Product scope

A single-screen astronaut medical command center that runs convincingly in simulation mode without a backend, while exposing clean integration points for the requested FastAPI/WebSocket bridge. The experience prioritizes the diagnostic grid, live telemetry, anatomical hologram, and Flight Surgeon chat as a cohesive operational surface rather than a generic dashboard.

## Implementation approach

- Build a Vite + React + TypeScript single-page application with CSS modules replaced by a focused global stylesheet for fast visual iteration and responsive behavior.
- Keep the data model local and deterministic enough for the UI to feel live: telemetry fluctuates on a timer, charts use seeded orbital-health series, and every action updates chat history or status indicators.
- Centralize backend connectivity in `src/services/aiBridge.ts`, with graceful fallback to local simulation for chat, diagnostics, uploads, hologram inspection, and telemetry.
- Centralize UI command execution in `src/context/HudCommandContext.tsx`; chat, tile actions, hologram actions, and footer vital cards dispatch through the same command surface.
- Use lightweight inline SVG and CSS for the anatomical hologram and waveform treatment; avoid extra image assets so the interface remains crisp and fast.
- Serve `public/manus-routes.json` with the single `/` route.

## Project structure

- `src/main.tsx` — application entry and providers.
- `src/App.tsx` — command-center composition and interaction state.
- `src/components/` — header, nav, diagnostic grid, workspace views, hologram, chat, telemetry footer, and modal primitives.
- `src/data/` — diagnostic definitions, chart series, profile, protocols, and alerts.
- `src/services/aiBridge.ts` — configurable FastAPI/WebSocket bridge plus local simulation fallback.
- `src/context/HudCommandContext.tsx` — command types, dispatch helpers, and UI orchestration.
- `src/styles.css` — orbital HUD visual system, responsive layout, motion, and accessibility states.
- `public/manus-routes.json` — managed route manifest.

## Design direction

Three possible directions were considered:

1. **Orbital Mission Control** — precise, dark, cyan-lit operational HUD with a medical layer. (0.07)
2. **Clinical Glass Lab** — brighter sterile glass panels with restrained telemetry accents. (0.04)
3. **Retro-Futurist Flight Deck** — amber-forward CRT styling with medical overlays. (0.02)

### Chosen movement: Orbital Mission Control

**Core principles:** instrument-first hierarchy; calm clarity under pressure; layered glass over a starfield; every control produces visible system feedback.

**Color philosophy:** obsidian gives the UI the depth of a spacecraft viewport. Cyan is the signature signal color for trusted telemetry and navigation. Amber marks watch conditions without competing with primary actions. Crimson is reserved for critical health states. Pale blue-gray text keeps long medical labels legible without flattening the atmosphere.

**Layout paradigm:** a three-zone flight deck with a narrow command rail on the left, a broad diagnostic work surface in the center, and a vertical hologram/chat stack on the right. The footer telemetry strip acts as a persistent instrument bus rather than a conventional dashboard row.

**Signature elements:** thin cyan corner brackets and measurement ticks; a segmented mission-status header; a luminous anatomical wireframe framed like a scanner window.

**Interaction philosophy:** actions feel like commands sent to a spacecraft. Selection adds a cyan trace, scanning reveals a progress state, and every system response is echoed in the chat log or status rail. No dead ends or empty states.

**Animation:** slow starfield drift and scanline shimmer in the background; 150–220ms panel transitions; waveform and telemetry pulses use subtle eased loops; diagnostic scanning has a clear 3-second progression and a terminal summary state. Respect reduced-motion preferences.

**Typography system:** `Rajdhani` for navigation, labels, timestamps, and vital values; `Inter` for clinical descriptions and chat. Uppercase is reserved for mission labels and compact controls. Use tabular numerals for telemetry.

**Brand essence:** an onboard medical command deck for astronauts who need fast, trustworthy guidance when Earth is far away. Personality: vigilant, composed, exact.

**Brand voice:** direct, calm, and operational. Example lines: “Primary systems nominal. I’m watching the trend, not just the number.” “Place the thoracic leads inside the cyan guide ring; I’ll verify signal quality before interpretation.”

**Wordmark & logo:** a compact `ARES-IV` wordmark paired with a split-orbit chevron mark: two cyan arcs around a small amber star, echoed in the mission badge and favicon treatment.

**Signature brand color:** `#60E8FF` — a cool, luminous cyan reserved for telemetry, active states, and the ARES orbital trace.

## Front-end behavior

The default diagnostic grid presents all 18 requested test tiles. Selecting a tile opens a measurement modal with instructions, animated waveform, biomarker result, reference range, and a “Send Results to AI Doctor” action. Left-side views replace the center workspace with profile, health, chronic-condition, or history panels and always expose a back-to-grid control. The right rail stays available so the hologram and chat remain operational while the workspace changes.

The upload dropzone accepts the requested formats, shows a simulated OCR/vision progress sequence, previews the selected file, and adds a report summary to chat context. The top scan action runs a staged full-system sweep. The settings modal persists API and WebSocket URLs to local storage. Browser speech recognition is used when available and falls back to a visible unsupported-state message.

## Build and delivery workflow

1. Add the pinned Node toolchain and dependencies, including React, Vite, TypeScript, Lucide icons, and Recharts.
2. Register TypeScript diagnostics with the managed host before the first application-code batch.
3. Implement the UI in cohesive components, then add the service/context seams.
4. Add the route manifest and project logo metadata.
5. Start the Vite dev server on the configured port 3000 and verify the manifest and app response.
6. Run the production build and resolve actionable diagnostics.
7. Capture a desktop and mobile preview for visual inspection if needed.
8. Commit the delivered work and push to `origin/main` so the managed checkpoint is recorded.
