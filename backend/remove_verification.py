"""
Script to remove email verification status for Angus Thacker
Sets verification_status back to 'pending'
"""
import asyncio
from sqlalchemy import select, update
from src.config.db import get_async_session, init_db, close_db
from src.models.user import User


async def remove_verification_status():
    """Remove verification status for Angus Thacker"""
    # Initialize database connection
    await init_db()
    
    try:
        async with get_async_session() as session:
            # Find user by name
            result = await session.execute(
                select(User).where(User.full_name == "Angus Thacker")
            )
            user = result.scalar_one_or_none()
            
            if not user:
                print("❌ User 'Angus Thacker' not found in database")
                return
            
            print(f"✅ Found user: {user.full_name} ({user.email})")
            print(f"   Current verification status: {user.verification_status}")
            print(f"   Current verification method: {user.verification_method}")
            
            # Update verification status
            user.verification_status = "pending"
            user.verification_method = None
            
            # Commit is handled automatically by get_async_session context manager
            
            print(f"\n✅ Successfully updated verification status to 'pending'")
            print(f"   Email verification has been removed for {user.full_name}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        raise
    finally:
        # Close database connection
        await close_db()


if __name__ == "__main__":
    asyncio.run(remove_verification_status())
