"""
Routes Package
Exports all FastAPI route modules.
"""
from src.routes.auth import router as auth_router
from src.routes.users import router as users_router
from src.routes.rides import router as rides_router
from src.routes.booking import router as booking_router
from src.routes.geo import router as geo_router

# Import admin routers (Sprint 3)
from .admin_rides import router as admin_rides_router
from .admin_reports import router as admin_reports_router
from .admin_incidents import router as admin_incidents_router


__all__ = ["auth_router", "users_router", "rides_router", "booking_router", "geo_router"]