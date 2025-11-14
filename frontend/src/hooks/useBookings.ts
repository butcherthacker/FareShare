/**
 * useBookings Hook
 * Custom React hook for managing booking data and operations
 * Provides convenient access to booking API functions with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import type {
    Booking,
    BookingCreateData,
    BookingStatusUpdate,
    BookingQueryParams,
    BookingStats,
} from '../types';
import {
    createBooking as apiCreateBooking,
    getBooking as apiGetBooking,
    listBookings as apiListBookings,
    updateBookingStatus as apiUpdateBookingStatus,
    cancelBooking as apiCancelBooking,
    getBookingStats as apiGetBookingStats,
} from '../utils/api';
import { useAuth } from './useAuth';

/**
 * Hook for managing bookings
 * @param autoFetch - Whether to automatically fetch bookings on mount (default: false)
 * @param initialParams - Initial query parameters for fetching bookings
 */
export function useBookings(autoFetch = false, initialParams?: BookingQueryParams) {
    const { user } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
    const [stats, setStats] = useState<BookingStats | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);

    /**
     * Fetch list of bookings with optional filtering
     */
    const fetchBookings = useCallback(async (params?: BookingQueryParams) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiListBookings(params);
            setBookings(response.bookings);
            setTotalPages(response.total_pages);
            setCurrentPage(response.page);
            setTotal(response.total);
        } catch (err: any) {
            setError(err.detail || 'Failed to fetch bookings');
            console.error('Error fetching bookings:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch a specific booking by ID
     */
    const fetchBooking = useCallback(async (bookingId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const booking = await apiGetBooking(bookingId);
            setCurrentBooking(booking);
            return booking;
        } catch (err: any) {
            setError(err.detail || 'Failed to fetch booking');
            console.error('Error fetching booking:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Create a new booking (claim seats)
     */
    const createBooking = useCallback(async (data: BookingCreateData): Promise<Booking | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const newBooking = await apiCreateBooking(data);

            // Add to local state if we have bookings loaded
            setBookings(prevBookings => [newBooking, ...prevBookings]);

            return newBooking;
        } catch (err: any) {
            setError(err.detail || 'Failed to create booking');
            console.error('Error creating booking:', err);
            throw err; // Re-throw so caller can handle
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Update booking status
     */
    const updateStatus = useCallback(async (
        bookingId: string,
        status: BookingStatusUpdate
    ): Promise<Booking | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const updatedBooking = await apiUpdateBookingStatus(bookingId, status);

            // Update in local state
            setBookings(prevBookings =>
                prevBookings.map(booking =>
                    booking.id === bookingId ? updatedBooking : booking
                )
            );

            // Update current booking if it's the one we updated
            if (currentBooking?.id === bookingId) {
                setCurrentBooking(updatedBooking);
            }

            return updatedBooking;
        } catch (err: any) {
            setError(err.detail || 'Failed to update booking status');
            console.error('Error updating booking status:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentBooking]);

    /**
     * Cancel a booking
     */
    const cancelBooking = useCallback(async (bookingId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await apiCancelBooking(bookingId);

            // Update in local state (mark as cancelled)
            setBookings(prevBookings =>
                prevBookings.map(booking =>
                    booking.id === bookingId
                        ? { ...booking, status: 'cancelled' as const }
                        : booking
                )
            );

            // Update current booking if it's the one we cancelled
            if (currentBooking?.id === bookingId) {
                setCurrentBooking({ ...currentBooking, status: 'cancelled' });
            }

            return true;
        } catch (err: any) {
            setError(err.detail || 'Failed to cancel booking');
            console.error('Error cancelling booking:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentBooking]);

    /**
     * Fetch booking statistics
     */
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const bookingStats = await apiGetBookingStats();
            setStats(bookingStats);
            return bookingStats;
        } catch (err: any) {
            setError(err.detail || 'Failed to fetch booking stats');
            console.error('Error fetching booking stats:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch bookings for the current user (as passenger or driver)
     * @param role - Filter by role ('passenger' or 'driver')
     * @param silent - If true, don't set error state on failure (for background fetches)
     */
    const fetchMyBookings = useCallback(async (
        role?: 'passenger' | 'driver',
        silent = false
    ) => {
        if (!user) {
            // Don't set error - just silently return if not logged in
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params: BookingQueryParams = { role };
            const response = await apiListBookings(params);

            setBookings(response.bookings);
            setTotal(response.total);
            setTotalPages(response.total_pages);
            setCurrentPage(response.page);
        } catch (err: any) {
            // Only set error if not in silent mode
            if (!silent) {
                const errorMessage = err.detail || err.message || 'Failed to fetch your bookings';
                setError(errorMessage);
            }
            console.log('Error fetching user bookings:', err);
            // Set empty bookings array on error
            setBookings([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    /**
     * Auto-fetch on mount if enabled
     */
    useEffect(() => {
        if (autoFetch) {
            fetchBookings(initialParams);
        }
    }, [autoFetch, fetchBookings, initialParams]);

    return {
        // State
        bookings,
        currentBooking,
        stats,
        isLoading,
        error,
        totalPages,
        currentPage,
        total,

        // Actions
        fetchBookings,
        fetchBooking,
        createBooking,
        updateStatus,
        cancelBooking,
        fetchStats,
        fetchMyBookings,

        // Utility
        clearError: () => setError(null),
    };
}
