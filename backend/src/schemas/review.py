"""
Review API Schemas
Pydantic models for review and rating endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator
from uuid import UUID


# ===== REQUEST SCHEMAS =====

class ReviewCreate(BaseModel):
    """Schema for creating a new review"""
    ride_id: UUID
    reviewee_id: UUID
    rating: int
    comment: Optional[str] = None
    
    @field_validator('rating')
    def validate_rating(cls, v):
        if v < 1 or v > 5:
            raise ValueError('Rating must be between 1 and 5')
        return v
    
    @field_validator('comment')
    def validate_comment(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) == 0:
                return None  # Empty comment treated as None
            if len(v) > 150:
                raise ValueError('Comment cannot exceed 150 characters')
        return v


# ===== RESPONSE SCHEMAS =====

class ReviewerInfo(BaseModel):
    """Minimal reviewer information for review responses"""
    id: UUID
    full_name: str
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


class ReviewResponse(BaseModel):
    """Schema for review response"""
    id: UUID
    ride_id: UUID
    reviewer_id: UUID
    reviewee_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ReviewWithReviewer(BaseModel):
    """Schema for review with reviewer details"""
    id: UUID
    ride_id: UUID
    rating: int
    comment: Optional[str] = None
    created_at: datetime
    reviewer: ReviewerInfo
    
    class Config:
        from_attributes = True


class PaginatedReviewsResponse(BaseModel):
    """Schema for paginated reviews list"""
    reviews: list[ReviewWithReviewer]
    total: int
    page: int
    page_size: int
    total_pages: int


class ReviewStatsResponse(BaseModel):
    """Schema for review statistics"""
    rating_avg: float
    rating_count: int
    five_star_count: int
    four_star_count: int
    three_star_count: int
    two_star_count: int
    one_star_count: int
