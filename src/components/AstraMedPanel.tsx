import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowUpRight, Check, ClipboardList, RefreshCw, ShieldCheck, Stethoscope, X } from 'lucide-react'
import { astramedEngine, createDemoProfile, TEST_TYPES, type Alert, type AstronautProfile, type ResultEvent, type TestResult, type TestType } from '../services/astramedEngine'
import './AstraMedPanel.css'

const modalityLabels: Record<TestType, string> = {
  blood: 'Blood', urine: 'Urine', saliva: 'Saliva', sweat: 'Sweat', immune: 'Immune', dna: 'DNA',
  ultrasound: 'Ultrasound', xray: 'X-Ray', retina: 'Retina', vision: 'Vision', blood_pressure: 'Blood Pressure',
  ecg: 'ECG', oxygen_saturation: 'Oxygen Saturation', temperature_breathing: 'Temperature / Breathing',
  sleep: 'Sleep', radiation: 'Radiation', skin_wound: 'Skin / Wound', iv_fluid: 'IV Fluid',
}
const metricExamples: Record<TestType, Record<string, unknown>> = {
  blood: { glucose_mg_dl: 145, sleep_hours: 7.2 }, urine: { specific_gravity: 1.018 },
  saliva: { cortisol_ug_dl: 11.8 }, sweat: { sodium_mmol_l: 42 }, immune: { immune_index: 92 },
  dna: {}, ultrasound: {}, xray: {}, retina: {}, vision: {}, blood_pressure: { systolic_mmhg: 120, diastolic_mmhg: 80 },
  ecg: { heart_rate_bpm: 72, spo2_pct: 98 }, oxygen_saturation: { spo2_pct: 98 },
  temperature_breathing: { temperature_c: 36.8, respiration_per_min: 15 }, sleep: { sleep_hours: 7.2 },
  radiation: { dose_mSv: 2.5 }, skin_wound: {}, iv_fluid: { hydration_index: 86 },
}
const presets: { label: string; type: TestType; metrics: Record<string, number> }[] = [
  { label: 'Low glucose', type: 'blood', metrics: { glucose_mg_dl: 55 } },
  { label: 'Short sleep', type: 'sleep', metrics: { sleep_hours: 3.5 } },
  { label: 'HR + oxygen', type: 'ecg', metrics: { heart_rate_bpm: 130, spo2_pct: 88 } },
  { label: 'Radiation', type: 'radiation', metrics: { dose_mSv: 2.5 } },
]

function readableTime(timestamp: string) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function humanize(value: string) { return value.replaceAll('_', ' ').toLowerCase() }

export default function AstraMedPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [astronautId, setAstronautId] = useState('crew-01')
  const [testType, setTestType] = useState<TestType>('blood')
  const [quality, setQuality] = useState('good')
  const [metricsText, setMetricsText] = useState(JSON.stringify(metricExamples.blood, null, 2))
  const [findings, setFindings] = useState('')
  const [sequence, setSequence] = useState('')
  const [crewProfile, setCrewProfile] = useState<AstronautProfile | null>(null)
  const [recentResults, setRecentResults] = useState<TestResult[]>([])
  const [events, setEvents] = useState<ResultEvent[]>([])
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const selectedId = astronautId.trim()
  const crewEvents = events.filter((event) => event.result.astronaut_id === selectedId)
  const latest = crewEvents[0]?.alert

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || !open) return
    const previous = document.activeElement as HTMLElement | null
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = oldOverflow
      previous?.focus()
    }
  }, [open])

  useEffect(() => {
    const snapshot = astramedEngine.getProfile(selectedId)
    setCrewProfile(snapshot?.profile ?? null)
    setRecentResults(snapshot?.recent_results ?? [])
    setFeedback('')
    setError('')
  }, [selectedId])

  const refreshProfile = (announce = true) => {
    const snapshot = astramedEngine.getProfile(selectedId)
    setCrewProfile(snapshot?.profile ?? null)
    setRecentResults(snapshot?.recent_results ?? [])
    if (announce) setFeedback(snapshot ? 'Profile refreshed from this browser session.' : 'No profile yet. Create the synthetic demo profile below.')
  }

  const seedProfile = () => {
    try {
      if (crewProfile && !window.confirm('Replace this synthetic crew profile with the demo diabetes profile? Existing packet history will be retained.')) return
      astramedEngine.setProfile(createDemoProfile(selectedId))
      refreshProfile(false)
      setError('')
      setFeedback('Synthetic diabetes profile created: mission day 42, baseline glucose 110 mg/dL, recorded radiation 12 mSv.')
    } catch (cause) {
      setFeedback('')
      setError(cause instanceof Error ? cause.message : 'Could not create profile.')
    }
  }

  const changeModality = (type: TestType) => {
    setTestType(type)
    setMetricsText(JSON.stringify(metricExamples[type], null, 2))
    setSequence('')
    setError('')
    setFeedback('')
  }

  const submitResult = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setFeedback('')
    try {
      const metrics: unknown = JSON.parse(metricsText)
      if (!metrics || Array.isArray(metrics) || typeof metrics !== 'object') throw new Error('Metrics must be a JSON object, for example {"glucose_mg_dl":55}.')
      const packet: TestResult = {
        astronaut_id: selectedId, test_type: testType, quality, timestamp: new Date().toISOString(),
        source_device: 'ares-astramed-synthetic-console', metrics: metrics as Record<string, unknown>,
        findings: findings.trim() ? [findings.trim()] : [],
        ...(sequence.trim() ? { sequence: Number(sequence) } : {}),
      }
      const result = astramedEngine.ingest(packet)
      setEvents((current) => [result, ...current].slice(0, 100))
      refreshProfile(false)
      setFeedback(result.accepted ? 'Synthetic packet accepted. Assessment and session history updated.' : 'Duplicate / out-of-order packet assessed but excluded from history and profile updates.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Packet could not be processed.')
    }
  }

  return <dialog id="astramed-flight-surgeon" ref={dialogRef} className="astramed-dialog" aria-labelledby="astramed-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
    <div className="astramed-shell">
      <header className="astramed-header">
        <div className="astramed-brand"><span className="astramed-mark"><Stethoscope size={23} /></span><div><span className="eyebrow">AI FLIGHT SURGEON / MULTIMODAL CREW HEALTH</span><h2 id="astramed-title">AstraMed <span>Medical overview</span></h2></div></div>
        <div className="astramed-header-actions"><span className="astramed-mode"><i /> BROWSER-LOCAL DEMO</span><button type="button" className="icon-button" aria-label="Close AstraMed Flight Surgeon" onClick={onClose}><X size={19} /></button></div>
      </header>
      <div className="astramed-content">
        <div className="astramed-safety"><ShieldCheck size={20} /><div><strong>Synthetic data only. Human medical review required.</strong><p>Educational prototype, not clinically validated. Illustrative rules are not medical advice, diagnosis, treatment, or a flight-surgeon replacement.</p></div></div>
        <div className="astramed-overview-heading"><div><span className="eyebrow">LONGITUDINAL CREW PROFILE</span><h3>One crew member. Every signal.</h3></div><button type="button" className="ghost-button" onClick={() => refreshProfile()}><RefreshCw size={13} /> Refresh profile</button></div>
        <section className="astramed-stats" aria-label="Crew profile overview">
          <div><span>ASTRONAUT ID</span><strong>{selectedId || 'Not set'}</strong><small>{crewProfile ? `Mission day ${crewProfile.mission_day}` : 'Create a demo profile to enable baselines'}</small></div>
          <div><span>CUMULATIVE RADIATION</span><strong>{crewProfile ? +crewProfile.cumulative_radiation_mSv.toFixed(3) : '—'} <em>mSv</em></strong><small>Recorded synthetic dose · not a safety limit</small></div>
          <div><span>CHRONIC CONDITIONS</span><strong>{crewProfile?.chronic_conditions.length ?? '—'}</strong><small>{crewProfile?.chronic_conditions.map((condition) => condition.name).join(' · ') || 'No demo profile loaded'}</small></div>
        </section>
        <div className="astramed-main-grid">
          <section className="astramed-card astramed-intake">
            <div className="astramed-card-heading"><span className="astramed-section-icon"><ClipboardList size={18} /></span><div><span className="eyebrow">18 TEST DOMAINS</span><h3>Submit a test packet</h3></div></div>
            <p className="astramed-muted">Enter synthetic observations. Each packet is checked against your prototype’s transparent rules.</p>
            <form onSubmit={submitResult}>
              <div className="astramed-form-grid">
                <label>Astronaut ID<input value={astronautId} onChange={(event) => setAstronautId(event.target.value)} required maxLength={80} autoComplete="off" /></label>
                <label>Test type<select value={testType} onChange={(event) => changeModality(event.target.value as TestType)}>{TEST_TYPES.map((type) => <option key={type} value={type}>{modalityLabels[type]}</option>)}</select></label>
                <label>Data quality<select value={quality} onChange={(event) => setQuality(event.target.value)}>{['good', 'degraded', 'poor', 'unknown', 'invalid'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
                <label>Sequence <span>(optional)</span><input type="number" min="0" step="1" value={sequence} onChange={(event) => setSequence(event.target.value)} placeholder="e.g. 1" /><small className="astramed-field-help">Sequence IDs enable duplicate/out-of-order detection. Without an ID, a repeated packet cannot be identified.</small></label>
              </div>
              <label className="astramed-json-label">Metrics JSON<textarea value={metricsText} onChange={(event) => setMetricsText(event.target.value)} rows={5} spellCheck={false} required aria-describedby="astramed-metrics-help" /></label>
              <p id="astramed-metrics-help" className="astramed-field-help">Units are encoded in metric keys: glucose_mg_dl, heart_rate_bpm, spo2_pct, temperature_c, sleep_hours, dose_mSv. Basic input bounds prevent malformed sensor payloads; they are not clinical reference intervals. Other metrics are stored without additional interpretation.</p>
              <label>Findings <span>(optional)</span><input value={findings} onChange={(event) => setFindings(event.target.value)} placeholder="A synthetic finding, if any" maxLength={2000} /></label>
              <div className="astramed-presets"><span>LOAD AN EXAMPLE</span><div>{presets.map((preset) => <button type="button" key={preset.label} onClick={() => { setTestType(preset.type); setMetricsText(JSON.stringify(preset.metrics, null, 2)); setSequence(''); setError(''); setFeedback('') }}>{preset.label}<ArrowUpRight size={11} /></button>)}</div></div>
              <div className="astramed-submit-row"><button className="primary-button" type="submit"><Activity size={14} /> Submit result</button><button className="ghost-button" type="button" onClick={seedProfile}>Create demo diabetes profile</button></div>
              {error && <p className="astramed-feedback error" role="alert"><AlertTriangle size={14} />{error}</p>}
              {feedback && <p className="astramed-feedback" role="status"><Check size={14} />{feedback}</p>}
            </form>
          </section>
          <div className="astramed-assessment-column">
            <AssessmentCard alert={latest} />
            <section className="astramed-card astramed-profile-context"><span className="eyebrow">PROFILE CONTEXT</span><h3>Baseline &amp; follow-up</h3>{crewProfile ? <><dl>{Object.entries(crewProfile.baseline).map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd>{+value.toFixed(2)}</dd></div>)}</dl><p className="astramed-muted">Good-quality, accepted observations update the rolling baseline. Duplicate packets do not alter this profile.</p></> : <p className="astramed-muted">Create the demo profile to activate diabetes context, rolling baselines, and cumulative radiation tracking. No actual astronaut record is loaded.</p>}</section>
          </div>
        </div>
        <section className="astramed-card astramed-modalities"><div><span className="eyebrow">SUPPORTED MODALITIES</span><h3>18 domains, one intake</h3></div><div className="astramed-modality-chips">{TEST_TYPES.map((type) => <button key={type} type="button" className={testType === type ? 'selected' : ''} onClick={() => changeModality(type)} aria-pressed={testType === type}>{modalityLabels[type]}</button>)}</div><p className="astramed-muted">Raw imaging, DNA sequence, ECG waveform, and lab instrument signal interpretation are not implemented. Findings are submitted text, not verified image analysis.</p></section>
        <div className="astramed-history-grid">
          <section className="astramed-card"><div className="astramed-history-heading"><div><span className="eyebrow">SESSION EVENT STREAM</span><h3>Assessment events</h3></div><span>{crewEvents.length} events</span></div><div className="astramed-event-list">{crewEvents.length ? crewEvents.slice(0, 12).map((event, index) => <div className="astramed-event" key={`${event.alert.timestamp}-${index}`}><span className={`astramed-level ${event.alert.level.toLowerCase()}`}>{event.alert.level}</span><div><strong>{humanize(event.alert.risk)}</strong><small>{modalityLabels[event.result.test_type]} · {event.accepted ? 'Accepted' : 'Excluded from history'}</small></div><time>{readableTime(event.alert.timestamp)}</time></div>) : <p className="astramed-empty">No events yet. Submit an example packet to see the assessment stream.</p>}</div></section>
          <section className="astramed-card"><div className="astramed-history-heading"><div><span className="eyebrow">LONGITUDINAL HISTORY</span><h3>Recent accepted results</h3></div><span>{recentResults.length} results</span></div><div className="astramed-event-list">{recentResults.length ? recentResults.slice().reverse().slice(0, 12).map((result, index) => <div className="astramed-result" key={`${result.timestamp}-${index}`}><div><strong>{modalityLabels[result.test_type]}</strong><small>{result.quality} quality{result.sequence !== undefined ? ` · Sequence ${result.sequence}` : ''}</small><code>{JSON.stringify(result.metrics)}</code></div><time>{readableTime(result.timestamp)}</time></div>) : <p className="astramed-empty">Accepted packets appear here after a demo profile is created. No persistent medical data is stored.</p>}</div></section>
        </div>
        <footer className="astramed-footer"><ShieldCheck size={15} /><p>Your prototype’s rules run in this browser only; no records are sent to a backend. Data resets on page reload. Session events replace the standalone prototype’s WebSocket feed.</p></footer>
      </div>
    </div>
  </dialog>
}

function AssessmentCard({ alert }: { alert?: Alert }) {
  return <section className={`astramed-card astramed-assessment ${alert?.level.toLowerCase() ?? 'waiting'}`} aria-live="polite" aria-atomic="true">
    <div className="astramed-history-heading"><div><span className="eyebrow">TRANSPARENT RULE ENGINE</span><h3>Latest assessment</h3></div>{alert && <span className={`astramed-level ${alert.level.toLowerCase()}`}>{alert.level}</span>}</div>
    {alert ? <><div className="astramed-risk"><strong>{humanize(alert.risk)}</strong><span>{alert.score}<small>/100</small></span></div><p className="astramed-field-help">Illustrative rule score · not a clinical risk probability</p><ul className="astramed-reasons">{alert.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul><h4>Action guidance</h4><ol className="astramed-actions">{alert.actions.map((action, index) => <li key={index}>{action}</li>)}</ol><div className="astramed-review"><ShieldCheck size={14} /> Human review required</div></> : <div className="astramed-waiting"><Activity size={36} /><strong>Waiting for a test packet</strong><p>No assessment has been made. Load an example and submit it to explore your rules.</p></div>}
  </section>
}
