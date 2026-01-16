"""
Incident Comment Routes
API endpoints for adding follow-up comments to incident reports.
"""
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.user import User
from src.models.incident import Incident
from src.models.incident_comment import IncidentComment
from src.schemas.incident_comment import IncidentCommentCreate, IncidentCommentResponse

router = APIRouter(prefix="/incidents", tags=["Incident Comments"])


async def _verify_incident_access(
    incident_id: UUID,
    user: User,
    db: AsyncSession
) -> Incident:
    """
    Verify user has access to this incident.
    Users can only comment on incidents they're involved in.
    Admins can comment on any incident.
    """
    query = select(Incident).where(Incident.id == incident_id)
    result = await db.execute(query)
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Check if user has access (admin or involved party)
    is_admin = getattr(user, "role", None) == "admin"
    is_reporter = incident.reporter_id == user.id
    is_reported = incident.reported_user_id == user.id
    
    if not (is_admin or is_reporter or is_reported):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to comment on this incident"
        )
    
    # Check if incident is still open for comments
    if incident.status == "resolved" and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add comments to resolved incidents. Only admins can comment on resolved incidents."
        )
    
    return incident


@router.post("/{incident_id}/comments", response_model=IncidentCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_incident_comment(
    incident_id: UUID,
    comment_data: IncidentCommentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Add a follow-up comment to an incident report.
    
    - Users can add comments to incidents they're involved in (as reporter or reported)
    - Comments are allowed on open and reviewed incidents
    - Admins can comment on any incident, including resolved ones
    """
    # Verify access and get incident
    incident = await _verify_incident_access(incident_id, current_user, db)
    
    # Check if user is admin
    is_admin = getattr(current_user, "role", None) == "admin"
    
    # Create the comment
    new_comment = IncidentComment(
        incident_id=incident_id,
        author_id=current_user.id,
        comment_text=comment_data.comment_text,
        is_admin_comment=is_admin
    )
    
    db.add(new_comment)
    await db.commit()
    await db.refresh(new_comment)
    
    # Load author relationship
    result = await db.execute(
        select(IncidentComment)
        .options(selectinload(IncidentComment.author))
        .where(IncidentComment.id == new_comment.id)
    )
    comment_with_author = result.scalar_one()
    
    return comment_with_author


@router.get("/{incident_id}/comments", response_model=List[IncidentCommentResponse])
async def get_incident_comments(
    incident_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all comments for an incident.
    
    Users can only view comments for incidents they're involved in.
    Admins can view comments for any incident.
    """
    # Verify access
    await _verify_incident_access(incident_id, current_user, db)
    
    # Get all comments for this incident
    query = select(IncidentComment).options(
        selectinload(IncidentComment.author)
    ).where(
        IncidentComment.incident_id == incident_id
    ).order_by(IncidentComment.created_at.asc())
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    return comments
