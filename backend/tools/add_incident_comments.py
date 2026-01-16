"""
Add incident_comments table to database
Run this script to add the new incident comments feature
"""
import asyncio
from sqlalchemy import text
from src.config.db import get_db, init_db, close_db
from sqlalchemy.ext.asyncio import create_async_engine
import os
from dotenv import load_dotenv

load_dotenv()


async def create_incident_comments_table():
    """Create the incident_comments table"""
    
    # Get database URL
    DATABASE_URL = os.getenv("DATABASE_URL")
    if DATABASE_URL.startswith("postgresql://"):
        ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    else:
        ASYNC_DATABASE_URL = DATABASE_URL
    
    engine = create_async_engine(ASYNC_DATABASE_URL)
    
    # Execute each statement separately
    statements = [
        """
        CREATE TABLE IF NOT EXISTS incident_comments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
            author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            comment_text TEXT NOT NULL,
            is_admin_comment BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """,
        "CREATE INDEX IF NOT EXISTS ix_incident_comments_incident_id ON incident_comments(incident_id)",
        "CREATE INDEX IF NOT EXISTS ix_incident_comments_author_id ON incident_comments(author_id)",
        "CREATE INDEX IF NOT EXISTS ix_incident_comments_created_at ON incident_comments(created_at)"
    ]
    
    async with engine.begin() as conn:
        for stmt in statements:
            await conn.execute(text(stmt))
        print("✅ incident_comments table created successfully")
    
    await engine.dispose()


async def main():
    print("🚀 Adding incident_comments table...")
    await create_incident_comments_table()
    print("✅ Database migration complete!")


if __name__ == "__main__":
    asyncio.run(main())
