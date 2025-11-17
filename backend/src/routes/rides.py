"""
Ride Routes
Handles ride posting, requesting, retrieval, and management endpoints.

Endpoints:
- POST /rides - Create new ride offer or request
- GET /rides - List all rides with filtering
- GET /rides/{id} - Get specific ride details
- PATCH /rides/{id} - Update ride information
- DELETE /rides/{id} - Cancel/delete a ride
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, or_, and_, cast
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2 import Geometry
from geoalchemy2.functions import ST_SetSRID, ST_MakePoint, ST_X, ST_Y, ST_DWithin, ST_Distance
import math

from src.config.db import get_db
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User
from src.schemas.ride import (
    RideCreate, 
    RideUpdate, 
    RideResponse, 
    RideListResponse,
    RideStatusUpdate,
    RideType,
    RideStatus,
    DriverInfo,
    RideSearchResponse,
    RideSearchItem
)
from src.auth import get_current_active_user

router = APIRouter(prefix="/rides", tags=["Rides"])


# ===== HELPER FUNCTIONS =====

async def get_ride_coordinates(db: AsyncSession, ride_id: str) -> dict:
    """
    Extract coordinates from a ride's PostGIS geography fields.
    
    PostGIS ST_X and ST_Y functions require geometry type, not geography.
    We need to cast geography to geometry first.
    
    Args:
        db: Database session
        ride_id: UUID of the ride
        
    Returns:
        dict with origin_lng, origin_lat, destination_lng, destination_lat
    """
    coords_query = select(
        ST_X(cast(Ride.origin_geom, Geometry)).label('origin_lng'),
        ST_Y(cast(Ride.origin_geom, Geometry)).label('origin_lat'),
        ST_X(cast(Ride.destination_geom, Geometry)).label('dest_lng'),
        ST_Y(cast(Ride.destination_geom, Geometry)).label('dest_lat')
    ).where(Ride.id == ride_id)
    
    coords_result = await db.execute(coords_query)
    coords = coords_result.first()
    
    if coords:
        return {
            "origin_lng": coords.origin_lng,
            "origin_lat": coords.origin_lat,
            "destination_lng": coords.dest_lng,
            "destination_lat": coords.dest_lat
        }
    return {
        "origin_lng": None,
        "origin_lat": None,
        "destination_lng": None,
        "destination_lat": None
    }


def convert_ride_to_response(ride: Ride) -> dict:
    """
    Convert Ride model to response dictionary with extracted coordinates.
    
    Args:
        ride: Ride database model
        
    Returns:
        dict: Ride data ready for RideResponse schema
    """
    # Extract coordinates from PostGIS geometry objects
    # Note: We need to handle this in the route since SQLAlchemy doesn't auto-convert
    ride_dict = {
        "id": str(ride.id),
        "ride_type": "request" if ride.status == "requested" else "offer",
        "driver_id": str(ride.driver_id),
        "origin_label": ride.origin_label,
        "destination_label": ride.destination_label,
        "departure_time": ride.departure_time,
        "seats_total": ride.seats_total,
        "seats_available": ride.seats_available,
        "price_share": float(ride.price_share),
        "vehicle_make": ride.vehicle_make,
        "vehicle_model": ride.vehicle_model,
        "vehicle_color": ride.vehicle_color,
        "vehicle_year": ride.vehicle_year,
        "notes": ride.notes,
        "status": ride.status,
        "created_at": ride.created_at,
        # Include driver info if available
        "driver": None
    }
    
    # Add driver information if loaded
    if ride.driver:
        ride_dict["driver"] = DriverInfo(
            id=str(ride.driver.id),
            full_name=ride.driver.full_name,
            rating_avg=float(ride.driver.rating_avg),
            rating_count=ride.driver.rating_count,
            avatar_url=ride.driver.avatar_url
        )
    
    return ride_dict


# ===== CREATE RIDE =====

@router.post("/", response_model=RideResponse, status_code=status.HTTP_201_CREATED)
async def create_ride(
    ride_data: RideCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new ride offer (driver) or ride request (passenger).
    
    **Authentication required.**
    
    For **RIDE OFFERS** (drivers):
    - Set ride_type to "offer"
    - Specify available seats and price per passenger
    - Vehicle info optional (falls back to user profile)
    
    For **RIDE REQUESTS** (passengers):
    - Set ride_type to "request"
    - Specify needed seats (usually 1) and willing-to-pay price
    - Ride will be marked as "requested" status
    
    **Coordinates are optional** until map integration is complete.
    If not provided, coordinates will default to (0, 0) - this should be fixed
    when map integration is added.
    """
    # TODO: Optionally enforce verification requirement
    # if current_user.verification_status != "verified":
    #     raise HTTPException(
    #         status_code=status.HTTP_403_FORBIDDEN,
    #         detail="Only verified users can post rides"
    #     )
    
    # Determine ride status based on type
    if ride_data.ride_type == RideType.REQUEST:
        ride_status = "requested"  # Passenger looking for driver
    else:
        ride_status = "open"  # Driver offering ride
    
    # Handle coordinates - use provided values or default to (0, 0) for now
    # TODO: Make coordinates required once map integration is complete
    origin_lng = ride_data.origin_lng if ride_data.origin_lng is not None else 0.0
    origin_lat = ride_data.origin_lat if ride_data.origin_lat is not None else 0.0
    dest_lng = ride_data.destination_lng if ride_data.destination_lng is not None else 0.0
    dest_lat = ride_data.destination_lat if ride_data.destination_lat is not None else 0.0
    
    # Create new ride
    new_ride = Ride(
        driver_id=current_user.id,
        
        # Location labels
        origin_label=ride_data.origin_label,
        destination_label=ride_data.destination_label,
        
        # PostGIS geometry (POINT format: longitude first, then latitude)
        # ST_SetSRID sets the coordinate system (4326 = WGS84 for GPS)
        # ST_MakePoint creates a point from lon, lat
        origin_geom=ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326),
        destination_geom=ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326),
        
        # Schedule
        departure_time=ride_data.departure_time,
        
        # Capacity
        seats_total=ride_data.seats_total,
        seats_available=ride_data.seats_total,  # Initially all seats available
        
        # Pricing
        price_share=ride_data.price_share,
        
        # Additional info
        notes=ride_data.notes,
        
        # Vehicle info (only for offers; requests shouldn't have vehicle info)
        # For offers: use provided or fallback to user's vehicle
        # For requests: vehicle info should be None (validation prevents it being sent)
        vehicle_make=ride_data.vehicle_make or (current_user.vehicle_make if ride_data.ride_type == RideType.OFFER else None),
        vehicle_model=ride_data.vehicle_model or (current_user.vehicle_model if ride_data.ride_type == RideType.OFFER else None),
        vehicle_color=ride_data.vehicle_color or (current_user.vehicle_color if ride_data.ride_type == RideType.OFFER else None),
        vehicle_year=ride_data.vehicle_year or (current_user.vehicle_year if ride_data.ride_type == RideType.OFFER else None),
        
        # Status
        status=ride_status
    )
    
    db.add(new_ride)
    await db.commit()
    await db.refresh(new_ride)
    
    # Load driver relationship for response
    await db.refresh(new_ride, ["driver"])
    
    # Convert to response format
    ride_dict = convert_ride_to_response(new_ride)
    
    # Extract coordinates for response using helper function
    coords = await get_ride_coordinates(db, new_ride.id)
    ride_dict.update(coords)
    
    return RideResponse(**ride_dict)


# ===== RIDE SEARCH (LIGHTWEIGHT) =====


@router.get("/search", response_model=RideSearchResponse)
async def search_rides(
    origin: Optional[str] = Query(None, description="Origin text to search"),
    destination: Optional[str] = Query(None, description="Destination text to search"),
    date: Optional[str] = Query(None, description="Travel date (YYYY-MM-DD)"),
    seats: Optional[int] = Query(None, ge=1, description="Minimum seats needed"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per seat"),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page for search results"),
    db: AsyncSession = Depends(get_db)
):
    """Search rides using lightweight filters for the Ride Search page."""
    # page_size is provided by query parameter (default 10)

    filters = [~Ride.status.in_(["cancelled", "completed"])]

    if origin:
        filters.append(Ride.origin_label.ilike(f"%{origin}%"))

    if destination:
        filters.append(Ride.destination_label.ilike(f"%{destination}%"))

    if seats is not None:
        filters.append(Ride.seats_available >= seats)

    if max_price is not None:
        filters.append(Ride.price_share <= max_price)

    if date:
        try:
            travel_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD."
            )

        start_dt = datetime.combine(travel_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)
        filters.append(and_(Ride.departure_time >= start_dt, Ride.departure_time < end_dt))

    query = select(Ride, User).join(User, Ride.driver_id == User.id, isouter=True)
    count_query = select(func.count()).select_from(Ride).join(User, Ride.driver_id == User.id, isouter=True)

    if filters:
        filter_clause = and_(*filters)
        query = query.where(filter_clause)
        count_query = count_query.where(filter_clause)

    query = query.order_by(Ride.departure_time.asc())

    offset = (page - 1) * page_size

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    result = await db.execute(query.offset(offset).limit(page_size))
    rows = result.all()

    rides_data: list[RideSearchItem] = []
    for ride, driver in rows:
        driver_rating = None
        if driver and driver.rating_count and driver.rating_count > 0:
            driver_rating = float(driver.rating_avg)

        ride_type = "request" if ride.status == "requested" else "offer"
        
        # Extract coordinates for map display
        coords = await get_ride_coordinates(db, ride.id)

        rides_data.append(
            RideSearchItem.model_validate(
                {
                    "id": str(ride.id),
                    "from": ride.origin_label,
                    "to": ride.destination_label,
                    "depart_at": ride.departure_time,
                    "seats_available": ride.seats_available,
                    "price": float(ride.price_share),
                    "driver_rating": driver_rating,
                    "ride_type": ride_type,
                    "origin_lat": coords["origin_lat"],
                    "origin_lng": coords["origin_lng"],
                    "destination_lat": coords["destination_lat"],
                    "destination_lng": coords["destination_lng"],
                }
            )
        )

    total_pages = max(1, math.ceil(total / page_size)) if total else 1

    return RideSearchResponse(
        rides=rides_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ===== PROXIMITY SEARCH =====

@router.get("/nearby", response_model=RideSearchResponse)
async def search_rides_nearby(
    lat: float = Query(..., ge=-90, le=90, description="Search center latitude"),
    lon: float = Query(..., ge=-180, le=180, description="Search center longitude"),
    radius_km: float = Query(
        25.0, 
        ge=1, 
        le=200, 
        description="Search radius in kilometers (default: 25km, max: 200km)"
    ),
    search_type: str = Query(
        "origin",
        description="Search by 'origin', 'destination', or 'both' (either origin or destination within radius)"
    ),
    date: Optional[str] = Query(None, description="Travel date (YYYY-MM-DD)"),
    seats: Optional[int] = Query(None, ge=1, description="Minimum seats needed"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per seat"),
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Search for rides near a specific location using PostGIS proximity queries.
    
    **Find rides within a radius of a point.**
    
    This endpoint uses efficient geospatial indexing (GIST) for fast proximity search.
    Perfect for "find rides near me" or "rides from my location" features.
    
    **Search types:**
    - `origin`: Find rides that START near the search point (default)
    - `destination`: Find rides that END near the search point
    - `both`: Find rides where EITHER origin OR destination is near the search point
    
    **Examples:**
    - Find rides starting near Toronto airport within 10km
      `?lat=43.6777&lon=-79.6248&radius_km=10&search_type=origin`
    
    - Find rides going to downtown within 5km
      `?lat=43.6532&lon=-79.3832&radius_km=5&search_type=destination`
    
    **Performance:**
    - Uses GIST spatial indexes for fast queries
    - Typical query time: <100ms for thousands of rides
    - Radius queries use meters internally for accuracy
    
    **Returns:**
    List of rides sorted by distance (nearest first), with same fields as /search endpoint.
    """
    # Validate search_type
    if search_type not in ["origin", "destination", "both"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="search_type must be 'origin', 'destination', or 'both'"
        )
    
    # Convert radius from kilometers to meters (PostGIS uses meters)
    radius_meters = radius_km * 1000
    
    # Create point for search center
    search_point = ST_SetSRID(ST_MakePoint(lon, lat), 4326)
    
    # Base filters (exclude cancelled/completed rides)
    filters = [~Ride.status.in_(["cancelled", "completed"])]
    
    # Add proximity filter based on search_type
    if search_type == "origin":
        # Rides starting within radius
        filters.append(ST_DWithin(Ride.origin_geom, search_point, radius_meters))
        distance_expr = ST_Distance(Ride.origin_geom, search_point)
    elif search_type == "destination":
        # Rides ending within radius
        filters.append(ST_DWithin(Ride.destination_geom, search_point, radius_meters))
        distance_expr = ST_Distance(Ride.destination_geom, search_point)
    else:  # both
        # Rides where either origin or destination is within radius
        filters.append(
            or_(
                ST_DWithin(Ride.origin_geom, search_point, radius_meters),
                ST_DWithin(Ride.destination_geom, search_point, radius_meters)
            )
        )
        # For sorting, use minimum distance (closest endpoint)
        # Note: ST_Distance returns meters
        origin_dist = ST_Distance(Ride.origin_geom, search_point)
        dest_dist = ST_Distance(Ride.destination_geom, search_point)
        distance_expr = func.least(origin_dist, dest_dist)
    
    # Add optional filters (same as regular search)
    if seats is not None:
        filters.append(Ride.seats_available >= seats)
    
    if max_price is not None:
        filters.append(Ride.price_share <= max_price)
    
    if date:
        try:
            travel_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD."
            )
        
        start_dt = datetime.combine(travel_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        end_dt = start_dt + timedelta(days=1)
        filters.append(and_(Ride.departure_time >= start_dt, Ride.departure_time < end_dt))
    
    # Build query with distance calculation
    query = (
        select(Ride, User, distance_expr.label('distance'))
        .join(User, Ride.driver_id == User.id, isouter=True)
        .where(and_(*filters))
        .order_by('distance')  # Sort by distance (nearest first)
    )
    
    # Count query
    count_query = (
        select(func.count())
        .select_from(Ride)
        .join(User, Ride.driver_id == User.id, isouter=True)
        .where(and_(*filters))
    )
    
    # Get total count
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    rows = result.all()
    
    # Format results
    rides_data: list[RideSearchItem] = []
    for ride, driver, distance_meters in rows:
        driver_rating = None
        if driver and driver.rating_count and driver.rating_count > 0:
            driver_rating = float(driver.rating_avg)
        
        ride_type = "request" if ride.status == "requested" else "offer"
        
        # Extract coordinates for map display
        coords = await get_ride_coordinates(db, ride.id)
        
        rides_data.append(
            RideSearchItem.model_validate(
                {
                    "id": str(ride.id),
                    "from": ride.origin_label,
                    "to": ride.destination_label,
                    "depart_at": ride.departure_time,
                    "seats_available": ride.seats_available,
                    "price": float(ride.price_share),
                    "driver_rating": driver_rating,
                    "ride_type": ride_type,
                    "origin_lat": coords["origin_lat"],
                    "origin_lng": coords["origin_lng"],
                    "destination_lat": coords["destination_lat"],
                    "destination_lng": coords["destination_lng"],
                }
            )
        )
    
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    
    return RideSearchResponse(
        rides=rides_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ===== GET SINGLE RIDE =====

@router.get("/{ride_id}", response_model=RideResponse)
async def get_ride(
    ride_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific ride.
    
    **No authentication required** - allows anyone to view ride details.
    """
    # Query ride with driver information
    result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride with ID {ride_id} not found"
        )
    
    # Convert to response format
    ride_dict = convert_ride_to_response(ride)
    
    # Extract coordinates using helper function
    coords = await get_ride_coordinates(db, ride.id)
    ride_dict.update(coords)
    
    return RideResponse(**ride_dict)


# ===== LIST RIDES WITH FILTERS =====

@router.get("/", response_model=RideListResponse)
async def list_rides(
    # Pagination
    page: int = Query(1, ge=1, description="Page number (starts at 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    
    # Filters
    ride_type: Optional[RideType] = Query(None, description="Filter by offer or request"),
    status: Optional[RideStatus] = Query(None, description="Filter by ride status"),
    min_seats: Optional[int] = Query(None, ge=1, description="Minimum available seats"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price per seat"),
    
    # Search
    search: Optional[str] = Query(None, description="Search in origin/destination labels"),
    
    # Sorting
    sort_by: str = Query("departure_time", description="Sort field: departure_time, price_share, created_at"),
    sort_order: str = Query("asc", description="Sort order: asc or desc"),
    
    db: AsyncSession = Depends(get_db)
):
    """
    List all rides with filtering, searching, and pagination.
    
    **No authentication required** - allows anyone to browse available rides.
    
    **Filters:**
    - `ride_type`: Show only offers or requests
    - `status`: Filter by ride status (open, requested, full, etc.)
    - `min_seats`: Minimum available seats
    - `max_price`: Maximum price per seat
    - `search`: Text search in origin/destination labels
    
    **Pagination:**
    - `page`: Page number (default: 1)
    - `page_size`: Results per page (default: 20, max: 100)
    
    **Sorting:**
    - `sort_by`: Field to sort by (departure_time, price_share, created_at)
    - `sort_order`: asc or desc
    """
    # Build base query
    query = select(Ride)
    
    # Apply filters
    conditions = []
    
    # Filter by ride type
    if ride_type == RideType.REQUEST:
        conditions.append(Ride.status == "requested")
    elif ride_type == RideType.OFFER:
        conditions.append(Ride.status != "requested")
    
    # Filter by status
    if status:
        conditions.append(Ride.status == status.value)
    
    # Filter by minimum available seats
    if min_seats:
        conditions.append(Ride.seats_available >= min_seats)
    
    # Filter by maximum price
    if max_price:
        conditions.append(Ride.price_share <= max_price)
    
    # Text search in origin/destination labels
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(
                Ride.origin_label.ilike(search_pattern),
                Ride.destination_label.ilike(search_pattern)
            )
        )
    
    # Apply all conditions
    if conditions:
        query = query.where(and_(*conditions))
    
    # Apply sorting
    sort_field = getattr(Ride, sort_by, Ride.departure_time)
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
    rides = result.scalars().all()
    
    # Convert rides to response format
    rides_data = []
    for ride in rides:
        ride_dict = convert_ride_to_response(ride)
        
        # Extract coordinates using helper function
        coords = await get_ride_coordinates(db, ride.id)
        ride_dict.update(coords)
        
        rides_data.append(RideResponse(**ride_dict))
    
    # Calculate total pages
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    
    return RideListResponse(
        rides=rides_data,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


# ===== UPDATE RIDE =====

@router.patch("/{ride_id}", response_model=RideResponse)
async def update_ride(
    ride_id: str,
    ride_update: RideUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update ride information.
    
    **Authentication required.**
    **Only the ride owner can update their ride.**
    
    All fields are optional - only provided fields will be updated.
    Cannot update rides that are completed or cancelled.
    """
    # Get ride
    result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride with ID {ride_id} not found"
        )
    
    # Verify ownership
    if ride.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own rides"
        )
    
    # Cannot update completed or cancelled rides
    if ride.status in ["completed", "cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update {ride.status} rides"
        )
    
    # Update fields if provided
    update_data = ride_update.model_dump(exclude_unset=True)
    
    # Handle coordinate updates
    coords_updated = False
    if any(k in update_data for k in ['origin_lat', 'origin_lng', 'destination_lat', 'destination_lng']):
        coords_updated = True
        
        # Get current coordinates if not all new ones provided
        current_coords = await get_ride_coordinates(db, ride.id)
        
        # Use new values or keep current
        origin_lng = update_data.get('origin_lng', current_coords['origin_lng'])
        origin_lat = update_data.get('origin_lat', current_coords['origin_lat'])
        dest_lng = update_data.get('destination_lng', current_coords['destination_lng'])
        dest_lat = update_data.get('destination_lat', current_coords['destination_lat'])
        
        # Update geometry columns
        ride.origin_geom = ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)
        ride.destination_geom = ST_SetSRID(ST_MakePoint(dest_lng, dest_lat), 4326)
        
        # Remove coordinate fields from update_data (already handled)
        for key in ['origin_lat', 'origin_lng', 'destination_lat', 'destination_lng']:
            update_data.pop(key, None)
    
    # Update remaining fields
    for field, value in update_data.items():
        if hasattr(ride, field):
            setattr(ride, field, value)
    
    # If seats_total changed, adjust seats_available proportionally
    if 'seats_total' in update_data:
        # Calculate how many seats were booked
        seats_booked = ride.seats_total - ride.seats_available
        # Adjust available seats
        ride.seats_available = update_data['seats_total'] - seats_booked
        
        # Ensure seats_available doesn't go negative
        if ride.seats_available < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reduce total seats below number of booked seats"
            )
    
    await db.commit()
    await db.refresh(ride)
    await db.refresh(ride, ["driver"])
    
    # Convert to response
    ride_dict = convert_ride_to_response(ride)
    
    # Extract coordinates using helper function
    coords = await get_ride_coordinates(db, ride.id)
    ride_dict.update(coords)
    
    return RideResponse(**ride_dict)


# ===== CANCEL/DELETE RIDE =====

@router.delete("/{ride_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ride(
    ride_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel or delete a ride.
    
    **Authentication required.**
    **Only the ride owner can delete their ride.**
    
    If the ride has bookings, it will be marked as "cancelled" instead of deleted.
    If no bookings exist, the ride is permanently deleted.
    """
    # Get ride with bookings
    result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride with ID {ride_id} not found"
        )
    
    # Verify ownership
    if ride.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own rides"
        )
    
    # Check if ride has bookings
    if ride.bookings and len(ride.bookings) > 0:
        # Don't delete - mark as cancelled instead
        ride.status = "cancelled"
        await db.commit()
    else:
        # No bookings - safe to delete
        await db.delete(ride)
        await db.commit()
    
    return None  # 204 No Content


# ===== UPDATE RIDE STATUS =====

@router.patch("/{ride_id}/status", response_model=RideResponse)
async def update_ride_status(
    ride_id: str,
    status_update: RideStatusUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update ride status (cancel or complete).
    
    **Authentication required.**
    **Only the ride owner can update ride status.**
    
    Allowed status transitions:
    - Any status → "cancelled"
    - Any status → "completed"
    
    Note: "open", "full", and "requested" statuses are managed automatically
    by the system based on bookings.
    """
    # Get ride
    result = await db.execute(
        select(Ride).where(Ride.id == ride_id)
    )
    ride = result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ride with ID {ride_id} not found"
        )
    
    # Verify ownership
    if ride.driver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own rides"
        )
    
    # Update status
    ride.status = status_update.status.value

    # If marking ride completed or cancelled, propagate status to bookings
    # so that booking rows reflect final state and earnings can be computed
    # by looking at booking.status = 'completed'.
    if status_update.status.value == 'completed':
        # Mark all bookings for this ride as completed
        bookings_query = select(Booking).where(Booking.ride_id == ride.id)
        bookings_result = await db.execute(bookings_query)
        bookings = bookings_result.scalars().all()
        for b in bookings:
            b.status = 'completed'
    elif status_update.status.value == 'cancelled':
        # Mark bookings as cancelled when ride cancelled
        bookings_query = select(Booking).where(Booking.ride_id == ride.id)
        bookings_result = await db.execute(bookings_query)
        bookings = bookings_result.scalars().all()
        for b in bookings:
            b.status = 'cancelled'
    
    await db.commit()
    await db.refresh(ride)
    await db.refresh(ride, ["driver"])
    
    # Convert to response
    ride_dict = convert_ride_to_response(ride)
    
    # Extract coordinates using helper function
    coords = await get_ride_coordinates(db, ride.id)
    ride_dict.update(coords)
    
    return RideResponse(**ride_dict)
