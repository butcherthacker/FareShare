/**
 * Booking Types
 * Type definitions for booking-related data structures matching the backend API
 */

/**
 * Current status of the booking
 */
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

/**
 * Simplified passenger information included in booking responses
 */
export interface PassengerInfo {
    id: string;
    full_name: string;
    rating_avg: number;
    rating_count: number;
    avatar_url: string | null;
}

/**
 * Basic ride information included in booking responses
 */
export interface RideInfoBasic {
    id: string;
    origin_label: string | null;
    destination_label: string | null;
    departure_time: string; // ISO datetime string
    price_share: number;
    status: string;
    driver_id: string;
}

/**
 * Booking data for creating a new booking
 * Matches backend BookingCreate schema
 */
export interface BookingCreateData {
    ride_id: string;
    seats_reserved: number;
}

/**
 * Booking status update
 * Matches backend BookingStatusUpdate schema
 */
export interface BookingStatusUpdate {
    status: BookingStatus;
}

/**
 * Complete booking information received from the backend
 * Matches backend BookingResponse schema
 */
export interface Booking {
    id: string;

    // Passenger info
    passenger_id: string;
    passenger: PassengerInfo | null;

    // Ride info
    ride_id: string;
    ride: RideInfoBasic | null;

    // Booking details
    seats_reserved: number;
    amount_paid: number;
    status: BookingStatus;

    // Timestamps
    booked_at: string; // ISO datetime string
}

/**
 * Paginated list of bookings response
 * Matches backend BookingListResponse schema
 */
export interface BookingListResponse {
    bookings: Booking[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
}

/**
 * Booking statistics
 * Matches backend BookingStats schema
 */
export interface BookingStats {
    total_bookings: number;
    pending_bookings: number;
    confirmed_bookings: number;
    completed_bookings: number;
    cancelled_bookings: number;
    total_spent: number;  // As passenger
    total_earned: number; // As driver
}

/**
 * Query parameters for listing/filtering bookings
 */
export interface BookingQueryParams {
    page?: number;
    page_size?: number;
    status?: BookingStatus;
    role?: "passenger" | "driver";
    from_date?: string; // ISO datetime string
    to_date?: string;   // ISO datetime string
    sort_by?: "booked_at" | "status";
    sort_order?: "asc" | "desc";
    // Optional filters accepted by the backend (some APIs use ride or ride_id)
    ride_id?: string;
    ride?: string;
}
