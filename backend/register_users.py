"""
Register Initial Users
Creates admin and test user accounts in the database.
"""
import asyncio
from src.config.db import get_async_session, init_db, close_db
from src.models.user import User
from src.auth import get_password_hash

users_to_create = [
    {
        "full_name": "Adam Driver",
        "email": "admin@example.com",
        "password": "adminpass123",
        "role": "admin"
    },
    {
        "full_name": "Steve Rider",
        "email": "steve@example.com",
        "password": "password123",
        "role": "user"
    },
    {
        "full_name": "Angus Thacker",
        "email": "thac1398@mylaurier.ca",
        "password": "password123",
        "role": "user"
    }
]


async def register_users():
    """Register initial users in the database"""
    print("🔄 Initializing database connection...")
    await init_db()
    
    print("🔄 Registering users...\n")
    
    async with get_async_session() as session:
        for user_data in users_to_create:
            # Check if user already exists
            from sqlalchemy import select
            existing = await session.execute(
                select(User).where(User.email == user_data["email"])
            )
            if existing.scalar_one_or_none():
                print(f"⚠️  User {user_data['email']} already exists, skipping...")
                continue
            
            # Hash the password
            hashed_password = get_password_hash(user_data["password"])
            
            # Create user
            new_user = User(
                full_name=user_data["full_name"],
                email=user_data["email"],
                password_hash=hashed_password,
                role=user_data["role"],
                verification_status="verified",  # Auto-verify for testing
                verification_method="email",
                status="active"
            )
            
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            
            role_label = "👑 ADMIN" if user_data["role"] == "admin" else "👤 USER"
            print(f"✅ {role_label} - {user_data['full_name']} ({user_data['email']})")
    
    print("\n✅ All users registered successfully!")
    print("\n📝 Login credentials:")
    for user_data in users_to_create:
        role_icon = "👑" if user_data["role"] == "admin" else "👤"
        print(f"  {role_icon} {user_data['email']} / {user_data['password']}")
    
    await close_db()


if __name__ == "__main__":
    asyncio.run(register_users())
