from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict

class TestType(str, Enum):
    blood="blood"; urine="urine"; saliva="saliva"; sweat="sweat"; immune="immune"; dna="dna"
    ultrasound="ultrasound"; xray="xray"; retina="retina"; vision="vision"
    blood_pressure="blood_pressure"; ecg="ecg"; oxygen_saturation="oxygen_saturation"
    temperature_breathing="temperature_breathing"; sleep="sleep"; radiation="radiation"
    skin_wound="skin_wound"; iv_fluid="iv_fluid"

class ChronicCondition(BaseModel):
    name: str
    status: str = "active"
    notes: Optional[str] = None
    targets: dict[str,float] = Field(default_factory=dict)

class AstronautProfile(BaseModel):
    astronaut_id: str
    mission_day: int = 0
    chronic_conditions: list[ChronicCondition] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    microgravity_adaptation_day: Optional[int] = None
    circadian_phase_hours: Optional[float] = None
    cumulative_radiation_mSv: float = 0
    baseline: dict[str,float] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TestResult(BaseModel):
    model_config = ConfigDict(extra="allow")
    astronaut_id: str
    test_type: TestType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    source_device: Optional[str] = None
    sequence: Optional[int] = None
    quality: str = "unknown"
    metrics: dict[str,Any] = Field(default_factory=dict)
    findings: list[str] = Field(default_factory=list)
    image_uri: Optional[str] = None
    units: dict[str,str] = Field(default_factory=dict)

class Alert(BaseModel):
    level: str
    risk: str
    score: float
    reasons: list[str]
    actions: list[str]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    human_review_required: bool = True
