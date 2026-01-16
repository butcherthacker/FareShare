"""
Admin Incidents Routes

Admin endpoints for reviewing and managing incident reports filed by users.
Allows filtering by date, status, user, and ride.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.user import User
from src.models.incident import Incident
from src.schemas.incident import IncidentAdminResponse, IncidentUpdate

router = APIRouter(prefix="/admin", tags=["Admin Incidents"])


def _ensure_admin(user: User) -> None:
    if not user or getattr(user, "role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access only."
        )


def _parse_date(value: Optional[str], field_name: str) -> Optional[datetime]:
    if value is None:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format for '{field_name}'. Expected YYYY-MM-DD."
        )
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


@router.get("/incidents")
async def list_incidents(
    from_date: Optional[str] = Query(
        None, description="Filter incidents created on/after this date (YYYY-MM-DD)"
    ),
    to_date: Optional[str] = Query(
        None, description="Filter incidents created on/before this date (YYYY-MM-DD)"
    ),
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Optional incident status filter (open, reviewed, resolved, etc.)",
    ),
    user_id: Optional[str] = Query(
        None, description="Filter incidents raised by a user ID"
    ),
    ride_id: Optional[str] = Query(
        None, description="Filter incidents associated with a ride ID"
    ),
    page: int = Query(0, ge=0, description="Page index (0-based)"),
    limit: int = Query(20, ge=1, le=100, description="Page size (1-100)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Admin endpoint to list and filter all incident reports.

    Supports filtering by:
    - Date range (from_date, to_date)
    - Status (open, reviewed, resolved, dismissed)
    - User ID (reporter or reported user)
    - Ride ID
    
    Returns full incident details including admin notes.
    """
    _ensure_admin(current_user)

    # Parse date filters
    from_dt = _parse_date(from_date, "from") if from_date else None
    to_dt = _parse_date(to_date, "to") if to_date else None

    # Build query with filters
    query = select(Incident)
    
    # Date filters
    if from_dt:
        query = query.where(Incident.created_at >= from_dt)
    if to_dt:
        # Add one day to include the entire 'to' date
        to_dt_end = to_dt + timedelta(days=1)
        query = query.where(Incident.created_at < to_dt_end)
    
    # Status filter
    if status_filter:
        query = query.where(Incident.status == status_filter)
    
    # User filter (reporter or reported user)
    if user_id:
        try:
            user_uuid = UUID(user_id)
            query = query.where(
                or_(
                    Incident.reporter_id == user_uuid,
                    Incident.reported_user_id == user_uuid
                )
            )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user_id format"
            )
    
    # Ride filter
    if ride_id:
        try:
            ride_uuid = UUID(ride_id)
            query = query.where(Incident.ride_id == ride_uuid)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ride_id format"
            )
    
    # Eager load relationships
    query = query.options(
        selectinload(Incident.reporter),
        selectinload(Incident.reported_user),
        selectinload(Incident.ride)
    )
    
    # Get total count
    count_query = select(func.count()).select_from(Incident)
    if from_dt:
        count_query = count_query.where(Incident.created_at >= from_dt)
    if to_dt:
        to_dt_end = to_dt + timedelta(days=1)
        count_query = count_query.where(Incident.created_at < to_dt_end)
    if status_filter:
        count_query = count_query.where(Incident.status == status_filter)
    if user_id:
        user_uuid = UUID(user_id)
        count_query = count_query.where(
            or_(
                Incident.reporter_id == user_uuid,
                Incident.reported_user_id == user_uuid
            )
        )
    if ride_id:
        ride_uuid = UUID(ride_id)
        count_query = count_query.where(Incident.ride_id == ride_uuid)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(Incident.created_at.desc())
    query = query.offset(page * limit).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    return {
        "page": page,
        "limit": limit,
        "results": [IncidentAdminResponse.from_orm(inc) for inc in incidents],
        "filters": {
            "from": from_date,
            "to": to_date,
            "status": status_filter,
            "user_id": user_id,
            "ride_id": ride_id,
        },
        "total": total,
    }


@router.patch("/incidents/{incident_id}", response_model=IncidentAdminResponse)
async def update_incident(
    incident_id: UUID,
    update_data: IncidentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update an incident's status and/or admin notes (admin only).
    
    Allows admins to:
    - Change the status (open → reviewed → resolved/dismissed)
    - Add internal notes about the investigation/resolution
    """
    _ensure_admin(current_user)
    
    # Get the incident
    query = select(Incident).options(
        selectinload(Incident.reporter),
        selectinload(Incident.reported_user),
        selectinload(Incident.ride)
    ).where(Incident.id == incident_id)
    
    result = await db.execute(query)
    incident = result.scalar_one_or_none()
    
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Incident not found"
        )
    
    # Update fields
    if update_data.status is not None:
        incident.status = update_data.status
    
    if update_data.admin_notes is not None:
        incident.admin_notes = update_data.admin_notes
    
    await db.commit()
    await db.refresh(incident)
    
    return incident
