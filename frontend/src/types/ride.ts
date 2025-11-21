/**
 * Ride Types
 * Type definitions for ride-related data structures matching the backend API
 */

/**
 * Type of ride posting
 */
export type RideType = "offer" | "request";

/**
 * Current status of the ride
 */
export type RideStatus = "open" | "requested" | "full" | "cancelled" | "completed";

/**
 * Simplified driver information included in ride responses
 */
export interface DriverInfo {
    id: string;
    full_name: string;
    rating_avg: number;
    rating_count: number;
    avatar_url: string | null;
}

/**
 * Ride data for creating a new ride offer or request
 * Matches backend RideCreate schema
 */
export interface RideCreateData {
    ride_type: RideType;

    // Location information
    origin_label: string;
    destination_label: string;
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;

    // Schedule
    departure_time: string; // ISO datetime string

    // Capacity and pricing
    seats_total: number;
    price_share: number;

    // Optional notes/preferences
    notes?: string;

    // Optional vehicle info (only for OFFERS - ignored for requests)
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_color?: string;
    vehicle_year?: number;
}

/**
 * Ride data for updating an existing ride
 * All fields are optional - only provided fields will be updated
 * Matches backend RideUpdate schema
 */
export interface RideUpdateData {
    origin_label?: string;
    destination_label?: string;
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
    departure_time?: string;
    seats_total?: number;
    price_share?: number;
    notes?: string;
    vehicle_make?: string;
    vehicle_model?: string;
    vehicle_color?: string;
    vehicle_year?: number;
}

/**
 * Complete ride information received from the backend
 * Matches backend RideResponse schema
 */
export interface Ride {
    id: string;
    ride_type: string; // "offer" or "request"

    // Driver info
    driver_id: string;
    driver: DriverInfo | null;

    // Location
    origin_label: string | null;
    destination_label: string | null;
    origin_lat: number | null;
    origin_lng: number | null;
    destination_lat: number | null;
    destination_lng: number | null;

    // Schedule
    departure_time: string; // ISO datetime string

    // Capacity
    seats_total: number;
    seats_available: number;

    // Pricing
    price_share: number;

    // Vehicle info
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_color: string | null;
    vehicle_year: number | null;

    // Additional info
    notes: string | null;

    // Status
    status: RideStatus;

    // Timestamps
    created_at: string; // ISO datetime string
}

/**
 * Paginated list of rides response
 * Matches backend RideListResponse schema
 */
export interface RideListResponse {
    rides: Ride[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * Lightweight ride shape returned by the search endpoint
 * This is intentionally smaller than the full `Ride` type
 * Includes coordinates for map display on search results
 */
export interface SearchResultRide {
    id: string;
    from: string | null;
    to: string | null;
    depart_at: string; // ISO datetime
    seats_available: number;
    price: number;
    driver_rating?: number | null;
    ride_type?: string | null;
    // Coordinates for map display
    origin_lat?: number | null;
    origin_lng?: number | null;
    destination_lat?: number | null;
    destination_lng?: number | null;
}

/**
 * Response shape for the search endpoint
 */
export interface SearchResponse {
    rides: SearchResultRide[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * Query parameters for listing/filtering rides
 */
export interface RideQueryParams {
    page?: number;
    page_size?: number;
    ride_type?: RideType;
    status?: RideStatus;
    min_seats?: number;
    max_price?: number;
    search?: string;
    sort_by?: "departure_time" | "price_share" | "created_at";
    sort_order?: "asc" | "desc";
}

/**
 * Status update for a ride
 */
export interface RideStatusUpdate {
    status: "cancelled" | "completed";
}
