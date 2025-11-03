"""
Ride Model
Represents ride offers posted by drivers.
Includes geospatial data (origin/destination) using PostGIS.
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Numeric, DateTime, ForeignKey, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text
from geoalchemy2 import Geography

from src.config.db import Base


class Ride(Base):
    """
    Ride Model - Represents a ride offer posted by a driver.
    
    When a driver posts a ride, they specify:
    - Where they're going (origin → destination)
    - When they're leaving (departure time)
    - How many passengers they can take (seats)
    - How much each passenger pays (price)
    
    Uses PostGIS (PostgreSQL extension) to store geographic coordinates.
    This allows efficient queries like "find rides near me" or "within 10km radius".
    
    Relationships:
        - driver: The user who created this ride (N:1 - many rides, one driver)
        - bookings: All passenger bookings for this ride (1:N - one ride, many bookings)
        - reviews: All reviews related to this ride (1:N)
    """
    __tablename__ = "rides"
    
    # ===== PRIMARY KEY =====
    # Auto-generated unique ID for each ride
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="Unique ride identifier (UUID)"
    )
    
    # ===== DRIVER REFERENCE =====
    # Links to the User who created this ride
    # If user is deleted, their rides are deleted too (CASCADE)
    # Indexed for fast "show all rides by driver X" queries
    driver_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),  # Link to users table
        nullable=False,  # Every ride must have a driver
        index=True,  # Speed up driver lookup queries
        comment="User who is offering this ride"
    )
    
    # ===== VEHICLE INFORMATION =====
    # Details about the car (helps passengers identify driver)
    # All fields are optional (nullable=True)
    
    # Brand of vehicle (e.g., "Toyota", "Honda", "Ford")
    vehicle_make = Column(
        String(50),
        nullable=True,  # Optional field
        comment="Vehicle brand (e.g., Toyota, Honda)"
    )
    
    # Model name (e.g., "Camry", "Civic", "F-150")
    vehicle_model = Column(
        String(50),
        nullable=True,
        comment="Vehicle model (e.g., Camry, Civic)"
    )
    
    # Color helps passengers find the right car (e.g., "Red", "Blue", "Black")
    vehicle_color = Column(
        String(30),
        nullable=True,
        comment="Vehicle color for passenger identification"
    )
    
    # Manufacturing year (e.g., 2020, 2018)
    vehicle_year = Column(
        Integer,
        nullable=True,
        comment="Vehicle year of manufacture"
    )
    
    # ===== ROUTE INFORMATION - HUMAN-READABLE =====
    # These are display labels for UI (e.g., "Downtown Toronto", "Pearson Airport")
    # Not used for calculations, just for showing to users
    
    # Starting point description (e.g., "123 Main St, Toronto")
    origin_label = Column(
        String(255),
        nullable=True,
        comment="Human-readable starting point (e.g., 'Downtown Toronto')"
    )
    
    # Ending point description (e.g., "Toronto Pearson Airport")
    destination_label = Column(
        String(255),
        nullable=True,
        comment="Human-readable destination (e.g., 'Pearson Airport')"
    )
    
    # ===== ROUTE INFORMATION - GEOGRAPHIC COORDINATES =====
    # PostGIS Geography type stores latitude/longitude
    # POINT = single location (not a line or area)
    # SRID 4326 = WGS84 coordinate system (standard for GPS)
    # Format: POINT(longitude latitude) - note: lon THEN lat!
    
    # Starting point as GPS coordinates
    # Required field - we need this for "find rides near me" queries
    # Example: POINT(-79.3832 43.6532) for Toronto
    origin_geom = Column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,  # Must have coordinates
        comment="Starting point GPS coordinates (longitude, latitude)"
    )
    
    # Ending point as GPS coordinates
    destination_geom = Column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False,
        comment="Destination GPS coordinates (longitude, latitude)"
    )
    
    # ===== SCHEDULE =====
    # When the driver plans to leave
    # Timezone-aware (stores UTC, displays in user's timezone)
    # Indexed for fast "find rides leaving today" queries
    departure_time = Column(
        DateTime(timezone=True),
        nullable=False,
        index=True,  # Speed up time-based searches
        comment="When driver departs (timezone-aware)"
    )
    
    # ===== CAPACITY & PRICING =====
    
    # Maximum passengers this ride can take (e.g., 4 for a sedan)
    # Must be greater than 0 (enforced by constraint)
    seats_total = Column(
        Integer,
        nullable=False,
        comment="Total passenger seats available in vehicle"
    )
    
    # How many seats are still open for booking
    # Decreases when passengers book, increases if they cancel
    # Must be between 0 and seats_total (enforced by constraint)
    seats_available = Column(
        Integer,
        nullable=False,
        comment="Seats still available for booking (decreases with bookings)"
    )
    
    # Cost per passenger (in USD, 2 decimal places)
    # Example: 15.50 means $15.50 per person
    # Must be non-negative (can be 0 for free rides)
    price_share = Column(
        Numeric(6, 2),  # Up to $9999.99
        nullable=False,
        comment="Price per passenger in USD (e.g., 15.50 = $15.50)"
    )
    
    # ===== RIDE STATUS =====
    # Lifecycle of a ride:
    # "requested" -> passenger looking for ride
    # "open" -> ride is accepting bookings
    # "full" -> all seats booked
    # "cancelled" -> driver cancelled the ride
    # "completed" -> ride finished successfully
    # Indexed for fast "show only open rides" queries
    status = Column(
        String(20),
        nullable=False,
        server_default="open",  # New rides start as open
        index=True,  # Speed up status filtering
        comment="Ride state: requested, open, full, cancelled, or completed"
    )
    
    # ===== ADDITIONAL INFORMATION =====
    # Optional notes from user (e.g., "I have luggage", "Looking for quiet ride")
    notes = Column(
        String(500),
        nullable=True,
        comment="Additional notes or preferences from user"
    )
    
    # ===== TIMESTAMPS =====
    # When this ride was posted/created
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),  # Auto-set by database
        comment="When ride was created (UTC)"
    )
    
    # ===== DATA VALIDATION RULES =====
    # Database enforces these constraints automatically
    
    __table_args__ = (
        # Seats available must be between 0 and total seats
        # Example: if seats_total=4, seats_available can be 0,1,2,3,4 only
        CheckConstraint(
            "seats_available >= 0 AND seats_available <= seats_total",
            name="check_seats_range"
        ),
        # Status must be one of these exact values
        # "requested" = passenger looking for ride (ride request)
        # "open" = driver offering ride, accepting bookings
        # "full" = all seats booked
        # "cancelled" = ride cancelled
        # "completed" = ride finished
        CheckConstraint(
            "status IN ('requested', 'open', 'full', 'cancelled', 'completed')",
            name="check_ride_status"
        ),
        # Total seats must be positive (can't have 0-seat ride)
        CheckConstraint(
            "seats_total > 0",
            name="check_seats_positive"
        ),
        # Price cannot be negative (can be 0 for free rides)
        CheckConstraint(
            "price_share >= 0",
            name="check_price_positive"
        ),
        # ===== GEOSPATIAL INDEXES =====
        # GIST indexes make geographic queries MUCH faster
        # Without these, "find rides near me" would be very slow
        # "GIST" = Generalized Search Tree (spatial index type)
        Index("idx_origin_geom", origin_geom, postgresql_using="gist"),
        Index("idx_destination_geom", destination_geom, postgresql_using="gist"),
    )
    
    # ===== RELATIONSHIPS TO OTHER TABLES =====
    
    # The driver (User) who created this ride
    # Access via: ride.driver.full_name
    driver = relationship(
        "User",
        back_populates="rides",  # User.rides links back to this
        lazy="selectin"  # Load driver info automatically
    )
    
    # All bookings made for this ride
    # Access via: ride.bookings (returns list of Booking objects)
    # If ride is deleted, bookings are deleted too (cascade)
    bookings = relationship(
        "Booking",
        back_populates="ride",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    # All reviews about this ride
    # Access via: ride.reviews
    reviews = relationship(
        "Review",
        back_populates="ride",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<Ride(id={self.id}, driver_id={self.driver_id}, status='{self.status}')>"
