from collections import defaultdict, deque
from datetime import datetime, timezone
from .schemas import AstronautProfile, TestResult, Alert

class MedicalEngine:
    """Transparent illustrative rules; not clinically validated."""
    def __init__(self):
        self.profiles={}
        self.history=defaultdict(lambda: deque(maxlen=2000))
        self.last_sequence={}

    def set_profile(self,p):
        self.profiles[p.astronaut_id]=p
        return p

    def ingest(self,r):
        aid=r.astronaut_id; key=(aid,r.test_type.value)
        prev=self.last_sequence.get(key)
        gap=prev is not None and r.sequence is not None and r.sequence>prev+1
        duplicate=prev is not None and r.sequence is not None and r.sequence<=prev
        if not duplicate:
            self.history[aid].append(r)
            if r.sequence is not None: self.last_sequence[key]=r.sequence
        alert=self.assess(r)
        if gap:
            alert.reasons.append("Packet sequence gap detected; missing observations were not imputed.")
            if alert.level=="INFO":
                alert.level="WARNING"; alert.risk="DATA_QUALITY"; alert.score=15
                alert.actions=["Check device connectivity, timestamps, and packet integrity.","Do not interpret missing data as normal."]
        if duplicate: alert.reasons.append("Duplicate/out-of-order packet excluded from history.")
        self.update_profile(r)
        return alert

    def update_profile(self,r):
        p=self.profiles.get(r.astronaut_id)
        if not p: return
        if r.test_type.value=="radiation":
            d=r.metrics.get("dose_mSv")
            if isinstance(d,(int,float)) and d>=0: p.cumulative_radiation_mSv+=float(d)
        if r.quality.lower()=="good":
            for k in ("glucose_mg_dl","heart_rate_bpm","spo2_pct","temperature_c"):
                v=r.metrics.get(k)
                if isinstance(v,(int,float)):
                    old=p.baseline.get(k); p.baseline[k]=float(v) if old is None else .95*old+.05*float(v)
        p.updated_at=datetime.now(timezone.utc)

    def assess(self,r):
        m=r.metrics; reasons=[]; risks=[]; score=0
        def add(n,msg,risk):
            nonlocal score
            score+=n; reasons.append(msg); risks.append(risk)
        glucose=m.get("glucose_mg_dl")
        p=self.profiles.get(r.astronaut_id)
        diabetes=bool(p and any("diabet" in c.name.lower() and c.status=="active" for c in p.chronic_conditions))
        if isinstance(glucose,(int,float)):
            if glucose<70: add(65,f"Glucose {glucose:g} mg/dL below illustrative low trigger.","HYPOGLYCEMIA")
            elif glucose>=250: add(45,f"Glucose {glucose:g} mg/dL above illustrative high trigger.","HYPERGLYCEMIA")
            elif diabetes and glucose>=180: add(20,f"Glucose {glucose:g} mg/dL above example diabetes follow-up trigger.","DIABETES_TREND")
        hr,spo2=m.get("heart_rate_bpm"),m.get("spo2_pct")
        if isinstance(hr,(int,float)) and hr>120: add(25,f"Elevated HR: {hr:g} bpm.","CARDIOVASCULAR_STRAIN")
        if isinstance(spo2,(int,float)) and spo2<90: add(55,f"Low SpO2: {spo2:g}%.","OXYGENATION")
        temp=m.get("temperature_c")
        if isinstance(temp,(int,float)) and temp>=38: add(25,f"Elevated temperature: {temp:g} C.","FEVER_SIGNAL")
        sleep=m.get("sleep_hours")
        if isinstance(sleep,(int,float)) and sleep<4: add(20,f"Low sleep duration: {sleep:g} hours.","FATIGUE")
        if isinstance(glucose,(int,float)) and glucose>=180 and isinstance(sleep,(int,float)) and sleep<5:
            add(20,"Combined elevated glucose and short sleep; review metabolic/fatigue context.","METABOLIC_FATIGUE")
        dose=m.get("dose_mSv")
        if isinstance(dose,(int,float)) and dose>0:
            total=(p.cumulative_radiation_mSv if p else 0)+dose
            if total>100: add(20,f"Cumulative recorded dose {total:g} mSv; review mission-specific limits.","RADIATION_REVIEW")
        if r.findings:
            reasons.extend([f"Submitted {r.test_type.value} finding: {x}" for x in r.findings[:5]])
            score+=5
        if r.quality.lower() in ("poor","degraded","invalid"):
            reasons.append(f"Data quality is {r.quality}; verify or repeat if safe."); score+=5
        level="EMERGENCY" if score>=60 else "WARNING" if score>=20 else "INFO"
        actions={
          "EMERGENCY":["Immediately contact designated flight surgeon/medical control and follow mission-approved emergency procedures.","Verify the measurement independently if safe; do not delay escalation.","Use only approved protocols; this software does not prescribe treatment."],
          "WARNING":["Verify measurement, units, device quality and timestamp; repeat per mission protocol.","Notify the crew medical officer/flight surgeon.","Review history, medications, activity, sleep and environmental context."],
          "INFO":["Store the result in the longitudinal profile and continue scheduled monitoring.","No configured rule triggered; this does not establish medical safety."]
        }[level]
        return Alert(level=level,risk=risks[0] if risks else (r.test_type.value.upper()+"_REVIEW" if r.findings else "NO_RULE_TRIGGERED"),
                     score=min(score,100),reasons=reasons or ["No configured rule triggered."],actions=actions)
