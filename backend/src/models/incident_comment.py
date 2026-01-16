"""
Incident Comment Model
Allows users and admins to add follow-up comments to incident reports.
"""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from src.config.db import Base


class IncidentComment(Base):
    """
    Model for incident follow-up comments.
    
    Allows both users and admins to add updates, questions, or additional
    information to an ongoing incident investigation.
    """
    __tablename__ = "incident_comments"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign keys
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Comment data
    comment_text = Column(Text, nullable=False)
    is_admin_comment = Column(Boolean, default=False, nullable=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    # Relationships
    incident = relationship("Incident", back_populates="comments")
    author = relationship("User", foreign_keys=[author_id])
    
    # Indexes for efficient queries
    __table_args__ = (
        {"extend_existing": True}
    )
