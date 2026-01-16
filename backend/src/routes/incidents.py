"""
Incident Routes
API endpoints for incident reporting between users with confirmed bookings.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.user import User
from src.models.incident import Incident
from src.models.booking import Booking
from src.models.ride import Ride
from src.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentListResponse
)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


async def _verify_booking_exists(
    db: AsyncSession,
    reporter_id: UUID,
    reported_user_id: UUID,
    ride_id: UUID,
    booking_id: UUID
) -> bool:
    """
    Verify that the reporter has a confirmed booking with the reported user.
    
    This prevents users from filing false reports about people they haven't
    actually interacted with on the platform.
    """
    # Get the ride to determine who is the driver
    ride_query = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = ride_query.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )
    
    # Get the booking
    booking_query = await db.execute(
        select(Booking)
        .where(Booking.id == booking_id)
        .where(Booking.ride_id == ride_id)
    )
    booking = booking_query.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify the booking is confirmed
    if booking.status != "confirmed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only report incidents for confirmed bookings"
        )
    
    # Verify the reporter is either the driver or the passenger
    if ride.driver_id != reporter_id and booking.passenger_id != reporter_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not part of this booking"
        )
    
    # Verify the reported user is the other party (driver or passenger)
    if ride.driver_id == reporter_id:
        # Reporter is driver, reported user should be passenger
        if booking.passenger_id != reported_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reported user is not the passenger on this booking"
            )
    else:
        # Reporter is passenger, reported user should be driver
        if ride.driver_id != reported_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reported user is not the driver of this ride"
            )
    
    return True


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
async def create_incident(
    incident_data: IncidentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    File a new incident report.
    
    Users can only file reports for other users they have a confirmed booking with.
    This ensures accountability and prevents abuse of the reporting system.
    """
    print(f"[DEBUG] Creating incident: {incident_data.dict()}")
    print(f"[DEBUG] Current user: {current_user.id}")
    
    # Verify the booking relationship exists and is valid
    await _verify_booking_exists(
        db=db,
        reporter_id=current_user.id,
        reported_user_id=incident_data.reported_user_id,
        ride_id=incident_data.ride_id,
        booking_id=incident_data.booking_id
    )
    
    # Prevent users from reporting themselves
    if current_user.id == incident_data.reported_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot report yourself"
        )
    
    # Create the incident
    new_incident = Incident(
        reporter_id=current_user.id,
        reported_user_id=incident_data.reported_user_id,
        ride_id=incident_data.ride_id,
        booking_id=incident_data.booking_id,
        category=incident_data.category,
        description=incident_data.description,
        status="open"
    )
    
    db.add(new_incident)
    await db.commit()
    await db.refresh(new_incident)
    
    # Load relationships for response
    result = await db.execute(
        select(Incident)
        .options(
            selectinload(Incident.reporter),
            selectinload(Incident.reported_user),
            selectinload(Incident.ride)
        )
        .where(Incident.id == new_incident.id)
    )
    incident_with_relations = result.scalar_one()
    
    return incident_with_relations


@router.get("", response_model=IncidentListResponse)
async def list_my_incidents(
    page: int = Query(0, ge=0, description="Page number (0-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all incident reports filed by or about the current user.
    
    Returns incidents where the user is either the reporter or the reported user.
    """
    # Build query
    query = select(Incident).where(
        or_(
            Incident.reporter_id == current_user.id,
            Incident.reported_user_id == current_user.id
        )
    )
    
    # Apply status filter if provided
    if status_filter:
        query = query.where(Incident.status == status_filter)
    
    # Add eager loading for relationships
    query = query.options(
        selectinload(Incident.reporter),
        selectinload(Incident.reported_user),
        selectinload(Incident.ride)
    )
    
    # Get total count
    count_query = select(func.count()).select_from(Incident).where(
        or_(
            Incident.reporter_id == current_user.id,
            Incident.reported_user_id == current_user.id
        )
    )
    if status_filter:
        count_query = count_query.where(Incident.status == status_filter)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination and ordering
    query = query.order_by(Incident.created_at.desc())
    query = query.offset(page * limit).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    incidents = result.scalars().all()
    
    return IncidentListResponse(
        incidents=incidents,
        total=total,
        page=page,
        limit=limit
    )


@router.get("/{incident_id}", response_model=IncidentResponse)
async def get_incident(
    incident_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get details of a specific incident.
    
    Users can only view incidents they are involved in (as reporter or reported user).
    """
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
    
    # Verify user is involved in this incident
    if incident.reporter_id != current_user.id and incident.reported_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this incident"
        )
    
    return incident
