/**
 * Review Hooks
 * Custom hooks for review and rating operations
 */
import { useState } from 'react';
import type { ReviewCreate, PaginatedReviews, ReviewWithReviewer } from '../types/review';
import { apiRequest } from '../utils/api';

export const useReviews = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create a new review
   */
  const createReview = async (reviewData: ReviewCreate): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(reviewData)
      });
      return true;
    } catch (err: any) {
      const errorMsg = err.detail || 'Failed to submit review';
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch reviews for a specific user
   */
  const getUserReviews = async (
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PaginatedReviews | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<PaginatedReviews>(
        `/api/reviews/users/${userId}?page=${page}&page_size=${pageSize}`
      );
      return data;
    } catch (err: any) {
      const errorMsg = err.detail || 'Failed to fetch reviews';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch reviews for a specific ride
   */
  const getRideReviews = async (rideId: string): Promise<ReviewWithReviewer[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<ReviewWithReviewer[]>(`/api/reviews/rides/${rideId}`);
      return data;
    } catch (err: any) {
      const errorMsg = err.detail || 'Failed to fetch ride reviews';
      setError(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    createReview,
    getUserReviews,
    getRideReviews,
    loading,
    error
  };
};
