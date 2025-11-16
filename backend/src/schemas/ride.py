"""
Ride API Schemas
Pydantic models for ride posting, requesting, and retrieval endpoints.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, field_validator, model_validator, Field
from enum import Enum
from decimal import Decimal


class RideType(str, Enum):
    """Type of ride posting"""
    OFFER = "offer"      # Driver offering a ride
    REQUEST = "request"  # Passenger requesting a ride


class RideStatus(str, Enum):
    """Current status of the ride"""
    OPEN = "open"           # Available for bookings
    REQUESTED = "requested" # Passenger looking for driver
    FULL = "full"           # All seats booked
    CANCELLED = "cancelled" # Cancelled by driver
    COMPLETED = "completed" # Ride finished


# ===== CREATE RIDE SCHEMAS =====

class RideCreate(BaseModel):
    """
    Schema for creating a new ride offer or request.
    
    For ride OFFERS (driver posting):
        - ride_type: "offer"
        - seats_total: number of available seats
        - price_share: cost per passenger
        
    For ride REQUESTS (passenger looking for ride):
        - ride_type: "request"
        - seats_total: number of seats needed (usually 1)
        - price_share: willing to pay amount
    
    **Coordinates:**
    Use the /api/geo/geocode endpoint to convert addresses to coordinates.
    Coordinates are strongly recommended for map display and proximity search.
    If not provided, coordinates will default to (0, 0).
    """
    ride_type: RideType
    
    # Location information - Human-readable labels
    origin_label: str = Field(
        ..., 
        description="Human-readable starting point (e.g., '123 Main St, Toronto')"
    )
    destination_label: str = Field(
        ..., 
        description="Human-readable destination (e.g., 'Pearson Airport')"
    )
    
    # Location information - GPS coordinates (use /api/geo/geocode to get these)
    origin_lat: Optional[float] = Field(
        None, 
        ge=-90, 
        le=90,
        description="Origin latitude (-90 to 90). Get from /api/geo/geocode endpoint."
    )
    origin_lng: Optional[float] = Field(
        None, 
        ge=-180, 
        le=180,
        description="Origin longitude (-180 to 180). Get from /api/geo/geocode endpoint."
    )
    destination_lat: Optional[float] = Field(
        None, 
        ge=-90, 
        le=90,
        description="Destination latitude (-90 to 90). Get from /api/geo/geocode endpoint."
    )
    destination_lng: Optional[float] = Field(
        None, 
        ge=-180, 
        le=180,
        description="Destination longitude (-180 to 180). Get from /api/geo/geocode endpoint."
    )
    
    # Schedule
    departure_time: datetime  # When driver leaves (or when passenger needs ride)
    
    # Capacity and pricing
    seats_total: int  # Seats available (offer) or needed (request)
    price_share: Decimal  # Price per seat
    
    # Optional notes/preferences (e.g., "I have luggage", "Prefer quiet ride")
    notes: Optional[str] = None
    
    # Optional vehicle info (only for OFFERS - ignored for requests)
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_year: Optional[int] = None
    
    @field_validator('origin_label', 'destination_label')
    @classmethod
    def validate_location_labels(cls, v):
        """Ensure location labels are not empty"""
        if not v or len(v.strip()) < 3:
            raise ValueError('Location must be at least 3 characters')
        if len(v) > 255:
            raise ValueError('Location cannot exceed 255 characters')
        return v.strip()
    
    @field_validator('origin_lat', 'destination_lat')
    @classmethod
    def validate_latitude(cls, v):
        """Validate latitude range (-90 to 90)"""
        if v is not None:
            if v < -90 or v > 90:
                raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @field_validator('origin_lng', 'destination_lng')
    @classmethod
    def validate_longitude(cls, v):
        """Validate longitude range (-180 to 180)"""
        if v is not None:
            if v < -180 or v > 180:
                raise ValueError('Longitude must be between -180 and 180')
        return v
    
    @field_validator('departure_time')
    @classmethod
    def validate_departure_time(cls, v):
        """Ensure departure time is in the future"""
        if v.replace(tzinfo=None) < datetime.now():
            raise ValueError('Departure time must be in the future')
        return v
    
    @field_validator('seats_total')
    @classmethod
    def validate_seats(cls, v):
        """Validate seat count"""
        if v < 1:
            raise ValueError('Must have at least 1 seat')
        if v > 10:
            raise ValueError('Cannot exceed 10 seats')
        return v
    
    @field_validator('price_share')
    @classmethod
    def validate_price(cls, v):
        """Validate price"""
        if v < 0:
            raise ValueError('Price cannot be negative')
        if v > 9999.99:
            raise ValueError('Price cannot exceed $9,999.99')
        return round(v, 2)
    
    @field_validator('vehicle_year')
    @classmethod
    def validate_vehicle_year(cls, v):
        """Validate vehicle year"""
        if v is not None:
            current_year = datetime.now().year
            if v < 1900 or v > current_year + 1:
                raise ValueError(f'Vehicle year must be between 1900 and {current_year + 1}')
        return v
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        """Validate notes length"""
        if v is not None:
            if len(v.strip()) == 0:
                return None  # Empty string becomes None
            if len(v) > 500:
                raise ValueError('Notes cannot exceed 500 characters')
            return v.strip()
        return v
    
    @model_validator(mode='after')
    def validate_coordinates(self):
        """Ensure coordinate pairs are complete"""
        # If any origin coordinate is provided, both must be provided
        if (self.origin_lat is not None) != (self.origin_lng is not None):
            raise ValueError('Both origin latitude and longitude must be provided together')
        
        # If any destination coordinate is provided, both must be provided
        if (self.destination_lat is not None) != (self.destination_lng is not None):
            raise ValueError('Both destination latitude and longitude must be provided together')
        
        return self
    
    @model_validator(mode='after')
    def validate_ride_type_constraints(self):
        """Validate constraints specific to ride type"""
        # Ride REQUESTS should not include vehicle details (passengers don't have vehicles)
        if self.ride_type == RideType.REQUEST:
            if any([self.vehicle_make, self.vehicle_model, self.vehicle_color, self.vehicle_year]):
                raise ValueError('Vehicle details cannot be specified for ride requests (only for offers)')
        
        return self


# ===== UPDATE RIDE SCHEMAS =====

class RideUpdate(BaseModel):
    """
    Schema for updating an existing ride.
    All fields are optional - only provided fields will be updated.
    """
    origin_label: Optional[str] = None
    destination_label: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    
    departure_time: Optional[datetime] = None
    seats_total: Optional[int] = None
    price_share: Optional[Decimal] = None
    notes: Optional[str] = None
    
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_year: Optional[int] = None
    
    # Apply same validators as RideCreate
    @field_validator('origin_label', 'destination_label')
    @classmethod
    def validate_location_labels(cls, v):
        if v is not None:
            if not v or len(v.strip()) < 3:
                raise ValueError('Location must be at least 3 characters')
            if len(v) > 255:
                raise ValueError('Location cannot exceed 255 characters')
            return v.strip()
        return v
    
    @field_validator('origin_lat', 'destination_lat')
    @classmethod
    def validate_latitude(cls, v):
        if v is not None:
            if v < -90 or v > 90:
                raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @field_validator('origin_lng', 'destination_lng')
    @classmethod
    def validate_longitude(cls, v):
        if v is not None:
            if v < -180 or v > 180:
                raise ValueError('Longitude must be between -180 and 180')
        return v
    
    @field_validator('departure_time')
    @classmethod
    def validate_departure_time(cls, v):
        if v is not None:
            if v.replace(tzinfo=None) < datetime.now():
                raise ValueError('Departure time must be in the future')
        return v
    
    @field_validator('seats_total')
    @classmethod
    def validate_seats(cls, v):
        if v is not None:
            if v < 1:
                raise ValueError('Must have at least 1 seat')
            if v > 10:
                raise ValueError('Cannot exceed 10 seats')
        return v
    
    @field_validator('price_share')
    @classmethod
    def validate_price(cls, v):
        if v is not None:
            if v < 0:
                raise ValueError('Price cannot be negative')
            if v > 9999.99:
                raise ValueError('Price cannot exceed $9,999.99')
            return round(v, 2)
        return v
    
    @field_validator('vehicle_year')
    @classmethod
    def validate_vehicle_year(cls, v):
        if v is not None:
            current_year = datetime.now().year
            if v < 1900 or v > current_year + 1:
                raise ValueError(f'Vehicle year must be between 1900 and {current_year + 1}')
        return v
    
    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v):
        if v is not None:
            if len(v.strip()) == 0:
                return None
            if len(v) > 500:
                raise ValueError('Notes cannot exceed 500 characters')
            return v.strip()
        return v


# ===== RESPONSE SCHEMAS =====

class DriverInfo(BaseModel):
    """Simplified driver information for ride responses"""
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


class RideResponse(BaseModel):
    """
    Schema for ride response.
    Returns complete ride information with driver details and coordinates.
    
    **Coordinates are always included** for map display and proximity features.
    If coordinates were not provided during creation, they will default to (0, 0).
    """
    id: str
    ride_type: str  # "offer" or "request" (derived from status)
    
    # Driver info
    driver_id: str
    driver: Optional[DriverInfo] = None
    
    # Location - Human-readable labels
    origin_label: Optional[str] = Field(None, description="Human-readable origin")
    destination_label: Optional[str] = Field(None, description="Human-readable destination")
    
    # Location - GPS coordinates for map display
    origin_lat: Optional[float] = Field(None, description="Origin latitude")
    origin_lng: Optional[float] = Field(None, description="Origin longitude")
    destination_lat: Optional[float] = Field(None, description="Destination latitude")
    destination_lng: Optional[float] = Field(None, description="Destination longitude")
    
    # Schedule
    departure_time: datetime
    
    # Capacity
    seats_total: int
    seats_available: int
    
    # Pricing
    price_share: float
    
    # Vehicle info
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    vehicle_color: Optional[str] = None
    vehicle_year: Optional[int] = None
    
    # Additional info
    notes: Optional[str] = None
    
    # Status
    status: RideStatus
    
    # Timestamps
    created_at: datetime
    
    model_config = {"from_attributes": True}
    
    @field_validator('id', 'driver_id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        """Convert UUID to string if needed"""
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class RideListResponse(BaseModel):
    """Schema for paginated list of rides"""
    rides: list[RideResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===== SEARCH RESPONSE SCHEMAS =====

class RideSearchItem(BaseModel):
    """
    Simplified ride info returned by the search endpoint.
    
    Includes coordinates for map display on search results page.
    """
    id: str
    from_label: Optional[str] = Field(None, alias="from")
    to_label: Optional[str] = Field(None, alias="to")
    depart_at: datetime
    seats_available: int
    price: float
    driver_rating: Optional[float] = None
    ride_type: str
    
    # Coordinates for map display
    origin_lat: Optional[float] = Field(None, description="Origin latitude")
    origin_lng: Optional[float] = Field(None, description="Origin longitude")
    destination_lat: Optional[float] = Field(None, description="Destination latitude")
    destination_lng: Optional[float] = Field(None, description="Destination longitude")

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
    }

    @field_validator('id', mode='before')
    @classmethod
    def convert_uuid_to_str(cls, v):
        if v is not None and not isinstance(v, str):
            return str(v)
        return v


class RideSearchResponse(BaseModel):
    """Paginated response for ride search endpoint"""
    rides: list[RideSearchItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ===== STATUS UPDATE SCHEMA =====

class RideStatusUpdate(BaseModel):
    """Schema for updating ride status"""
    status: RideStatus
    
    @field_validator('status')
    @classmethod
    def validate_status_transition(cls, v):
        """Validate allowed status values"""
        allowed = {RideStatus.CANCELLED, RideStatus.COMPLETED}
        if v not in allowed:
            raise ValueError(f'Can only manually set status to: {", ".join([s.value for s in allowed])}')
        return v
