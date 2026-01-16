"""
Incident Model
Represents safety/conduct incident reports between users who have booked rides together.
"""
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, text

from src.config.db import Base


class Incident(Base):
    """
    Incident Model - Represents a report filed by a user about another user.
    
    Users can only file incident reports for other users they have a confirmed
    booking with, ensuring accountability and preventing abuse.
    
    Incident Status Lifecycle:
    1. "open" - Just filed, awaiting admin review
    2. "reviewed" - Admin has reviewed, may be investigating
    3. "resolved" - Admin has taken action and closed the case
    4. "dismissed" - Admin determined no action needed
    
    Categories:
    - safety: Safety concerns or dangerous behavior
    - harassment: Harassment or inappropriate conduct
    - property: Property damage or theft
    - other: Other concerns not fitting above categories
    
    Relationships:
        - reporter: The user filing the incident report (N:1)
        - reported_user: The user being reported (N:1)
        - ride: The ride where the incident occurred (N:1)
        - booking: The booking that connects reporter and reported user (N:1)
    """
    __tablename__ = "incidents"
    
    # ===== PRIMARY KEY =====
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
        comment="Unique incident identifier (UUID)"
    )
    
    # ===== FOREIGN KEYS =====
    
    # User who filed the incident report
    reporter_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="User who filed the incident report"
    )
    
    # User being reported
    reported_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="User being reported for the incident"
    )
    
    # Ride where incident occurred
    ride_id = Column(
        UUID(as_uuid=True),
        ForeignKey("rides.id", ondelete="CASCADE"),
        nullable=False,
        comment="Ride where the incident occurred"
    )
    
    # Booking that establishes the connection between users
    booking_id = Column(
        UUID(as_uuid=True),
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        comment="Booking that connects the reporter and reported user"
    )
    
    # ===== INCIDENT DETAILS =====
    
    # Category of the incident
    category = Column(
        String(50),
        nullable=False,
        comment="Incident category: safety, harassment, property, other"
    )
    
    # Detailed description of the incident
    description = Column(
        Text,
        nullable=False,
        comment="Detailed description of what happened"
    )
    
    # Current status of the incident report
    status = Column(
        String(20),
        nullable=False,
        server_default="open",
        comment="Current status: open, reviewed, resolved, dismissed"
    )
    
    # Optional admin notes (visible only to admins)
    admin_notes = Column(
        Text,
        nullable=True,
        comment="Internal notes from admin reviewing the incident"
    )
    
    # ===== TIMESTAMPS =====
    
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="When the incident was reported"
    )
    
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Last update to incident status or admin notes"
    )
    
    # ===== RELATIONSHIPS =====
    
    reporter = relationship(
        "User",
        foreign_keys=[reporter_id],
        backref="incidents_reported"
    )
    
    reported_user = relationship(
        "User",
        foreign_keys=[reported_user_id],
        backref="incidents_received"
    )
    
    ride = relationship(
        "Ride",
        foreign_keys=[ride_id],
        backref="incidents"
    )
    
    booking = relationship(
        "Booking",
        foreign_keys=[booking_id],
        backref="incidents"
    )
    
    comments = relationship(
        "IncidentComment",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="IncidentComment.created_at"
    )
    
    # ===== INDEXES =====
    
    __table_args__ = (
        # Index for finding all incidents reported by a user
        Index("ix_incidents_reporter_id", "reporter_id"),
        
        # Index for finding all incidents about a user
        Index("ix_incidents_reported_user_id", "reported_user_id"),
        
        # Index for finding incidents by ride
        Index("ix_incidents_ride_id", "ride_id"),
        
        # Index for finding incidents by status (admin filtering)
        Index("ix_incidents_status", "status"),
        
        # Index for admin queries (status + date sorting)
        Index("ix_incidents_status_created", "status", "created_at"),
    )
    
    def __repr__(self):
        return (
            f"<Incident(id={self.id}, category='{self.category}', "
            f"status='{self.status}', ride_id={self.ride_id})>"
        )
