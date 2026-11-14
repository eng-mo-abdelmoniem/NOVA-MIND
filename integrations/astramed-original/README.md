# AstraMed Multimodal prototype

## Windows quick start
Install Python 3.11+. Extract this ZIP, open the folder in VS Code, then Terminal > New Terminal:
```powershell
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```
Open http://127.0.0.1:8000. API docs: http://127.0.0.1:8000/docs.

## Try it
1. Click **Create demo diabetes profile**.
2. Choose `blood`, enter `{"glucose_mg_dl":55}`, click Submit result.
3. Try `sleep` with `{"sleep_hours":3.5}`.
4. Try `ecg` with `{"heart_rate_bpm":130,"spo2_pct":88}`.
5. Try `radiation` with `{"dose_mSv":2.5}`.
Use synthetic values only.

## Architecture
18 modality packets -> Pydantic validation -> sequence/quality checks -> longitudinal profile ->
chronic-condition and baseline context -> transparent multi-signal rule engine -> alerts ->
REST and WebSocket dashboard.

Supported test types: blood, urine, saliva, sweat, immune, dna, ultrasound, xray, retina, vision,
blood_pressure, ecg, oxygen_saturation, temperature_breathing, sleep, radiation, skin_wound, iv_fluid.
Results accept metrics, units, quality, findings and optional image URI. Raw image, DNA, ECG waveform,
or lab instrument interpretation is not included.

## API
- POST /profiles — create/update astronaut profile
- GET /profiles/{astronaut_id} — profile and recent tests
- POST /results — ingest test result and receive alert
- WS /ws — live dashboard events
- GET /health — service status

## Critical safety limits
Not production-ready or clinically validated. Thresholds are illustrative software examples, not
medical advice. Do not use for diagnosis, treatment, or real crew triage. State is in memory and
resets at restart. Operational use requires clinical governance, validated devices/models/protocols,
secure identity/authentication, encryption, durable storage, audit logs, offline failover, redundancy,
cybersecurity and human medical authority.
