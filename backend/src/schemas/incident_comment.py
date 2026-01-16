"""
Incident Comment Schemas
Pydantic models for incident comment validation and serialization.
"""
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, validator


# ===== REQUEST SCHEMAS =====

class IncidentCommentCreate(BaseModel):
    """Schema for creating a new incident comment."""
    comment_text: str = Field(..., min_length=1, max_length=2000, description="Comment text")
    
    @validator('comment_text')
    def validate_comment_text(cls, v):
        if not v.strip():
            raise ValueError("Comment cannot be empty or only whitespace")
        return v.strip()


# ===== RESPONSE SCHEMAS =====

class IncidentCommentAuthorInfo(BaseModel):
    """Minimal author info for comment responses"""
    id: UUID
    full_name: str
    
    class Config:
        from_attributes = True


class IncidentCommentResponse(BaseModel):
    """Complete incident comment information."""
    id: UUID
    incident_id: UUID
    author_id: UUID
    comment_text: str
    is_admin_comment: bool
    created_at: datetime
    updated_at: datetime
    
    # Nested relationship data
    author: Optional[IncidentCommentAuthorInfo] = None
    
    class Config:
        from_attributes = True
