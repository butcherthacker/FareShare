"""
Incident Schemas
Pydantic models for incident report validation and serialization.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, validator


# ===== REQUEST SCHEMAS =====

class IncidentCreate(BaseModel):
    """
    Schema for creating a new incident report.
    
    The reporter_id is extracted from the authenticated user's token,
    so it's not included in this schema.
    """
    reported_user_id: UUID = Field(..., description="ID of the user being reported")
    ride_id: UUID = Field(..., description="ID of the ride where incident occurred")
    booking_id: UUID = Field(..., description="ID of the booking that connects users")
    category: str = Field(..., description="Incident category: safety, harassment, property, other")
    description: str = Field(..., min_length=10, max_length=2000, description="Detailed description of the incident")
    
    @validator('category')
    def validate_category(cls, v):
        allowed_categories = ['safety', 'harassment', 'property', 'other']
        if v not in allowed_categories:
            raise ValueError(f"Category must be one of: {', '.join(allowed_categories)}")
        return v
    
    @validator('description')
    def validate_description(cls, v):
        if not v.strip():
            raise ValueError("Description cannot be empty or only whitespace")
        return v.strip()


class IncidentUpdate(BaseModel):
    """
    Schema for updating an incident (admin only).
    
    Admins can update the status and add internal notes.
    """
    status: Optional[str] = Field(None, description="New status: open, reviewed, resolved, dismissed")
    admin_notes: Optional[str] = Field(None, max_length=2000, description="Internal admin notes")
    
    @validator('status')
    def validate_status(cls, v):
        if v is None:
            return v
        allowed_statuses = ['open', 'reviewed', 'resolved', 'dismissed']
        if v not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(allowed_statuses)}")
        return v


# ===== RESPONSE SCHEMAS =====

class IncidentUserInfo(BaseModel):
    """Minimal user info for incident responses"""
    id: UUID
    full_name: str
    
    class Config:
        from_attributes = True


class IncidentRideInfo(BaseModel):
    """Minimal ride info for incident responses"""
    id: UUID
    origin_label: Optional[str] = None
    destination_label: Optional[str] = None
    departure_time: datetime
    
    class Config:
        from_attributes = True


class IncidentResponse(BaseModel):
    """
    Complete incident information returned to users.
    
    Includes admin notes so users can see responses to their reports.
    """
    id: UUID
    reporter_id: UUID
    reported_user_id: UUID
    ride_id: UUID
    booking_id: UUID
    category: str
    description: str
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    # Nested relationship data
    reporter: Optional[IncidentUserInfo] = None
    reported_user: Optional[IncidentUserInfo] = None
    ride: Optional[IncidentRideInfo] = None
    
    class Config:
        from_attributes = True


class IncidentAdminResponse(IncidentResponse):
    """
    Extended incident information for admins, including internal notes.
    """
    admin_notes: Optional[str] = None
    
    class Config:
        from_attributes = True


class IncidentListResponse(BaseModel):
    """
    Paginated list of incidents.
    """
    incidents: list[IncidentResponse]
    total: int
    page: int
    limit: int
    
    class Config:
        from_attributes = True
