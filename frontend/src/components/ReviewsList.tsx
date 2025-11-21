/**
 * Reviews List Component
 * Displays a paginated list of reviews
 */
import React, { useEffect, useState } from 'react';
import { useReviews } from '../hooks/useReviews';
import type { PaginatedReviews } from '../types/review';
import { ReviewCard } from './ReviewCard';

interface ReviewsListProps {
  userId: string;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ userId }) => {
  const [reviews, setReviews] = useState<PaginatedReviews | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { getUserReviews, loading } = useReviews();

  useEffect(() => {
    loadReviews(currentPage);
  }, [userId, currentPage]);

  const loadReviews = async (page: number) => {
    const data = await getUserReviews(userId, page, 10);
    if (data) {
      setReviews(data);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (reviews && currentPage < reviews.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading && !reviews) {
    return (
      <div className="flex justify-center items-center py-12">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2"
          style={{ borderColor: 'var(--color-accent)' }}
        ></div>
      </div>
    );
  }

  if (!reviews || reviews.total === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 mx-auto mb-4"
          style={{ color: 'var(--color-secondary)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <p className="text-gray-600">No reviews yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* Reviews Count */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Reviews ({reviews.total})
        </h3>
      </div>

      {/* Reviews Grid */}
      <div className="space-y-4 mb-6">
        {reviews.reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>

      {/* Pagination */}
      {reviews.total_pages > 1 && (
        <div className="flex justify-between items-center">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="px-4 py-2 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Previous
          </button>
          <span className="text-gray-600">
            Page {currentPage} of {reviews.total_pages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= reviews.total_pages}
            className="px-4 py-2 text-white rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
