/**
 * API Utility Functions
 * Centralized API client for making authenticated requests to the backend
 */

import type { ApiError } from '../types';

// Backend API base URL - configured via environment variable
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

/**
 * Custom error class for API errors
 * Provides structured error handling with status codes and messages
 */
export class ApiClientError extends Error {
    statusCode: number;
    detail: string;
    errorCode?: string;

    constructor(
        statusCode: number,
        detail: string,
        errorCode?: string
    ) {
        super(detail);
        this.name = 'ApiClientError';
        this.statusCode = statusCode;
        this.detail = detail;
        this.errorCode = errorCode;
    }
}

/**
 * Get authentication token from localStorage
 * @returns JWT token or null if not logged in
 */
export function getAuthToken(): string | null {
    return localStorage.getItem('fareshare_token');
}

/**
 * Save authentication token to localStorage
 * @param token - JWT access token
 */
export function setAuthToken(token: string): void {
    localStorage.setItem('fareshare_token', token);
}

/**
 * Remove authentication token from localStorage
 * Called during logout
 */
export function removeAuthToken(): void {
    localStorage.removeItem('fareshare_token');
}

/**
 * Make an authenticated API request
 * Automatically includes JWT token in Authorization header if available
 * 
 * @param endpoint - API endpoint path (e.g., '/api/users')
 * @param options - Fetch options (method, body, headers, etc.)
 * @returns Parsed JSON response
 * @throws ApiClientError if request fails
 */
export async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    // Construct full URL
    const url = `${API_BASE_URL}${endpoint}`;

    // Get auth token if available
    const token = getAuthToken();

    // Prepare headers
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add custom headers from options
    if (options.headers) {
        Object.assign(headers, options.headers);
    }

    // Add Authorization header if token exists
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        // Make the request
        const response = await fetch(url, {
            ...options,
            headers,
        });

        console.log('API Request:', {
            url,
            method: options.method || 'GET',
            status: response.status,
            ok: response.ok
        });

        // Handle 204 No Content - no body to parse
        if (response.status === 204) {
            return undefined as T;
        }

        // Parse response body
        let data: any;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            // For non-JSON responses, try to read as text
            const text = await response.text();
            data = text || undefined;
        }

        // Handle error responses
        if (!response.ok) {
            // If we got an error but no data, create a generic error
            if (!data) {
                throw new ApiClientError(
                    response.status,
                    `Request failed with status ${response.status}`,
                    undefined
                );
            }

            const error: ApiError = typeof data === 'string' ? { detail: data } : data;
            throw new ApiClientError(
                response.status,
                error.detail || 'An error occurred',
                error.error_code
            );
        }

        return data as T;
    } catch (error) {
        console.error('API Request Error:', {
            url,
            error,
            errorType: error instanceof TypeError ? 'TypeError (Network)' : error instanceof ApiClientError ? 'ApiClientError' : 'Other'
        });

        // Re-throw ApiClientError as-is
        if (error instanceof ApiClientError) {
            throw error;
        }

        // Handle network errors
        if (error instanceof TypeError) {
            throw new ApiClientError(
                0,
                'Network error. Please check your connection and try again.'
            );
        }

        // Handle other errors
        throw new ApiClientError(
            500,
            'An unexpected error occurred. Please try again.'
        );
    }
}

/**
 * Convenience method for GET requests
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost<T>(
    endpoint: string,
    data?: any
): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Convenience method for PUT requests
 */
export async function apiPut<T>(
    endpoint: string,
    data?: any
): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch<T>(
    endpoint: string,
    data?: any
): Promise<T> {
    return apiRequest<T>(endpoint, {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete<T>(endpoint: string): Promise<T> {
    return apiRequest<T>(endpoint, { method: 'DELETE' });
}

// ===== RIDE API FUNCTIONS =====

import type {
    Ride,
    RideCreateData,
    RideUpdateData,
    RideListResponse,
    RideQueryParams,
    RideStatusUpdate,
} from '../types';

import type { SearchResponse } from '../types';

/**
 * Create a new ride offer or request
 * @param data - Ride creation data
 * @returns Created ride
 */
export async function createRide(data: RideCreateData): Promise<Ride> {
    return apiPost<Ride>('/api/rides', data);
}

/**
 * Get a specific ride by ID
 * @param rideId - UUID of the ride
 * @returns Ride details
 */
export async function getRide(rideId: string): Promise<Ride> {
    return apiGet<Ride>(`/api/rides/${rideId}`);
}

/**
 * List rides with optional filtering and pagination
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated list of rides
 */
export async function listRides(params?: RideQueryParams): Promise<RideListResponse> {
    // Build query string from params
    const queryParams = new URLSearchParams();

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/rides?${queryString}` : '/api/rides';

    return apiGet<RideListResponse>(endpoint);
}

/**
 * Update an existing ride
 * @param rideId - UUID of the ride to update
 * @param data - Fields to update
 * @returns Updated ride
 */
export async function updateRide(rideId: string, data: RideUpdateData): Promise<Ride> {
    return apiPatch<Ride>(`/api/rides/${rideId}`, data);
}

/**
 * Delete/cancel a ride
 * @param rideId - UUID of the ride to delete
 */
export async function deleteRide(rideId: string): Promise<void> {
    return apiDelete<void>(`/api/rides/${rideId}`);
}

/**
 * Update ride status (cancel or complete)
 * @param rideId - UUID of the ride
 * @param status - New status
 * @returns Updated ride
 */
export async function updateRideStatus(
    rideId: string,
    status: RideStatusUpdate
): Promise<Ride> {
    return apiPatch<Ride>(`/api/rides/${rideId}/status`, status);
}

/**
 * Get rides posted by the current user
 * @param params - Optional query parameters
 * @returns List of user's rides
 */
export async function getMyRides(params?: RideQueryParams): Promise<RideListResponse> {
    // TODO: Update this once backend implements a dedicated /rides/my endpoint
    // For now, we'll need to filter client-side by driver_id after fetching
    return listRides(params);
}

/**
 * Search rides using lightweight filters (backend: GET /api/rides/search)
 * Accepts query params similar to backend docs and returns a SearchResponse
 */
export async function searchRides(params?: Record<string, any>): Promise<SearchResponse> {
    const qp = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== "") {
                qp.append(k, String(v));
            }
        });
    }

    const qs = qp.toString();
    const endpoint = qs ? `/api/rides/search?${qs}` : '/api/rides/search';

    return apiGet<SearchResponse>(endpoint);
}

// ===== BOOKING API FUNCTIONS =====

import type {
    Booking,
    BookingCreateData,
    BookingStatusUpdate,
    BookingListResponse,
    BookingStats,
    BookingQueryParams,
} from '../types';

/**
 * Create a new booking (claim seats in a ride)
 * @param data - Booking creation data
 * @returns Created booking
 */
export async function createBooking(data: BookingCreateData): Promise<Booking> {
    return apiPost<Booking>('/api/bookings', data);
}

/**
 * Get a specific booking by ID
 * @param bookingId - UUID of the booking
 * @returns Booking details
 */
export async function getBooking(bookingId: string): Promise<Booking> {
    return apiGet<Booking>(`/api/bookings/${bookingId}`);
}

/**
 * List bookings with optional filtering and pagination
 * @param params - Query parameters for filtering and pagination
 * @returns Paginated list of bookings
 */
export async function listBookings(params?: BookingQueryParams): Promise<BookingListResponse> {
    // Build query string from params
    const queryParams = new URLSearchParams();

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                queryParams.append(key, String(value));
            }
        });
    }

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/api/bookings?${queryString}` : '/api/bookings';

    return apiGet<BookingListResponse>(endpoint);
}

/**
 * Update booking status
 * @param bookingId - UUID of the booking
 * @param status - New status
 * @returns Updated booking
 */
export async function updateBookingStatus(
    bookingId: string,
    status: BookingStatusUpdate
): Promise<Booking> {
    return apiPatch<Booking>(`/api/bookings/${bookingId}/status`, status);
}

/**
 * Cancel a booking
 * @param bookingId - UUID of the booking to cancel
 */
export async function cancelBooking(bookingId: string): Promise<void> {
    return apiDelete<void>(`/api/bookings/${bookingId}`);
}

/**
 * Get booking statistics for the current user
 * @returns Booking statistics
 */
export async function getBookingStats(): Promise<BookingStats> {
    return apiGet<BookingStats>('/api/bookings/stats/summary');
}
