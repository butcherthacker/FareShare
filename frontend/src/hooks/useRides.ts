/**
 * useRides Hook
 * Custom React hook for managing ride data and operations
 * Provides convenient access to ride API functions with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import type {
    Ride,
    RideCreateData,
    RideUpdateData,
    RideQueryParams,
    RideStatusUpdate,
} from '../types';
import {
    createRide as apiCreateRide,
    getRide as apiGetRide,
    listRides as apiListRides,
    updateRide as apiUpdateRide,
    deleteRide as apiDeleteRide,
    updateRideStatus as apiUpdateRideStatus,
} from '../utils/api';
import { useAuth } from './useAuth';

/**
 * Hook for managing rides
 * @param autoFetch - Whether to automatically fetch rides on mount (default: false)
 * @param initialParams - Initial query parameters for fetching rides
 */
export function useRides(autoFetch = false, initialParams?: RideQueryParams) {
    const { user } = useAuth();
    const [rides, setRides] = useState<Ride[]>([]);
    const [currentRide, setCurrentRide] = useState<Ride | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);

    /**
     * Fetch list of rides with optional filtering
     */
    const fetchRides = useCallback(async (params?: RideQueryParams) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await apiListRides(params);
            setRides(response.rides);
            setTotalPages(response.total_pages);
            setCurrentPage(response.page);
            setTotal(response.total);
        } catch (err: any) {
            setError(err.detail || 'Failed to fetch rides');
            console.error('Error fetching rides:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Fetch a specific ride by ID
     */
    const fetchRide = useCallback(async (rideId: string) => {
        setIsLoading(true);
        setError(null);

        try {
            const ride = await apiGetRide(rideId);
            setCurrentRide(ride);
            return ride;
        } catch (err: any) {
            setError(err.detail || 'Failed to fetch ride');
            console.error('Error fetching ride:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Create a new ride (offer or request)
     */
    const createRide = useCallback(async (data: RideCreateData): Promise<Ride | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const newRide = await apiCreateRide(data);

            // Add to local state if we have rides loaded
            setRides(prevRides => [newRide, ...prevRides]);

            return newRide;
        } catch (err: any) {
            setError(err.detail || 'Failed to create ride');
            console.error('Error creating ride:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Update an existing ride
     */
    const updateRide = useCallback(async (
        rideId: string,
        data: RideUpdateData
    ): Promise<Ride | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const updatedRide = await apiUpdateRide(rideId, data);

            // Update in local state
            setRides(prevRides =>
                prevRides.map(ride => (ride.id === rideId ? updatedRide : ride))
            );

            // Update current ride if it's the one we updated
            if (currentRide?.id === rideId) {
                setCurrentRide(updatedRide);
            }

            return updatedRide;
        } catch (err: any) {
            setError(err.detail || 'Failed to update ride');
            console.error('Error updating ride:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentRide]);

    /**
     * Delete/cancel a ride
     */
    const deleteRide = useCallback(async (rideId: string): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            await apiDeleteRide(rideId);

            // Remove from local state
            setRides(prevRides => prevRides.filter(ride => ride.id !== rideId));

            // Clear current ride if it's the one we deleted
            if (currentRide?.id === rideId) {
                setCurrentRide(null);
            }

            return true;
        } catch (err: any) {
            setError(err.detail || 'Failed to delete ride');
            console.error('Error deleting ride:', err);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [currentRide]);

    /**
     * Update ride status (cancel or complete)
     */
    const updateStatus = useCallback(async (
        rideId: string,
        status: RideStatusUpdate
    ): Promise<Ride | null> => {
        setIsLoading(true);
        setError(null);

        try {
            const updatedRide = await apiUpdateRideStatus(rideId, status);

            // Update in local state
            setRides(prevRides =>
                prevRides.map(ride => (ride.id === rideId ? updatedRide : ride))
            );

            // Update current ride if it's the one we updated
            if (currentRide?.id === rideId) {
                setCurrentRide(updatedRide);
            }

            return updatedRide;
        } catch (err: any) {
            setError(err.detail || 'Failed to update ride status');
            console.error('Error updating ride status:', err);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [currentRide]);

    /**
     * Get rides posted by the current user
     * @param params - Query parameters
     * @param silent - If true, don't set error state on failure (for background fetches)
     */
    const fetchMyRides = useCallback(async (params?: RideQueryParams, silent = false) => {
        if (!user) {
            // Don't set error - just silently return if not logged in
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiListRides(params);

            // Filter to only rides posted by current user
            const myRides = response.rides.filter(ride => ride.driver_id === user.id);

            setRides(myRides);
            setTotal(myRides.length);
            // TODO: Update pagination once backend supports filtering by user
            setTotalPages(Math.ceil(myRides.length / (params?.page_size || 20)));
            setCurrentPage(params?.page || 1);
        } catch (err: any) {
            // Only set error if not in silent mode
            if (!silent) {
                const errorMessage = err.detail || err.message || 'Failed to fetch your rides';
                setError(errorMessage);
            }
            console.log('Error fetching user rides:', err);
            // Set empty rides array on error
            setRides([]);
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
            fetchRides(initialParams);
        }
    }, [autoFetch, fetchRides, initialParams]);

    return {
        // State
        rides,
        currentRide,
        isLoading,
        error,
        totalPages,
        currentPage,
        total,

        // Actions
        fetchRides,
        fetchRide,
        createRide,
        updateRide,
        deleteRide,
        updateStatus,
        fetchMyRides,

        // Utility
        clearError: () => setError(null),
    };
}
