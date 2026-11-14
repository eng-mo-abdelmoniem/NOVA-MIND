# ARES-IV Orbital Med-Bay — TODO

## 1. Build the single-view clinical aerospace shell
- Deliver a bright pale-blue clinical console inspired by the supplied reference, with rounded white diagnostic cards, restrained indigo navigation accents, amber watch states, crimson critical states, a subtle orbital background, Rajdhani/Inter typography, mission badge, live MET clock, AI Flight Surgeon status, notifications, and settings controls.
- Keep the layout responsive across desktop and mobile while preserving the left command rail, center six-column diagnostic workspace, dedicated right hologram/scan tower, floating Flight Surgeon launcher/popup, and fixed indigo telemetry footer hierarchy.

## 2. Deliver the diagnostic measurement grid and full-system scan
- Show the exact 18 unique tiles: Blood Test, Urine Test, Saliva Test, Sweat Test, Immune Panel, DNA / Microbe Test, Ultrasound, X-Ray, Eye & Vision (SANS), Bone Density, Blood Pressure, ECG, Oxygen Saturation, Temp & Breathing, Muscle Mass, Radiation Bio-Scan, Skin / Wound Scan, and IV Fluid & Hydration.
- Make every tile open a live sensor measurement modal with placement instructions, a 3-second scan animation, biomarker results, range comparison, and Send Results to AI Doctor.
- Make Request Medical Exam run a visible full-system diagnostic sweep with progress and summary.

## 3. Deliver the profile, health, chronic-condition, and history workspaces
- Profile must show astronaut identity, rank, age, blood type, mission duration, zero-G exposure, allergies, baseline vitals, and emergency evacuation protocol.
- General Health must provide 1 Month, 3 Months, 6 Months, and 1 Year controls, a calculated trajectory badge, and health trend charts.
- Chronic & Space-Induced Conditions must cover glycemic control, hypertension/orthostatic intolerance, space anemia, radiation sickness/burn risk, and current-vs-baseline risk summaries.
- History must provide 24-hour/7-day switching, search/filter, structured medical logs, and a working JSON/CSV export.

## 4. Deliver the anatomical hologram and protocol interactions
- Show a realistic full-body human medical-scan hologram with cyan/indigo treatment, front/back toggle, Full Body/Skeletal/Organs/Surface-Wounds layers, clickable major body regions, highlight/focus state, first-aid protocol card, and Holographic Human Body Analysis scan.
- Clicking a body region must notify the chat context and surface a specific zero-G first-aid protocol.

## 5. Deliver upload, chat, telemetry, and settings behaviors
- Accept PDF/JPG/PNG/DICOM uploads via drag-and-drop or file picker, show AI Vision & OCR progress, preview the file, extract simulated findings, and inject the report into chat context.
- Provide a floating Flight Surgeon launcher that opens a popup chat with timestamps, text send, voice-input control, and command parsing for navigation, tests, vital modals, hologram highlighting, and full scans.
- Provide five live telemetry cards for glucose, oxygen, heart rate, blood pressure, and radiation, each with 24-hour/7-day chart modal, stats, and clinical notes.
- Persist editable FastAPI and WebSocket URLs in localStorage and expose centralized bridge methods with local simulation fallback.

## 6. Complete the managed build handoff
- Serve `public/manus-routes.json` for the `/` route, set project logo metadata, run diagnostics and production build, verify preview readiness, and push the completed work to the managed `origin/main` checkpoint.
