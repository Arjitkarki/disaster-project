from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel


class Severity(str, Enum):
    LOW      = 'LOW'
    MODERATE = 'MODERATE'
    HIGH     = 'HIGH'
    CRITICAL = 'CRITICAL'


class Lifecycle(str, Enum):
    REPORTED = 'REPORTED'
    VERIFIED = 'VERIFIED'
    ACTIVE   = 'ACTIVE'
    RESOLVED = 'RESOLVED'


class Zone(BaseModel):
    id:           str
    name:         str
    district:     str
    municipality: Optional[str] = None


class Incident(BaseModel):
    id:          str
    title:       str
    description: str
    severity:    Severity
    lifecycle:   Lifecycle
    zone:        Zone
    latitude:    float
    longitude:   float
    reported_at: datetime
    updated_at:  datetime


class ReportCreate(BaseModel):
    description: str
    latitude:    float
    longitude:   float
    image_url:   Optional[str] = None


class ReportResponse(BaseModel):
    id:           str
    description:  str
    latitude:     float
    longitude:    float
    image_url:    Optional[str] = None
    submitted_at: datetime
    lifecycle:    Lifecycle = Lifecycle.REPORTED
