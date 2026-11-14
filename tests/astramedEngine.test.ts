import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AstraMedEngine,
  TEST_TYPES,
  createDemoProfile,
  type AstronautProfile,
  type TestResult,
} from '../src/services/astramedEngine.ts'

const baseResult = (overrides: Partial<TestResult> = {}): TestResult => ({
  astronaut_id: 'crew-1',
  test_type: 'blood',
  timestamp: '2026-11-14T08:00:00.000Z',
  quality: 'good',
  metrics: {},
  findings: [],
  ...overrides,
})

const freshProfile = (id = 'crew-1'): AstronautProfile => createDemoProfile(id)

describe('AstraMedEngine', () => {
  it('exports exactly the eighteen supported modalities in reference order', () => {
    assert.deepEqual(TEST_TYPES, [
      'blood', 'urine', 'saliva', 'sweat', 'immune', 'dna', 'ultrasound', 'xray', 'retina',
      'vision', 'blood_pressure', 'ecg', 'oxygen_saturation', 'temperature_breathing', 'sleep',
      'radiation', 'skin_wound', 'iv_fluid',
    ])
    assert.equal(TEST_TYPES.length, 18)
  })

  it('creates the demo profile with the requested day, diabetes, radiation and glucose baseline', () => {
    const profile = createDemoProfile('demo-crew')
    assert.equal(profile.astronaut_id, 'demo-crew')
    assert.equal(profile.mission_day, 42)
    assert.deepEqual(profile.chronic_conditions, [{ name: 'Type 2 diabetes', status: 'active' }])
    assert.equal(profile.cumulative_radiation_mSv, 12)
    assert.equal(profile.baseline.glucose_mg_dl, 110)
  })

  it('raises an emergency for glucose 55 mg/dL', () => {
    const engine = new AstraMedEngine()
    engine.setProfile(freshProfile())
    const event = engine.ingest(baseResult({ metrics: { glucose_mg_dl: 55 } }))
    assert.equal(event.accepted, true)
    assert.equal(event.alert.level, 'EMERGENCY')
    assert.equal(event.alert.risk, 'HYPOGLYCEMIA')
    assert.equal(event.alert.score, 65)
    assert.match(event.alert.reasons[0], /55 mg\/dL below illustrative low trigger/)
    assert.equal(event.alert.human_review_required, true)
  })

  it('warns on sleep below four hours', () => {
    const event = new AstraMedEngine().ingest(baseResult({ test_type: 'sleep', metrics: { sleep_hours: 3.5 } }))
    assert.equal(event.alert.level, 'WARNING')
    assert.equal(event.alert.risk, 'FATIGUE')
    assert.equal(event.alert.score, 20)
    assert.ok(event.alert.reasons.some((reason) => reason.includes('Low sleep duration: 3.5 hours.')))
  })

  it('combines elevated heart rate and low oxygen into an emergency ECG alert', () => {
    const event = new AstraMedEngine().ingest(baseResult({
      test_type: 'ecg',
      metrics: { heart_rate_bpm: 130, spo2_pct: 88 },
    }))
    assert.equal(event.alert.level, 'EMERGENCY')
    assert.equal(event.alert.risk, 'CARDIOVASCULAR_STRAIN')
    assert.equal(event.alert.score, 80)
    assert.ok(event.alert.reasons.some((reason) => reason.includes('Elevated HR: 130 bpm.')))
    assert.ok(event.alert.reasons.some((reason) => reason.includes('Low SpO2: 88%.')))
  })

  it('warns at the illustrative diabetes follow-up threshold of 180 mg/dL', () => {
    const engine = new AstraMedEngine()
    engine.setProfile(freshProfile())
    const event = engine.ingest(baseResult({ metrics: { glucose_mg_dl: 180 } }))
    assert.equal(event.alert.level, 'WARNING')
    assert.equal(event.alert.risk, 'DIABETES_TREND')
    assert.equal(event.alert.score, 20)
  })

  it('adds the combined elevated-glucose and short-sleep rule without diabetes context', () => {
    const event = new AstraMedEngine().ingest(baseResult({
      metrics: { glucose_mg_dl: 180, sleep_hours: 3 },
    }))
    assert.equal(event.alert.level, 'WARNING')
    assert.equal(event.alert.score, 40)
    assert.ok(event.alert.reasons.includes('Combined elevated glucose and short sleep; review metabolic/fatigue context.'))
  })

  it('returns an informational alert when no configured rule fires', () => {
    const event = new AstraMedEngine().ingest(baseResult({ metrics: { glucose_mg_dl: 100, temperature_c: 37 } }))
    assert.equal(event.alert.level, 'INFO')
    assert.equal(event.alert.risk, 'NO_RULE_TRIGGERED')
    assert.equal(event.alert.score, 0)
    assert.deepEqual(event.alert.reasons, ['No configured rule triggered.'])
  })

  it('preserves finding and poor-quality context in an alert', () => {
    const event = new AstraMedEngine().ingest(baseResult({
      quality: 'poor',
      findings: ['sample is cloudy'],
      metrics: { note: 'unknown string metrics remain supported' },
    }))
    assert.equal(event.alert.level, 'INFO')
    assert.equal(event.alert.score, 10)
    assert.ok(event.alert.reasons.includes('Submitted blood finding: sample is cloudy'))
    assert.ok(event.alert.reasons.includes('Data quality is poor; verify or repeat if safe.'))
  })

  it('turns an informational result with a sequence gap into the reference data-quality warning', () => {
    const engine = new AstraMedEngine()
    engine.ingest(baseResult({ sequence: 1 }))
    const event = engine.ingest(baseResult({ sequence: 4 }))
    assert.equal(event.accepted, true)
    assert.equal(event.alert.level, 'WARNING')
    assert.equal(event.alert.risk, 'DATA_QUALITY')
    assert.equal(event.alert.score, 15)
    assert.ok(event.alert.reasons.includes('Packet sequence gap detected; missing observations were not imputed.'))
    assert.deepEqual(event.alert.actions, [
      'Check device connectivity, timestamps, and packet integrity.',
      'Do not interpret missing data as normal.',
    ])
  })

  it('assesses but excludes duplicate and out-of-order radiation packets from profile and history updates', () => {
    const engine = new AstraMedEngine()
    engine.setProfile(freshProfile())
    const first = engine.ingest(baseResult({
      test_type: 'radiation', sequence: 2, metrics: { dose_mSv: 2, glucose_mg_dl: 120 },
    }))
    assert.equal(first.accepted, true)
    assert.equal(engine.getProfile('crew-1')?.profile.cumulative_radiation_mSv, 14)
    assert.equal(engine.getProfile('crew-1')?.profile.baseline.glucose_mg_dl, 110.5)

    const afterFirst = engine.getProfile('crew-1')!
    const duplicate = engine.ingest(baseResult({
      test_type: 'radiation', sequence: 2, metrics: { dose_mSv: 50, glucose_mg_dl: 55 },
    }))
    assert.equal(duplicate.accepted, false)
    assert.equal(duplicate.alert.level, 'EMERGENCY')
    assert.ok(duplicate.alert.reasons.includes('Duplicate/out-of-order packet excluded from history.'))

    const outOfOrder = engine.ingest(baseResult({
      test_type: 'radiation', sequence: 1, metrics: { dose_mSv: 30, glucose_mg_dl: 60 },
    }))
    assert.equal(outOfOrder.accepted, false)
    assert.equal(outOfOrder.alert.level, 'EMERGENCY')
    const afterRejected = engine.getProfile('crew-1')!
    assert.equal(afterRejected.profile.cumulative_radiation_mSv, afterFirst.profile.cumulative_radiation_mSv)
    assert.equal(afterRejected.profile.baseline.glucose_mg_dl, afterFirst.profile.baseline.glucose_mg_dl)
    assert.equal(afterRejected.profile.updated_at, afterFirst.profile.updated_at)
    assert.equal(afterRejected.recent_results.length, 1)
    assert.equal(afterRejected.recent_results[0].sequence, 2)
  })

  it('checks cumulative radiation against the prior recorded total before updating it', () => {
    const engine = new AstraMedEngine()
    const profile = freshProfile()
    profile.cumulative_radiation_mSv = 100
    engine.setProfile(profile)
    const event = engine.ingest(baseResult({ test_type: 'radiation', metrics: { dose_mSv: 1 } }))
    assert.equal(event.alert.level, 'WARNING')
    assert.equal(event.alert.risk, 'RADIATION_REVIEW')
    assert.equal(event.alert.score, 20)
    assert.equal(engine.getProfile('crew-1')?.profile.cumulative_radiation_mSv, 101)
  })

  it('bounds retained history at 2,000 and exposes only the most recent 30 results', () => {
    const engine = new AstraMedEngine()
    engine.setProfile(freshProfile())
    for (let sequence = 0; sequence < 2_002; sequence += 1) {
      engine.ingest(baseResult({ sequence, metrics: { sample_index: sequence } }))
    }
    const saved = engine.getProfile('crew-1')!
    assert.equal(saved.recent_results.length, 30)
    assert.equal(saved.recent_results[0].sequence, 1_972)
    assert.equal(saved.recent_results[29].sequence, 2_001)
  })

  it('returns and stores isolated profile and result snapshots', () => {
    const engine = new AstraMedEngine()
    const inputProfile = freshProfile()
    engine.setProfile(inputProfile)
    inputProfile.baseline.glucose_mg_dl = 999
    const returnedProfile = engine.getProfile('crew-1')!
    assert.equal(returnedProfile.profile.baseline.glucose_mg_dl, 110)
    returnedProfile.profile.baseline.glucose_mg_dl = 888
    returnedProfile.recent_results.push(baseResult({ metrics: { marker: 'not stored' } }))
    assert.equal(engine.getProfile('crew-1')?.profile.baseline.glucose_mg_dl, 110)
    assert.equal(engine.getProfile('crew-1')?.recent_results.length, 0)

    const inputResult = baseResult({ metrics: { nested: { value: 1 }, label: 'initial' } })
    const event = engine.ingest(inputResult)
    ;(inputResult.metrics.nested as { value: number }).value = 2
    ;(event.result.metrics.nested as { value: number }).value = 3
    event.alert.reasons.push('mutated caller snapshot')
    const saved = engine.getProfile('crew-1')!
    assert.deepEqual(saved.recent_results[0].metrics.nested, { value: 1 })
    assert.ok(!engine.getProfile('crew-1')?.recent_results[0].findings.includes('mutated caller snapshot'))
  })

  it('rejects numeric metrics outside broad human-measurement sensor bounds before baseline updates', () => {
    const engine = new AstraMedEngine()
    const profile = freshProfile()
    profile.baseline.heart_rate_bpm = 72
    engine.setProfile(profile)

    const invalidMeasurements = [
      { metric: 'heart_rate_bpm', value: -1, acceptedBounds: '0 and 300' },
      { metric: 'spo2_pct', value: 101, acceptedBounds: '0 and 100' },
      { metric: 'dose_mSv', value: -1, acceptedBounds: '0 and Infinity (finite values only)' },
      { metric: 'temperature_c', value: -1, acceptedBounds: '0 and 60' },
      { metric: 'sleep_hours', value: 25, acceptedBounds: '0 and 24' },
      { metric: 'glucose_mg_dl', value: 1_001, acceptedBounds: '0 and 1000' },
    ]

    for (const { metric, value, acceptedBounds } of invalidMeasurements) {
      const expectedMessage = `${metric} must be between ${acceptedBounds} for a human-measurement payload`
      assert.throws(
        () => engine.ingest(baseResult({ metrics: { [metric]: value } })),
        (error: unknown) => error instanceof TypeError && error.message === expectedMessage,
      )
    }

    const saved = engine.getProfile('crew-1')!
    assert.equal(saved.profile.baseline.heart_rate_bpm, 72)
    assert.equal(saved.profile.baseline.glucose_mg_dl, 110)
    assert.equal(saved.recent_results.length, 0)
  })

  it('rejects malformed objects, invalid identifiers/types/timestamps/sequences, and non-finite rule metrics', () => {
    const engine = new AstraMedEngine()
    const invalidResults: unknown[] = [
      { ...baseResult(), metrics: [] },
      baseResult({ metrics: { glucose_mg_dl: '55' } }),
      baseResult({ metrics: { heart_rate_bpm: Number.POSITIVE_INFINITY } }),
      baseResult({ metrics: { dose_mSv: Number.NaN } }),
      baseResult({ astronaut_id: '' }),
      baseResult({ astronaut_id: 'x'.repeat(81) }),
      baseResult({ test_type: 'unknown' as TestResult['test_type'] }),
      baseResult({ timestamp: 'not-a-date' }),
      baseResult({ sequence: -1 }),
      baseResult({ sequence: 1.5 }),
    ]
    for (const invalid of invalidResults) {
      assert.throws(() => engine.ingest(invalid as TestResult))
    }
    assert.equal(engine.getProfile('crew-1'), undefined)
  })

  it('rejects invalid cumulative radiation profiles', () => {
    const engine = new AstraMedEngine()
    for (const radiation of [-1, Number.POSITIVE_INFINITY, Number.NaN]) {
      const profile = freshProfile()
      profile.cumulative_radiation_mSv = radiation
      assert.throws(() => engine.setProfile(profile), /cumulative_radiation_mSv/)
    }
  })
})
