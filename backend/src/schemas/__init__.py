"""
Schemas Package
Exports all Pydantic models for request/response validation.
"""
from src.schemas.user import *
from src.schemas.ride import *
from src.schemas.booking import *

__all__ = [
    # User schemas
    "UserRegister", "UserLogin", "UserResponse", "UserProfileUpdate",
    "UserPasswordChange", "Token", "AvatarUploadResponse", "PrivacyResponse",
    # Ride schemas
    "RideCreate", "RideUpdate", "RideResponse", "RideListResponse",
    "RideStatusUpdate", "RideType", "RideStatus", "DriverInfo",
    # Booking schemas
    "BookingCreate", "BookingStatusUpdate", "BookingResponse", "BookingListResponse",
    "BookingStatus", "BookingStats", "PassengerInfo", "RideInfoBasic"
]