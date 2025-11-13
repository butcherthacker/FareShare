"""
User Profile Routes
Handles user profile management, password changes, avatar uploads, and privacy actions.
"""
import os
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from email_validator import validate_email, EmailNotValidError

from src.config.db import get_db
from src.models.user import User
from src.schemas.user import (
    UserResponse, UserProfileUpdate, UserPasswordChange,
    AvatarUploadResponse, PrivacyResponse
)
from src.auth import (
    get_current_active_user, 
    verify_password, 
    get_password_hash,
    validate_password_strength
)

router = APIRouter(prefix="/users", tags=["User Profile"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user's profile information.
    
    Returns complete user profile including avatar URL, vehicle info,
    and verification status. Used by User Settings page and header.
    """
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user profile information.
    
    Allows updating name and email.
    Email changes may require re-verification in the future.
    """
    # Check if email is being changed and if it's already taken
    if profile_data.email and profile_data.email.lower() != current_user.email:
        # Validate new email format
        try:
            # Use check_deliverability=False for development to allow example.com
            validate_email(profile_data.email, check_deliverability=False)
        except EmailNotValidError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Check if new email is already in use
        from sqlalchemy import select
        result = await db.execute(
            select(User).where(User.email == profile_data.email.lower())
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address is already in use"
            )
        
        # Update email and mark for re-verification
        current_user.email = profile_data.email.lower()
        # TODO: When email verification is implemented, set verification_status to "pending"
    
    # Update other profile fields
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name
    # Vehicle information is now stored on rides; user profile no longer stores vehicle fields
    
    # Save changes
    await db.commit()
    await db.refresh(current_user)
    
    return current_user


@router.patch("/me/password")
async def change_user_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change user's password.
    
    Requires current password for verification and new password
    that meets security requirements.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password strength
    if not validate_password_strength(password_data.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password does not meet security requirements"
        )
    
    # Check that new password is different from current
    if verify_password(password_data.new_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password"
        )
    
    # Hash and save new password
    current_user.password_hash = get_password_hash(password_data.new_password)
    await db.commit()
    
    return {
        "message": "Password changed successfully"
    }


@router.post("/me/avatar", response_model=AvatarUploadResponse)
async def upload_user_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload user avatar image.
    
    Accepts image files and stores them with generated filenames.
    Returns the URL to access the uploaded image.
    """
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG, PNG, GIF, and WebP images are allowed"
        )
    
    # Validate file size (5MB max)
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    file_content = await file.read()
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size must be less than 5MB"
        )
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    unique_filename = f"avatar_{current_user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
    
    # Create uploads directory if it doesn't exist
    uploads_dir = "uploads/avatars"
    os.makedirs(uploads_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(uploads_dir, unique_filename)
    with open(file_path, "wb") as f:
        f.write(file_content)
    
    # Update user's avatar URL
    # In production, this would be a full URL to your CDN/cloud storage
    avatar_url = f"/uploads/avatars/{unique_filename}"
    current_user.avatar_url = avatar_url
    
    await db.commit()
    
    return AvatarUploadResponse(
        avatar_url=avatar_url,
        message="Avatar uploaded successfully"
    )


@router.post("/me/export", response_model=PrivacyResponse)
async def export_user_data(
    current_user: User = Depends(get_current_active_user)
):
    """
    Request export of all user data.
    
    Enqueues a data export job that will compile all user data
    into a downloadable format (GDPR compliance).
    
    TODO: Implement actual data export with background job processing
    """
    # Generate a request ID for tracking
    request_id = f"export_{current_user.id}_{uuid.uuid4().hex[:8]}"
    
    # TODO: Implement actual data export logic
    # - Queue background job to compile user data
    # - Include: profile, rides, bookings, reviews, etc.
    # - Generate downloadable ZIP file
    # - Send email notification when ready
    
    return PrivacyResponse(
        message="Data export request submitted. You will receive an email when your data is ready for download.",
        request_id=request_id,
        status="queued"
    )


@router.post("/me/delete", response_model=PrivacyResponse)
async def request_account_deletion(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Request account deletion.
    
    Soft-deletes the account or queues it for deletion.
    For compliance and data integrity, accounts may not be
    immediately deleted if they have active bookings.
    
    TODO: Implement proper account deletion logic
    """
    # Check for active bookings/rides that prevent deletion
    # TODO: Query for active bookings or recent rides
    
    # For now, just mark account as suspended
    # In production, you might:
    # - Set deletion_requested_at timestamp
    # - Queue background job for actual deletion
    # - Send confirmation email
    # - Implement grace period for cancellation
    
    current_user.status = "suspended"  # Soft delete
    await db.commit()
    
    return PrivacyResponse(
        message="Account deletion request submitted. Your account has been deactivated and will be permanently deleted within 30 days.",
        status="queued"
    )