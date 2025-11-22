"""
Authentication Routes
Handles user registration, email verification, login, and logout endpoints.
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from email_validator import validate_email, EmailNotValidError
import logging

from src.config.db import get_db
from src.config.email import send_verification_email
from src.models.user import User
from src.schemas.user import UserRegister, UserLogin, Token, UserResponse
from src.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_verification_token,
    decode_verification_token,
    get_current_user,
    get_current_active_user,
    validate_password_strength,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    VERIFICATION_TOKEN_EXPIRE_HOURS
)
from pydantic import BaseModel, EmailStr

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


class ResendVerificationRequest(BaseModel):
    """Payload for requesting a new verification email without authentication."""
    email: EmailStr


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserRegister,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user account.
    
    Creates a new user with hashed password and sends verification email.
    Email must be unique across all users.
    """
    # Validate email format
    try:
        validate_email(user_data.email, check_deliverability=False)
    except EmailNotValidError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )
    
    # Check if email already exists
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered"
        )
    
    # Validate password strength
    if not validate_password_strength(user_data.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    # Create new user with pending verification status
    new_user = User(
        full_name=user_data.full_name.strip(),
        email=user_data.email.lower(),
        password_hash=get_password_hash(user_data.password),
        verification_status="pending"  # Will be set to "verified" after email verification
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate verification token
    verification_token = create_verification_token(
        user_id=str(new_user.id),
        email=new_user.email
    )
    
    # Send verification email in background
    background_tasks.add_task(
        send_verification_email,
        email=new_user.email,
        full_name=new_user.full_name,
        verification_token=verification_token
    )
    
    logger.info(f"New user registered: {new_user.email}")
    
    return new_user


@router.post("/login", response_model=Token)
async def login_user(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login user and return access token.
    
    Validates email/password and returns JWT token for authenticated requests.
    Requires email verification before allowing login.
    """
    # TODO: Implement rate limiting for login attempts

    # Find user by email
    result = await db.execute(
        select(User).where(User.email == credentials.email.lower())
    )
    user = result.scalar_one_or_none()
    
    # Check if user exists and password is correct
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    # Check if email is verified
    if user.verification_status != "verified":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email before logging in. Check the inbox associated with your sign-up email for the verification link."
        )
    
    # Check if account is suspended
    if user.status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact support."
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
    }

@router.post("/logout")
async def logout_user():
    """
    Logout user (optional endpoint).

    Since we're using stateless JWT tokens, logout is handled client-side
    by removing the token. This endpoint exists for completeness and
    future enhancements (like token blacklisting).

    TODO: Implement token blacklisting with Redis for enhanced security
    """

    return {
        "message": "Logout successful",
        "detail": "Remove token from client storage"
    }

@router.post("/verify-email")
async def verify_user_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify user's email address using token from verification email.

    Updates verification_status to "verified" and verification_method to "email".
    """
    # Decode and validate token
    token_data = decode_verification_token(token)
    user_id = token_data["user_id"]
    email = token_data["email"]
    
    # Find user
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify email matches
    if user.email != email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email mismatch"
        )
    
    # Check if already verified
    if user.verification_status == "verified" and user.verification_method == "email":
        return {
            "message": "Email already verified",
            "status": "success"
        }
    
    # Update verification status using existing fields
    user.verification_status = "verified"
    user.verification_method = "email"
    
    await db.commit()
    
    logger.info(f"Email verified for user: {user.email}")
    
    return {
        "message": "Email verified successfully",
        "status": "success"
    }


@router.post("/resend-verification")
async def resend_verification_email(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Resend verification email to current user.
    
    Allows users who didn't receive or lost their verification email to request a new one.
    """
    # Check if already verified
    if current_user.verification_status == "verified":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Generate new verification token
    verification_token = create_verification_token(
        user_id=str(current_user.id),
        email=current_user.email
    )
    
    # Send verification email in background
    background_tasks.add_task(
        send_verification_email,
        email=current_user.email,
        full_name=current_user.full_name,
        verification_token=verification_token
    )
    
    logger.info(f"Verification email resent to: {current_user.email}")
    
    return {
        "message": "Verification email sent",
        "status": "success"
    }


@router.post("/resend-verification-email")
async def resend_verification_email_public(
    payload: ResendVerificationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Allow users to request a new verification email by providing their email address."""
    result = await db.execute(
        select(User).where(User.email == payload.email.lower())
    )
    user = result.scalar_one_or_none()

    # Always respond with success to avoid revealing account existence
    generic_response = {
        "message": "If an account with that email exists, a verification email has been sent.",
        "status": "queued"
    }

    if not user:
        return generic_response

    if user.verification_status == "verified":
        return {
            "message": "This email has already been verified. You can sign in now.",
            "status": "already_verified"
        }

    verification_token = create_verification_token(
        user_id=str(user.id),
        email=user.email
    )

    background_tasks.add_task(
        send_verification_email,
        email=user.email,
        full_name=user.full_name,
        verification_token=verification_token
    )

    logger.info(f"Public verification email resent to: {user.email}")

    return generic_response


@router.get("/me", response_model=UserResponse)
async def get_authenticated_user(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user's profile.
    
    Returns the user profile for the authenticated user based on their JWT token.
    """
    return current_user
