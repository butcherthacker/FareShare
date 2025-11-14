"""
Booking Routes
Handles booking creation, retrieval, and management endpoints.

Endpoints:
- POST /bookings - Create new booking (claim seat or fulfill ride request)
- GET /bookings - List all bookings for current user
- GET /bookings/{id} - Get specific booking details
- PATCH /bookings/{id}/status - Update booking status
- DELETE /bookings/{id} - Cancel a booking
- GET /bookings/stats - Get booking statistics for current user
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal
import math

from src.config.db import get_db
from src.models.booking import Booking
from src.models.ride import Ride
from src.models.user import User
from src.schemas.booking import (
    BookingCreate,
    BookingStatusUpdate,
    BookingResponse,
    BookingListResponse,
    BookingStats,
    PassengerInfo,
    RideInfoBasic
)
from src.auth import get_current_active_user

router = APIRouter(prefix="/bookings", tags=["Bookings"])


# ===== HELPER FUNCTIONS =====

def convert_booking_to_response(booking: Booking) -> dict:
    """
    Convert Booking model to response dictionary.
    
    Args:
        booking: Booking database model
        
    Returns:
        dict: Booking data ready for BookingResponse schema
    """
    booking_dict = {
        "id": str(booking.id),
        "passenger_id": str(booking.passenger_id),
        "ride_id": str(booking.ride_id),
        "seats_reserved": booking.seats_reserved,
        "amount_paid": float(booking.amount_paid),
        "status": booking.status,
        "booked_at": booking.booked_at,
        "passenger": None,
        "ride": None
    }
    
    # Add passenger information if loaded
    if booking.passenger:
        booking_dict["passenger"] = PassengerInfo(
            id=str(booking.passenger.id),
            full_name=booking.passenger.full_name,
            rating_avg=float(booking.passenger.rating_avg),
            rating_count=booking.passenger.rating_count,
            avatar_url=booking.passenger.avatar_url
        )
    
    # Add ride information if loaded
    if booking.ride:
        booking_dict["ride"] = RideInfoBasic(
            id=str(booking.ride.id),
            origin_label=booking.ride.origin_label,
            destination_label=booking.ride.destination_label,
            departure_time=booking.ride.departure_time,
            price_share=float(booking.ride.price_share),
            status=booking.ride.status,
            driver_id=str(booking.ride.driver_id)
        )
    
    return booking_dict


async def update_ride_availability(db: AsyncSession, ride: Ride):
    """
    Update ride's seats_available and status based on bookings.
    
    Automatically sets ride status to:
    - "full" if no seats available
    - "open" if seats available and ride was previously full
    
    Args:
        db: Database session
        ride: Ride object to update
    """
    # Calculate total confirmed seats from all confirmed bookings
    result = await db.execute(
        select(func.sum(Booking.seats_reserved))
        .where(
            and_(
                Booking.ride_id == ride.id,
                Booking.status.in_(["pending", "confirmed"])  # Count both pending and confirmed
            )
        )
    )
    total_booked = result.scalar() or 0
    
    # Update available seats
    ride.seats_available = ride.seats_total - total_booked
    
    # Update ride status based on availability
    if ride.seats_available <= 0 and ride.status != "full":
        ride.status = "full"
    elif ride.seats_available > 0 and ride.status == "full":
        # If ride was full but now has seats (due to cancellation), mark as open
        ride.status = "open" if ride.status != "requested" else "requested"


# ===== CREATE BOOKING =====

@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_data: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new booking (claim seats in a ride).
    
    **Authentication required.**
    
    **Two scenarios:**
    
    1. **Passenger books a RIDE OFFER** (driver already posted):
       - Passenger claims seats in an available ride
       - Reduces ride's seats_available
       - Booking starts as "pending" (awaiting driver confirmation)
    
    2. **Driver fulfills a RIDE REQUEST** (passenger is looking for driver):
       - Driver commits to providing ride for the request
       - Booking starts as "pending"
       - Request status changes from "requested" to "open"
    
    **Business Rules:**
    - Cannot book your own ride (passengers can't book their own offers)
    - Must have enough available seats
    - Cannot book completed or cancelled rides
    - Amount is auto-calculated: seats_reserved × ride.price_share
    - Cannot book the same ride twice (one active booking per user per ride)
    """
    # Get the ride
    result = await db.execute(
        select(Ride).where(Ride.id == booking_data.ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride with ID {booking_data.ride_id} not found"
        )
    
    # ===== BUSINESS RULE VALIDATIONS =====
    
    # Cannot book your own ride
    if ride.driver_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot book your own ride"
        )
    
    # Cannot book completed or cancelled rides
    if ride.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot book a {ride.status} ride"
        )
    
    # Check if user already has an active booking for this ride
    existing_booking = await db.execute(
        select(Booking).where(
            and_(
                Booking.ride_id == booking_data.ride_id,
                Booking.passenger_id == current_user.id,
                Booking.status.in_(["pending", "confirmed"])  # Active bookings
            )
        )
    )
    if existing_booking.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active booking for this ride"
        )
    
    # Check seat availability
    if booking_data.seats_reserved > ride.seats_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Not enough seats available. Requested: {booking_data.seats_reserved}, Available: {ride.seats_available}"
        )
    
    # ===== CALCULATE AMOUNT =====
    # Amount = seats × price per seat
    amount_paid = Decimal(booking_data.seats_reserved) * ride.price_share
    
    # ===== CREATE BOOKING =====
    new_booking = Booking(
        ride_id=ride.id,
        passenger_id=current_user.id,
        seats_reserved=booking_data.seats_reserved,
        amount_paid=amount_paid,
        status="pending"  # Starts as pending, driver can confirm later
    )
    
    db.add(new_booking)
    
    # ===== UPDATE RIDE AVAILABILITY =====
    # Reduce available seats
    ride.seats_available -= booking_data.seats_reserved
    
    # Update ride status if needed
    if ride.seats_available <= 0:
        ride.status = "full"
    
    # If this was a ride REQUEST, the driver is now fulfilling it
    # Change status from "requested" to "open" (or "full" if all seats booked)
    if ride.status == "requested" and ride.seats_available > 0:
        ride.status = "open"
    
    await db.commit()
    await db.refresh(new_booking)
    
    # Load relationships for response
    await db.refresh(new_booking, ["passenger", "ride"])
    
    # Convert to response format
    booking_dict = convert_booking_to_response(new_booking)
    
    return BookingResponse(**booking_dict)


# ===== LIST BOOKINGS =====

@router.get("/", response_model=BookingListResponse)
async def list_bookings(
    # Pagination
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    
    # Filters
    status: Optional[str] = Query(None, description="Filter by booking status"),
    role: Optional[str] = Query(None, description="Filter by role: 'passenger' or 'driver'"),
    ride_id: Optional[str] = Query(None, description="Filter bookings by ride ID"),
    
    # Date filters
    from_date: Optional[datetime] = Query(None, description="Filter bookings from this date"),
    to_date: Optional[datetime] = Query(None, description="Filter bookings to this date"),
    
    # Sorting
    sort_by: str = Query("booked_at", description="Sort field: booked_at, status"),
    sort_order: str = Query("desc", description="Sort order: asc or desc"),
    
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all bookings for the current user.
    
    **Authentication required.**
    
    Returns bookings where the user is either:
    - The **passenger** (bookings they made)
    - The **driver** (bookings for their rides)
    
    **Filters:**
    - `status`: Filter by booking status (pending, confirmed, completed, cancelled)
    - `role`: Show only bookings where user is 'passenger' or 'driver'
    - `from_date`: Show bookings created after this date
    - `to_date`: Show bookings created before this date
    
    **Pagination:**
    - `page`: Page number (default: 1)
    - `page_size`: Results per page (default: 20, max: 100)
    
    **Sorting:**
    - `sort_by`: Field to sort by (booked_at, status)
    - `sort_order`: asc or desc
    """
    # Build base query
    # User can see bookings where they're the passenger OR the driver of the ride
    query = select(Booking).join(Ride, Booking.ride_id == Ride.id)
    
    conditions = []
    
    # Filter to current user's bookings (as passenger or driver)
    if role == "passenger":
        # Only bookings where user is the passenger
        conditions.append(Booking.passenger_id == current_user.id)
    elif role == "driver":
        # Only bookings for rides where user is the driver
        conditions.append(Ride.driver_id == current_user.id)
    else:
        # Both: passenger bookings OR driver's ride bookings
        conditions.append(
            or_(
                Booking.passenger_id == current_user.id,
                Ride.driver_id == current_user.id
            )
        )
    
    # Filter by status
    if status:
        conditions.append(Booking.status == status)

    # Filter by ride id (returns only bookings for a specific ride)
    if ride_id:
        conditions.append(Booking.ride_id == ride_id)
    
    # Filter by date range
    if from_date:
        conditions.append(Booking.booked_at >= from_date)
    if to_date:
        conditions.append(Booking.booked_at <= to_date)
    
    # Apply all conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply sorting
    sort_field = getattr(Booking, sort_by, Booking.booked_at)
    if sort_order == "desc":
        query = query.order_by(sort_field.desc())
    else:
        query = query.order_by(sort_field.asc())
    
    # Get total count before pagination
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    bookings = result.scalars().all()
    
    # Convert bookings to response format
    bookings_data = []
    for booking in bookings:
        booking_dict = convert_booking_to_response(booking)
        bookings_data.append(BookingResponse(**booking_dict))
    
    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return BookingListResponse(
        bookings=bookings_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ===== GET SINGLE BOOKING =====

@router.get("/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific booking.
    
    **Authentication required.**
    **Only accessible to the passenger who made the booking or the driver of the ride.**
    """
    # Query booking with relationships
    result = await db.execute(
        select(Booking)
        .join(Ride, Booking.ride_id == Ride.id)
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found"
        )
    
    # Verify access: user must be the passenger or the driver
    if booking.passenger_id != current_user.id and booking.ride.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only view your own bookings or bookings for your rides"
        )
    
    # Convert to response format
    booking_dict = convert_booking_to_response(booking)
    
    return BookingResponse(**booking_dict)


# ===== UPDATE BOOKING STATUS =====

@router.patch("/{booking_id}/status", response_model=BookingResponse)
async def update_booking_status(
    booking_id: str,
    status_update: BookingStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update booking status.
    
    **Authentication required.**
    
    **Allowed status transitions:**
    
    **By Driver (ride owner):**
    - pending → confirmed (driver accepts booking)
    - pending → cancelled (driver rejects booking)
    - confirmed → cancelled (driver cancels confirmed booking)
    
    **By Passenger (booking owner):**
    - pending → cancelled (passenger cancels their booking)
    - confirmed → cancelled (passenger cancels confirmed booking)
    
    **By System (when ride completes):**
    - confirmed → completed (ride finished successfully)
    
    **Business Rules:**
    - Cannot change completed bookings
    - Cannot confirm/complete cancelled bookings
    - Cancelling a booking frees up the seats in the ride
    """
    # Get booking with ride
    result = await db.execute(
        select(Booking)
        .join(Ride, Booking.ride_id == Ride.id)
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found"
        )
    
    # Get the ride
    ride = booking.ride
    
    # Verify access: user must be the passenger or the driver
    is_passenger = booking.passenger_id == current_user.id
    is_driver = ride.driver_id == current_user.id
    
    if not (is_passenger or is_driver):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own bookings or bookings for your rides"
        )
    
    # ===== VALIDATE STATUS TRANSITIONS =====
    
    current_status = booking.status
    new_status = status_update.status.value
    
    # Cannot change completed bookings
    if current_status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify completed bookings"
        )
    
    # Cannot un-cancel a booking
    if current_status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify cancelled bookings"
        )
    
    # Validate role-specific transitions
    if new_status == "confirmed":
        # Only driver can confirm
        if not is_driver:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the driver can confirm bookings"
            )
        # Can only confirm pending bookings
        if current_status != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only confirm pending bookings"
            )
    
    elif new_status == "completed":
        # Only driver can mark as completed
        if not is_driver:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the driver can mark bookings as completed"
            )
        # Can only complete confirmed bookings
        if current_status != "confirmed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only complete confirmed bookings"
            )
    
    elif new_status == "cancelled":
        # Both passenger and driver can cancel
        # Passenger can cancel their own bookings
        # Driver can cancel bookings for their rides
        pass  # No additional validation needed
    
    elif new_status == "pending":
        # Cannot manually set status back to pending
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot set status back to pending"
        )
    
    # ===== UPDATE BOOKING STATUS =====
    old_status = booking.status
    booking.status = new_status
    
    # ===== UPDATE RIDE AVAILABILITY IF CANCELLED =====
    if new_status == "cancelled" and old_status in ["pending", "confirmed"]:
        # Free up the seats that were reserved
        ride.seats_available += booking.seats_reserved
        
        # Update ride status if it was full
        if ride.status == "full" and ride.seats_available > 0:
            ride.status = "open" if ride.status != "requested" else "requested"
    
    await db.commit()
    await db.refresh(booking)
    await db.refresh(booking, ["passenger", "ride"])
    
    # Convert to response format
    booking_dict = convert_booking_to_response(booking)
    
    return BookingResponse(**booking_dict)


# ===== CANCEL BOOKING =====

@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a booking.
    
    **Authentication required.**
    **Only the passenger or the driver can cancel.**
    
    Cancelling a booking:
    - Sets status to "cancelled"
    - Frees up the reserved seats in the ride
    - Cannot cancel completed bookings
    
    Note: Bookings are not permanently deleted, just marked as cancelled
    for record-keeping and refund processing.
    """
    # Get booking with ride
    result = await db.execute(
        select(Booking)
        .join(Ride, Booking.ride_id == Ride.id)
        .where(Booking.id == booking_id)
    )
    booking = result.scalar_one_or_none()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Booking with ID {booking_id} not found"
        )
    
    # Get the ride
    ride = booking.ride
    
    # Verify access: user must be the passenger or the driver
    if booking.passenger_id != current_user.id and ride.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own bookings or bookings for your rides"
        )
    
    # Cannot cancel completed bookings
    if booking.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel completed bookings"
        )
    
    # Cannot cancel already cancelled bookings
    if booking.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is already cancelled"
        )
    
    # Mark as cancelled
    booking.status = "cancelled"
    
    # Free up the seats
    ride.seats_available += booking.seats_reserved
    
    # Update ride status if it was full
    if ride.status == "full" and ride.seats_available > 0:
        ride.status = "open" if ride.status != "requested" else "requested"
    
    await db.commit()
    
    return None  # 204 No Content


# ===== GET BOOKING STATISTICS =====

@router.get("/stats/summary", response_model=BookingStats)
async def get_booking_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get booking statistics for the current user.
    
    **Authentication required.**
    
    Returns:
    - Total number of bookings (as passenger)
    - Breakdown by status (pending, confirmed, completed, cancelled)
    - Total amount spent (as passenger)
    - Total amount earned (as driver from completed bookings)
    """
    # ===== PASSENGER STATISTICS =====
    # Count bookings by status (as passenger)
    status_counts = await db.execute(
        select(
            Booking.status,
            func.count(Booking.id).label('count'),
            func.sum(Booking.amount_paid).label('total_amount')
        )
        .where(Booking.passenger_id == current_user.id)
        .group_by(Booking.status)
    )
    
    # Initialize stats
    total_bookings = 0
    pending_bookings = 0
    confirmed_bookings = 0
    completed_bookings = 0
    cancelled_bookings = 0
    total_spent = Decimal(0)
    
    # Process results
    for row in status_counts:
        count = row.count
        amount = row.total_amount or Decimal(0)
        
        total_bookings += count
        
        if row.status == "pending":
            pending_bookings = count
        elif row.status == "confirmed":
            confirmed_bookings = count
        elif row.status == "completed":
            completed_bookings = count
            total_spent += amount  # Only count completed bookings for spending
        elif row.status == "cancelled":
            cancelled_bookings = count
    
    # ===== DRIVER STATISTICS =====
    # Calculate total earnings (from completed bookings on user's rides)
    earnings_result = await db.execute(
        select(func.sum(Booking.amount_paid))
        .join(Ride, Booking.ride_id == Ride.id)
        .where(
            and_(
                Ride.driver_id == current_user.id,
                Booking.status == "completed"
            )
        )
    )
    total_earned = earnings_result.scalar() or Decimal(0)
    
    return BookingStats(
        total_bookings=total_bookings,
        pending_bookings=pending_bookings,
        confirmed_bookings=confirmed_bookings,
        completed_bookings=completed_bookings,
        cancelled_bookings=cancelled_bookings,
        total_spent=float(total_spent),
        total_earned=float(total_earned)
    )
