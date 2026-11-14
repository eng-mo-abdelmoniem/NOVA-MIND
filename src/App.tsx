import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Bell, Brain, Check, ChevronDown, CircleHelp, Download, FileScan, Gauge, HeartPulse, Info, Layers3, Mic, PanelRight, Play, Plus, Radio, RefreshCw, ScanLine, Search, Send, Settings, ShieldCheck, Sparkles, Stethoscope, Upload, UserRound, Waves, X, Zap } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { analyzeHologramRegion, connectTelemetryWebSocket, getBackendConfig, saveBackendConfig, sendChatToCustomAI, testBackendConnection, triggerDiagnosticTest, uploadMedicalReport, type AICommand } from './services/aiBridge'
import { bodyParts, chronicSeries, diagnosticTests, healthSeries, medicalLog, profile, telemetrySeed, alerts, type DiagnosticTest, type TabId } from './data'
import { useHudCommand } from './context/HudCommandContext'

type ChatMessage = { id: number; role: 'user' | 'assistant'; text: string; time: string; tone?: 'system' | 'alert' }
type Modal = { type: 'test'; testId: string } | { type: 'vital'; vital: string } | { type: 'scan' } | { type: 'settings' } | null

const tabLabels: Record<TabId, string> = { grid: 'Diagnostics', profile: 'Profile', health: 'General Health', chronic: 'Chronic Conditions', history: 'Medical History' }
const vitalMeta: Record<string, { label: string; unit: string; color: string; note: string }> = {
  glucose: { label: 'Glucose level', unit: 'mg/dL', color: '#f4b860', note: 'Stable against the mission baseline. Continue current meal timing.' },
  oxygen: { label: 'Oxygen saturation', unit: '%', color: '#70e8bb', note: 'Optimal peripheral oxygenation. No respiratory intervention required.' },
  heartRate: { label: 'Heart rate', unit: 'bpm', color: '#60e8ff', note: 'Sinus rhythm and variability remain nominal at rest.' },
  bloodPressure: { label: 'Blood pressure', unit: 'mmHg', color: '#b49bff', note: 'No orthostatic intolerance signal in current orbital reading.' },
  radiation: { label: 'Radiation dose', unit: 'mSv', color: '#f4b860', note: 'Elevated watch only. Daily cumulative dose remains below the alert threshold.' },
}

function timeLabel() {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' }).format(new Date()) + ' UTC'
}

function IconBadge({ children, tone = 'cyan' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`icon-badge tone-${tone}`}>{children}</span>
}

function SectionLabel({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>
}

function MiniSpark({ color = '#60e8ff', points = [12, 16, 13, 19, 15, 24, 22, 28] }: { color?: string; points?: number[] }) {
  const d = points.map((point, index) => `${index * 18},${34 - point}`).join(' ')
  return <svg className="mini-spark" viewBox="0 0 126 34" aria-hidden="true"><polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="126" cy={34 - points[points.length - 1]} r="2.7" fill={color} /></svg>
}

function StatusPill({ children, tone = 'green' }: { children: React.ReactNode; tone?: 'green' | 'amber' | 'cyan' | 'red' }) {
  return <span className={`status-pill ${tone}`}><span className="status-dot" />{children}</span>
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('grid')
  const [clock, setClock] = useState(timeLabel())
  const [telemetry, setTelemetry] = useState(telemetrySeed)
  const [modal, setModal] = useState<Modal>(null)
  const [selectedPart, setSelectedPart] = useState('left_arm')
  const [hologramView, setHologramView] = useState<'front' | 'back'>('front')
  const [hologramLayer, setHologramLayer] = useState('Full Body')
  const [scanProgress, setScanProgress] = useState<number | null>(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'assistant', text: 'ARES-IV Flight Surgeon online. Primary life-support biometrics are stable. What should I inspect?', time: '14:24:10' },
    { id: 2, role: 'assistant', text: 'A mild left forearm contusion is resolving. I can open the wound scan or walk you through sterile dressing protocol.', time: '14:25:02', tone: 'system' },
  ])
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [uploadedReport, setUploadedReport] = useState<{ name: string; summary: string } | null>(null)
  const [historyQuery, setHistoryQuery] = useState('')
  const [historyRange, setHistoryRange] = useState<'24h' | '7d'>('24h')
  const [healthRange, setHealthRange] = useState('6 Months')
  const [isListening, setIsListening] = useState(false)
  const [protocolOpen, setProtocolOpen] = useState(false)
  const [bridgeOnline, setBridgeOnline] = useState(false)
  const [bridgeVersion, setBridgeVersion] = useState(0)
  const uploadRef = useRef<HTMLInputElement>(null)
  const { registerHandlers, executeAIResponse } = useHudCommand()

  useEffect(() => {
    const ticker = window.setInterval(() => setClock(timeLabel()), 1000)
    return () => window.clearInterval(ticker)
  }, [])

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setTelemetry((current) => ({
        glucose: Math.max(103, Math.min(118, current.glucose + (Math.random() > 0.5 ? 1 : -1))),
        oxygen: Math.max(97, Math.min(99, current.oxygen + (Math.random() > 0.6 ? 1 : -1))),
        heartRate: Math.max(68, Math.min(78, current.heartRate + (Math.random() > 0.5 ? 1 : -1))),
        bpSys: Math.max(116, Math.min(124, current.bpSys + (Math.random() > 0.5 ? 1 : -1))),
        bpDia: Math.max(76, Math.min(83, current.bpDia + (Math.random() > 0.5 ? 1 : -1))),
        radiation: +(current.radiation + (Math.random() > 0.82 ? 0.01 : 0)).toFixed(2),
      }))
    }, 2500)
    return () => window.clearInterval(ticker)
  }, [])

  useEffect(() => {
    const disconnect = connectTelemetryWebSocket((payload) => {
      const vitals = (payload as { vitals?: Record<string, number> })?.vitals
      if (!vitals) return
      setTelemetry((current) => ({
        glucose: vitals.glucose ?? current.glucose,
        oxygen: vitals.oxygen ?? current.oxygen,
        heartRate: vitals.heartRate ?? vitals.heart_rate ?? current.heartRate,
        bpSys: vitals.bpSys ?? vitals.bp_sys ?? current.bpSys,
        bpDia: vitals.bpDia ?? vitals.bp_dia ?? current.bpDia,
        radiation: vitals.radiation ?? current.radiation,
      }))
    }, (online) => setBridgeOnline(online))
    return disconnect
  }, [bridgeVersion])

  useEffect(() => {
    const refresh = () => setBridgeVersion((value) => value + 1)
    window.addEventListener('ares-config-changed', refresh)
    return () => window.removeEventListener('ares-config-changed', refresh)
  }, [])

  const addMessage = useCallback((role: ChatMessage['role'], text: string, tone?: ChatMessage['tone']) => {
    setChatMessages((messages) => [...messages, { id: Date.now() + Math.random(), role, text, tone, time: timeLabel().replace(' UTC', '') }])
  }, [])

  const openTest = useCallback((target: string) => {
    const normalized = target.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    const compact = normalized.replace(/[^a-z0-9]/g, '')
    const matched = diagnosticTests.find((test) => test.id === normalized || test.id.replace(/[^a-z0-9]/g, '') === compact || test.name.toLowerCase() === normalized || test.name.toLowerCase().replace(/[^a-z0-9]/g, '') === compact || test.name.toLowerCase().includes(normalized))
    if (!matched) {
      addMessage('assistant', `I could not map “${target}” to a sensor channel. Try ECG, Blood Test, or Radiation Bio-Scan.`, 'alert')
      return
    }
    setActiveTab('grid')
    setModal({ type: 'test', testId: matched.id })
  }, [addMessage])

  const highlightPart = useCallback((target: string) => {
    const normalized = target.toLowerCase().replace(/\s+/g, '_')
    const part = bodyParts.find((item) => item.id === normalized) ?? bodyParts.find((item) => item.label.toLowerCase().includes(target.toLowerCase())) ?? bodyParts.find((item) => item.id === 'left_arm')!
    setSelectedPart(part.id)
    addMessage('assistant', `${part.label} selected on the hologram. The zero-G first-aid protocol is now visible below the scanner.`, 'system')
  }, [addMessage])

  const runFullScan = useCallback(() => {
    setModal({ type: 'scan' })
    setScanProgress(0)
  }, [])

  const openVital = useCallback((target: string) => {
    const aliases: Record<string, string> = { 'heart rate': 'heartRate', heart_rate: 'heartRate', 'oxygen saturation': 'oxygen', spo2: 'oxygen', 'blood pressure': 'bloodPressure', blood_pressure: 'bloodPressure', 'radiation dose': 'radiation', glucose: 'glucose', oxygen: 'oxygen', radiation: 'radiation' }
    const normalized = target.toLowerCase().trim()
    setModal({ type: 'vital', vital: aliases[normalized] ?? target })
  }, [])
  const openFullTrend = useCallback((target: string) => { setModal(null); setActiveTab('health'); addMessage('assistant', `Opening the full ${vitalMeta[target]?.label ?? 'vital'} trend in General Health.`, 'system') }, [addMessage])

  const navigateTab = useCallback((target: string) => {
    const normalized = target.toLowerCase().trim()
    const aliases: Record<string, TabId> = { diagnostics: 'grid', 'diagnostic grid': 'grid', profile: 'profile', health: 'health', 'general health': 'health', chronic: 'chronic', 'chronic diseases': 'chronic', 'chronic conditions': 'chronic', history: 'history', 'medical history': 'history' }
    setActiveTab(aliases[normalized] ?? 'grid')
  }, [])

  useEffect(() => {
    registerHandlers({
      OPEN_TEST: (command: AICommand) => openTest(command.target),
      HIGHLIGHT_HOLOGRAM: (command: AICommand) => highlightPart(command.target),
      NAVIGATE_TAB: (command: AICommand) => navigateTab(command.target),
      OPEN_VITAL_MODAL: (command: AICommand) => openVital(command.target),
      RUN_FULL_SCAN: runFullScan,
    })
  }, [highlightPart, navigateTab, openTest, openVital, registerHandlers, runFullScan])

  useEffect(() => {
    if (scanProgress === null || scanProgress >= 100) return
    const timer = window.setTimeout(() => setScanProgress((value) => Math.min(100, (value ?? 0) + 10)), 240)
    return () => window.clearTimeout(timer)
  }, [modal, scanProgress])

  const selectedBodyPart = bodyParts.find((item) => item.id === selectedPart) ?? bodyParts[5]
  const currentTest = modal?.type === 'test' ? diagnosticTests.find((test) => test.id === modal.testId) : undefined

  const handleChat = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const message = chatInput.trim()
    if (!message) return
    setChatInput('')
    addMessage('user', message)
    const response = await sendChatToCustomAI(message, { selectedBodyPart: selectedPart, uploadedReport: uploadedReport?.summary, telemetry })
    addMessage('assistant', response.reply)
    executeAIResponse(response)
  }

  const startVoice = () => {
    const SpeechRecognition = (window as unknown as { webkitSpeechRecognition?: new () => { lang: string; start: () => void; onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void } }).webkitSpeechRecognition
    if (!SpeechRecognition) { addMessage('assistant', 'Voice input is not available in this browser. You can still use the text channel.', 'alert'); return }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.onresult = (event) => { setChatInput(event.results[0][0].transcript) }
    recognition.onend = () => setIsListening(false)
    setIsListening(true)
    recognition.start()
  }

  const handleUpload = async (file?: File) => {
    if (!file) return
    const extension = file.name.split('.').pop()?.toLowerCase()
    const isDicom = extension === 'dicom' || extension === 'dcm' || file.type === 'application/dicom' || file.type === 'application/dicom+json'
    const allowed = new Set(['pdf', 'jpg', 'jpeg', 'png'])
    if (!isDicom && (!extension || !allowed.has(extension))) {
      addMessage('assistant', 'Evidence Intake accepts PDF, JPG, PNG, or DICOM files only.', 'alert')
      return
    }
    setUploadProgress(0)
    for (const progress of [20, 42, 68, 84]) {
      await new Promise((resolve) => window.setTimeout(resolve, 260))
      setUploadProgress(progress)
    }
    const result = await uploadMedicalReport(file)
    setUploadedReport({ name: result.filename, summary: result.ai_analysis })
    setUploadProgress(100)
    addMessage('assistant', `Report context added: ${result.ai_analysis}`, 'system')
    window.setTimeout(() => setUploadProgress(null), 900)
  }

  const handleHologramPart = async (id: string) => {
    setSelectedPart(id)
    const part = bodyParts.find((item) => item.id === id)
    if (part) addMessage('assistant', `${part.label} selected. I am checking the anatomical layer and preparing the first-aid protocol.`)
    const result = await analyzeHologramRegion(id, hologramView)
    if (result.anatomical_notes) addMessage('assistant', `${result.anatomical_notes} ${Array.isArray(result.first_aid_protocol) ? result.first_aid_protocol[0] : ''}`, 'system')
  }

  const filteredLog = medicalLog.filter((row) => `${row.type} ${row.metric} ${row.result}`.toLowerCase().includes(historyQuery.toLowerCase()))

  const exportLog = (format: 'json' | 'csv') => {
    const payload = format === 'json' ? JSON.stringify(filteredLog, null, 2) : ['time,type,metric,result,status', ...filteredLog.map((row) => Object.values(row).join(','))].join('\n')
    const blob = new Blob([payload], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `ares-medical-log.${format}`; link.click(); URL.revokeObjectURL(link.href)
  }

  const navigateBack = () => setActiveTab('grid')

  return <div className="app-shell">
    <Starfield />
    <header className="topbar">
      <div className="mission-lockup">
        <div className="orbit-mark"><span>✦</span><i /></div>
        <div><div className="mission-name">ARES-IV <span>//</span> ORBITAL MED-BAY</div><div className="mission-sub">CREW HEALTH COMMAND DECK <span className="sep">·</span> MISSION DAY 142</div></div>
      </div>
      <button className="exam-button" onClick={runFullScan}><ScanLine size={18} /><span>REQUEST MEDICAL EXAM</span><ArrowUpRight size={15} /></button>
      <div className="top-actions">
        <div className="met-block"><span className="eyebrow">MISSION ELAPSED TIME</span><strong>DAY 142 <span>|</span> {clock}</strong></div>
        <StatusPill tone="green">AI FLIGHT SURGEON: ACTIVE</StatusPill>
        <div className="header-icon-wrap"><button className="header-icon" aria-label="Open alerts" onClick={() => setNotificationsOpen((value) => !value)}><Bell size={17} /><span className="notification-dot">3</span></button>{notificationsOpen && <NotificationTray />}</div>
        <button className="header-icon" aria-label="Open settings" onClick={() => setModal({ type: 'settings' })}><Settings size={17} /></button>
      </div>
    </header>

    <div className="dashboard-layout">
      <aside className="left-rail">
        <nav className="command-nav">
          <span className="rail-caption">COMMAND MODULE</span>
          <NavItem icon={<Gauge size={17} />} label="Diagnostic Grid" active={activeTab === 'grid'} onClick={() => setActiveTab('grid')} />
          <NavItem icon={<UserRound size={17} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          <NavItem icon={<Activity size={17} />} label="General Health" active={activeTab === 'health'} onClick={() => setActiveTab('health')} />
          <NavItem icon={<HeartPulse size={17} />} label="Chronic Conditions" active={activeTab === 'chronic'} onClick={() => setActiveTab('chronic')} badge="02" />
          <NavItem icon={<FileScan size={17} />} label="Medical History" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </nav>
        <div className="rail-divider" />
        <UploadPanel progress={uploadProgress} report={uploadedReport} onClick={() => uploadRef.current?.click()} onDrop={handleUpload} />
        <input ref={uploadRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.dicom,.dcm,application/dicom" onChange={(event) => handleUpload(event.target.files?.[0])} />
        <div className="rail-footer"><div><span className="status-dot green" /> SIMULATION MODE</div><button onClick={() => setModal({ type: 'settings' })}><Settings size={14} /> CONFIG</button></div>
      </aside>

      <main className="workspace">
        {activeTab !== 'grid' && <button className="back-link" onClick={navigateBack}><ArrowLeft size={15} /> BACK TO DIAGNOSTIC GRID <span>//</span> {tabLabels[activeTab].toUpperCase()}</button>}
        {activeTab === 'grid' && <DiagnosticWorkspace onOpenTest={(test) => setModal({ type: 'test', testId: test.id })} onRunScan={runFullScan} />}
        {activeTab === 'profile' && <ProfileWorkspace onOpenProtocol={() => setProtocolOpen(true)} />}
        {activeTab === 'health' && <HealthWorkspace range={healthRange} onRangeChange={setHealthRange} />}
        {activeTab === 'chronic' && <ChronicWorkspace />}
        {activeTab === 'history' && <HistoryWorkspace query={historyQuery} onQuery={setHistoryQuery} range={historyRange} onRange={setHistoryRange} rows={filteredLog} onExport={exportLog} />}
      </main>

      <aside className="right-rail">
        <HologramPanel view={hologramView} layer={hologramLayer} selectedPart={selectedPart} scanning={scanProgress !== null} onView={setHologramView} onLayer={setHologramLayer} onPart={handleHologramPart} onScan={runFullScan} />
      </aside>
    </div>

    {chatOpen && <div className="chat-popover"><button className="chat-popover-close" aria-label="Close Flight Surgeon" onClick={() => setChatOpen(false)}><X size={15} /></button><ChatPanel messages={chatMessages} value={chatInput} onChange={setChatInput} onSubmit={handleChat} onVoice={startVoice} listening={isListening} onInfo={() => addMessage('assistant', 'Command help: try “Open ECG test”, “Show my heart rate history”, “Check my left arm”, “Show chronic diseases”, or “Run full scan”.', 'system')} /></div>}
    <button className={`chat-fab ${chatOpen ? 'active' : ''}`} aria-label={chatOpen ? 'Close Flight Surgeon' : 'Open Flight Surgeon'} aria-expanded={chatOpen} onClick={() => setChatOpen((value) => !value)}><Sparkles size={20} /><span className="chat-fab-pulse" /><strong>AI</strong></button>
    <TelemetryFooter telemetry={telemetry} onOpen={openVital} online={bridgeOnline} />

    {modal?.type === 'test' && currentTest && <MeasurementModal test={currentTest} onClose={() => setModal(null)} onSend={async (text) => { addMessage('user', text); const response = await sendChatToCustomAI(text, { telemetry, selectedBodyPart: selectedPart }); addMessage('assistant', response.reply, 'system'); executeAIResponse(response); setModal(null) }} />}
    {modal?.type === 'scan' && <ScanModal progress={scanProgress ?? 0} onClose={() => setModal(null)} onSummary={() => { addMessage('assistant', 'Full-system sweep complete: 18 channels nominal; one radiation watch remains on the mission record.', 'system'); setModal(null); setScanProgress(null) }} />}
    {modal?.type === 'vital' && <VitalModal vital={modal.vital} telemetry={telemetry} onClose={() => setModal(null)} onOpenFullTrend={openFullTrend} />}
    {modal?.type === 'settings' && <SettingsModal onClose={() => setModal(null)} />}
    {scanProgress !== null && modal?.type !== 'scan' && <button className="scan-toast" onClick={() => setModal({ type: 'scan' })}><ScanLine size={14} /> FULL SWEEP {scanProgress >= 100 ? 'COMPLETE' : `${scanProgress}%`} <ArrowUpRight size={13} /></button>}
    {protocolOpen && <ProtocolModal onClose={() => setProtocolOpen(false)} />}
  </div>
}

function Starfield() {
  const stars = Array.from({ length: 42 }, (_, index) => ({ left: `${(index * 37) % 100}%`, top: `${(index * 61) % 100}%`, delay: `${(index % 9) * 0.6}s`, size: `${index % 3 === 0 ? 2 : 1}px` }))
  return <div className="starfield" aria-hidden="true">{stars.map((star, index) => <i key={index} style={{ left: star.left, top: star.top, animationDelay: star.delay, width: star.size, height: star.size }} />)}<div className="constellation c1" /><div className="constellation c2" /></div>
}

function NavItem({ icon, label, active, onClick, badge }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void; badge?: string }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{badge && <b>{badge}</b>}</button>
}

function NotificationTray() {
  return <div className="notification-tray"><div className="tray-heading"><span>RECENT ALERTS</span><span className="live-tag">LIVE</span></div>{alerts.map((alert) => <div className="alert-row" key={alert.time}><span className={`alert-pip ${alert.tone}`} /><div><strong>{alert.label}</strong><small>{alert.detail}</small></div><time>{alert.time}</time></div>)}</div>
}

function UploadPanel({ progress, report, onClick, onDrop }: { progress: number | null; report: { name: string; summary: string } | null; onClick: () => void; onDrop: (file?: File) => void }) {
  const [dragging, setDragging] = useState(false)
  return <div className={`upload-panel ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); onDrop(event.dataTransfer.files?.[0]) }} onClick={onClick}>
    <div className="upload-header"><span className="eyebrow">EVIDENCE INTAKE</span><Upload size={15} /></div>
    {progress !== null ? <><div className="upload-spinner"><RefreshCw size={20} /></div><strong>AI VISION & OCR</strong><small>Analyzing report… {progress}%</small><div className="progress-track"><span style={{ width: `${progress}%` }} /></div></> : report ? <><div className="report-file"><FileScan size={18} /><div><strong>{report.name}</strong><small>Context injected into AI memory</small></div><Check size={15} /></div><p className="report-summary">{report.summary}</p><span className="upload-again">+ ADD ANOTHER REPORT</span></> : <><div className="upload-orb"><Plus size={19} /></div><strong>UPLOAD OLD TEST REPORTS</strong><small>Drag & drop PDF, JPG, PNG, DICOM</small><span className="upload-link">BROWSE FILES <ArrowUpRight size={12} /></span></>}
  </div>
}

function DiagnosticWorkspace({ onOpenTest, onRunScan }: { onOpenTest: (test: DiagnosticTest) => void; onRunScan: () => void }) {
  return <><SectionLabel eyebrow="PRIMARY DIAGNOSTICS / 18 CHANNELS" title="Measurement grid" detail="Select a sensor channel to begin a live readout." action={<div className="grid-meta"><span><i className="legend-dot cyan" /> Nominal</span><span><i className="legend-dot amber" /> Watch</span><span>SYNC 2.5 SEC</span></div>} /><div className="grid-banner"><div><span className="eyebrow">AUTONOMOUS CHECK</span><strong>Run a full-system exam before the next orbital transfer window.</strong></div><button className="text-button" onClick={onRunScan}>RUN FULL SWEEP <ArrowUpRight size={14} /></button></div><div className="diagnostic-grid">{diagnosticTests.map((test, index) => <button className={`diagnostic-tile ${test.accent}`} key={test.id} onClick={() => onOpenTest(test)}><div className="tile-top"><span className="tile-index">{String(index + 1).padStart(2, '0')}</span><IconBadge tone={test.accent}>{test.icon}</IconBadge><span className="tile-signal"><span className="signal-bar" /><span className="signal-bar" /><span className="signal-bar" /></span></div><div className="tile-name">{test.name}</div><div className="tile-category">{test.category}</div><div className="tile-value"><strong>{test.value}</strong><span>{test.metric}</span></div><MiniSpark color={test.accent === 'amber' ? '#f4b860' : test.accent === 'violet' ? '#b49bff' : test.accent === 'green' ? '#70e8bb' : '#60e8ff'} /></button>)}</div><div className="workspace-note"><Info size={15} /><span>All readings are simulated until a telemetry bridge is connected. The local model mirrors the FastAPI command schema for rapid crew training.</span><span className="note-code">BRIDGE / LOCAL-SIM</span></div></>
}

function ProfileWorkspace({ onOpenProtocol }: { onOpenProtocol: () => void }) {
  return <><SectionLabel eyebrow="CREW RECORD / ARES-04" title="Astronaut profile" detail="Personal baseline and emergency readiness profile." action={<StatusPill tone="green">PROFILE VERIFIED</StatusPill>} /><div className="profile-grid"><div className="profile-card identity-card"><div className="scan-corner" /><div className="profile-avatar"><UserRound size={34} /><span className="avatar-orbit" /></div><span className="eyebrow">ACTIVE CREW MEMBER</span><h3>{profile.name}</h3><p>{profile.callsign}</p><div className="profile-rank"><ShieldCheck size={14} /> {profile.rank}</div><div className="profile-id"><span>CREW ID</span><strong>AV-0417-ORBIT</strong><span>STATUS</span><StatusPill tone="green">NOMINAL</StatusPill></div></div><div className="profile-card"><span className="eyebrow">BIOMETRIC RECORD</span><div className="fact-grid"><Fact label="Age" value={profile.age} /><Fact label="Blood type" value={profile.blood} tone="amber" /><Fact label="Mission duration" value={profile.mission} /><Fact label="Zero-G exposure" value={profile.zeroG} /><Fact label="Known allergies" value={profile.allergies} tone="amber" /><Fact label="Evacuation protocol" value={profile.evacuation} tone="red" /></div></div><div className="profile-card baseline-card"><span className="eyebrow">BASELINE VITALS / EARTH</span>{[['Heart rate', '68 bpm', '± 5'], ['Blood pressure', '118 / 78', 'mmHg'], ['SpO₂', '99%', 'ambient'], ['Body temperature', '36.6 °C', 'core']].map(([label, value, note]) => <div className="baseline-row" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div><div className="protocol-card"><div className="protocol-icon"><CircleHelp size={22} /></div><div><span className="eyebrow">EMERGENCY EVACUATION PROTOCOL</span><h3>Keep the crew member stabilized in the restraint cradle.</h3><p>Protocol E-7 prioritizes airway, circulation, and radiation-shielded transfer. Response window: 18 minutes.</p><button className="text-button" onClick={onOpenProtocol}>OPEN PROTOCOL <ArrowUpRight size={13} /></button></div></div></div></>
}

function ProtocolModal({ onClose }: { onClose: () => void }) {
  return <div className="modal-backdrop"><div className="modal settings-modal"><ModalHeader eyebrow="EMERGENCY PROCEDURE / E-7" title="Evacuation protocol" onClose={onClose} /><div className="settings-copy"><ShieldCheck size={17} /><p>Maintain airway and circulation first. Keep the crew member restrained, avoid free-floating droplets, and initiate the radiation-shielded transfer sequence.</p></div><div className="step-list protocol-steps"><div className="done"><span>01</span> Secure the restraint cradle <Check size={12} /></div><div><span>02</span> Run oxygen and blood-pressure checks</div><div><span>03</span> Apply sterile dressing or compression wrap</div><div><span>04</span> Notify Mission Control and begin E-7 transfer</div></div><div className="modal-actions"><button className="primary-button" onClick={onClose}><Check size={15} /> ACKNOWLEDGE PROTOCOL</button></div></div></div>
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: string }) { return <div className="fact"><span>{label}</span><strong className={tone ? `text-${tone}` : ''}>{value}</strong></div> }

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value?: number; name?: string; color?: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="chart-tooltip"><span>{label}</span>{payload.map((item) => <strong key={item.name} style={{ color: item.color }}>{item.name} <b>{item.value}</b></strong>)}</div>
}

function HealthWorkspace({ range, onRangeChange }: { range: string; onRangeChange: (range: string) => void }) {
  const size = ({ '1 Month': 4, '3 Months': 6, '6 Months': 8, '1 Year': 12 } as Record<string, number>)[range] ?? 8
  const rangeSeries = Array.from({ length: size }, (_, index) => { const source = healthSeries[index % healthSeries.length]; return { ...source, period: range === '1 Month' ? `W${index + 1}` : `M${index + 1}`, cardio: +(source.cardio + (index >= healthSeries.length ? 1.2 : 0)).toFixed(1), bone: +(source.bone + (index >= healthSeries.length ? .4 : 0)).toFixed(1), muscle: +(source.muscle + (index >= healthSeries.length ? .3 : 0)).toFixed(1), immune: +(source.immune + (index >= healthSeries.length ? .7 : 0)).toFixed(1), radiation: +(source.radiation + (index >= healthSeries.length ? .12 : 0)).toFixed(2) } })
  const latest = rangeSeries[rangeSeries.length - 1]
  return <><SectionLabel eyebrow="LONGITUDINAL HEALTH / TRAJECTORY" title="General health" detail={`Aggregated countermeasure performance across the selected ${range.toLowerCase()} window.`} action={<div className="range-switcher">{['1 Month', '3 Months', '6 Months', '1 Year'].map((item) => <button key={item} className={range === item ? 'active' : ''} onClick={() => onRangeChange(item)}>{item}</button>)}</div>} /><div className="health-summary"><div className="trajectory"><span className="eyebrow">HEALTH TRAJECTORY STATUS</span><strong>IMPROVING <span>+4.2%</span></strong><p>Countermeasure adherence is lifting cardiovascular and bone retention scores.</p></div><HealthStat label="Cardiovascular fitness" value={`${latest.cardio} / 100`} change="+6.8%" color="#60e8ff" /><HealthStat label="Bone mineral density" value={`${latest.bone}%`} change="+1.4%" color="#70e8bb" /><HealthStat label="Immune index" value={`${latest.immune} / 100`} change="+3.1%" color="#b49bff" /></div><div className="chart-card large-chart"><div className="chart-card-head"><div><span className="eyebrow">COUNTERMEASURE PERFORMANCE</span><h3>Integrated health trajectory</h3></div><div className="chart-legend"><span><i style={{ background: '#60e8ff' }} /> Cardio</span><span><i style={{ background: '#70e8bb' }} /> Bone</span><span><i style={{ background: '#b49bff' }} /> Immune</span></div></div><ResponsiveContainer width="100%" height={250}><LineChart data={rangeSeries}><CartesianGrid stroke="#203349" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="period" tick={{ fill: '#6f8199', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis domain={[70, 100]} tick={{ fill: '#6f8199', fontSize: 11 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="cardio" name="Cardio" stroke="#60e8ff" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="bone" name="Bone" stroke="#70e8bb" strokeWidth={2.5} dot={false} /><Line type="monotone" dataKey="immune" name="Immune" stroke="#b49bff" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div><div className="health-lower"><div className="chart-card"><div className="chart-card-head"><div><span className="eyebrow">LEAN MASS RETENTION</span><h3>Muscle / tissue</h3></div><strong className="chart-kpi">{latest.muscle}%</strong></div><ResponsiveContainer width="100%" height={150}><AreaChart data={rangeSeries}><XAxis dataKey="period" hide /><YAxis domain={[88, 100]} hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="muscle" name="Muscle" stroke="#b49bff" fill="#b49bff" fillOpacity={.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div><div className="chart-card"><div className="chart-card-head"><div><span className="eyebrow">RADIATION EXPOSURE</span><h3>Cumulative dose</h3></div><strong className="chart-kpi amber-text">{latest.radiation} mSv</strong></div><ResponsiveContainer width="100%" height={150}><AreaChart data={rangeSeries}><XAxis dataKey="period" hide /><YAxis domain={[0, 2.5]} hide /><Tooltip content={<ChartTooltip />} /><Area type="monotone" dataKey="radiation" name="Dose" stroke="#f4b860" fill="#f4b860" fillOpacity={.15} strokeWidth={2} /></AreaChart></ResponsiveContainer></div></div></>
}

function HealthStat({ label, value, change, color }: { label: string; value: string; change: string; color: string }) { return <div className="health-stat"><MiniSpark color={color} /><span>{label}</span><strong>{value}</strong><small style={{ color }}>{change} vs baseline</small></div> }

function ChronicWorkspace() {
  return <><SectionLabel eyebrow="CONTINUOUS MONITORING / 24 HOURS" title="Chronic & space-induced conditions" detail="Risk surfaces for the conditions most affected by long-duration orbital flight." action={<StatusPill tone="amber">2 WATCH ITEMS</StatusPill>} /><div className="risk-grid"><RiskCard title="Glycemic control" eyebrow="DIABETES / INSULIN RESISTANCE" value="110" unit="mg/dL" tone="amber" note="Stable vs 105 mg/dL Earth baseline" /><RiskCard title="Orthostatic load" eyebrow="HYPERTENSION / INTOLERANCE" value="120 / 80" unit="mmHg" tone="green" note="No postural drop in last 6 checks" /><RiskCard title="Space anemia" eyebrow="HEMOGLOBIN / RBC" value="14.2" unit="g/dL" tone="green" note="+0.3 g/dL from mission low" /><RiskCard title="Radiation burn risk" eyebrow="CUMULATIVE EXPOSURE" value="1.5" unit="mSv" tone="amber" note="75% of daily watch threshold" /></div><div className="chronic-charts"><div className="chart-card"><div className="chart-card-head"><div><span className="eyebrow">24-HOUR GLYCEMIC CONTROL</span><h3>Glucose vs Earth baseline</h3></div><StatusPill tone="green">STABLE</StatusPill></div><ResponsiveContainer width="100%" height={215}><LineChart data={chronicSeries}><CartesianGrid stroke="#203349" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[95, 120]} tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Legend wrapperStyle={{ color: '#95a6ba', fontSize: 10 }} /><Line dataKey="glucose" name="Orbital" stroke="#f4b860" strokeWidth={2.5} dot={false} /><Line dataKey={() => 105} name="Earth baseline" stroke="#53667c" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></div><div className="chart-card"><div className="chart-card-head"><div><span className="eyebrow">SYSTOLIC / DIASTOLIC CURVE</span><h3>Pressure load</h3></div><StatusPill tone="green">NOMINAL</StatusPill></div><ResponsiveContainer width="100%" height={215}><LineChart data={chronicSeries}><CartesianGrid stroke="#203349" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis domain={[55, 135]} tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line dataKey="sys" name="Systolic" stroke="#60e8ff" strokeWidth={2.5} dot={false} /><Line dataKey="dia" name="Diastolic" stroke="#b49bff" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div></div><div className="condition-table"><div className="table-heading"><span>RISK ASSESSMENT</span><span>EARTH BASELINE</span><span>CURRENT ORBITAL</span><span>STATUS</span></div>{[['Glycemic stability', '105 mg/dL', '110 mg/dL', 'Watch'], ['Hemoglobin', '13.9 g/dL', '14.2 g/dL', 'Nominal'], ['Cellular inflammation', '1.0 AU', '1.1 AU', 'Watch'], ['Cumulative dose', '0.0 mSv', '1.5 mSv', 'Watch']].map((row) => <div className="table-row" key={row[0]}><strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><StatusPill tone={row[3] === 'Nominal' ? 'green' : 'amber'}>{row[3]}</StatusPill></div>)}</div></>
}

function RiskCard({ title, eyebrow, value, unit, tone, note }: { title: string; eyebrow: string; value: string; unit: string; tone: 'amber' | 'green'; note: string }) { return <div className={`risk-card ${tone}`}><div className="risk-card-head"><span className="eyebrow">{eyebrow}</span><ArrowUpRight size={15} /></div><h3>{title}</h3><strong>{value}<small>{unit}</small></strong><MiniSpark color={tone === 'amber' ? '#f4b860' : '#70e8bb'} /><p>{note}</p></div> }

function HistoryWorkspace({ query, onQuery, range, onRange, rows, onExport }: { query: string; onQuery: (value: string) => void; range: '24h' | '7d'; onRange: (value: '24h' | '7d') => void; rows: typeof medicalLog; onExport: (format: 'json' | 'csv') => void }) {
  const visibleRows = range === '7d' ? [...rows, ...rows.slice(0, 4).map((row, index) => ({ ...row, time: `DAY ${141 - Math.floor(index / 2)} ${row.time}` }))] : rows
  return <><SectionLabel eyebrow="CLINICAL ARCHIVE / VERIFIED LOG" title="Medical history" detail="Searchable mission telemetry with export-ready records." action={<div className="export-actions"><button className="ghost-button" onClick={() => onExport('json')}><Download size={13} /> JSON</button><button className="ghost-button" onClick={() => onExport('csv')}><Download size={13} /> CSV</button></div>} /><div className="history-toolbar"><div className="search-box"><Search size={15} /><input placeholder="Search test type or vital sign" value={query} onChange={(event) => onQuery(event.target.value)} /></div><div className="range-switcher"><button className={range === '24h' ? 'active' : ''} onClick={() => onRange('24h')}>LAST 24 HOURS</button><button className={range === '7d' ? 'active' : ''} onClick={() => onRange('7d')}>LAST 7 DAYS</button></div></div><div className="history-table"><div className="table-heading"><span>UTC TIME</span><span>TEST / CHANNEL</span><span>MEASUREMENT</span><span>RESULT</span><span>STATUS</span></div>{visibleRows.map((row, index) => <div className="table-row" key={`${row.time}-${row.type}-${index}`}><span className="mono-text">{row.time}</span><strong>{row.type}</strong><span>{row.metric}</span><span>{row.result}</span><StatusPill tone={row.status === 'Nominal' || row.status === 'Cleared' ? 'green' : 'amber'}>{row.status}</StatusPill></div>)}{visibleRows.length === 0 && <div className="empty-state"><Search size={20} /> No medical records match this query.</div>}</div><div className="history-foot"><span><Radio size={14} /> Showing {visibleRows.length} records · {range === '7d' ? '7-day archive' : 'last 24 hours'} · source: onboard event store</span><span>EXPORTS ARE SIMULATION-SAFE</span></div></>
}

function HologramPanel({ view, layer, selectedPart, scanning, onView, onLayer, onPart, onScan }: { view: 'front' | 'back'; layer: string; selectedPart: string; scanning: boolean; onView: (view: 'front' | 'back') => void; onLayer: (layer: string) => void; onPart: (part: string) => void; onScan: () => void }) {
  const selected = bodyParts.find((part) => part.id === selectedPart) ?? bodyParts[5]
  return <section className="hologram-panel"><div className="panel-heading"><div><span className="eyebrow">AI MEDICAL HOLOGRAM</span><h2>ANATOMICAL GUIDE</h2></div><span className="panel-live"><span className="status-dot" /> LIVE</span></div><div className="holo-controls"><div className="segmented"><button className={view === 'front' ? 'active' : ''} onClick={() => onView('front')}>FRONT</button><button className={view === 'back' ? 'active' : ''} onClick={() => onView('back')}>BACK</button></div><div className="layer-select"><Layers3 size={13} /><select value={layer} onChange={(event) => onLayer(event.target.value)}><option>Full Body</option><option>Skeletal</option><option>Organs</option><option>Surface / Wounds</option></select><ChevronDown size={12} /></div></div><div className={`hologram-stage ${scanning ? 'scanning' : ''}`}><div className="holo-grid" /><div className="scan-line" /><div className={`human-scan-figure ${view} ${layer === 'Skeletal' ? 'skeletal' : ''} ${layer === 'Organs' ? 'organs' : ''} ${layer === 'Surface / Wounds' ? 'surface-wounds' : ''}`}>
  <img src="/ares-human-hologram-v2.png" alt="Realistic human medical hologram" />
  <div className="anatomy-scan-overlay" aria-hidden="true" />
  <svg className="body-hit-map" viewBox="0 0 100 126" role="img" aria-label="Interactive human body regions">
    {bodyParts.map((part) => <rect key={part.id} className={`body-hit ${part.id === selectedPart ? 'selected' : ''}`} x={part.x - part.width / 2} y={part.y - part.height / 2} width={part.width} height={part.height} rx="2" onClick={() => onPart(part.id)} />)}
  </svg>
</div>{scanning && <div className="holo-scan-label"><ScanLine size={13} /> FULL-BODY BIO-SCAN IN PROGRESS</div>}<div className="holo-corner top-left" /><div className="holo-corner top-right" /><div className="holo-corner bottom-left" /><div className="holo-corner bottom-right" /></div><div className="holo-selection"><div className="selection-marker"><span className="pulse-ring" /><span className="target-dot" /></div><div><span className="eyebrow">SELECTED REGION</span><strong>{selected.label}</strong><small>Neurovascular integrity · <span>nominal</span></small></div><button aria-label="Inspect selected region" onClick={() => onPart(selected.id)}><ArrowUpRight size={16} /></button></div><div className="protocol-inline"><div className="protocol-inline-head"><span><Stethoscope size={14} /> ZERO-G FIRST-AID PROTOCOL</span><span className="protocol-code">P-0{selected.id.length}</span></div><p>{selected.protocol}</p></div><button className="holo-scan-button" onClick={onScan}><ScanLine size={16} /> HOLOGRAPHIC HUMAN BODY ANALYSIS <span>↗</span></button></section>
}

function ChatPanel({ messages, value, onChange, onSubmit, onVoice, listening, onInfo }: { messages: ChatMessage[]; value: string; onChange: (value: string) => void; onSubmit: (event?: React.FormEvent) => void; onVoice: () => void; listening: boolean; onInfo: () => void }) {
  return <section className="chat-panel"><div className="panel-heading"><div><span className="eyebrow">AUTONOMOUS AI DOCTOR</span><h2>FLIGHT SURGEON <span className="online-indicator" /></h2></div><button className="icon-button" aria-label="Chat command help" onClick={onInfo}><CircleHelp size={15} /></button></div><div className="chat-thread">{messages.map((message) => <div className={`chat-message ${message.role} ${message.tone ?? ''}`} key={message.id}><div className="chat-avatar">{message.role === 'assistant' ? <Sparkles size={13} /> : <UserRound size={13} />}</div><div className="chat-bubble"><p>{message.text}</p><time>{message.time} UTC</time></div></div>)}</div><form className="chat-compose" onSubmit={onSubmit}><div className="compose-row"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Ask the Flight Surgeon…" /><button className={`voice-button ${listening ? 'listening' : ''}`} type="button" aria-label="Use voice input" onClick={onVoice}><Mic size={15} /></button><button className="send-button" type="submit" aria-label="Send message"><Send size={15} /></button></div><div className="suggestion-row"><button type="button" onClick={() => onChange('Show my heart rate history')}>heart rate history</button><button type="button" onClick={() => onChange('Check my left arm')}>check left arm</button><button type="button" onClick={() => onChange('Run full scan')}>full scan</button></div></form></section>
}

function TelemetryFooter({ telemetry, onOpen, online }: { telemetry: typeof telemetrySeed; onOpen: (key: string) => void; online: boolean }) {
  const cards = [
    { key: 'glucose', label: 'GLUCOSE LEVEL', value: `${telemetry.glucose}`, unit: 'mg/dL', state: '↓ NORMAL', tone: 'amber', icon: <Activity size={15} /> },
    { key: 'oxygen', label: 'OXYGEN LEVEL', value: `${telemetry.oxygen}`, unit: '%', state: '→ OPTIMAL', tone: 'green', icon: <Waves size={15} /> },
    { key: 'heartRate', label: 'HEART RATE', value: `${telemetry.heartRate}`, unit: 'bpm', state: '↑ NOMINAL', tone: 'cyan', icon: <HeartPulse size={15} /> },
    { key: 'bloodPressure', label: 'BLOOD PRESSURE', value: `${telemetry.bpSys}/${telemetry.bpDia}`, unit: 'mmHg', state: '↑ NORMAL', tone: 'violet', icon: <Activity size={15} /> },
    { key: 'radiation', label: 'RADIATION DOSE', value: `${telemetry.radiation.toFixed(2)}`, unit: 'mSv', state: '↑ ELEVATED WATCH', tone: 'amber', icon: <Zap size={15} /> },
  ]
  return <footer className="telemetry-footer"><div className="telemetry-brand"><span className="eyebrow">LIVE TELEMETRY</span><strong>STREAM / 05</strong><span className={`streaming ${online ? '' : 'offline'}`}><i /> {online ? 'STREAMING' : 'LOCAL SIMULATION'}</span></div>{cards.map((card) => <button className={`telemetry-card ${card.tone}`} key={card.key} onClick={() => onOpen(card.key)}><div className="telemetry-card-head"><span>{card.icon} {card.label}</span><ArrowUpRight size={13} /></div><div className="telemetry-value"><strong>{card.value}</strong><span>{card.unit}</span></div><div className="telemetry-state"><span className="state-arrow">{card.state.slice(0, 1)}</span> {card.state.slice(2)}</div><MiniSpark color={card.tone === 'amber' ? '#f4b860' : card.tone === 'green' ? '#70e8bb' : card.tone === 'violet' ? '#b49bff' : '#60e8ff'} /></button>)}</footer>
}

function MeasurementModal({ test, onClose, onSend }: { test: DiagnosticTest; onClose: () => void; onSend: (message: string) => void }) {
  const [progress, setProgress] = useState(0); const [complete, setComplete] = useState(false); const [bridgeResult, setBridgeResult] = useState<{ result?: string; status?: string } | null>(null)
  useEffect(() => { if (progress >= 100) { setComplete(true); void triggerDiagnosticTest(test).then((result) => setBridgeResult(result)) ; return } const timer = window.setTimeout(() => setProgress((value) => Math.min(100, value + 10)), 300); return () => window.clearTimeout(timer) }, [progress, test])
  const displayedValue = bridgeResult?.result || test.value
  return <div className="modal-backdrop"><div className="modal measurement-modal"><ModalHeader eyebrow={`LIVE SENSOR / ${test.category}`} title={test.name} onClose={onClose} /><div className="measurement-body"><div className="measurement-visual"><div className={`waveform ${complete ? 'complete' : ''}`}><svg viewBox="0 0 500 120" preserveAspectRatio="none"><path d="M0 62 H35 L42 60 L49 64 L57 61 L63 62 L69 62 L76 20 L82 97 L89 62 H126 L134 60 L140 65 L148 61 L154 62 L160 62 L167 30 L174 88 L182 62 H220 L228 60 L235 64 L241 61 L248 62 L255 62 L263 22 L270 98 L277 62 H320 L328 60 L335 64 L341 61 L348 62 L355 62 L362 29 L369 89 L376 62 H420 L428 60 L435 64 L441 61 L448 62 L455 62 L462 21 L469 97 L476 62 H500" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div><div className="waveform-axis"><span>0.0s</span><span>1.0s</span><span>2.0s</span><span>3.0s</span></div><div className="sensor-status"><span className="status-dot" />{complete ? 'SIGNAL LOCKED · ANALYSIS COMPLETE' : `CALIBRATING SENSOR ARRAY · ${progress}%`}</div></div><div className="measurement-instructions"><span className="eyebrow">PLACEMENT INSTRUCTIONS</span><p>{test.instruction}</p><div className="step-list"><div className={progress > 20 ? 'done' : ''}><span>01</span> Secure sensor array {progress > 20 && <Check size={12} />}</div><div className={progress > 55 ? 'done' : ''}><span>02</span> Establish clean signal {progress > 55 && <Check size={12} />}</div><div className={progress > 85 ? 'done' : ''}><span>03</span> Compare orbital baseline {progress > 85 && <Check size={12} />}</div></div></div></div><div className="measurement-result"><div><span className="eyebrow">PRIMARY BIOMARKER</span><strong>{test.metric}</strong><small>Reference range {test.range}</small></div><div className="result-value"><strong>{displayedValue}</strong><StatusPill tone={test.accent === 'amber' ? 'amber' : 'green'}>{complete ? bridgeResult?.status === 'simulation' ? 'SIMULATION' : 'NOMINAL' : 'PENDING'}</StatusPill></div></div>{complete && <div className="measurement-note"><ShieldCheck size={16} /><span>{test.detail}</span></div>}<div className="modal-actions"><button className="ghost-button" onClick={onClose}>CLOSE</button><button className="primary-button" disabled={!complete} onClick={() => onSend(`I have logged the ${test.name} result: ${displayedValue}. ${test.detail}`)}><Sparkles size={15} /> SEND RESULTS TO AI DOCTOR</button></div></div></div>
}

function ModalHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) { return <div className="modal-header"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close modal"><X size={17} /></button></div> }

function ScanModal({ progress, onClose, onSummary }: { progress: number; onClose: () => void; onSummary: () => void }) {
  const complete = progress >= 100
  return <div className="modal-backdrop"><div className="modal scan-modal"><ModalHeader eyebrow="AUTONOMOUS EXAM / ALL CHANNELS" title="Full-system diagnostic sweep" onClose={onClose} /><div className="scan-visual"><div className="scan-radar"><div className="radar-ring r1" /><div className="radar-ring r2" /><div className="radar-sweep" /><Activity size={48} /></div><div className="scan-copy"><span className="eyebrow">{complete ? 'SWEEP COMPLETE' : 'SENSOR ARRAY ACTIVE'}</span><strong>{complete ? 'Primary systems nominal.' : `Cross-checking ${Math.max(1, Math.ceil(progress / 6))} of 18 sensor channels…`}</strong><p>{complete ? 'No critical deviations detected. One amber radiation watch remains on the mission record.' : 'The onboard AI is comparing live signals against the astronaut Earth baseline and orbital trend.'}</p><div className="big-progress"><span style={{ width: `${progress}%` }} /></div><div className="scan-stats"><span><Check size={13} /> {complete ? '18' : Math.floor(progress / 6)} CLEARED</span><span><AlertTriangle size={13} /> {complete ? '01' : '00'} WATCH</span><span><Radio size={13} /> SIMULATION</span></div></div></div><div className="sweep-grid">{['CARDIO', 'RESPIRATORY', 'NEURO', 'MUSCULOSKELETAL', 'IMMUNE', 'RADIATION'].map((item, index) => <div key={item} className={progress > index * 16 ? 'cleared' : ''}><span>{item}</span><i>{progress > index * 16 ? '✓' : '—'}</i></div>)}</div><div className="modal-actions"><button className="ghost-button" onClick={onClose}>{complete ? 'RETURN TO DECK' : 'RUN IN BACKGROUND'}</button>{complete && <button className="primary-button" onClick={onSummary}><Sparkles size={15} /> SEND SUMMARY TO AI DOCTOR</button>}</div></div></div>
}

function VitalModal({ vital, telemetry, onClose, onOpenFullTrend }: { vital: string; telemetry: typeof telemetrySeed; onClose: () => void; onOpenFullTrend: (vital: string) => void }) {
  const [range, setRange] = useState<'24h' | '7d'>('24h'); const meta = vitalMeta[vital] ?? vitalMeta.glucose
  const current = vital === 'bloodPressure' ? telemetry.bpSys : vital === 'heartRate' ? telemetry.heartRate : vital === 'oxygen' ? telemetry.oxygen : vital === 'radiation' ? telemetry.radiation : telemetry.glucose
  const currentDisplay = vital === 'bloodPressure' ? `${telemetry.bpSys}/${telemetry.bpDia}` : vital === 'radiation' ? telemetry.radiation.toFixed(2) : `${current}`
  const series = Array.from({ length: range === '24h' ? 12 : 14 }, (_, index) => ({ time: range === '24h' ? `${String((index * 2) % 24).padStart(2, '0')}:00` : `D${Math.floor(index / 2) + 1} ${index % 2 ? '12' : '00'}:00`, value: Number(current) + Math.sin(index * .9) * (vital === 'radiation' ? .08 : 3), dia: vital === 'bloodPressure' ? telemetry.bpDia + Math.cos(index * .7) * 2 : undefined }))
  const values = series.map((item) => item.value); const diastolicValues = series.map((item) => item.dia ?? telemetry.bpDia); const min = Math.min(...values); const max = Math.max(...values); const avg = values.reduce((sum, item) => sum + item, 0) / values.length; const diaMin = Math.min(...diastolicValues); const diaMax = Math.max(...diastolicValues); const diaAvg = diastolicValues.reduce((sum, item) => sum + item, 0) / diastolicValues.length
  return <div className="modal-backdrop"><div className="modal vital-modal"><ModalHeader eyebrow="TELEMETRY DETAIL / DUAL WINDOW" title={meta.label} onClose={onClose} /><div className="vital-hero"><div><span className="eyebrow">CURRENT READING</span><strong>{currentDisplay}<small>{meta.unit}</small></strong><StatusPill tone={vital === 'radiation' ? 'amber' : 'green'}>{vital === 'radiation' ? 'ELEVATED WATCH' : 'NOMINAL'}</StatusPill></div><div className="vital-stats"><div><span>MIN</span><strong>{vital === 'bloodPressure' ? `${min.toFixed(0)}/${diaMin.toFixed(0)}` : min.toFixed(vital === 'radiation' ? 2 : 0)}</strong></div><div><span>MAX</span><strong>{vital === 'bloodPressure' ? `${max.toFixed(0)}/${diaMax.toFixed(0)}` : max.toFixed(vital === 'radiation' ? 2 : 0)}</strong></div><div><span>AVG</span><strong>{vital === 'bloodPressure' ? `${avg.toFixed(0)}/${diaAvg.toFixed(0)}` : avg.toFixed(vital === 'radiation' ? 2 : 0)}</strong></div></div></div><div className="range-switcher modal-range"><button className={range === '24h' ? 'active' : ''} onClick={() => setRange('24h')}>LAST 24 HOURS</button><button className={range === '7d' ? 'active' : ''} onClick={() => setRange('7d')}>LAST 7 DAYS</button></div><div className="vital-chart"><ResponsiveContainer width="100%" height={220}><LineChart data={series}><CartesianGrid stroke="#203349" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="time" tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: '#6f8199', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip content={<ChartTooltip />} /><Line type="monotone" dataKey="value" name={vital === 'bloodPressure' ? 'Systolic' : meta.label} stroke={meta.color} strokeWidth={2.5} dot={false} />{vital === 'bloodPressure' && <Line type="monotone" dataKey="dia" name="Diastolic" stroke="#b49bff" strokeWidth={2} dot={false} />}</LineChart></ResponsiveContainer></div><div className="clinical-note"><Brain size={17} /><div><span className="eyebrow">AI CLINICAL NOTE</span><p>{meta.note}</p></div></div><div className="modal-actions"><button className="ghost-button" onClick={onClose}>CLOSE</button><button className="primary-button" onClick={() => onOpenFullTrend(vital)}><ArrowUpRight size={15} /> OPEN FULL TREND VIEW</button></div></div></div>
}

function SettingsModal({ onClose }: { onClose: () => void }) {
  const current = getBackendConfig(); const [apiUrl, setApiUrl] = useState(current.apiBaseUrl); const [wsUrl, setWsUrl] = useState(current.websocketUrl); const [testing, setTesting] = useState(false); const [status, setStatus] = useState<'idle' | 'online' | 'offline'>('idle')
  const save = () => { saveBackendConfig(apiUrl, wsUrl); onClose() }
  const test = async () => { setTesting(true); saveBackendConfig(apiUrl, wsUrl); setStatus(await testBackendConnection(apiUrl) ? 'online' : 'offline'); setTesting(false) }
  return <div className="modal-backdrop"><div className="modal settings-modal"><ModalHeader eyebrow="SYSTEM CONFIGURATION / BRIDGE" title="Backend connection" onClose={onClose} /><div className="settings-copy"><Info size={16} /><p>Paste the URL of your Python FastAPI bridge to move from simulation mode to live AI and telemetry. Values are saved only in this browser.</p></div><label className="field-label">FASTAPI BASE URL<input value={apiUrl} onChange={(event) => setApiUrl(event.target.value)} /></label><label className="field-label">WEBSOCKET TELEMETRY URL<input value={wsUrl} onChange={(event) => setWsUrl(event.target.value)} /></label><div className="connection-test"><span className={`status-dot ${status === 'online' ? 'green' : status === 'offline' ? 'red' : ''}`} /><div><strong>{testing ? 'CHECKING BRIDGE…' : status === 'online' ? 'BRIDGE ONLINE' : status === 'offline' ? 'BRIDGE OFFLINE / SIMULATION' : 'LOCAL SIMULATION READY'}</strong><small>Fallback remains active if the bridge is offline.</small></div><button className="ghost-button" onClick={test} disabled={testing}>{testing ? 'TESTING' : 'TEST BRIDGE'}</button></div><div className="modal-actions"><button className="ghost-button" onClick={onClose}>CANCEL</button><button className="primary-button" onClick={save}><Check size={15} /> SAVE CONFIGURATION</button></div></div></div>
}

export default App
