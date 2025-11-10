"""
Trip History and Driver Summary Endpoints (Sprint 2)
- Provides APIs to fetch trip history for users (riders and drivers)
  and summary statistics for drivers.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, or_, select
from uuid import UUID

from src.config.db import get_db
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User

router = APIRouter(prefix="/api/trips", tags=["Trips"])


# ---------------------------------------------------------
# 1.  Trip History  (Riders and Drivers)
# ---------------------------------------------------------
@router.get("/history/{user_id}")
async def get_trip_history(user_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Returns all trips for the given user (as driver or passenger).
    Each trip includes ride details and booking/payment info.
    Returns empty array if user has no trips (instead of 404).
    """
    query = (
        select(Ride, Booking)
        .outerjoin(Booking, Ride.id == Booking.ride_id)
        .where(or_(Ride.driver_id == user_id, Booking.passenger_id == user_id))
        .order_by(Ride.departure_time.desc())
    )

    result = await db.execute(query)
    rows = result.all()

    history = []
    for ride, booking in rows:
        trip = {
            "ride_id": ride.id,
            "driver_id": ride.driver_id,
            "origin": ride.origin_label,
            "destination": ride.destination_label,
            "departure_time": ride.departure_time,
            "price_share": float(ride.price_share),
            "seats_total": ride.seats_total,
            "seats_available": ride.seats_available,
            "status": ride.status,
        }
        # If there's a booking object for this ride row, include booking fields
        # This ensures driver-facing rows also have booking/payment info for
        # aggregation on the frontend (e.g., total earnings per completed booking).
        if booking:
            trip.update({
                "booking_id": booking.id,
                "booking_status": booking.status,
                "amount_paid": float(booking.amount_paid or 0),
                "seats_reserved": booking.seats_reserved,
                "passenger_id": booking.passenger_id,
            })

        # Determine the user's role for this trip.
        # Priority:
        # 1) If there's a booking and the user is the passenger -> passenger
        # 2) If this ride is a passenger-created request (status == 'requested') and
        #    the requester created the ride (driver_id == user_id) -> passenger (request)
        # 3) If the user is the driver who posted the ride -> driver
        if booking and booking.passenger_id == user_id:
            trip.update({
                "role": "passenger",
            })
        elif ride.status == "requested" and ride.driver_id == user_id:
            # This is a ride *request* posted by the user (they are seeking a driver)
            trip.update({
                "role": "passenger",
                # No booking fields present for a standalone request
            })
        elif ride.driver_id == user_id:
            trip.update({"role": "driver"})
        history.append(trip)

    return {"user_id": str(user_id), "trips": history}


# ---------------------------------------------------------
# 2.  Driver Summary / Earnings
# ---------------------------------------------------------
@router.get("/summary/{driver_id}")
async def get_driver_summary(driver_id: UUID, db: AsyncSession = Depends(get_db)):
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