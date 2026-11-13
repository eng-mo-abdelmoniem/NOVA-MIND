import type { DiagnosticTest } from '../data'

export type AICommand = {
  action: 'OPEN_TEST' | 'HIGHLIGHT_HOLOGRAM' | 'NAVIGATE_TAB' | 'OPEN_VITAL_MODAL' | 'RUN_FULL_SCAN'
  target: string
  timeframe?: string
}

export type AIResponse = { reply: string; command?: AICommand }

const DEFAULT_API = 'http://localhost:8000'
const DEFAULT_WS = 'ws://localhost:8000/ws/telemetry'

export const getBackendConfig = () => ({
  apiBaseUrl: localStorage.getItem('ares.apiBaseUrl') || DEFAULT_API,
  websocketUrl: localStorage.getItem('ares.websocketUrl') || DEFAULT_WS,
})

export const saveBackendConfig = (apiBaseUrl: string, websocketUrl: string) => {
  localStorage.setItem('ares.apiBaseUrl', apiBaseUrl.trim() || DEFAULT_API)
  localStorage.setItem('ares.websocketUrl', websocketUrl.trim() || DEFAULT_WS)
}

const withTimeout = async (url: string, init: RequestInit, timeoutMs = 1400) => {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timeout)
  }
}

const localChat = (message: string): AIResponse => {
  const normalized = message.toLowerCase()
  if (normalized.includes('ecg') || normalized.includes('heart')) return { reply: 'Opening a live ECG scan. Place the three thoracic leads inside the cyan guide rings.', command: { action: 'OPEN_TEST', target: 'ecg' } }
  if (normalized.includes('glucose') || normalized.includes('sugar') || normalized.includes('diabetes')) return { reply: 'Your glucose is 110 mg/dL and holding steady. I am opening the 24-hour glycemic trend.', command: { action: 'OPEN_VITAL_MODAL', target: 'glucose', timeframe: '24h' } }
  if (normalized.includes('arm') || normalized.includes('wound') || normalized.includes('pain')) return { reply: 'I have highlighted the left arm. Follow the zero-G sterile dressing protocol shown beneath the hologram.', command: { action: 'HIGHLIGHT_HOLOGRAM', target: 'left_arm' } }
  if (normalized.includes('chronic') || normalized.includes('radiation') || normalized.includes('hypertension')) return { reply: 'Switching to chronic and radiation monitoring. Current orbital readings remain inside safety margins.', command: { action: 'NAVIGATE_TAB', target: 'chronic' } }
  if (normalized.includes('history') || normalized.includes('log')) return { reply: 'Displaying your medical log and trend viewer.', command: { action: 'NAVIGATE_TAB', target: 'history' } }
  if (normalized.includes('scan') || normalized.includes('exam')) return { reply: 'Running a full-system diagnostic sweep across all available sensors.', command: { action: 'RUN_FULL_SCAN', target: 'all' } }
  return { reply: 'Flight Surgeon AI online. Primary life-support biometrics are stable. Ask for a test, trend, body region, or full scan.' }
}

export async function sendChatToCustomAI(message: string, contextPayload: Record<string, unknown> = {}): Promise<AIResponse> {
  const { apiBaseUrl } = getBackendConfig()
  try {
    const response = await withTimeout(`${apiBaseUrl}/api/ai/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, context: contextPayload }),
    })
    if (!response.ok) throw new Error('AI bridge unavailable')
    return await response.json() as AIResponse
  } catch {
    return localChat(message)
  }
}

export async function uploadMedicalReport(file: File) {
  const { apiBaseUrl } = getBackendConfig()
  try {
    const form = new FormData(); form.append('file', file)
    const response = await withTimeout(`${apiBaseUrl}/api/reports/upload`, { method: 'POST', body: form }, 2500)
    if (!response.ok) throw new Error('Report bridge unavailable')
    return await response.json() as { filename: string; ai_analysis: string }
  } catch {
    return { filename: file.name, ai_analysis: `Parsed '${file.name}': cardiac and pulmonary structures nominal; mild microgravity fluid shift noted.` }
  }
}

export async function triggerDiagnosticTest(test: DiagnosticTest) {
  const { apiBaseUrl } = getBackendConfig()
  try {
    const response = await withTimeout(`${apiBaseUrl}/api/diagnostics/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ testId: test.id }) })
    if (!response.ok) throw new Error('Diagnostic bridge unavailable')
    return await response.json()
  } catch {
    return { status: 'simulation', testId: test.id, result: test.value }
  }
}

export async function analyzeHologramRegion(bodyPart: string, view: string) {
  const { apiBaseUrl } = getBackendConfig()
  try {
    const response = await withTimeout(`${apiBaseUrl}/api/hologram/inspect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body_part: bodyPart, view }) })
    if (!response.ok) throw new Error('Hologram bridge unavailable')
    return await response.json()
  } catch {
    return { body_part: bodyPart, anatomical_notes: 'Vascular and skeletal integrity intact in simulation.', first_aid_protocol: ['Activate bio-scanner adhesive patch.', 'Clean with an antimicrobial zero-G wipe.', 'Apply compression hydrogel bandage if needed.'] }
  }
}

export function connectTelemetryWebSocket(onDataReceived: (payload: unknown) => void) {
  const { websocketUrl } = getBackendConfig()
  try {
    const socket = new WebSocket(websocketUrl)
    socket.onmessage = (event) => { try { onDataReceived(JSON.parse(event.data)) } catch { /* ignore malformed bridge packets */ } }
    return () => socket.close()
  } catch {
    return () => undefined
  }
}
