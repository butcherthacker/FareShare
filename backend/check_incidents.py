"""Check incident reports in database"""
import asyncio
from src.config.db import init_db, get_db
from sqlalchemy import text

async def check_incidents():
    await init_db()
    
    async for session in get_db():
        result = await session.execute(
            text('SELECT id, category, description, status, created_at FROM incidents ORDER BY created_at DESC')
        )
        incidents = result.fetchall()
        
        print(f'\n✅ Found {len(incidents)} incident report(s) in database:\n')
        
        for i, row in enumerate(incidents, 1):
            print(f'{i}. Category: {row[1]:12} | Status: {row[3]:10} | Description: {row[2][:60]}...')
        
        if len(incidents) == 0:
            print('❌ No incidents found in database')
        
        break

if __name__ == '__main__':
    asyncio.run(check_incidents())
