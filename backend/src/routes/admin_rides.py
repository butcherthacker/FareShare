"""
Admin Rides Routes

Provides a paginated, filterable view of rides for admin auditing.

Endpoint:
- GET /admin/rides
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, case, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_MakeEnvelope, ST_Within

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User

router = APIRouter(prefix="/admin", tags=["Admin Rides"])


def _ensure_admin(user: User) -> None:
    """
    Raise 403 if the current user is not an admin.
    """
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


def _parse_geo_bbox(geo_bbox: Optional[str]):
    if not geo_bbox:
        return None
    try:
        parts = [float(p) for p in geo_bbox.split(",")]
        if len(parts) != 4:
            raise ValueError
        min_lon, min_lat, max_lon, max_lat = parts
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="geo_bbox must be 'minLon,minLat,maxLon,maxLat'"
        )
    return min_lon, min_lat, max_lon, max_lat


@router.get("/rides")
async def list_admin_rides(
    from_date: Optional[str] = Query(
        None, description="Filter rides departing on/after this date (YYYY-MM-DD)"
    ),
    to_date: Optional[str] = Query(
        None, description="Filter rides departing on/before this date (YYYY-MM-DD)"
    ),
    status_filter: Optional[str] = Query(
        None,
        alias="status",
        description="Optional ride status filter (open, cancelled, completed, etc.)",
    ),
    driver_id: Optional[UUID] = Query(
        None, description="Filter rides by driver ID"
    ),
    rider_id: Optional[UUID] = Query(
        None, description="Filter rides by passenger (booking) user ID"
    ),
    page: int = Query(0, ge=0, description="Page index (0-based)"),
    limit: int = Query(20, ge=1, le=100, description="Page size (1-100)"),
    geo_bbox: Optional[str] = Query(
        None,
        description="Optional bounding box: 'minLon,minLat,maxLon,maxLat'",
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Admin-only ride listing with filters, joins, and basic aggregates per ride.
    """
    _ensure_admin(current_user)

    from_dt = _parse_date(from_date, "from") if from_date else None
    to_dt = _parse_date(to_date, "to") if to_date else None
    if to_dt:
        to_dt = to_dt + timedelta(days=1)

    bbox_tuple = _parse_geo_bbox(geo_bbox)

    conditions = []

    if from_dt:
        conditions.append(Ride.departure_time >= from_dt)
    if to_dt:
        conditions.append(Ride.departure_time < to_dt)
    if status_filter:
        conditions.append(Ride.status == status_filter.lower())
    if driver_id:
        conditions.append(Ride.driver_id == driver_id)

    # When filtering by rider_id, we must join bookings; we'll always left join anyway.
    if bbox_tuple:
        min_lon, min_lat, max_lon, max_lat = bbox_tuple
        envelope = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        conditions.append(
            or_(
                ST_Within(Ride.origin_geom, envelope),
                ST_Within(Ride.destination_geom, envelope),
            )
        )

    # Aggregate booking stats per ride
    passengers_count_expr = func.coalesce(func.sum(Booking.seats_reserved), 0)
    confirmed_seats_expr = func.coalesce(
        func.sum(
            case(
                (Booking.status.in_(["confirmed", "completed"]), Booking.seats_reserved),
                else_=0,
            )
        ),
        0,
    )
    denied_seats_expr = func.coalesce(
        func.sum(
            case(
                (Booking.status == "cancelled", Booking.seats_reserved),
                else_=0,
            )
        ),
        0,
    )

    stmt = (
        select(
            Ride.id.label("ride_id"),
            Ride.status.label("status"),
            Ride.departure_time.label("departure_time"),
            Ride.origin_label.label("origin_label"),
            Ride.destination_label.label("destination_label"),
            User.id.label("driver_id"),
            User.full_name.label("driver_name"),
            passengers_count_expr.label("passengers_count"),
            confirmed_seats_expr.label("bookings_confirmed"),
            denied_seats_expr.label("bookings_denied"),
        )
        .select_from(Ride)
        .join(User, User.id == Ride.driver_id)
        .join(Booking, Booking.ride_id == Ride.id, isouter=True)
    )

    if rider_id:
        conditions.append(Booking.passenger_id == rider_id)

    if conditions:
        stmt = stmt.where(and_(*conditions))

    stmt = (
        stmt.group_by(
            Ride.id,
            Ride.status,
            Ride.departure_time,
            Ride.origin_label,
            Ride.destination_label,
            User.id,
            User.full_name,
        )
        .order_by(Ride.departure_time.desc())
        .limit(limit)
        .offset(page * limit)
    )

    result = await db.execute(stmt)
    rows = result.fetchall()

    response: List[dict] = []
    for row in rows:
        response.append(
            {
                "ride_id": str(row.ride_id),
                "status": row.status,
                "departure_time": row.departure_time.isoformat()
                if row.departure_time
                else None,
                "origin_label": row.origin_label,
                "destination_label": row.destination_label,
                "driver": {
                    "id": str(row.driver_id),
                    "name": row.driver_name,
                },
                "passengers_count": int(row.passengers_count or 0),
                "bookings_confirmed": int(row.bookings_confirmed or 0),
                "bookings_denied": int(row.bookings_denied or 0),
            }
        )

    return {
        "page": page,
        "limit": limit,
        "results": response,
    }
