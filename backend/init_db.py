"""
Initialize Database
Creates all tables from SQLAlchemy models.
Run this script to set up a fresh database.
"""
import asyncio
from src.config.db import Base, init_db, async_engine, close_db
from src.models import User, Ride, Booking, Review, Incident


async def create_tables():
    """Create all database tables"""
    print("🔄 Initializing database connection...")
    await init_db()
    
    # Get the initialized engine
    from src.config.db import async_engine as engine
    
    print("🔄 Creating all tables...")
    async with engine.begin() as conn:
        # Drop all tables first (if you want a fresh start)
        # await conn.run_sync(Base.metadata.drop_all)
        
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("✅ All tables created successfully!")
    print("\nTables created:")
    print("  - users")
    print("  - rides")
    print("  - bookings")
    print("  - reviews")
    print("  - incidents")
    
    await close_db()
    print("\n✅ Database initialization complete!")


if __name__ == "__main__":
    asyncio.run(create_tables())
