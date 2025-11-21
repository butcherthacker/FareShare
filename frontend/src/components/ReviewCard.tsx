/**
 * Review Card Component
 * Displays a single review with reviewer info, rating, and comment
 */
import React from 'react';
import type { ReviewWithReviewer } from '../types/review';
import { StarRating } from './StarRating';

interface ReviewCardProps {
  review: ReviewWithReviewer;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div 
      className="bg-white rounded-lg p-4"
      style={{ border: '1px solid var(--color-secondary)' }}
    >
      {/* Reviewer Info */}
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {review.reviewer.avatar_url ? (
            <img
              src={review.reviewer.avatar_url}
              alt={review.reviewer.full_name}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            review.reviewer.full_name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-medium" style={{ color: 'var(--color-primary)' }}>
            {review.reviewer.full_name}
          </h4>
          <p className="text-sm text-gray-600">{formatDate(review.created_at)}</p>
        </div>
      </div>

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={review.rating} readonly size="sm" />
      </div>

      {/* Comment */}
      {review.comment && (
        <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
      )}
    </div>
  );
};
