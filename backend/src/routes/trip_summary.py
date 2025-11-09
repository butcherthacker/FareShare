"""
Trip History and Driver Summary Endpoints (Sprint 2)
- Provides APIs to fetch trip history for users (riders and drivers)
  and summary statistics for drivers.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, select
from uuid import UUID

from src.config.db import get_async_session
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User

router = APIRouter(prefix="/api/trips", tags=["Trips"])


# ---------------------------------------------------------
# 1.  Trip History  (Riders and Drivers)
# ---------------------------------------------------------
@router.get("/history/{user_id}")
async def get_trip_history(user_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """
    Returns all trips for the given user (as driver or passenger).
    Each trip includes ride details and booking/payment info.
    """
    query = (
        select(Ride, Booking)
        .outerjoin(Booking, Ride.id == Booking.ride_id)
        .where(or_(Ride.driver_id == user_id, Booking.passenger_id == user_id))
        .order_by(Ride.departure_time.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    if not rows:
        raise HTTPException(status_code=404, detail="No trips found for this user")

    history = []
    for ride, booking in rows:
        trip = {
            "ride_id": ride.id,
            "driver_id": ride.driver_id,
            "origin": ride.origin_label,
            "destination": ride.destination_label,
            "departure_time": ride.departure_time,
            "price_share": ride.price_share,
        }

        # If this user was a passenger, include booking info
        if booking and booking.passenger_id == user_id:
            trip.update({
                "role": "passenger",
                "booking_status": booking.status,
                "amount_paid": float(booking.amount_paid or 0),
                "seats_reserved": booking.seats_reserved,
            })
        elif ride.driver_id == user_id:
            trip.update({"role": "driver"})
        history.append(trip)

    return {"user_id": str(user_id), "trips": history}


# ---------------------------------------------------------
# 2.  Driver Summary / Earnings
# ---------------------------------------------------------
@router.get("/summary/{driver_id}")
async def get_driver_summary(driver_id: UUID, db: AsyncSession = Depends(get_async_session)):
    """
    Returns driver statistics: total completed trips,
    total earnings, and average earning per ride.
    """
    query = (
        select(
            func.count(Ride.id).label("total_trips"),
            func.sum(Booking.amount_paid).label("total_earnings"),
            func.avg(Booking.amount_paid).label("avg_per_ride"),
        )
        .join(Booking, Ride.id == Booking.ride_id)
        .where(Ride.driver_id == driver_id, Booking.status == "completed")
    )

    result = await db.execute(query)
    summary = result.first()

    return {
        "driver_id": str(driver_id),
        "total_trips": int(summary.total_trips or 0),
        "total_earnings": float(summary.total_earnings or 0),
        "avg_per_ride": float(summary.avg_per_ride or 0),
    }

# Temp: Test for endpoint
@router.get("/ping")
async def ping_test():
    return {"message": "trip_summary router loaded successfully"}