# AstraMed integration

The header button **AI FLIGHT SURGEON: ACTIVE** opens the AstraMed dashboard in `src/components/AstraMedPanel.tsx`. The supplied source is preserved unchanged in `astramed-original/` for reference. Its Python service is not started or exposed by the website.

The current static website runs a typed port of the supplied transparent rules in `src/services/astramedEngine.ts`. Profiles, recent packet history, rolling baselines, cumulative radiation and event assessments are isolated in the visitor's page memory. Closing and reopening the dialog preserves the page session; reloading the page resets it. The original REST profile/result operations are implemented as local engine calls, and local event updates replace WebSocket broadcasts. No uploaded records or synthetic packet data are sent to a server by this integration.

There is no trained model, raw image/DNA/waveform interpretation, durable clinical storage, authentication, device ingestion, multi-user WebSocket service, or clinical validation. Use only synthetic data. Rule scores and thresholds are illustrative software examples, not medical advice or clinical probabilities.

The original duplicate/out-of-order behavior is intentionally corrected for packets that include a sequence ID: rejected packets do not change history, cumulative radiation, or rolling baselines. Sequence gaps are flagged rather than imputed. Sequence is optional in the submitted schema; sequence-less packets are treated as new observations because they cannot be reliably deduplicated, and the dialog says so. The supplied `requirements.txt` contains literal escaped newline sequences; it is retained as received, not used by the website build.

Run the website with `pnpm install --frozen-lockfile` and `pnpm dev --port 3000`. Validate with `pnpm build` and `node --experimental-strip-types --test tests/astramedEngine.test.ts` (Node 22+).
