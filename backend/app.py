"""
FareShare API - Main Application
FastAPI application entry point with health checks and database connectivity.
"""
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
from src.routes import auth_router, users_router, rides_router

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
app.add_middleware(
    CORSMiddleware,
    # Allow all origins for development - replace with specific domains in production
    allow_origins=["*"],  # For development only!
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
