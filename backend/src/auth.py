"""
Authentication & Security Utilities
Handles JWT tokens, password hashing, email verification, and authentication dependencies for FastAPI routes.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.db import get_db
from src.models.user import User

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")  # Change in production!
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
VERIFICATION_TOKEN_EXPIRE_HOURS = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", 24))

# HTTP Bearer token scheme
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against its hash.
    
    Args:
        plain_password: The plain text password to verify
        hashed_password: The stored bcrypt hash
        
    Returns:
        bool: True if password matches, False otherwise
    """
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a plain password using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        str: Bcrypt hashed password
    """
    try:
        # Bcrypt has a 72-byte limit, so truncate if necessary
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        # Generate salt and hash password
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    except Exception as e:
        print(f"Password hashing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing password"
        )


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token with user data.
    
    Args:
        data: Dictionary containing user info (usually user_id)
        expires_delta: Optional custom expiration time
        
    Returns:
        str: JWT token string
    """
    to_encode = data.copy()
    
    # Set expiration time
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    
    # Create and return JWT token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_verification_token(user_id: str, email: str) -> str:
    """
    Create a JWT token specifically for email verification.
    
    Args:
        user_id: User's UUID as string
        email: User's email address
        
    Returns:
        str: JWT verification token
    """
    verification_expires = timedelta(hours=VERIFICATION_TOKEN_EXPIRE_HOURS)
    return create_access_token(
        data={
            "sub": str(user_id),
            "email": email,
            "type": "email_verification"
        },
        expires_delta=verification_expires
    )


def decode_verification_token(token: str) -> dict:
    """
    Decode and validate an email verification token.
    
    Args:
        token: JWT verification token
        
    Returns:
        dict: Decoded payload with user_id and email
        
    Raises:
        HTTPException: If token is invalid, expired, or wrong type
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Verify it's a verification token
        if payload.get("type") != "email_verification":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token type"
            )
        
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id is None or email is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token payload"
            )
        
        return {"user_id": user_id, "email": email}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency to get current authenticated user from JWT token.
    Use this in routes that require authentication.
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
        
    Returns:
        User: The authenticated user object
        
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Extract token from Bearer header
        token = credentials.credentials
        
        # Decode JWT token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Look up user in database
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    # Check if user account is active
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    
    return user


async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    FastAPI dependency that ensures user is both authenticated AND active.
    Use this instead of get_current_user for extra security.
    
    Args:
        current_user: User from get_current_user dependency
        
    Returns:
        User: The active user object
        
    Raises:
        HTTPException: If user account is suspended
    """
    if current_user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended"
        )
    return current_user


def validate_password_strength(password: str) -> bool:
    """
    Check if password meets minimum security requirements.
    Add more complex rules as needed.
    
    Args:
        password: Plain text password to validate
        
    Returns:
        bool: True if password is strong enough
    """
    # Basic validation - you can make this more complex
    if len(password) < 8:
        return False
    
    # TODO: Add more validation rules:
    # - Must contain uppercase and lowercase letters
    # - Must contain at least one number
    # - Must contain at least one special character
    # - Cannot be common passwords (check against list)
    
    return True


# Rate limiting helpers (for future implementation)
# TODO: Implement rate limiting for sensitive endpoints like login/register
# You can use Redis or in-memory storage for this

def check_rate_limit(identifier: str, max_attempts: int = 5, window_minutes: int = 15) -> bool:
    """
    TODO: Implement rate limiting for login attempts.
    
    Args:
        identifier: User identifier (email/IP) to rate limit
        max_attempts: Maximum attempts allowed in time window
        window_minutes: Time window in minutes
        
    Returns:
        bool: True if request is within rate limit
    """
    # Placeholder - implement with Redis or similar
    return True