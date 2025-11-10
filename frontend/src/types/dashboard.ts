/**
 * Dashboard and Trip Summary Types
 * Type definitions for trip history and driver summary data from backend
 */

/**
 * Role of the user in a trip (passenger or driver)
 */
export type TripRole = "passenger" | "driver";

/**
 * Single trip entry from trip history
 * Combines ride and booking information
 */
export interface TripHistoryItem {
    ride_id: string;
    driver_id: string;
    origin: string | null;
    destination: string | null;
    departure_time: string; // ISO datetime string
    price_share: number;
    role: TripRole;
    // Booking fields (only present if user was a passenger)
    booking_status?: string;
    amount_paid?: number;
    seats_reserved?: number;
    // Additional ride-level fields provided by backend for driver aggregation
    seats_total?: number;
    seats_available?: number;
    status?: string;
}

/**
 * Trip history response from backend
 */
export interface TripHistoryResponse {
    user_id: string;
    trips: TripHistoryItem[];
}

/**
 * Driver summary statistics from backend
 */
export interface DriverSummary {
    driver_id: string;
    total_trips: number;
    total_earnings: number;
    avg_per_ride: number;
}

/**
 * Processed dashboard data for frontend display
 * Separates rider and driver statistics
 */
export interface DashboardData {
    // Common fields
    totalTrips: number;
    recentTrips: TripHistoryItem[];

    // Rider-specific (as passenger)
    totalSpent?: number;
    avgCostPerTrip?: number;

    // Driver-specific
    totalEarned?: number;
    avgEarningPerTrip?: number;
}
