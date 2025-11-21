/**
 * Review Types
 * TypeScript interfaces for the review and rating system
 */

export interface ReviewCreate {
  ride_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewerInfo {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export interface Review {
  id: string;
  ride_id: string;
  reviewer_id: string;
  reviewee_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface ReviewWithReviewer {
  id: string;
  ride_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  reviewer: ReviewerInfo;
}

export interface PaginatedReviews {
  reviews: ReviewWithReviewer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ReviewStats {
  rating_avg: number;
  rating_count: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
}
