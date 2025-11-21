"""
Review Routes
Handles review and rating endpoints for mutual feedback between drivers and passengers.
"""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config.db import get_db
from src.models.review import Review
from src.models.ride import Ride
from src.models.booking import Booking
from src.models.user import User
from src.schemas.review import (
    ReviewCreate, 
    ReviewResponse, 
    ReviewWithReviewer,
    PaginatedReviewsResponse
)
from src.auth import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new review after a completed ride.
    
    Requirements:
    - Reviewer must be authenticated and verified
    - Ride must exist and be completed
    - Reviewer must be a participant (driver or passenger) of the ride
    - Reviewee must be a participant of the ride (not the reviewer)
    - No duplicate reviews (same reviewer→reviewee for same ride)
    """
    
    # 1. Verify user is verified (basic verification check)
    # Note: Assuming verification_status field exists on User model
    if hasattr(current_user, 'verification_status') and current_user.verification_status != 'verified':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only verified users can leave reviews"
        )
    
    # 2. Fetch the ride with relationships
    ride_query = select(Ride).where(Ride.id == review_data.ride_id).options(
        selectinload(Ride.bookings)
    )
    ride_result = await db.execute(ride_query)
    ride = ride_result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )
    
    # 3. Check if reviewer has a completed booking for this ride
    # (Either as driver with any completed booking, or as passenger with their own completed booking)
    has_completed_booking = False
    
    if ride.driver_id == current_user.id:
        # Driver: check if any booking is completed
        has_completed_booking = any(
            booking.status == 'completed' 
            for booking in ride.bookings
        )
    else:
        # Passenger: check if their specific booking is completed
        has_completed_booking = any(
            booking.passenger_id == current_user.id and booking.status == 'completed'
            for booking in ride.bookings
        )
    
    if not has_completed_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reviews can only be written for completed rides. Please mark the booking as completed first."
        )
    
    # 4. Prevent self-review
    if current_user.id == review_data.reviewee_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot review yourself"
        )
    
    # 5. Check if reviewer is a participant (driver or passenger with confirmed booking)
    is_driver = (ride.driver_id == current_user.id)
    
    # Check if current user has a confirmed/completed booking
    passenger_ids = [
        booking.passenger_id 
        for booking in ride.bookings 
        if booking.status in ['confirmed', 'completed']
    ]
    is_passenger = current_user.id in passenger_ids
    
    if not (is_driver or is_passenger):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only ride participants can leave reviews"
        )
    
    # 6. Check if reviewee is a participant
    reviewee_is_driver = (ride.driver_id == review_data.reviewee_id)
    reviewee_is_passenger = review_data.reviewee_id in passenger_ids
    
    if not (reviewee_is_driver or reviewee_is_passenger):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only review other participants of this ride"
        )
    
    # 7. Check for duplicate review
    duplicate_check = select(Review).where(
        and_(
            Review.ride_id == review_data.ride_id,
            Review.reviewer_id == current_user.id,
            Review.reviewee_id == review_data.reviewee_id
        )
    )
    duplicate_result = await db.execute(duplicate_check)
    existing_review = duplicate_result.scalar_one_or_none()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this user for this ride"
        )
    
    # 8. Create the review
    new_review = Review(
        ride_id=review_data.ride_id,
        reviewer_id=current_user.id,
        reviewee_id=review_data.reviewee_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    
    db.add(new_review)
    
    # 9. Update reviewee's rating statistics
    # Calculate new average and count
    reviewee_query = select(User).where(User.id == review_data.reviewee_id)
    reviewee_result = await db.execute(reviewee_query)
    reviewee = reviewee_result.scalar_one_or_none()
    
    if reviewee:
        # Calculate new rating average
        current_total = reviewee.rating_avg * reviewee.rating_count
        new_count = reviewee.rating_count + 1
        new_avg = (current_total + review_data.rating) / new_count
        
        reviewee.rating_avg = round(new_avg, 2)
        reviewee.rating_count = new_count
    
    # 10. Commit the transaction
    await db.commit()
    await db.refresh(new_review)
    
    return new_review


@router.get("/users/{user_id}", response_model=PaginatedReviewsResponse)
async def get_user_reviews(
    user_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=50, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated reviews received by a specific user.
    
    This is a public endpoint that shows reviews about a user.
    Useful for profile pages and trust building.
    """
    
    # 1. Check if user exists
    user_query = select(User).where(User.id == user_id)
    user_result = await db.execute(user_query)
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # 2. Get total count
    count_query = select(func.count()).select_from(Review).where(
        Review.reviewee_id == user_id
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar()
    
    # 3. Calculate pagination
    total_pages = (total + page_size - 1) // page_size
    offset = (page - 1) * page_size
    
    # 4. Fetch reviews with reviewer info
    reviews_query = (
        select(Review)
        .where(Review.reviewee_id == user_id)
        .options(selectinload(Review.reviewer))
        .order_by(Review.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    
    reviews_result = await db.execute(reviews_query)
    reviews = reviews_result.scalars().all()
    
    # 5. Format response
    reviews_with_reviewer = [
        ReviewWithReviewer(
            id=review.id,
            ride_id=review.ride_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            reviewer={
                "id": review.reviewer.id,
                "full_name": review.reviewer.full_name,
                "avatar_url": review.reviewer.avatar_url
            }
        )
        for review in reviews
    ]
    
    return PaginatedReviewsResponse(
        reviews=reviews_with_reviewer,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/rides/{ride_id}", response_model=list[ReviewWithReviewer])
async def get_ride_reviews(
    ride_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all reviews for a specific ride.
    
    Optional endpoint useful for trip history pages.
    Shows mutual feedback between ride participants.
    """
    
    # 1. Check if ride exists
    ride_query = select(Ride).where(Ride.id == ride_id)
    ride_result = await db.execute(ride_query)
    ride = ride_result.scalar_one_or_none()
    
    if not ride:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ride not found"
        )
    
    # 2. Fetch all reviews for this ride with reviewer info
    reviews_query = (
        select(Review)
        .where(Review.ride_id == ride_id)
        .options(selectinload(Review.reviewer))
        .order_by(Review.created_at.desc())
    )
    
    reviews_result = await db.execute(reviews_query)
    reviews = reviews_result.scalars().all()
    
    # 3. Format response
    reviews_with_reviewer = [
        ReviewWithReviewer(
            id=review.id,
            ride_id=review.ride_id,
            rating=review.rating,
            comment=review.comment,
            created_at=review.created_at,
            reviewer={
                "id": review.reviewer.id,
                "full_name": review.reviewer.full_name,
                "avatar_url": review.reviewer.avatar_url
            }
        )
        for review in reviews
    ]
    
    return reviews_with_reviewer
