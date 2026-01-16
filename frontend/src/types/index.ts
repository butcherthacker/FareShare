/**
 * Type Definitions Index
 * Central export point for all TypeScript type definitions
 */

export type {
    UserRole,
    VerificationStatus,
    AccountStatus,
    RegisterData,
    LoginData,
    TokenResponse,
    User,
    AuthContextType,
    ApiError,
} from './auth';

export type {
    RideType,
    RideStatus,
    DriverInfo,
    RideCreateData,
    RideUpdateData,
    Ride,
    RideListResponse,
    SearchResultRide,
    SearchResponse,
    RideQueryParams,
    RideStatusUpdate,
} from './ride';

export type {
    BookingStatus,
    PassengerInfo,
    RideInfoBasic,
    BookingCreateData,
    BookingStatusUpdate,
    Booking,
    BookingListResponse,
    BookingStats,
    BookingQueryParams,
} from './booking';

export type {
    IncidentCategory,
    IncidentStatus,
    IncidentUserInfo,
    IncidentRideInfo,
    Incident,
    IncidentAdminResponse,
    CreateIncidentRequest,
    IncidentListResponse,
    IncidentComment,
    IncidentCommentAuthor,
    CreateIncidentCommentRequest,
} from './incident';
