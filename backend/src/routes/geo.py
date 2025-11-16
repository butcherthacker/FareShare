"""
Geocoding Routes
Provides geocoding services via OpenStreetMap Nominatim API proxy.

Endpoints:
- GET /geo/geocode - Search for addresses and get coordinates
- GET /geo/reverse - Reverse geocode coordinates to address

This proxy handles:
- Rate limiting to prevent abuse
- CORS issues when calling Nominatim from browser
- Input validation and error handling
- Response normalization for consistent API contract
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Query, Request
from pydantic import BaseModel, Field, field_validator
import httpx
import logging
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/geo", tags=["Geocoding"])


# ===== RATE LIMITING =====

class SimpleRateLimiter:
    """
    Simple in-memory rate limiter for geocoding endpoints.
    
    Limits requests per IP address to prevent abuse of Nominatim API.
    This is a basic implementation - for production, consider Redis-based limiter.
    
    Nominatim Usage Policy:
    - Max 1 request per second
    - Bulk geocoding should be done locally
    - Always include a valid User-Agent
    """
    
    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        """
        Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests allowed per window
            window_seconds: Time window in seconds
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # Store timestamps of requests per IP: {ip: [timestamp1, timestamp2, ...]}
        self.requests = defaultdict(list)
        self._lock = asyncio.Lock()
    
    async def check_rate_limit(self, client_ip: str) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            client_ip: Client IP address
            
        Returns:
            True if request is allowed, False if rate limit exceeded
        """
        async with self._lock:
            now = datetime.now()
            cutoff_time = now - timedelta(seconds=self.window_seconds)
            
            # Get request history for this IP
            request_times = self.requests[client_ip]
            
            # Remove old requests outside the window
            request_times[:] = [t for t in request_times if t > cutoff_time]
            
            # Check if limit exceeded
            if len(request_times) >= self.max_requests:
                return False
            
            # Add current request
            request_times.append(now)
            return True
    
    async def cleanup_old_entries(self):
        """Remove IPs with no recent requests (cleanup task)"""
        async with self._lock:
            now = datetime.now()
            cutoff_time = now - timedelta(seconds=self.window_seconds * 2)
            
            # Remove IPs with no recent activity
            ips_to_remove = []
            for ip, times in self.requests.items():
                if not times or all(t < cutoff_time for t in times):
                    ips_to_remove.append(ip)
            
            for ip in ips_to_remove:
                del self.requests[ip]


# Initialize rate limiter
# 10 requests per minute per IP (conservative to respect Nominatim policy)
rate_limiter = SimpleRateLimiter(max_requests=10, window_seconds=60)


# ===== RESPONSE SCHEMAS =====

class GeocodingResult(BaseModel):
    """
    Single geocoding result.
    
    Normalized format from OpenStreetMap Nominatim response.
    """
    label: str = Field(..., description="Human-readable address label")
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")
    display_name: str = Field(..., description="Full formatted address")
    place_type: Optional[str] = Field(None, description="Type of place (city, road, etc.)")
    importance: Optional[float] = Field(None, description="Relevance score (0-1)")
    
    @field_validator('lat')
    @classmethod
    def validate_latitude(cls, v):
        """Validate latitude range"""
        if not -90 <= v <= 90:
            raise ValueError('Latitude must be between -90 and 90')
        return v
    
    @field_validator('lon')
    @classmethod
    def validate_longitude(cls, v):
        """Validate longitude range"""
        if not -180 <= v <= 180:
            raise ValueError('Longitude must be between -180 and 180')
        return v


class GeocodingResponse(BaseModel):
    """Response for geocoding search"""
    results: List[GeocodingResult] = Field(..., description="List of matching locations")
    query: str = Field(..., description="Original search query")
    count: int = Field(..., description="Number of results found")


class ReverseGeocodingResult(BaseModel):
    """Result for reverse geocoding (coordinates to address)"""
    label: str = Field(..., description="Human-readable address")
    lat: float = Field(..., description="Latitude coordinate")
    lon: float = Field(..., description="Longitude coordinate")
    display_name: str = Field(..., description="Full formatted address")
    address: dict = Field(..., description="Structured address components")


# ===== HELPER FUNCTIONS =====

def get_client_ip(request: Request) -> str:
    """
    Extract client IP address from request.
    
    Handles proxies and load balancers by checking X-Forwarded-For header.
    """
    # Check for proxy headers first
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can be comma-separated list, get first (original client)
        return forwarded_for.split(",")[0].strip()
    
    # Fallback to direct connection IP
    if request.client:
        return request.client.host
    
    return "unknown"


async def call_nominatim(
    endpoint: str,
    params: dict,
    timeout: float = 10.0
) -> dict:
    """
    Make HTTP request to OpenStreetMap Nominatim API.
    
    Args:
        endpoint: Nominatim endpoint (e.g., "search", "reverse")
        params: Query parameters
        timeout: Request timeout in seconds
        
    Returns:
        Parsed JSON response
        
    Raises:
        HTTPException: If request fails
    """
    # Nominatim base URL
    base_url = "https://nominatim.openstreetmap.org"
    
    # Add required format parameter
    params["format"] = "json"
    
    # Add User-Agent (required by Nominatim usage policy)
    headers = {
        "User-Agent": "FareShare/1.0 (ride-sharing platform; geocoding for route visualization)"
    }
    
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(
                f"{base_url}/{endpoint}",
                params=params,
                headers=headers
            )
            
            # Check for rate limiting from Nominatim
            if response.status_code == 429:
                logger.warning("Nominatim rate limit exceeded")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Geocoding service temporarily unavailable due to rate limiting. Please try again later."
                )
            
            # Check for other errors
            response.raise_for_status()
            
            return response.json()
            
    except httpx.TimeoutException:
        logger.error(f"Nominatim request timeout for endpoint: {endpoint}")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Geocoding service timeout. Please try again."
        )
    except httpx.HTTPError as e:
        logger.error(f"Nominatim HTTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Geocoding service unavailable. Please try again later."
        )


# ===== GEOCODING ENDPOINT =====

@router.get("/geocode", response_model=GeocodingResponse)
async def geocode_address(
    request: Request,
    query: str = Query(
        ...,
        min_length=3,
        max_length=200,
        description="Address or place name to search for",
        example="Toronto, Canada"
    ),
    limit: int = Query(
        5,
        ge=1,
        le=10,
        description="Maximum number of results to return"
    ),
    country_codes: Optional[str] = Query(
        None,
        description="Limit results to specific countries (comma-separated ISO 3166-1 alpha-2 codes)",
        example="ca,us"
    )
):
    """
    Geocode an address or place name to coordinates.
    
    **Search for locations and get their GPS coordinates.**
    
    This endpoint proxies requests to OpenStreetMap Nominatim API to:
    - Avoid CORS issues from browser
    - Apply rate limiting to prevent abuse
    - Normalize response format
    
    **Rate Limiting:**
    - 10 requests per minute per IP address
    - Respects Nominatim usage policy
    
    **Examples:**
    - `?query=Toronto, Canada` - Search for city
    - `?query=123 Main Street, Toronto` - Search for specific address
    - `?query=Toronto Pearson Airport&country_codes=ca` - Limit to Canada
    
    **Returns:**
    List of matching locations with:
    - `label`: Short display name
    - `lat`, `lon`: GPS coordinates
    - `display_name`: Full formatted address
    - `place_type`: Type of location (city, road, etc.)
    - `importance`: Relevance score (0-1, higher is more relevant)
    """
    # Check rate limit
    client_ip = get_client_ip(request)
    
    if not await rate_limiter.check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again in a minute."
        )
    
    # Build Nominatim query parameters
    nominatim_params = {
        "q": query,
        "limit": limit,
        "addressdetails": 1,  # Include structured address data
    }
    
    # Add country filter if provided
    if country_codes:
        nominatim_params["countrycodes"] = country_codes
    
    # Call Nominatim API
    try:
        results = await call_nominatim("search", nominatim_params)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in geocoding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )
    
    # Normalize results to our schema
    normalized_results = []
    for result in results:
        try:
            # Extract key fields
            lat = float(result.get("lat", 0))
            lon = float(result.get("lon", 0))
            display_name = result.get("display_name", "")
            place_type = result.get("type")
            importance = result.get("importance")
            
            # Create short label (use name if available, otherwise first part of display_name)
            name = result.get("name")
            if name:
                label = name
            else:
                # Use first part of display_name
                label = display_name.split(",")[0] if display_name else query
            
            normalized_results.append(
                GeocodingResult(
                    label=label,
                    lat=lat,
                    lon=lon,
                    display_name=display_name,
                    place_type=place_type,
                    importance=importance
                )
            )
        except (ValueError, KeyError) as e:
            logger.warning(f"Skipping malformed result: {e}")
            continue
    
    return GeocodingResponse(
        results=normalized_results,
        query=query,
        count=len(normalized_results)
    )


# ===== REVERSE GEOCODING ENDPOINT =====

@router.get("/reverse", response_model=ReverseGeocodingResult)
async def reverse_geocode(
    request: Request,
    lat: float = Query(..., ge=-90, le=90, description="Latitude coordinate"),
    lon: float = Query(..., ge=-180, le=180, description="Longitude coordinate"),
    zoom: int = Query(
        18,
        ge=3,
        le=18,
        description="Zoom level (3=country, 18=building). Higher = more detailed address."
    )
):
    """
    Reverse geocode coordinates to human-readable address.
    
    **Convert GPS coordinates to an address.**
    
    Useful for:
    - Displaying address when user drops a pin on map
    - Converting saved coordinates back to readable location
    - Validating coordinates represent real places
    
    **Rate Limiting:**
    - 10 requests per minute per IP address
    
    **Zoom levels:**
    - 3: Country
    - 5: State/Province
    - 8: County
    - 10: City
    - 14: Suburb
    - 16: Street
    - 18: Building
    
    **Returns:**
    Address details including:
    - `label`: Short display name
    - `display_name`: Full formatted address
    - `address`: Structured components (street, city, country, etc.)
    """
    # Check rate limit
    client_ip = get_client_ip(request)
    
    if not await rate_limiter.check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again in a minute."
        )
    
    # Build Nominatim query parameters
    nominatim_params = {
        "lat": lat,
        "lon": lon,
        "zoom": zoom,
        "addressdetails": 1,  # Include structured address
    }
    
    # Call Nominatim API
    try:
        result = await call_nominatim("reverse", nominatim_params)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in reverse geocoding: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )
    
    # Check if result found
    if not result or "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No address found for the given coordinates"
        )
    
    # Extract fields
    display_name = result.get("display_name", "")
    address = result.get("address", {})
    
    # Create short label from address components
    # Priority: building > house_number + road > suburb > city > country
    label_parts = []
    
    if "building" in address:
        label_parts.append(address["building"])
    elif "house_number" in address and "road" in address:
        label_parts.append(f"{address['house_number']} {address['road']}")
    elif "road" in address:
        label_parts.append(address["road"])
    
    if "suburb" in address:
        label_parts.append(address["suburb"])
    elif "city" in address:
        label_parts.append(address["city"])
    elif "town" in address:
        label_parts.append(address["town"])
    elif "village" in address:
        label_parts.append(address["village"])
    
    # Create label (max 2-3 components)
    label = ", ".join(label_parts[:3]) if label_parts else display_name.split(",")[0]
    
    return ReverseGeocodingResult(
        label=label,
        lat=lat,
        lon=lon,
        display_name=display_name,
        address=address
    )


# ===== HEALTH CHECK =====

@router.get("/health", tags=["Health"])
async def geocoding_health_check():
    """
    Check if geocoding service is operational.
    
    Makes a simple test request to Nominatim to verify connectivity.
    """
    try:
        # Test with a simple query for a well-known location
        result = await call_nominatim(
            "search",
            {"q": "Toronto", "limit": 1},
            timeout=5.0
        )
        
        if result and len(result) > 0:
            return {
                "status": "healthy",
                "service": "nominatim",
                "message": "Geocoding service is operational"
            }
        else:
            return {
                "status": "degraded",
                "service": "nominatim",
                "message": "Geocoding service returned no results"
            }
            
    except Exception as e:
        logger.error(f"Geocoding health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "nominatim",
            "error": str(e)
        }
