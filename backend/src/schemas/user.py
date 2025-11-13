"""
User API Schemas
Pydantic models for user authentication and profile management endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
from enum import Enum


class UserRole(str, Enum):
    """User role enum"""
    USER = "user"
    ADMIN = "admin"


class VerificationStatus(str, Enum):
    """Account verification status enum"""
    PENDING = "pending"
    VERIFIED = "verified"


class AccountStatus(str, Enum):
    """Account status enum"""
    ACTIVE = "active"
    SUSPENDED = "suspended"


# ===== AUTHENTICATION SCHEMAS =====

class UserRegister(BaseModel):
    """Schema for user registration"""
    full_name: str
    email: EmailStr
    password: str
    
    @field_validator('full_name')
    def validate_full_name(cls, v):
        if not v or len(v.strip()) < 2:
            raise ValueError('Full name must be at least 2 characters')
        if len(v) > 100:
            raise ValueError('Full name cannot exceed 100 characters')
        return v.strip()
    
    @field_validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # TODO: Add more password strength validation
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


# ===== USER PROFILE SCHEMAS =====

class UserResponse(BaseModel):
    """Schema for user profile response"""
    id: str
    full_name: str
    email: str
    role: UserRole
    verification_status: VerificationStatus
    status: AccountStatus
    avatar_url: Optional[str] = None
    rating_avg: float
    rating_count: int
    created_at: datetime
    
    
    # Pydantic v2: enable loading from ORM model attributes and serialize UUIDs as strings
    model_config = {
        "from_attributes": True,
        "json_encoders": {
            # This isn't needed in Pydantic v2, but we add field serializer below
        }
    }
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string if needed"""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    
    # Vehicle info (for drivers)
    # Vehicle information moved to `rides` table; not part of user profile
    
    @field_validator('full_name')
    def validate_full_name(cls, v):
        if v is not None:
            if not v or len(v.strip()) < 2:
                raise ValueError('Full name must be at least 2 characters')
            if len(v) > 100:
                raise ValueError('Full name cannot exceed 100 characters')
            return v.strip()
        return v
    


class UserPasswordChange(BaseModel):
    """Schema for changing password"""
    current_password: str
    new_password: str
    
    @field_validator('new_password')
    def validate_new_password(cls, v):
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters long')
        # TODO: Add more password strength validation
        return v


# ===== FILE UPLOAD SCHEMAS =====

class AvatarUploadResponse(BaseModel):
    """Schema for avatar upload response"""
    avatar_url: str
    message: str = "Avatar uploaded successfully"


# ===== PRIVACY SCHEMAS =====

class PrivacyResponse(BaseModel):
    """Schema for privacy action responses"""
    message: str
    request_id: Optional[str] = None
    status: str = "success"


# ===== ERROR SCHEMAS =====

class ErrorResponse(BaseModel):
    """Schema for error responses"""
    detail: str
    error_code: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    """Schema for validation error responses"""
    detail: str
    validation_errors: list