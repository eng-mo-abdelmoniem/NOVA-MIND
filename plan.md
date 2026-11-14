# Nova Mind Orbital Med-Bay — Implementation Plan

## Product scope

A single-screen Nova Mind astronaut medical command center that runs convincingly in simulation mode without a backend, while exposing clean integration points for the requested FastAPI/WebSocket bridge. The experience prioritizes the diagnostic grid, live telemetry, anatomical hologram, and Flight Surgeon chat as a cohesive operational surface rather than a generic dashboard.

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

### Chosen movement: Clinical Aerospace Console

**Core principles:** instrument-first hierarchy; calm clarity under pressure; soft clinical surfaces with precise aerospace accents; every control produces visible system feedback.

**Color philosophy:** pale blue-white surfaces create the trust and cleanliness of a clinical console while indigo telemetry bands anchor the spacecraft context. Blue is the signature navigation and data color, amber marks watch conditions, green confirms safe readings, and crimson is reserved for critical states.

**Layout paradigm:** a three-zone medical workstation with a narrow rounded command rail on the left, a bright six-column diagnostic work surface in the center, and a dedicated vertical hologram/scan tower on the right. The Flight Surgeon is summoned from a floating orbital assistant button, keeping the board open until conversation is needed. The indigo footer telemetry strip acts as a persistent instrument bus.

**Signature elements:** rounded white diagnostic cards with restrained colored signal marks; an indigo telemetry footer; a soft-blue hologram scanner window that retains the orbital anatomy motif.

**Interaction philosophy:** actions feel like commands sent to a spacecraft. Selection adds a cyan trace, scanning reveals a progress state, and every system response is echoed in the chat log or status rail. No dead ends or empty states.

**Animation:** keep the starfield extremely subtle; use 150–220ms card elevation and color transitions; waveform and telemetry pulses remain restrained; diagnostic scanning has a clear 3-second progression and terminal summary state. Respect reduced-motion preferences.

**Typography system:** `Rajdhani` for navigation, labels, timestamps, and vital values; `Inter` for clinical descriptions and chat. Uppercase is reserved for mission labels and compact controls. Use tabular numerals for telemetry.

**Brand essence:** an onboard medical command deck for astronauts who need fast, trustworthy guidance when Earth is far away. Personality: vigilant, composed, exact.

**Brand voice:** direct, calm, and operational. Example lines: “Primary systems nominal. I’m watching the trend, not just the number.” “Place the thoracic leads inside the cyan guide ring; I’ll verify signal quality before interpretation.”

**Wordmark & logo:** a compact `NOVA MIND` wordmark paired with a split-orbit chevron mark: two indigo arcs around a small amber star, echoed in the mission badge and favicon treatment.

**Signature brand color:** `#3D5FC8` — a clinical indigo reserved for active states, navigation, and the Nova Mind orbital trace.

## Front-end behavior

The default diagnostic grid presents all 18 requested test tiles. Selecting a tile opens a measurement modal with instructions, animated waveform, biomarker result, reference range, and a “Send Results to AI Doctor” action. Left-side views replace the center workspace with profile, health, chronic-condition, or history panels and always expose a back-to-grid control. The Flight Surgeon chat opens as a floating popup from the orbital assistant button, while the right rail stays dedicated to the interactive hologram and scan controls.

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
