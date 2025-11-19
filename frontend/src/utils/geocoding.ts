/**
 * Geocoding Utilities
 * 
 * Provides functions to convert addresses to GPS coordinates and vice versa
 * using the OpenStreetMap Nominatim API through our backend proxy.
 * 
 * The backend proxy (/api/geo) handles:
 * - Rate limiting to prevent abuse
 * - CORS issues when calling Nominatim from browser
 * - Response normalization for consistent data
 */

import { apiGet } from './api';

/**
 * Single geocoding result from the geocode endpoint
 */
export interface GeocodingResult {
    label: string;              // Short human-readable name
    lat: number;                // Latitude coordinate (-90 to 90)
    lon: number;                // Longitude coordinate (-180 to 180)
    display_name: string;       // Full formatted address
    place_type?: string | null; // Type of place (city, road, etc.)
    importance?: number | null; // Relevance score (0-1, higher is better)
}

/**
 * Response from the geocode endpoint
 */
export interface GeocodingResponse {
    results: GeocodingResult[];
    query: string;
    count: number;
}

/**
 * Reverse geocoding result (coordinates to address)
 */
export interface ReverseGeocodingResult {
    label: string;         // Short human-readable address
    lat: number;          // Latitude coordinate
    lon: number;          // Longitude coordinate
    display_name: string; // Full formatted address
    address: Record<string, string>; // Structured address components
}

/**
 * Convert an address or place name to GPS coordinates
 * 
 * @param query - Address or place name to search for (e.g., "Toronto, Canada")
 * @param limit - Maximum number of results to return (default: 5, max: 10)
 * @param countryCode - Optional ISO country code to limit results (e.g., "ca")
 * @returns Array of matching locations with coordinates
 * @throws ApiClientError if geocoding fails
 * 
 * @example
 * ```typescript
 * const results = await geocodeAddress("123 Main St, Toronto");
 * if (results.length > 0) {
 *   const { lat, lon } = results[0];
 *   console.log(`Coordinates: ${lat}, ${lon}`);
 * }
 * ```
 */
export async function geocodeAddress(
    query: string,
    limit: number = 5,
    countryCode?: string
): Promise<GeocodingResult[]> {
    // Build query parameters
    const params = new URLSearchParams({
        query: query.trim(),
        limit: String(limit)
    });

    if (countryCode) {
        params.append('country_codes', countryCode);
    }

    try {
        const response = await apiGet<GeocodingResponse>(
            `/api/geo/geocode?${params.toString()}`
        );
        return response.results;
    } catch (error) {
        console.error('Geocoding error:', error);
        throw error;
    }
}

/**
 * Convert GPS coordinates to a human-readable address
 * 
 * @param lat - Latitude coordinate (-90 to 90)
 * @param lon - Longitude coordinate (-180 to 180)
 * @param zoom - Zoom level for detail (3=country, 18=building, default: 18)
 * @returns Address information for the coordinates
 * @throws ApiClientError if reverse geocoding fails
 * 
 * @example
 * ```typescript
 * const address = await reverseGeocode(43.6532, -79.3832);
 * console.log(address.display_name); // "Toronto, Ontario, Canada"
 * ```
 */
export async function reverseGeocode(
    lat: number,
    lon: number,
    zoom: number = 18
): Promise<ReverseGeocodingResult> {
    // Validate coordinates
    if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
    }
    if (lon < -180 || lon > 180) {
        throw new Error('Longitude must be between -180 and 180');
    }

    // Build query parameters
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        zoom: String(zoom)
    });

    try {
        const response = await apiGet<ReverseGeocodingResult>(
            `/api/geo/reverse?${params.toString()}`
        );
        return response;
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        throw error;
    }
}

/**
 * Debounced geocoding function to prevent excessive API calls
 * 
 * Returns a function that delays geocoding until the user stops typing
 * for a specified duration. Useful for real-time search inputs.
 * 
 * @param callback - Function to call with geocoding results
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced function that accepts a query string
 * 
 * @example
 * ```typescript
 * const debouncedGeocode = createDebouncedGeocode((results) => {
 *   setMapMarkers(results);
 * }, 500);
 * 
 * // In input onChange handler:
 * debouncedGeocode(inputValue);
 * ```
 */
export function createDebouncedGeocode(
    callback: (results: GeocodingResult[]) => void,
    delay: number = 500
): (query: string) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (query: string) => {
        // Clear existing timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        // Skip if query is too short
        if (!query || query.trim().length < 3) {
            callback([]);
            return;
        }

        // Set new timeout
        timeoutId = setTimeout(async () => {
            try {
                const results = await geocodeAddress(query);
                callback(results);
            } catch (error) {
                console.error('Debounced geocoding error:', error);
                callback([]);
            }
        }, delay);
    };
}

/**
 * Check if coordinates are valid (non-zero and within valid ranges)
 * 
 * Returns false if coordinates are missing, zero, or outside valid ranges.
 * Useful for validating whether to display a map or show an error.
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @returns True if coordinates are valid and non-zero
 * 
 * @example
 * ```typescript
 * if (hasValidCoordinates(ride.origin_lat, ride.origin_lng)) {
 *   // Show map with marker
 * } else {
 *   // Show "Location not available" message
 * }
 * ```
 */
export function hasValidCoordinates(
    lat: number | null | undefined,
    lon: number | null | undefined
): boolean {
    if (lat == null || lon == null) return false;
    if (lat === 0 && lon === 0) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    return true;
}

/**
 * Format coordinates as a display string
 * 
 * @param lat - Latitude coordinate
 * @param lon - Longitude coordinate
 * @param precision - Number of decimal places (default: 4)
 * @returns Formatted coordinate string (e.g., "43.6532, -79.3832")
 * 
 * @example
 * ```typescript
 * const coords = formatCoordinates(43.653226, -79.383184);
 * console.log(coords); // "43.6532, -79.3832"
 * ```
 */
export function formatCoordinates(
    lat: number,
    lon: number,
    precision: number = 4
): string {
    return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
}
