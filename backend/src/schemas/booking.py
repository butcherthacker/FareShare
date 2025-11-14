"""
Booking API Schemas
Pydantic models for booking rides, managing reservations, and viewing bookings.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, Field
from enum import Enum
from decimal import Decimal


class BookingStatus(str, Enum):
    """Current status of the booking"""
    PENDING = "pending"       # Just created, waiting for driver confirmation
    CONFIRMED = "confirmed"   # Driver accepted, seats reserved
    COMPLETED = "completed"   # Ride finished successfully
    CANCELLED = "cancelled"   # Booking was cancelled


# ===== CREATE BOOKING SCHEMAS =====

class BookingCreate(BaseModel):
    """
    Schema for creating a new booking (passenger claims seats in a ride).
    
    Two scenarios:
    1. Passenger books a ride OFFER (driver already posted):
       - ride_id: ID of the ride offer to book
       - seats_reserved: Number of seats needed
       
    2. Driver fulfills a ride REQUEST (passenger is looking for driver):
       - ride_id: ID of the ride request to fulfill
       - seats_reserved: Number of seats the driver can provide
    
    The booking automatically calculates amount_paid as:
    seats_reserved × ride.price_share
    """
    ride_id: str  # UUID of the ride to book
    seats_reserved: int  # Number of seats to reserve
    
    @field_validator('seats_reserved')
    @classmethod
    def validate_seats(cls, v):
        """Validate seat count"""
        if v < 1:
            raise ValueError('Must reserve at least 1 seat')
        if v > 10:
            raise ValueError('Cannot reserve more than 10 seats')
        return v


# ===== UPDATE BOOKING SCHEMAS =====

class BookingStatusUpdate(BaseModel):
    """
    Schema for updating booking status.
    Only status transitions allowed by business rules are permitted.
    """
    status: BookingStatus
    
    @field_validator('status')
    @classmethod
    def validate_status_transition(cls, v):
        """Validate allowed status transitions"""
        # All status transitions will be validated in the route logic
        # This just ensures it's a valid BookingStatus enum value
        return v


# ===== RESPONSE SCHEMAS =====

class PassengerInfo(BaseModel):
    """Simplified passenger information for booking responses"""
    id: str
    full_name: str
    rating_avg: float
    rating_count: int
    avatar_url: Optional[str] = None
    
    model_config = {"from_attributes": True}
    
    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string if needed"""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class RideInfoBasic(BaseModel):
    """Basic ride information for booking responses"""
    id: str
    origin_label: Optional[str] = None
    destination_label: Optional[str] = None
    departure_time: datetime
    price_share: float
    status: str
    driver_id: str
    
    model_config = {"from_attributes": True}
    
    @field_validator('id', 'driver_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string if needed"""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class BookingResponse(BaseModel):
    """
    Schema for booking response.
    Returns complete booking information with passenger and ride details.
    """
    id: str
    
    # Passenger info
    passenger_id: str
    passenger: Optional[PassengerInfo] = None
    
    # Ride info
    ride_id: str
    ride: Optional[RideInfoBasic] = None
    
    # Booking details
    seats_reserved: int
    amount_paid: float
    status: BookingStatus
    
    # Timestamps
    booked_at: datetime
    
    model_config = {"from_attributes": True}
    
    @field_validator('id', 'passenger_id', 'ride_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string if needed"""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class BookingListResponse(BaseModel):
    """Schema for paginated list of bookings"""
    bookings: list[BookingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookingStats(BaseModel):
    """Statistics about user's bookings"""
    total_bookings: int
    pending_bookings: int
    confirmed_bookings: int
    completed_bookings: int
    cancelled_bookings: int
    total_spent: float  # Total amount paid across all bookings
    total_earned: float  # Total amount earned as driver (from completed rides)
