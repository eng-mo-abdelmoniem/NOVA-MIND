export const TEST_TYPES = [
  'blood',
  'urine',
  'saliva',
  'sweat',
  'immune',
  'dna',
  'ultrasound',
  'xray',
  'retina',
  'vision',
  'blood_pressure',
  'ecg',
  'oxygen_saturation',
  'temperature_breathing',
  'sleep',
  'radiation',
  'skin_wound',
  'iv_fluid',
] as const

export type TestType = (typeof TEST_TYPES)[number]

export type AstronautProfile = {
  astronaut_id: string
  mission_day: number
  chronic_conditions: {
    name: string
    status: string
    notes?: string
    targets?: Record<string, number>
  }[]
  medications: string[]
  allergies: string[]
  cumulative_radiation_mSv: number
  baseline: Record<string, number>
  updated_at: string
}

export type TestResult = {
  astronaut_id: string
  test_type: TestType
  timestamp: string
  source_device?: string
  sequence?: number
  quality: string
  metrics: Record<string, unknown>
  findings: string[]
  units?: Record<string, string>
  image_uri?: string
}

export type Alert = {
  level: 'INFO' | 'WARNING' | 'EMERGENCY'
  risk: string
  score: number
  reasons: string[]
  actions: string[]
  timestamp: string
  human_review_required: true
}

export type ResultEvent = {
  result: TestResult
  alert: Alert
  accepted: boolean
}

const HISTORY_LIMIT = 2_000
const RECENT_RESULT_LIMIT = 30
const NUMERIC_RULE_METRICS = [
  'glucose_mg_dl',
  'heart_rate_bpm',
  'spo2_pct',
  'temperature_c',
  'sleep_hours',
  'dose_mSv',
] as const
// Broad sensor-domain plausibility bounds only; these are not clinical reference thresholds
// and do not classify any in-range measurement as clinically normal.
const SENSOR_DOMAIN_BOUNDS: Record<(typeof NUMERIC_RULE_METRICS)[number], { min: number; max: number }> = {
  glucose_mg_dl: { min: 0, max: 1_000 },
  heart_rate_bpm: { min: 0, max: 300 },
  spo2_pct: { min: 0, max: 100 },
  temperature_c: { min: 0, max: 60 },
  sleep_hours: { min: 0, max: 24 },
  dose_mSv: { min: 0, max: Number.POSITIVE_INFINITY },
}

const EMERGENCY_ACTIONS = [
  'Immediately contact designated flight surgeon/medical control and follow mission-approved emergency procedures.',
  'Verify the measurement independently if safe; do not delay escalation.',
  'Use only approved protocols; this software does not prescribe treatment.',
]
const WARNING_ACTIONS = [
  'Verify measurement, units, device quality and timestamp; repeat per mission protocol.',
  'Notify the crew medical officer/flight surgeon.',
  'Review history, medications, activity, sleep and environmental context.',
]
const INFO_ACTIONS = [
  'Store the result in the longitudinal profile and continue scheduled monitoring.',
  'No configured rule triggered; this does not establish medical safety.',
]
const SEQUENCE_GAP_ACTIONS = [
  'Check device connectivity, timestamps, and packet integrity.',
  'Do not interpret missing data as normal.',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const clone = <T>(value: T): T => structuredClone(value)

const validateAstronautId: (id: unknown) => asserts id is string = (id) => {
  if (typeof id !== 'string' || id.trim().length === 0 || id.length > 80) {
    throw new TypeError('astronaut_id must be a nonempty string of at most 80 characters')
  }
}

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && Number.isFinite(Date.parse(value))

const formatNumber = (value: number): string => {
  const rounded = Number(value.toPrecision(6))
  return String(rounded)
}

const isTestType = (value: unknown): value is TestType =>
  typeof value === 'string' && (TEST_TYPES as readonly string[]).includes(value)

const validateProfile = (profile: AstronautProfile): void => {
  if (!isRecord(profile)) throw new TypeError('profile must be an object')
  validateAstronautId(profile.astronaut_id)
  if (!Number.isFinite(profile.mission_day)) throw new TypeError('mission_day must be finite')
  if (!Array.isArray(profile.chronic_conditions)) throw new TypeError('chronic_conditions must be an array')
  for (const condition of profile.chronic_conditions) {
    if (!isRecord(condition) || typeof condition.name !== 'string' || typeof condition.status !== 'string') {
      throw new TypeError('each chronic condition must include string name and status fields')
    }
    if (condition.notes !== undefined && typeof condition.notes !== 'string') {
      throw new TypeError('chronic condition notes must be a string when provided')
    }
    if (condition.targets !== undefined) {
      if (!isRecord(condition.targets) || Object.values(condition.targets).some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
        throw new TypeError('chronic condition targets must contain finite numbers')
      }
    }
  }
  if (!Array.isArray(profile.medications) || profile.medications.some((value) => typeof value !== 'string')) {
    throw new TypeError('medications must be an array of strings')
  }
  if (!Array.isArray(profile.allergies) || profile.allergies.some((value) => typeof value !== 'string')) {
    throw new TypeError('allergies must be an array of strings')
  }
  if (!Number.isFinite(profile.cumulative_radiation_mSv) || profile.cumulative_radiation_mSv < 0) {
    throw new TypeError('cumulative_radiation_mSv must be finite and nonnegative')
  }
  if (!isRecord(profile.baseline) || Object.values(profile.baseline).some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new TypeError('baseline must be an object containing finite numbers')
  }
  if (!isValidTimestamp(profile.updated_at)) throw new TypeError('updated_at must be a valid timestamp')
}

const validateResult = (result: TestResult): void => {
  if (!isRecord(result)) throw new TypeError('result must be an object')
  validateAstronautId(result.astronaut_id)
  if (!isTestType(result.test_type)) throw new TypeError('test_type is not supported')
  if (!isValidTimestamp(result.timestamp)) throw new TypeError('timestamp must be valid')
  if (result.sequence !== undefined && (!Number.isInteger(result.sequence) || result.sequence < 0)) {
    throw new TypeError('sequence must be an integer greater than or equal to zero')
  }
  if (typeof result.quality !== 'string') throw new TypeError('quality must be a string')
  if (!isRecord(result.metrics)) throw new TypeError('metrics must be an object')
  for (const key of NUMERIC_RULE_METRICS) {
    if (Object.hasOwn(result.metrics, key)) {
      const value = result.metrics[key]
      const { min, max } = SENSOR_DOMAIN_BOUNDS[key]
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        const acceptedMax = max === Number.POSITIVE_INFINITY ? 'Infinity (finite values only)' : String(max)
        throw new TypeError(`${key} must be between ${min} and ${acceptedMax} for a human-measurement payload`)
      }
    }
  }
  if (!Array.isArray(result.findings) || result.findings.some((finding) => typeof finding !== 'string')) {
    throw new TypeError('findings must be an array of strings')
  }
  if (result.source_device !== undefined && typeof result.source_device !== 'string') {
    throw new TypeError('source_device must be a string when provided')
  }
  if (result.image_uri !== undefined && typeof result.image_uri !== 'string') {
    throw new TypeError('image_uri must be a string when provided')
  }
  if (result.units !== undefined && (!isRecord(result.units) || Object.values(result.units).some((value) => typeof value !== 'string'))) {
    throw new TypeError('units must be an object containing strings')
  }
}

export const createDemoProfile = (id: string): AstronautProfile => {
  validateAstronautId(id)
  return {
    astronaut_id: id,
    mission_day: 42,
    chronic_conditions: [{ name: 'Type 2 diabetes', status: 'active' }],
    medications: [],
    allergies: [],
    cumulative_radiation_mSv: 12,
    baseline: { glucose_mg_dl: 110 },
    updated_at: new Date().toISOString(),
  }
}

export class AstraMedEngine {
  private readonly profiles = new Map<string, AstronautProfile>()
  private readonly history = new Map<string, TestResult[]>()
  private readonly lastSequence = new Map<string, number>()

  setProfile(profile: AstronautProfile): AstronautProfile {
    validateProfile(profile)
    const snapshot = clone(profile)
    this.profiles.set(snapshot.astronaut_id, snapshot)
    return clone(snapshot)
  }

  getProfile(id: string): { profile: AstronautProfile; recent_results: TestResult[] } | undefined {
    const profile = this.profiles.get(id)
    if (!profile) return undefined
    const results = this.history.get(id) ?? []
    return {
      profile: clone(profile),
      recent_results: clone(results.slice(-RECENT_RESULT_LIMIT)),
    }
  }

  ingest(result: TestResult): ResultEvent {
    validateResult(result)
    const resultSnapshot = clone(result)
    const key = `${resultSnapshot.astronaut_id}\u0000${resultSnapshot.test_type}`
    const previousSequence = this.lastSequence.get(key)
    const hasSequence = resultSnapshot.sequence !== undefined
    const sequence = resultSnapshot.sequence
    const gap = previousSequence !== undefined && hasSequence && sequence! > previousSequence + 1
    const duplicate = previousSequence !== undefined && hasSequence && sequence! <= previousSequence

    const profile = this.profiles.get(resultSnapshot.astronaut_id)
    const radiationDose = resultSnapshot.metrics.dose_mSv
    if (!duplicate && resultSnapshot.test_type === 'radiation' && typeof radiationDose === 'number' && radiationDose >= 0 && profile) {
      if (!Number.isFinite(profile.cumulative_radiation_mSv + radiationDose)) {
        throw new RangeError('cumulative_radiation_mSv would exceed the finite numeric range')
      }
    }

    const alert = this.assess(resultSnapshot, profile)
    if (gap) {
      alert.reasons.push('Packet sequence gap detected; missing observations were not imputed.')
      if (alert.level === 'INFO') {
        alert.level = 'WARNING'
        alert.risk = 'DATA_QUALITY'
        alert.score = 15
        alert.actions = [...SEQUENCE_GAP_ACTIONS]
      }
    }
    if (duplicate) alert.reasons.push('Duplicate/out-of-order packet excluded from history.')

    if (!duplicate) {
      const astronautHistory = this.history.get(resultSnapshot.astronaut_id) ?? []
      astronautHistory.push(clone(resultSnapshot))
      if (astronautHistory.length > HISTORY_LIMIT) astronautHistory.splice(0, astronautHistory.length - HISTORY_LIMIT)
      this.history.set(resultSnapshot.astronaut_id, astronautHistory)
      if (sequence !== undefined) this.lastSequence.set(key, sequence)
      this.updateProfile(resultSnapshot, profile)
    }

    return { result: clone(resultSnapshot), alert: clone(alert), accepted: !duplicate }
  }

  private assess(result: TestResult, profile: AstronautProfile | undefined): Alert {
    const metrics = result.metrics
    const reasons: string[] = []
    const risks: string[] = []
    let score = 0
    const add = (points: number, reason: string, risk: string): void => {
      score += points
      reasons.push(reason)
      risks.push(risk)
    }

    const glucose = metrics.glucose_mg_dl
    const diabetes = Boolean(profile?.chronic_conditions.some(
      (condition) => condition.name.toLowerCase().includes('diabet') && condition.status === 'active',
    ))
    if (typeof glucose === 'number') {
      if (glucose < 70) add(65, `Glucose ${formatNumber(glucose)} mg/dL below illustrative low trigger.`, 'HYPOGLYCEMIA')
      else if (glucose >= 250) add(45, `Glucose ${formatNumber(glucose)} mg/dL above illustrative high trigger.`, 'HYPERGLYCEMIA')
      else if (diabetes && glucose >= 180) add(20, `Glucose ${formatNumber(glucose)} mg/dL above example diabetes follow-up trigger.`, 'DIABETES_TREND')
    }

    const heartRate = metrics.heart_rate_bpm
    const oxygenSaturation = metrics.spo2_pct
    if (typeof heartRate === 'number' && heartRate > 120) {
      add(25, `Elevated HR: ${formatNumber(heartRate)} bpm.`, 'CARDIOVASCULAR_STRAIN')
    }
    if (typeof oxygenSaturation === 'number' && oxygenSaturation < 90) {
      add(55, `Low SpO2: ${formatNumber(oxygenSaturation)}%.`, 'OXYGENATION')
    }

    const temperature = metrics.temperature_c
    if (typeof temperature === 'number' && temperature >= 38) {
      add(25, `Elevated temperature: ${formatNumber(temperature)} C.`, 'FEVER_SIGNAL')
    }
    const sleep = metrics.sleep_hours
    if (typeof sleep === 'number' && sleep < 4) {
      add(20, `Low sleep duration: ${formatNumber(sleep)} hours.`, 'FATIGUE')
    }
    if (typeof glucose === 'number' && glucose >= 180 && typeof sleep === 'number' && sleep < 5) {
      add(20, 'Combined elevated glucose and short sleep; review metabolic/fatigue context.', 'METABOLIC_FATIGUE')
    }

    const dose = metrics.dose_mSv
    if (typeof dose === 'number' && dose > 0) {
      const total = (profile?.cumulative_radiation_mSv ?? 0) + dose
      if (total > 100) {
        add(20, `Cumulative recorded dose ${formatNumber(total)} mSv; review mission-specific limits.`, 'RADIATION_REVIEW')
      }
    }

    if (result.findings.length > 0) {
      reasons.push(...result.findings.slice(0, 5).map((finding) => `Submitted ${result.test_type} finding: ${finding}`))
      score += 5
    }
    const quality = result.quality.toLowerCase()
    if (['poor', 'degraded', 'invalid'].includes(quality)) {
      reasons.push(`Data quality is ${result.quality}; verify or repeat if safe.`)
      score += 5
    }

    const level: Alert['level'] = score >= 60 ? 'EMERGENCY' : score >= 20 ? 'WARNING' : 'INFO'
    return {
      level,
      risk: risks[0] ?? (result.findings.length > 0 ? `${result.test_type.toUpperCase()}_REVIEW` : 'NO_RULE_TRIGGERED'),
      score: Math.min(score, 100),
      reasons: reasons.length > 0 ? reasons : ['No configured rule triggered.'],
      actions: [...(level === 'EMERGENCY' ? EMERGENCY_ACTIONS : level === 'WARNING' ? WARNING_ACTIONS : INFO_ACTIONS)],
      timestamp: new Date().toISOString(),
      human_review_required: true,
    }
  }

  private updateProfile(result: TestResult, profile: AstronautProfile | undefined): void {
    if (!profile) return
    if (result.test_type === 'radiation') {
      const dose = result.metrics.dose_mSv
      if (typeof dose === 'number' && dose >= 0) profile.cumulative_radiation_mSv += dose
    }
    if (result.quality.toLowerCase() === 'good') {
      for (const key of ['glucose_mg_dl', 'heart_rate_bpm', 'spo2_pct', 'temperature_c'] as const) {
        const value = result.metrics[key]
        if (typeof value === 'number') {
          const old = profile.baseline[key]
          profile.baseline[key] = old === undefined ? value : 0.95 * old + 0.05 * value
        }
      }
    }
    profile.updated_at = new Date().toISOString()
  }
}

export const astramedEngine = new AstraMedEngine()
