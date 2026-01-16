/**
 * useIncidents Hook
 * React hook for managing incident reports
 */

import { useState, useCallback } from 'react';
import { createIncident, getMyIncidents, getIncident } from '../utils/api';
import type { 
    Incident, 
    IncidentListResponse, 
    CreateIncidentRequest, 
    IncidentStatus 
} from '../types';

interface UseIncidentsReturn {
    incidents: Incident[];
    loading: boolean;
    error: string | null;
    createReport: (incidentData: CreateIncidentRequest) => Promise<Incident | null>;
    fetchMyIncidents: (params?: { page?: number; limit?: number; status?: IncidentStatus }) => Promise<void>;
    fetchIncident: (incidentId: string) => Promise<Incident | null>;
    clearError: () => void;
}

/**
 * Hook for managing incident reports
 * Provides functions to create and fetch incident reports
 */
export function useIncidents(): UseIncidentsReturn {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Clear any existing error
     */
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    /**
     * Create a new incident report
     */
    const createReport = useCallback(async (incidentData: CreateIncidentRequest): Promise<Incident | null> => {
        setLoading(true);
        setError(null);

        try {
            console.log('[DEBUG] Creating incident with data:', incidentData);
            const newIncident = await createIncident(incidentData);
            console.log('[DEBUG] Incident created successfully:', newIncident);
            
            // Add to local state
            setIncidents(prev => [newIncident, ...prev]);
            
            return newIncident;
        } catch (err: any) {
            console.error('[DEBUG] Full error object:', err);
            console.error('[DEBUG] Error detail:', err.detail);
            console.error('[DEBUG] Error message:', err.message);
            console.error('[DEBUG] Error status:', err.statusCode);
            const errorMessage = err.detail || err.message || 'Failed to create incident report';
            setError(errorMessage);
            console.error('Error creating incident report:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Fetch all incidents involving the current user
     */
    const fetchMyIncidents = useCallback(async (params?: { 
        page?: number; 
        limit?: number; 
        status?: IncidentStatus 
    }): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            const response: IncidentListResponse = await getMyIncidents(params);
            setIncidents(response.incidents);
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to fetch incidents';
            setError(errorMessage);
            console.error('Error fetching incidents:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Fetch a specific incident by ID
     */
    const fetchIncident = useCallback(async (incidentId: string): Promise<Incident | null> => {
        setLoading(true);
        setError(null);

        try {
            const incident = await getIncident(incidentId);
            return incident;
        } catch (err: any) {
            const errorMessage = err.detail || err.message || 'Failed to fetch incident';
            setError(errorMessage);
            console.error('Error fetching incident:', err);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        incidents,
        loading,
        error,
        createReport,
        fetchMyIncidents,
        fetchIncident,
        clearError,
    };
}
