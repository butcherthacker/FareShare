"""
FareShare API - Main Application
FastAPI application entry point with health checks and database connectivity.
"""

from dotenv import load_dotenv
load_dotenv()  # Load .env file at startup

from datetime import datetime
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os
from sqlalchemy import text, select

from src.config.db import init_db, close_db, get_async_session
from src.models import User, Ride, Booking, Review
from src.routes import auth_router, users_router, rides_router, booking_router, trip_summary # Trip summary routes
from src.routes.reviews import router as reviews_router

# Import admin routers (Sprint 3)
from src.routes.auth import router as auth_router # Re-importing for admin
from src.routes.admin_rides import router as admin_rides_router
from src.routes.admin_reports import router as admin_reports_router
from src.routes.admin_incidents import router as admin_incidents_router



# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manage application lifespan events.
    - Startup: Initialize database connection pool
    - Shutdown: Close all database connections
    """
    # Startup
    logger.info("🚀 Starting FareShare API...")
    await init_db()
    logger.info("✅ Database connection pool initialized")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down FareShare API...")
    await close_db()
    logger.info("✅ Database connections closed")


# Initialize FastAPI app
app = FastAPI(
    title="FareShare API",
    description="Ride-sharing platform with geospatial features",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - configure based on your frontend URL
cors_origins_env = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_env:
    allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]
else:
    # Sensible defaults for Vite dev server (ports 5173 and 5174)
    allow_origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Mount static files for avatar uploads
# Create uploads directory if it doesn't exist
os.makedirs("uploads/avatars", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(rides_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(reviews_router, prefix="/api")
app.include_router(trip_summary.router) # Trip summary routes (already has /api/trips prefix)
from src.routes.geo import router as geo_router
app.include_router(geo_router, prefix="/api")  # Geocoding routes
from src.routes.messages import router as messages_router
app.include_router(messages_router)  # Messaging routes (already has /api/messages prefix)

# Include admin routers (Sprint 3)
app.include_router(auth_router)  # Auth routes for admin
app.include_router(admin_rides_router)
app.include_router(admin_reports_router)
app.include_router(admin_incidents_router)


@app.get("/", tags=["Root"])
async def root():
    """Welcome endpoint"""
    return {
        "message": "Welcome to FareShare API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"], status_code=status.HTTP_200_OK)
async def health_check():
    """
    Health check endpoint with database connectivity test.
    Returns 200 if API and database are healthy, 503 otherwise.
    """
    try:
        # Test database connection with a simple query
        async with get_async_session() as session:
            result = await session.execute(text("SELECT 1 as health_check"))
            row = result.fetchone()
            
            if row and row[0] == 1:
                return {
                    "status": "healthy",
                    "database": "connected",
                    "message": "API and database are operational"
                }
            else:
                return {
                    "status": "unhealthy",
                    "database": "error",
                    "message": "Database query returned unexpected result"
                }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }




# Demo endpoints removed - using proper route modules instead
# See src/routes/ for all API endpoints

@app.get("/api/test", tags=["Test"])
async def test_api():
    """
    Test endpoint that returns a simple message.
    This can be used to verify API connectivity from frontend.
    """
    return {
        "message": "API connection successful",
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Disable in production
    )
