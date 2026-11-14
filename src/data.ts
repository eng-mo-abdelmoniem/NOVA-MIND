export type TabId = 'grid' | 'profile' | 'health' | 'chronic' | 'history'

export type DiagnosticTest = {
  id: string
  name: string
  category: string
  icon: string
  accent: 'cyan' | 'amber' | 'violet' | 'green'
  metric: string
  value: string
  range: string
  instruction: string
  detail: string
}

export const diagnosticTests: DiagnosticTest[] = [
  { id: 'blood', name: 'Blood Test', category: 'HEMATOLOGY', icon: '◉', accent: 'cyan', metric: 'Hemoglobin', value: '14.2 g/dL', range: '12.0–17.5 g/dL', instruction: 'Secure the microfluidic lancet against the left index pad. Keep the hand inside the sterile capture ring.', detail: 'CBC profile nominal. RBC morphology stable under microgravity exposure.' },
  { id: 'urine', name: 'Urine Test', category: 'RENAL', icon: '◌', accent: 'amber', metric: 'Specific gravity', value: '1.018', range: '1.005–1.030', instruction: 'Place the sealed sample pod in the analyzer cradle. Rotate the latch until the amber lock indicator clears.', detail: 'Hydration markers within expected orbital range.' },
  { id: 'saliva', name: 'Saliva Test', category: 'BIOCHEMISTRY', icon: '◍', accent: 'violet', metric: 'Cortisol', value: '11.8 μg/dL', range: '5.0–23.0 μg/dL', instruction: 'Hold the absorbent strip under the tongue for 30 seconds before sealing the pod.', detail: 'Stress biomarker consistent with current mission workload.' },
  { id: 'sweat', name: 'Sweat Test', category: 'ELECTROLYTES', icon: '✦', accent: 'green', metric: 'Sodium', value: '42 mmol/L', range: '20–60 mmol/L', instruction: 'Apply the adhesive sweat patch to the inside of the forearm. Confirm the patch telemetry light is green.', detail: 'Electrolyte loss is controlled; maintain current fluid protocol.' },
  { id: 'immune', name: 'Immune Panel', category: 'IMMUNOLOGY', icon: '✚', accent: 'cyan', metric: 'Immune index', value: '92 / 100', range: '80–100', instruction: 'Place the sensor band around the upper arm and hold still while the optical reader calibrates.', detail: 'Immune resilience remains strong with mild orbital suppression signature.' },
  { id: 'dna', name: 'DNA / Microbe Test', category: 'PATHOGENS', icon: '⌁', accent: 'violet', metric: 'Pathogen load', value: '0.03 AU', range: '0.00–0.10 AU', instruction: 'Load the sealed swab cartridge into bay 03. Do not open the cartridge inside the cabin.', detail: 'No concerning pathogen signal detected in current sample.' },
  { id: 'ultrasound', name: 'Ultrasound', category: 'IMAGING', icon: '⌁', accent: 'cyan', metric: 'Fluid shift', value: 'MILD', range: 'NONE–MILD', instruction: 'Apply gel to the thoracic probe and follow the cyan guide arc across the chest.', detail: 'Mild microgravity fluid shift; no focal pulmonary anomaly.' },
  { id: 'xray', name: 'X-Ray', category: 'IMAGING', icon: '▧', accent: 'amber', metric: 'Lung clarity', value: '98%', range: '95–100%', instruction: 'Stand inside the imaging frame and align the shoulder markers with the vertical guide rails.', detail: 'Lung fields clear. No acute osseous abnormality.' },
  { id: 'vision', name: 'Eye & Vision (SANS)', category: 'NEURO-OCULAR', icon: '◎', accent: 'violet', metric: 'SANS risk', value: 'LOW', range: 'LOW', instruction: 'Rest your brow against the visor support and track the moving cyan target with both eyes.', detail: 'No papilledema signal. Near-vision accommodation is stable.' },
  { id: 'bone', name: 'Bone Density', category: 'MUSCULOSKELETAL', icon: '⌁', accent: 'green', metric: 'BMD retention', value: '94.6%', range: '> 90%', instruction: 'Secure both feet in the scan platform and keep the pelvis aligned with the centerline.', detail: 'Bone mineral retention is improving with countermeasure adherence.' },
  { id: 'bp', name: 'Blood Pressure', category: 'CARDIOVASCULAR', icon: '↕', accent: 'amber', metric: 'Pressure', value: '120 / 80', range: '90–130 / 60–85', instruction: 'Wrap the cuff above the left elbow. Relax the arm on the support bar during inflation.', detail: 'No orthostatic intolerance signal in current reading.' },
  { id: 'ecg', name: 'ECG', category: 'CARDIOVASCULAR', icon: '⌁', accent: 'cyan', metric: 'Rhythm', value: 'SINUS', range: 'SINUS', instruction: 'Place thoracic leads inside the cyan guide rings: upper right, upper left, and lower left chest.', detail: 'Sinus rhythm detected. QTc and variability are nominal.' },
  { id: 'oxygen', name: 'Oxygen Saturation', category: 'RESPIRATORY', icon: '◒', accent: 'green', metric: 'SpO₂', value: '98%', range: '95–100%', instruction: 'Clip the pulse oximeter to the right index finger. Keep the hand still until the signal bar fills.', detail: 'Peripheral oxygenation optimal.' },
  { id: 'breathing', name: 'Temp & Breathing', category: 'RESPIRATORY', icon: '≋', accent: 'amber', metric: 'Respiration', value: '15 / min', range: '12–20 / min', instruction: 'Seat the respiration band across the sternum and breathe normally for three cycles.', detail: 'Breathing cadence regular; core temperature 36.8 °C.' },
  { id: 'muscle', name: 'Muscle Mass', category: 'MUSCULOSKELETAL', icon: '◈', accent: 'violet', metric: 'Lean mass', value: '97.1%', range: '> 92%', instruction: 'Attach the impedance pads to both forearms and stand inside the neutral body frame.', detail: 'Muscle retention on target for current countermeasure schedule.' },
  { id: 'radiation', name: 'Radiation Bio-Scan', category: 'RADIATION', icon: '☼', accent: 'amber', metric: 'Cumulative dose', value: '1.5 mSv', range: '< 2.0 mSv', instruction: 'Step into the shielded scanner and keep the dosimeter aligned with the sternum marker.', detail: 'Dose remains within daily orbital watch margin.' },
  { id: 'skin', name: 'Skin / Wound Scan', category: 'SURFACE', icon: '✧', accent: 'violet', metric: 'Integrity', value: '98 / 100', range: '> 90 / 100', instruction: 'Aim the multispectral wand at the area of concern. Sweep slowly from proximal to distal.', detail: 'Minor left forearm contusion is resolving; no open wound detected.' },
  { id: 'hydration', name: 'IV Fluid & Hydration', category: 'FLUID BALANCE', icon: '◈', accent: 'cyan', metric: 'Hydration index', value: '86 / 100', range: '75–100', instruction: 'Connect the sterile hydration probe to the wrist port and hold the hand above heart level.', detail: 'Hydration status balanced; no IV bolus required.' },
]

export const telemetrySeed = {
  glucose: 110,
  oxygen: 98,
  heartRate: 72,
  bpSys: 120,
  bpDia: 80,
  radiation: 1.5,
}

export const profile = {
  name: 'Cmdr. Alex Vance',
  callsign: 'NOVA-04 / VANCE',
  rank: 'Mission Commander · Flight Surgeon Liaison',
  age: '38 years',
  blood: 'O−',
  mission: '142 days · 06 hours',
  zeroG: '118 days',
  allergies: 'Penicillin · none active',
  evacuation: 'Protocol E-7 · 18 min response window',
}

export const bodyParts = [
  { id: 'head', label: 'Head / Brain', x: 50, y: 13, width: 16, height: 13, protocol: 'Keep the head stabilized. Check pupil symmetry, speech clarity, and orientation before any dressing is applied.' },
  { id: 'eyes', label: 'Eyes', x: 50, y: 21, width: 15, height: 5, protocol: 'Dim cabin light, compare both pupils, and use the optical shield. Escalate any new field loss or halos immediately.' },
  { id: 'chest', label: 'Chest / Heart', x: 50, y: 37, width: 28, height: 18, protocol: 'Place the ECG patch over the thoracic guide rings. Watch rhythm and respiratory effort before treating pain.' },
  { id: 'lungs', label: 'Lungs', x: 50, y: 39, width: 22, height: 14, protocol: 'Check for unequal rise, breathlessness, or sharp pleuritic pain. Keep the astronaut upright and run the oxygen scan.' },
  { id: 'abdomen', label: 'Abdomen / Liver', x: 50, y: 52, width: 24, height: 14, protocol: 'Use gentle pressure only. Secure any dressing with the zero-G hydrogel bandage and monitor for rebound pain.' },
  { id: 'left_arm', label: 'Left Arm', x: 28, y: 43, width: 18, height: 11, protocol: 'Inspect the contusion under multispectral light. Apply a cold pack inside the sleeve and secure the arm to the restraint.' },
  { id: 'right_arm', label: 'Right Arm', x: 72, y: 43, width: 18, height: 11, protocol: 'Check distal pulse and sensation, then use the compression wrap only if swelling is increasing.' },
  { id: 'left_hand', label: 'Left Hand', x: 17, y: 58, width: 12, height: 8, protocol: 'Inspect nail-bed color and capillary refill. Use the finger splint kit for suspected fracture.' },
  { id: 'right_hand', label: 'Right Hand', x: 83, y: 58, width: 12, height: 8, protocol: 'Secure loose tools first. Check grip strength and apply a sterile cover to any abrasion.' },
  { id: 'pelvis', label: 'Pelvis', x: 50, y: 66, width: 20, height: 12, protocol: 'Stabilize the pelvis and avoid free-floating transfers. Check for numbness before any mobility test.' },
  { id: 'left_leg', label: 'Left Leg', x: 41, y: 82, width: 14, height: 24, protocol: 'Scan the knee and calf for asymmetry. Use the articulated brace and keep the limb supported during translation.' },
  { id: 'right_leg', label: 'Right Leg', x: 59, y: 82, width: 14, height: 24, protocol: 'Check distal temperature and sensation. Secure the leg before applying a compression sleeve.' },
  { id: 'left_foot', label: 'Left Foot', x: 39, y: 111, width: 15, height: 7, protocol: 'Check pedal pulse and skin integrity. Use the foot restraint to prevent unwanted drift while treating.' },
  { id: 'right_foot', label: 'Right Foot', x: 61, y: 111, width: 15, height: 7, protocol: 'Check pedal pulse and skin integrity. Use the foot restraint to prevent unwanted drift while treating.' },
]

export const alerts = [
  { time: '14:27 UTC', label: 'Radiation dose watch', detail: 'Cumulative dose +0.02 mSv since last poll', tone: 'amber' },
  { time: '13:58 UTC', label: 'Hydration review due', detail: 'Next fluid balance scan in 12 minutes', tone: 'cyan' },
  { time: '12:40 UTC', label: 'SANS optical check cleared', detail: 'Near-vision accommodation stable', tone: 'green' },
]

export const healthSeries = [
  { period: 'W1', cardio: 78, bone: 91, muscle: 94, immune: 83, radiation: 0.8 },
  { period: 'W2', cardio: 80, bone: 91.5, muscle: 94.5, immune: 84, radiation: 0.9 },
  { period: 'W3', cardio: 81, bone: 92, muscle: 95, immune: 85, radiation: 1.0 },
  { period: 'W4', cardio: 83, bone: 92.4, muscle: 95.4, immune: 87, radiation: 1.1 },
  { period: 'W5', cardio: 84, bone: 93, muscle: 96, immune: 88, radiation: 1.2 },
  { period: 'W6', cardio: 86, bone: 93.4, muscle: 96.4, immune: 90, radiation: 1.35 },
  { period: 'W7', cardio: 87, bone: 94, muscle: 96.8, immune: 91, radiation: 1.42 },
  { period: 'W8', cardio: 89, bone: 94.6, muscle: 97.1, immune: 92, radiation: 1.5 },
]

export const chronicSeries = [
  { time: '00:00', glucose: 106, sys: 118, dia: 77, hb: 14.0, dose: 1.12 },
  { time: '04:00', glucose: 108, sys: 120, dia: 79, hb: 14.1, dose: 1.18 },
  { time: '08:00', glucose: 114, sys: 122, dia: 81, hb: 14.1, dose: 1.27 },
  { time: '12:00', glucose: 110, sys: 119, dia: 78, hb: 14.2, dose: 1.36 },
  { time: '16:00', glucose: 112, sys: 121, dia: 80, hb: 14.2, dose: 1.43 },
  { time: '20:00', glucose: 109, sys: 120, dia: 79, hb: 14.2, dose: 1.5 },
]

export const medicalLog = [
  { time: '14:28:04', type: 'Telemetry', metric: 'Heart rate', result: '72 bpm', status: 'Nominal' },
  { time: '14:26:21', type: 'Radiation Bio-Scan', metric: 'Cumulative dose', result: '1.50 mSv', status: 'Watch' },
  { time: '14:12:47', type: 'ECG', metric: 'Rhythm', result: 'Sinus', status: 'Nominal' },
  { time: '13:58:09', type: 'Hydration', metric: 'Hydration index', result: '86 / 100', status: 'Nominal' },
  { time: '12:40:18', type: 'Vision (SANS)', metric: 'Optical risk', result: 'Low', status: 'Cleared' },
  { time: '11:03:42', type: 'Blood Test', metric: 'Hemoglobin', result: '14.2 g/dL', status: 'Nominal' },
  { time: '09:24:10', type: 'Skin / Wound Scan', metric: 'Left forearm', result: 'Contusion', status: 'Monitor' },
]
