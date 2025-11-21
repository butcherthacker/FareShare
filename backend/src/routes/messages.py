"""
Messaging routes for user-to-user communication via email
Allows users who have booked rides together to send messages
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

from src.config.db import get_db
from src.models.user import User
from src.models.ride import Ride
from src.models.booking import Booking
from src.auth import get_current_user
from src.config.email import send_user_message_email


router = APIRouter(prefix="/api/messages", tags=["messages"])


class MessageRequest(BaseModel):
    """Request model for sending a message to another user"""
    recipient_user_id: UUID = Field(..., description="UUID of the user to send message to")
    message: str = Field(..., min_length=1, max_length=500, description="Message content")
    ride_id: Optional[UUID] = Field(None, description="Optional: Include ride context")


class MessageResponse(BaseModel):
    """Response after sending a message"""
    success: bool
    message: str
    sent_to: str
    sent_at: datetime


@router.post("/send", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def send_message_to_user(
    message_request: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to another user via email.
    
    Validates that both users have a shared ride booking before allowing the message.
    This prevents spam and ensures users can only message people they're riding with.
    """
    
    # Get recipient user details
    recipient_result = await db.execute(
        select(User).where(User.id == message_request.recipient_user_id)
    )
    recipient = recipient_result.scalar_one_or_none()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found"
        )
    
    # Prevent users from messaging themselves
    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot send messages to yourself"
        )
    
    # Verify that both users have a shared ride booking
    # This query checks if there's any ride where both users have bookings
    shared_booking_query = select(Booking).where(
        and_(
            Booking.ride_id.in_(
                select(Booking.ride_id).where(Booking.passenger_id == current_user.id)
            ),
            Booking.passenger_id == recipient.id
        )
    ).limit(1)
    
    shared_booking_result = await db.execute(shared_booking_query)
    shared_booking = shared_booking_result.scalar_one_or_none()
    
    if not shared_booking:
        # Also check if current user is the driver of a ride the recipient booked
        driver_ride_query = select(Ride).where(
            and_(
                Ride.driver_id == current_user.id,
                Ride.id.in_(
                    select(Booking.ride_id).where(Booking.passenger_id == recipient.id)
                )
            )
        ).limit(1)
        
        driver_ride_result = await db.execute(driver_ride_query)
        driver_ride = driver_ride_result.scalar_one_or_none()
        
        # Or check if recipient is the driver of a ride current user booked
        passenger_ride_query = select(Ride).where(
            and_(
                Ride.driver_id == recipient.id,
                Ride.id.in_(
                    select(Booking.ride_id).where(Booking.passenger_id == current_user.id)
                )
            )
        ).limit(1)
        
        passenger_ride_result = await db.execute(passenger_ride_query)
        passenger_ride = passenger_ride_result.scalar_one_or_none()
        
        if not driver_ride and not passenger_ride:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only send messages to users you have a shared ride with"
            )
    
    # Get ride details if ride_id is provided
    ride_details = None
    if message_request.ride_id:
        ride_result = await db.execute(
            select(Ride).where(Ride.id == message_request.ride_id)
        )
        ride = ride_result.scalar_one_or_none()
        
        if ride:
            ride_details = {
                "origin": ride.origin_label,
                "destination": ride.destination_label,
                "date": ride.departure_time.strftime("%B %d, %Y") if ride.departure_time else "N/A",
                "time": ride.departure_time.strftime("%I:%M %p") if ride.departure_time else "N/A"
            }
    
    # Send the email
    try:
        await send_user_message_email(
            sender_name=current_user.full_name,
            sender_email=current_user.email,
            recipient_name=recipient.full_name,
            recipient_email=recipient.email,
            message_content=message_request.message,
            ride_details=ride_details
        )
        
        return MessageResponse(
            success=True,
            message=f"Message sent successfully to {recipient.full_name}",
            sent_to=recipient.email,
            sent_at=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send message: {str(e)}"
        )


@router.get("/ride-participants/{ride_id}")
async def get_ride_participants(
    ride_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of users you can message for a specific ride.
    Returns the driver and all passengers (excluding yourself).
    """
    
    # Get the ride
    ride_result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = ride_result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )
    
    # Verify current user is part of this ride (either driver or passenger)
    is_driver = ride.driver_id == current_user.id
    
    booking_check = await db.execute(
        select(Booking).where(
            and_(
                Booking.ride_id == ride_id,
                Booking.passenger_id == current_user.id
            )
        )
    )
    is_passenger = booking_check.scalar_one_or_none() is not None
    
    if not is_driver and not is_passenger:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be part of this ride to view participants"
        )
    
    participants = []
    
    # Add driver if it's not the current user
    if not is_driver:
        driver_result = await db.execute(
            select(User).where(User.id == ride.driver_id)
        )
        driver = driver_result.scalar_one_or_none()
        if driver:
            participants.append({
                "id": driver.id,
                "name": driver.full_name,
                "role": "Driver"
                # Email omitted for user privacy - admins can access via separate admin endpoints
            })
    
    # Add all passengers (excluding current user)
    bookings_result = await db.execute(
        select(Booking).where(
            and_(
                Booking.ride_id == ride_id,
                Booking.passenger_id != current_user.id
            )
        )
    )
    bookings = bookings_result.scalars().all()
    
    for booking in bookings:
        passenger_result = await db.execute(
            select(User).where(User.id == booking.passenger_id)
        )
        passenger = passenger_result.scalar_one_or_none()
        if passenger:
            participants.append({
                "id": passenger.id,
                "name": passenger.full_name,
                "role": "Passenger"
                # Email omitted for user privacy - admins can access via separate admin endpoints
            })
    
    return {
        "ride_id": ride_id,
        "ride_details": {
            "origin": ride.origin,
            "destination": ride.destination,
            "departure_time": ride.departure_time
        },
        "participants": participants
    }
