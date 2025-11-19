"""
Admin Incidents Routes

NOTE:
The core FareShare data model does not yet define an Incident table.
This module provides a *future-ready* API surface so that:

- The admin frontend can be wired to /admin/incidents without breaking.
- The backend can later plug in a real Incident model with minimal changes.

For Sprint 3, this endpoint simply returns an empty, paginated list.
"""

from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.db import get_db
from src.auth import get_current_active_user
from src.models.user import User

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
    Placeholder admin incidents endpoint.

    Once an Incident model/table exists, replace the body of this function
    with a real SELECT query that:

    - Applies date/status/user/ride filters
    - Supports pagination
    - Returns fields:
        incident_id, created_at, status, category, summary,
        user {id,name}, ride_id
    """
    _ensure_admin(current_user)

    # Dates are parsed/validated now so we can simply use them later
    _ = _parse_date(from_date, "from") if from_date else None
    _ = _parse_date(to_date, "to") if to_date else None

    # For Sprint 3 we don't yet have an Incident table,
    # so we return an empty, well-structured response.
    return {
        "page": page,
        "limit": limit,
        "results": [],
        "filters": {
            "from": from_date,
            "to": to_date,
            "status": status_filter,
            "user_id": user_id,
            "ride_id": ride_id,
        },
        "total": 0,
    }
