"""
Admin Usage Reports Routes (Sprint 3)

Provides aggregated metrics and bucketed statistics for the admin dashboard.

Endpoints:
- GET /admin/reports/usage      - JSON summary & buckets
- GET /admin/reports/usage.csv  - CSV export of summary/buckets
"""
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, case, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_MakeEnvelope, ST_Within

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User

router = APIRouter(prefix="/admin/reports", tags=["Admin Reports"])


# ===== HELPERS =====

def _ensure_admin(user: User) -> None:
    """
    Raise 403 if the current user is not an admin.
    """
    if not user or getattr(user, "role", None) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access only."
        )


def _parse_date(value: str, field_name: str) -> datetime:
    """
    Parse YYYY-MM-DD into timezone-aware datetime at start of day (UTC).
    Raises 400 on invalid format.
    """
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


def _parse_geo_bbox(geo_bbox: Optional[str]) -> Optional[Tuple[float, float, float, float]]:
    """
    Parse bbox string "minLon,minLat,maxLon,maxLat" to floats.
    """
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


def _build_ride_filters(
    from_dt: datetime,
    to_dt: datetime,
    status_filter: Optional[str],
    geo_bbox: Optional[Tuple[float, float, float, float]],
):
    """
    Common WHERE clause used by all admin usage queries.
    """
    filters = [
        Ride.departure_time >= from_dt,
        Ride.departure_time < to_dt,
    ]

    if status_filter and status_filter.lower() != "all":
        filters.append(Ride.status == status_filter.lower())

    if geo_bbox:
        min_lon, min_lat, max_lon, max_lat = geo_bbox
        envelope = ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
        filters.append(
            or_(
                ST_Within(Ride.origin_geom, envelope),
                ST_Within(Ride.destination_geom, envelope),
            )
        )

    return and_(*filters)


# ===== ROUTES =====

@router.get("/usage")
async def get_usage_report(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date inclusive (YYYY-MM-DD)"),
    status: str = Query("all", description="Ride status filter or 'all'"),
    group_by: str = Query(
        "week",
        description="Bucket size: 'day', 'week', or 'month'"
    ),
    geo_bbox: Optional[str] = Query(
        None,
        description="Optional bounding box: 'minLon,minLat,maxLon,maxLat'"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Returns high-level KPI summary and time-bucketed metrics for the given range.
    """
    _ensure_admin(current_user)

    group_by = group_by.lower()
    if group_by not in {"day", "week", "month"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="group_by must be one of: day, week, month"
        )

    # Inclusive [from, to] where to is at end-of-day
    from_dt = _parse_date(from_date, "from")
    to_dt_raw = _parse_date(to_date, "to")
    to_dt = to_dt_raw + timedelta(days=1)

    bbox_tuple = _parse_geo_bbox(geo_bbox)
    where_clause = _build_ride_filters(from_dt, to_dt, status, bbox_tuple)

    # ===== SUMMARY METRICS =====
    # Use left join so rides with no bookings are still counted.
    earnings_case = case(
        (
            Booking.status.in_(["confirmed", "completed"]),
            Booking.amount_paid,
        ),
        else_=0,
    )

    cancelled_booking_case = case(
        (
            Booking.status == "cancelled",
            1,
        ),
        else_=0,
    )

    completed_ride_case = case(
        (Ride.status == "completed", 1),
        else_=0,
    )

    cancelled_ride_case = case(
        (Ride.status == "cancelled", 1),
        else_=0,
    )

    summary_stmt = (
        select(
            func.count(func.distinct(Ride.id)).label("rides_total"),
            func.count(Booking.id).label("bookings_total"),
            func.sum(completed_ride_case).label("completed_rides"),
            func.sum(cancelled_ride_case).label("cancelled_rides"),
            func.sum(cancelled_booking_case).label("denied_bookings"),
            func.coalesce(func.sum(earnings_case), 0).label("earnings_total"),
            func.count(func.distinct(Ride.driver_id)).label("active_drivers"),
            func.count(func.distinct(Booking.passenger_id)).label("active_riders"),
        )
        .select_from(Ride)
        .join(Booking, Booking.ride_id == Ride.id, isouter=True)
        .where(where_clause)
    )

    summary_result = await db.execute(summary_stmt)
    summary_row = summary_result.one()

    # ===== AVERAGE DRIVER RATING =====
    # Fetch IDs of active drivers and average their rating_avg
    active_driver_stmt = (
        select(func.distinct(Ride.driver_id))
        .where(where_clause)
    )
    active_driver_ids_result = await db.execute(active_driver_stmt)
    active_driver_ids = [row[0] for row in active_driver_ids_result.fetchall()]

    avg_driver_rating = 0.0
    if active_driver_ids:
        rating_stmt = (
            select(func.avg(User.rating_avg))
            .where(User.id.in_(active_driver_ids))
        )
        rating_result = await db.execute(rating_stmt)
        avg_driver_rating = float(rating_result.scalar() or 0.0)

    # ===== BUCKETED METRICS =====
    period_expr = func.date_trunc(group_by, Ride.departure_time).label("period")

    bucket_stmt = (
        select(
            period_expr,
            func.count(func.distinct(Ride.id)).label("rides"),
            func.count(Booking.id).label("bookings"),
            func.coalesce(func.sum(earnings_case), 0).label("earnings"),
        )
        .select_from(Ride)
        .join(Booking, Booking.ride_id == Ride.id, isouter=True)
        .where(where_clause)
        .group_by(period_expr)
        .order_by(period_expr)
    )

    buckets_result = await db.execute(bucket_stmt)
    buckets: List[dict] = []
    for row in buckets_result:
        period: datetime = row.period
        period_str = period.date().isoformat()
        buckets.append(
            {
                "period": period_str,
                "rides": int(row.rides or 0),
                "bookings": int(row.bookings or 0),
                "earnings": float(row.earnings or 0.0),
            }
        )

    response = {
        "summary": {
            "rides_total": int(summary_row.rides_total or 0),
            "bookings_total": int(summary_row.bookings_total or 0),
            "completed_rides": int(summary_row.completed_rides or 0),
            "cancelled_rides": int(summary_row.cancelled_rides or 0),
            "denied_bookings": int(summary_row.denied_bookings or 0),
            "earnings_total": float(summary_row.earnings_total or 0.0),
            "active_drivers": int(summary_row.active_drivers or 0),
            "active_riders": int(summary_row.active_riders or 0),
            "avg_driver_rating": round(avg_driver_rating, 2),
        },
        "buckets": buckets,
    }
    return response


@router.get("/usage.csv")
async def get_usage_report_csv(
    from_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    to_date: str = Query(..., description="End date inclusive (YYYY-MM-DD)"),
    status: str = Query("all", description="Ride status filter or 'all'"),
    group_by: str = Query(
        "week",
        description="Bucket size: 'day', 'week', or 'month'"
    ),
    geo_bbox: Optional[str] = Query(
        None,
        description="Optional bounding box: 'minLon,minLat,maxLon,maxLat'"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    CSV export wrapper around GET /admin/reports/usage.

    Returns text/csv representing the same summary + bucket data.
    """
    _ensure_admin(current_user)

    # Reuse the JSON-producing logic
    json_data = await get_usage_report(
        from_date=from_date,
        to_date=to_date,
        status=status,
        group_by=group_by,
        geo_bbox=geo_bbox,
        db=db,
        current_user=current_user,
    )

    # Build CSV content
    lines: List[str] = []

    # Summary row
    s = json_data["summary"]
    summary_header = [
        "rides_total",
        "bookings_total",
        "completed_rides",
        "cancelled_rides",
        "denied_bookings",
        "earnings_total",
        "active_drivers",
        "active_riders",
        "avg_driver_rating",
    ]
    lines.append(",".join(summary_header))
    summary_row = [
        str(s["rides_total"]),
        str(s["bookings_total"]),
        str(s["completed_rides"]),
        str(s["cancelled_rides"]),
        str(s["denied_bookings"]),
        f"{s['earnings_total']:.2f}",
        str(s["active_drivers"]),
        str(s["active_riders"]),
        f"{s['avg_driver_rating']:.2f}",
    ]
    lines.append(",".join(summary_row))

    # Buckets
    lines.append("")  # empty line separator
    lines.append("period,rides,bookings,earnings")
    for b in json_data["buckets"]:
        lines.append(
            f"{b['period']},{b['rides']},{b['bookings']},{b['earnings']:.2f}"
        )

    csv_content = "\n".join(lines)
    return csv_content
