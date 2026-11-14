# Nova Mind Orbital Med-Bay — TODO

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
- Show a real interactive 3D full-body human model rendered as a blue hologram, with front/back rotation, Full Body/Skeletal/Organs/Surface-Wounds layer treatments, clickable major body regions, highlight/focus state, first-aid protocol card, and Holographic Human Body Analysis scan.
- Clicking a body region must notify the chat context and surface a specific zero-G first-aid protocol.

## 5. Deliver upload, chat, telemetry, and settings behaviors
- Accept PDF/JPG/PNG/DICOM uploads via drag-and-drop or file picker, show AI Vision & OCR progress, preview the file, extract simulated findings, and inject the report into chat context.
- Provide a floating Flight Surgeon launcher that opens a popup chat with timestamps, text send, voice-input control, and command parsing for navigation, tests, vital modals, hologram highlighting, and full scans.
- Provide five live telemetry cards for glucose, oxygen, heart rate, blood pressure, and radiation, each with 24-hour/7-day chart modal, stats, and clinical notes.
- Persist editable FastAPI and WebSocket URLs in localStorage and expose centralized bridge methods with local simulation fallback.

## 6. Complete the managed build handoff
- Serve `public/manus-routes.json` for the `/` route, set project logo metadata, run diagnostics and production build, verify preview readiness, and push the completed work to the managed `origin/main` checkpoint.

## 7. Convert the supplied anatomical reference into the site’s 3D hologram
- [x] Use the user-supplied `ares-human-hologram-clean.webp` as the image-to-3D reference; maintain the same icy-blue color, full-body pose, human silhouette, and X-ray/anatomical design as closely as a single-view reconstruction permits.
- [x] Display the generated textured GLB in the existing anatomical-guide panel rather than stripping its texture or substituting a generic human figure. Keep the existing dashboard, front/back views, scanning, and region/protocol interactions.
- [x] Ship the generated model at a same-origin static website path so the browser’s GLTF loader can fetch it reliably; show explicit loading/error states, dispose rendering resources safely, and checkpoint the delivered change. Preserve existing Auto Publish authorization.

Validation: exact-source front artwork projected on actual image-derived geometry; successful full-body scanner rendering; `pnpm build` and `git diff --check` pass; focused read-only review passes. Side/back anatomy is inferred and layers remain display presets.

## 8. Deliver consistent 360-degree front/back studio presentation
- [x] Use the subject “full-body blue X-ray human anatomy hologram” for the supplied `[اسم النموذج هنا]` placeholder; maintain the same complete-body proportions, pose, icy-blue palette, and photorealistic X-ray material in both front and posterior views.
- [x] Keep front/back views on the same continuous 3D geometry and topology with correctly oriented matching X-ray artwork on front and rear surfaces, rather than rendering a blank silhouette on the rear.
- [x] Use a pure white `#FFFFFF` anatomical viewport background, no background shadow, crisp edges, and detailed texture in the site’s model view.
- [ ] Soft even studio lighting: the current display preserves texture-baked shading through an unlit material; it does not implement a physically lit studio setup.

Validation: built successfully; screenshot checks show the full-body front art and an anatomically detailed posterior view on the same model with the white studio field.
