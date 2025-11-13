"""
User Model
Represents registered users in the FareShare platform.
Users can be drivers (offering rides) or passengers (booking rides).
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Numeric, Integer, DateTime, CheckConstraint
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text

from src.config.db import Base


class User(Base):
    """
    User Model - Represents all registered users in the FareShare platform.
    
    A user can be both a driver (offering rides) AND a passenger (booking rides).
    
    Relationships:
        - rides: All rides this user has created as a driver (1:N - one user, many rides)
        - bookings: All ride bookings this user made as a passenger (1:N - one user, many bookings)
        - reviews_written: All reviews this user has written about others (1:N)
        - reviews_received: All reviews others have written about this user (1:N)
    """
    __tablename__ = "users"
    
    # ===== PRIMARY KEY =====
    # Auto-generated unique ID for each user (UUID format)
    # Example: "550e8400-e29b-41d4-a716-446655440000"
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),  # Database generates this automatically
        comment="Unique user identifier (UUID)"
    )
    
    # ===== PROFILE INFORMATION =====
    # User's display name (e.g., "John Doe")
    # Max 100 characters, required field
    full_name = Column(
        String(100),
        nullable=False,  # Cannot be empty
        comment="User's full name displayed in app"
    )
    
    # Email for login and notifications
    # Must be unique across all users (enforced by database)
    # Indexed for faster login lookups
    email = Column(
        String(255),
        unique=True,  # No two users can have same email
        nullable=False,  # Required field
        index=True,  # Speed up login queries
        comment="Email address for authentication (must be unique)"
    )
    
    # Password stored as hash (NEVER store plain text passwords!)
    # Uses bcrypt algorithm for security
    password_hash = Column(
        Text,
        nullable=False,
        comment="Bcrypt hashed password (never store plain text!)"
    )
    
    # ===== AUTHORIZATION & VERIFICATION =====
    # User's permission level: "user" (default) or "admin"
    # Admins can manage all data, users can only manage their own
    role = Column(
        String(20),
        nullable=False,
        server_default="user",  # New users start as regular users
        comment="Permission level: 'user' or 'admin'"
    )
    
    # Whether user has verified their identity
    # "pending" = just registered, "verified" = confirmed email/phone
    verification_status = Column(
        String(20),
        nullable=False,
        server_default="pending",  # New users start unverified
        comment="Account verification: 'pending' or 'verified'"
    )
    
    # How the user verified (e.g., "email", "phone", "id_card")
    # Optional field, NULL if not yet verified
    verification_method = Column(
        String(50),
        nullable=True,  # Can be empty
        comment="How user verified identity: 'email', 'phone', etc."
    )
    
    # ===== RATING SYSTEM =====
    # Average star rating from all reviews (0.00 to 5.00)
    # Updated when new reviews are added
    # Example: 4.25 means average of all ratings is 4.25 stars
    rating_avg = Column(
        Numeric(3, 2),  # 3 total digits, 2 after decimal (e.g., 4.25)
        nullable=False,
        server_default="0.0",  # New users start with no rating
        comment="Average star rating: 0.00 to 5.00"
    )
    
    # Total number of reviews this user has received
    # Used to calculate rating_avg and show "based on X reviews"
    rating_count = Column(
        Integer,
        nullable=False,
        server_default="0",  # New users have zero reviews
        comment="Total number of reviews received"
    )
    
    # ===== ACCOUNT STATUS =====
    # Whether account is usable
    # "active" = can use app normally
    # "suspended" = blocked by admin (can't create/book rides)
    status = Column(
        String(20),
        nullable=False,
        server_default="active",  # New users are active by default
        comment="Account state: 'active' or 'suspended'"
    )
    
    # ===== PROFILE MEDIA =====
    # URL to user's profile picture/avatar
    # Can be local file path or external URL (cloud storage)
    # NULL means user has no custom avatar (use default)
    avatar_url = Column(
        String(500),
        nullable=True,
        comment="URL to user's profile picture/avatar"
    )
    
    # ===== DRIVER VEHICLE INFORMATION =====
    # These fields are optional and only used for drivers
    # Passengers don't need to fill these out
    # Driver vehicle information moved to `rides` table.
    
    # ===== TIMESTAMPS =====
    # When this user account was created
    # Automatically set by database on insert
    # Timezone-aware (stores UTC, can convert to any timezone)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),  # Database sets current time automatically
        comment="When account was created (UTC)"
    )
    
    # ===== DATA VALIDATION RULES =====
    # These constraints are enforced by the database itself
    # If violated, database will reject the insert/update
    __table_args__ = (
        # Role must be exactly "user" or "admin" (no other values allowed)
        CheckConstraint(
            "role IN ('user', 'admin')",
            name="check_user_role"
        ),
        # Verification status must be "pending" or "verified"
        CheckConstraint(
            "verification_status IN ('pending', 'verified')",
            name="check_verification_status"
        ),
        # Account status must be "active" or "suspended"
        CheckConstraint(
            "status IN ('active', 'suspended')",
            name="check_user_status"
        ),
        # Rating must be between 0.0 and 5.0 stars
        CheckConstraint(
            "rating_avg >= 0.0 AND rating_avg <= 5.0",
            name="check_rating_range"
        ),
        # Rating count cannot be negative
        CheckConstraint(
            "rating_count >= 0",
            name="check_rating_count"
        ),
    )
    
    # ===== RELATIONSHIPS TO OTHER TABLES =====
    # These create Python attributes to access related data
    # For example: user.rides returns all rides created by this user
    
    # All rides this user created as a driver
    # "cascade" means: if user is deleted, delete their rides too
    # "lazy=selectin" means: load rides automatically when needed
    rides = relationship(
        "Ride",  # Links to Ride model
        back_populates="driver",  # Ride.driver links back to this user
        cascade="all, delete-orphan",  # Delete rides if user deleted
        lazy="selectin"  # Load rides when accessing user.rides
    )
    
    # All bookings this user made as a passenger
    bookings = relationship(
        "Booking",
        back_populates="passenger",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    # All reviews this user wrote about other users
    # Uses foreign_keys to specify which field links to User
    reviews_written = relationship(
        "Review",
        foreign_keys="Review.reviewer_id",  # Links via reviewer_id field
        back_populates="reviewer",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    # All reviews other users wrote about this user
    reviews_received = relationship(
        "Review",
        foreign_keys="Review.reviewee_id",  # Links via reviewee_id field
        back_populates="reviewee",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    
    def __repr__(self):
        """String representation for debugging (what you see in print statements)"""
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"
