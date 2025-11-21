/**
 * Review Form Modal Component
 * Modal for creating a new review after a completed ride
 */
import React, { useState } from 'react';
import type { ReviewCreate } from '../types/review';
import { useReviews } from '../hooks/useReviews';
import { StarRating } from './StarRating';
import { X, CheckCircle } from 'lucide-react';

interface ReviewFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  revieweeId: string;
  revieweeName: string;
  onSuccess?: () => void;
}

export const ReviewFormModal: React.FC<ReviewFormModalProps> = ({
  isOpen,
  onClose,
  rideId,
  revieweeId,
  revieweeName,
  onSuccess
}) => {
  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const { createReview, loading, error } = useReviews();
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      return;
    }

    const reviewData: ReviewCreate = {
      ride_id: rideId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim() || undefined
    };

    const result = await createReview(reviewData);
    if (result) {
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setRating(0);
      setComment('');
      setSuccess(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
        style={{ border: '2px solid var(--color-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
            Write a Review
          </h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              <CheckCircle size={32} className="text-white" />
            </div>
            <p className="text-lg font-medium" style={{ color: 'var(--color-primary)' }}>
              Review submitted successfully!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Reviewee Name */}
            <div className="mb-6">
              <p className="text-gray-700 text-center">
                How was your experience with <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>{revieweeName}</span>?
              </p>
            </div>

            {/* Star Rating */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--color-primary)' }}>
                Rating <span style={{ color: 'var(--color-accent)' }}>*</span>
              </label>
              <div className="flex justify-center">
                <StarRating rating={rating} onRatingChange={setRating} size="lg" />
              </div>
              {rating === 0 && (
                <p className="text-xs text-gray-500 text-center mt-2">Click to select a rating</p>
              )}
            </div>

            {/* Comment */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-primary)' }}>
                Comment (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={150}
                rows={4}
                className="w-full px-3 py-2 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 resize-none"
                style={{ 
                  border: '1px solid var(--color-secondary)',
                  '--tw-ring-color': 'var(--color-accent)'
                } as React.CSSProperties}
                placeholder="Share your experience..."
              />
              <p className="text-xs text-gray-500 mt-1 text-right">
                {comment.length}/150 characters
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm" style={{ 
                backgroundColor: 'rgba(252, 74, 26, 0.1)', 
                border: '1px solid var(--color-primary)',
                color: 'var(--color-primary)'
              }}>
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  border: '1px solid var(--color-secondary)',
                  backgroundColor: 'white',
                  color: 'var(--color-primary)'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rating === 0 || loading}
                className="flex-1 px-4 py-2 text-white rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {loading ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
