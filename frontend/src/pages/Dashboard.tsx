/**
 * Dashboard Page
 * Displays user trip statistics and history
 * - Fetches data from backend trip summary endpoints (/api/trips/history and /api/trips/summary)
 * - Supports role toggle (rider/driver view)
 * - Shows stats cards and recent trip history
 * - Matches site color scheme and styling
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  Calendar, 
  Users, 
  Loader2,
  AlertCircle,
  Car,
  User,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useRides } from "../hooks/useRides";
import { useBookings } from "../hooks/useBookings";
import { getTripHistory } from "../utils/api";
import type { DashboardData, TripRole, Booking, BookingStatus } from "../types";

export default function Dashboard() {
  // Auth context for user info
  const { user } = useAuth();

  // UI state
  const [role, setRole] = useState<TripRole>("passenger");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tab state: "trips" or "bookings"
  const [activeTab, setActiveTab] = useState<"trips" | "bookings">("trips");

  // Data cache for both roles
  const [dataCache, setDataCache] = useState<{
    passenger?: DashboardData;
    driver?: DashboardData;
  }>({});

  /**
   * Fetch and process trip history and summary for the current user
   * Processes data differently for rider (passenger) vs driver view
   */
  const fetchDashboardData = async (selectedRole: TripRole) => {
    if (!user?.id) {
      setError("User not authenticated");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch trip history (includes both rider and driver trips)
      const historyResponse = await getTripHistory(user.id);
      const allTrips = historyResponse.trips || [];

      if (selectedRole === "passenger") {
        // Filter trips where user was a passenger
        const passengerTrips = allTrips.filter(trip => trip.role === "passenger");

        // For dashboard statistics "Trips Taken" and "Average Cost" we only count completed bookings.
        // trip.booking_status is only present for passenger-role entries.
        const passengerCompleted = passengerTrips.filter(t => t.booking_status === 'completed');

        // Calculate passenger statistics from completed trips only
        const totalSpent = passengerCompleted.reduce((sum, trip) => sum + (trip.amount_paid || 0), 0);
        const avgCostPerTrip = passengerCompleted.length > 0 ? totalSpent / passengerCompleted.length : 0;

        setDataCache(prev => ({
          ...prev,
          passenger: {
            // Show number of completed trips for the stat card
            totalTrips: passengerCompleted.length,
            // Recent trips list can include recent passenger activity (both completed and in-progress)
            recentTrips: passengerTrips.slice(0, 10), // Show last 10 passenger trips
            totalSpent,
            avgCostPerTrip,
          }
        }));
      } else {
  // Filter trips where user was a driver

        // Calculate driver earnings & completed trips from trip history rows.
        // We consider a ride "completed" if either:
        // - there's a booking row with booking_status === 'completed'
        // - OR the ride.status === 'completed' (fallback when bookings weren't updated)
        const driverTrips = allTrips.filter(t => t.role === 'driver');

        // Track unique completed ride ids (so multiple bookings for same ride count as 1 trip)
        const completedRideIds = new Set<string>();
        let totalEarned = 0;

        for (const t of driverTrips) {
          // If booking-level completed and amount_paid present, count it towards earnings
          if (t.booking_status === 'completed') {
            completedRideIds.add(t.ride_id);
            totalEarned += (t.amount_paid || 0);
          } else if (t.status === 'completed') {
            // Ride marked completed but booking rows might not have been updated.
            // Count the ride as completed. For earnings fallback, try to estimate
            // using price_share * number of seats that were booked (seats_total - seats_available).
            completedRideIds.add(t.ride_id);
            const seatsBooked = (t.seats_total ?? 0) - (t.seats_available ?? 0);
            const estimated = (t.amount_paid || 0) || ((t.price_share || 0) * Math.max(0, seatsBooked));
            totalEarned += estimated;
          }
        }

        const totalTripsCompleted = completedRideIds.size;
        const avgEarningPerTrip = totalTripsCompleted > 0 ? totalEarned / totalTripsCompleted : 0;

        setDataCache(prev => ({
          ...prev,
          driver: {
            totalTrips: totalTripsCompleted,
            recentTrips: driverTrips.slice(0, 10), // Show last 10 driver trips (activity)
            totalEarned,
            avgEarningPerTrip,
          }
        }));
      }
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.detail || err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch data when component mounts or role changes
   */
  useEffect(() => {
    if (user?.id) {
      // Check if data is already cached for this role
      if (role === "passenger" && dataCache.passenger) {
        setLoading(false);
        return;
      }
      if (role === "driver" && dataCache.driver) {
        setLoading(false);
        return;
      }

      // Fetch data for selected role
      fetchDashboardData(role);
    }
  }, [user?.id, role]);

  /**
   * Prefetch the other role's data in the background
   */
  useEffect(() => {
    if (user?.id && !loading) {
      const otherRole: TripRole = role === "passenger" ? "driver" : "passenger";
      if (!dataCache[otherRole]) {
        // Silently fetch other role's data
        fetchDashboardData(otherRole).catch(() => {
          // Ignore errors for prefetch
        });
      }
    }
  }, [user?.id, role, loading]);

  // When in driver role, fetch rides posted by current user (silent)
  useEffect(() => {
    if (role === "driver" && user?.id) {
      fetchMyRides(undefined, true).catch(() => {});
    }
  }, [role, user?.id]);

  // Get current role's data
  const dashboardData = dataCache[role];

  // Extract stats with fallbacks
  const totalTrips = dashboardData?.totalTrips ?? 0;
  const totalEarned = dashboardData?.totalEarned ?? 0;
  const avgCost = dashboardData?.avgCostPerTrip ?? 0;

  // Rides hook for driver/passenger actions (edit / update status / fetch single ride)
  const ridesHook = useRides();
  const { rides: myRides, fetchMyRides, fetchRide, updateRide, updateStatus, deleteRide } = ridesHook;

  // Bookings hook for managing bookings
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    error: bookingsError, 
    fetchMyBookings,
    updateStatus: updateBookingStatus,
    cancelBooking 
  } = useBookings();

  // Fetch bookings when tab is switched to bookings
  useEffect(() => {
    if (activeTab === "bookings" && user?.id) {
      fetchMyBookings();
    }
  }, [activeTab, user?.id]);

  // UI state for editing a passenger 'request' (only vehicle fields editable)
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [requestEditForm, setRequestEditForm] = useState<any>({});

  // UI state for editing a ride
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [statusMenuFor, setStatusMenuFor] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<{ rideId: string; status: 'completed' | 'cancelled' } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  // Helper: format ISO -> input[type=datetime-local] value
  const isoToLocalInput = (iso?: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, "0");
      const yyyy = d.getFullYear();
      const mm = pad(d.getMonth() + 1);
      const dd = pad(d.getDate());
      const hh = pad(d.getHours());
      const min = pad(d.getMinutes());
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    } catch (e) {
      return "";
    }
  };

  // Helper: local input -> ISO string (assumes local timezone)
  const localInputToIso = (val: string) => {
    if (!val) return undefined;
    const d = new Date(val);
    return d.toISOString();
  };

  // Choose which list to show in the main 'Rides' area:
  // - For drivers, show rides posted by the user (myRides from hook)
  // - For passengers, show recentTrips from dashboard data
  // For drivers, only show rides they posted that are not passenger "requests".
  // A ride with status === 'requested' represents a passenger looking for a ride
  // and should be shown on the rider side instead.
  const tripsToShow = role === "driver"
    ? (myRides ?? []).filter((r: any) => r?.status !== 'requested')
    : (dashboardData?.recentTrips ?? []);

  /**
   * Render star rating
   */
  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
  };

  /**
   * Loading state
   */
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background-warm)' }}>
        <div className="flex items-center gap-3" style={{ color: 'var(--color-primary)' }}>
          <Loader2 size={24} className="animate-spin" />
          <span className="text-lg">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background-warm)' }}>
        <motion.div 
          className="max-w-md p-6 rounded-lg bg-white flex items-start gap-3"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Error Loading Dashboard</h3>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ backgroundColor: 'var(--color-background-warm)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header Card */}
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8 mb-6"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            {/* User info */}
            <div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                {user?.full_name || "Dashboard"}
              </h1>
              {user && user.rating_count > 0 ? (
                <div className="flex items-center gap-2 text-gray-600">
                  <span className="text-lg text-yellow-500">{renderStars(user.rating_avg)}</span>
                  <span className="text-sm">
                    {user.rating_avg.toFixed(1)} • {user.rating_count} review{user.rating_count !== 1 ? "s" : ""}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-400">No reviews yet</p>
              )}
            </div>

            {/* Role Toggle */}
            <div className="flex rounded-full p-1" style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)' }}>
              <motion.button
                onClick={() => setRole("passenger")}
                className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                  role === "passenger"
                    ? "text-white shadow-md"
                    : "text-gray-600"
                }`}
                style={{ backgroundColor: role === "passenger" ? 'var(--color-primary)' : 'transparent' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <User size={16} />
                Rider
              </motion.button>
              <motion.button
                onClick={() => setRole("driver")}
                className={`px-4 md:px-6 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${
                  role === "driver"
                    ? "text-white shadow-md"
                    : "text-gray-600"
                }`}
                style={{ backgroundColor: role === "driver" ? 'var(--color-primary)' : 'transparent' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Car size={16} />
                Driver
              </motion.button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Total Trips */}
            <motion.div 
              className="rounded-xl p-4 md:p-6"
              style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)', border: '2px solid var(--color-secondary)' }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-sm md:text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {role === "passenger" ? "Trips Taken" : "Trips Completed"}
                </h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">{totalTrips}</p>
            </motion.div>

            {/* Money Stats */}
            <motion.div 
              className="rounded-xl p-4 md:p-6"
              style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.08)', border: '2px solid var(--color-secondary)' }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={20} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm md:text-base font-semibold" style={{ color: 'var(--color-accent)' }}>
                  {role === "passenger" ? "Average Cost" : "Total Earned"}
                </h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">
                ${(role === "passenger" ? avgCost : totalEarned).toFixed(2)}
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Trips / Bookings Section */}
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {/* Tab Navigation */}
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex rounded-lg p-1" style={{ backgroundColor: 'rgba(var(--color-secondary-rgb), 0.1)' }}>
              <motion.button
                onClick={() => setActiveTab("trips")}
                className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === "trips"
                    ? "text-white shadow-md"
                    : "text-gray-600"
                }`}
                style={{ backgroundColor: activeTab === "trips" ? 'var(--color-primary)' : 'transparent' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Car size={16} />
                {role === "passenger" ? "Ride Requests" : "Rides"}
              </motion.button>
              <motion.button
                onClick={() => setActiveTab("bookings")}
                className={`px-4 md:px-6 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === "bookings"
                    ? "text-white shadow-md"
                    : "text-gray-600"
                }`}
                style={{ backgroundColor: activeTab === "bookings" ? 'var(--color-primary)' : 'transparent' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CreditCard size={16} />
                Bookings
              </motion.button>
            </div>

            {((activeTab === "trips" && loading) || (activeTab === "bookings" && bookingsLoading)) && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </span>
            )}
          </div>

          {/* Trips Tab Content */}
          {activeTab === "trips" && (
            <>
          {/* Trip List */}
          {tripsToShow && tripsToShow.length > 0 ? (
            <div className="space-y-4">
              {tripsToShow.map((trip: any, index: number) => {
                // For driver role we receive Ride objects (myRides), for passenger we receive trip history items
                const isFinal = trip?.status === 'completed' || trip?.status === 'cancelled';
                const rideId = trip.id ?? trip.ride_id;
                return (
                <motion.div
                  key={(trip.id ?? trip.ride_id) as string}
                  className="rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow"
                  style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)', border: '1px solid var(--color-secondary)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  {/* Route Info */}
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                    <div className="flex-1">
                      {/* Origin → Destination */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 flex-wrap">
                          <MapPin size={18} style={{ color: 'var(--color-accent)' }} />
                          <span>{role === 'driver' ? (trip.origin_label || 'Unknown') : (trip.origin || 'Unknown')}</span>
                          <span className="text-gray-400">→</span>
                          <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                          <span>{role === 'driver' ? (trip.destination_label || 'Unknown') : (trip.destination || 'Unknown')}</span>
                        </div>
                        {role === 'driver' && trip.status && (trip.status === 'completed' || trip.status === 'cancelled') && (
                          <div className={`text-xs font-semibold px-2 py-1 rounded-full ${trip.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {trip.status.toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Trip Details */}
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>{new Date(role === 'driver' ? trip.departure_time : trip.departure_time).toLocaleString()}</span>
                        </div>

                        {role === "passenger" && trip.booking_status && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Status:</span>
                            <span className={`font-semibold ${
                              trip.booking_status === "completed" ? "text-green-600" : "text-gray-600"
                            }`}>
                              {trip.booking_status}
                            </span>
                          </div>
                        )}

                        {/* passenger request controls were moved to the right-side Actions area to match driver layout */}

                        {role === 'driver' ? (
                          <div className="flex items-center gap-2">
                            <Users size={14} />
                            <span>{trip.seats_available}/{trip.seats_total} seats available</span>
                          </div>
                        ) : (
                          trip.seats_reserved && (
                            <div className="flex items-center gap-2">
                              <Users size={14} />
                              <span>{trip.seats_reserved} seat{trip.seats_reserved !== 1 ? "s" : ""}</span>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Price + Actions */}
                    <div className="text-right flex flex-col items-end gap-3">
                      <div>
                        <p className="text-2xl md:text-3xl font-bold" style={{ 
                          color: role === "passenger" ? 'var(--color-primary)' : 'var(--color-accent)' 
                        }}>
                          ${(role === "passenger" && trip.amount_paid 
                            ? trip.amount_paid 
                            : trip.price_share
                          ).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {role === "passenger" ? "Total Paid" : "Per Seat"}
                        </p>
                      </div>

                      {/* Actions for drivers and passenger-created requests (render on the right side to match layout) */}
                      {(role === 'driver' || (role === 'passenger' && !trip.booking_status)) && (
                        <div className="flex items-center gap-2 relative">
                          <button
                            className={`px-3 py-1 rounded-md text-sm font-medium ${isFinal ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{ backgroundColor: 'var(--color-secondary)', color: 'white' }}
                            onClick={async () => {
                              if (isFinal) return;
                              if (role === 'driver') {
                                setEditingRideId(trip.id);
                                setEditForm({
                                  origin_label: trip.origin_label || '',
                                  destination_label: trip.destination_label || '',
                                  departure_time: isoToLocalInput(trip.departure_time),
                                  seats_total: trip.seats_total,
                                  price_share: trip.price_share,
                                  notes: trip.notes || '',
                                  vehicle_make: trip.vehicle_make || '',
                                  vehicle_model: trip.vehicle_model || '',
                                  vehicle_color: trip.vehicle_color || '',
                                  vehicle_year: trip.vehicle_year || undefined,
                                });
                              } else {
                                // passenger request - fetch full ride to populate vehicle-only form
                                try {
                                  const ride = await fetchRide(rideId);
                                  if (!ride) return;
                                  setEditingRequestId(rideId);
                                  setRequestEditForm({
                                    origin_label: ride.origin_label ?? '',
                                    destination_label: ride.destination_label ?? '',
                                    departure_time: isoToLocalInput(ride.departure_time),
                                    seats_total: ride.seats_total ?? 1,
                                    price_share: ride.price_share ?? 0,
                                    notes: ride.notes ?? '',
                                  });
                                } catch (err: any) {
                                  console.warn('Failed to fetch ride for editing:', err);
                                }
                              }
                            }}
                            disabled={isFinal}
                          >Edit</button>

                          <button
                            className="px-3 py-1 rounded-md text-sm font-medium"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                            onClick={() => setStatusMenuFor(rideId)}
                          >Change status</button>

                          <button
                            className="px-3 py-1 rounded-md text-sm font-medium"
                            style={{ backgroundColor: '#ef4444', color: 'white' }}
                            onClick={() => setPendingDelete(rideId)}
                          >Delete</button>

                          {statusMenuFor === rideId && (
                            <div className="absolute right-0 top-full mt-2 w-44 bg-white border rounded shadow-lg z-20 p-2">
                                <button className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded" onClick={() => setPendingStatus({ rideId, status: 'completed' })}>Mark as completed</button>
                                <button className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded mt-1" onClick={() => setPendingStatus({ rideId, status: 'cancelled' })}>Mark as cancelled</button>

                                {/* Confirmation row when a status is pending for this ride */}
                                {pendingStatus?.rideId === rideId ? (
                                  <div className="mt-2 p-2 border-t">
                                    <div className="text-sm mb-2">Confirm change status to <span className="font-semibold">{pendingStatus!.status}</span>?</div>
                                    <div className="flex gap-2">
                                      <button className="px-3 py-1 rounded bg-green-600 text-white text-sm" onClick={async () => {
                                        try {
                                          await updateStatus(rideId, { status: pendingStatus!.status });
                                          setPendingStatus(null);
                                          setStatusMenuFor(null);
                                          // Refresh both myRides and dashboard data so stats/cards update
                                          // regardless of role. fetchMyRides updates the ride list; 
                                          // fetchDashboardData recalculates totals from history.
                                          fetchMyRides(undefined, true).catch(() => {});
                                          fetchDashboardData(role).catch(() => {});
                                        } catch (err: any) {
                                          console.warn('Failed to change status:', err);
                                        }
                                      }}>Confirm</button>
                                      <button className="px-3 py-1 rounded bg-gray-200 text-sm" onClick={() => setPendingStatus(null)}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded mt-2 text-sm text-gray-600" onClick={() => setStatusMenuFor(null)}>Close</button>
                                )}
                            </div>
                          )}

                          {pendingDelete === rideId && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border rounded shadow-lg z-20 p-3">
                              <div className="text-sm mb-2">Are you sure you want to delete this ride?</div>
                              <div className="flex gap-2">
                                <button className="px-3 py-1 rounded bg-red-600 text-white text-sm" onClick={async () => {
                                  try {
                                    await deleteRide(rideId);
                                    setPendingDelete(null);
                                    if (role === 'driver') {
                                      fetchMyRides(undefined, true).catch(() => {});
                                    } else {
                                      fetchDashboardData(role).catch(() => {});
                                    }
                                  } catch (err: any) {
                                    console.warn('Failed to delete ride:', err);
                                  }
                                }}>Yes, delete</button>
                                <button className="px-3 py-1 rounded bg-gray-200 text-sm" onClick={() => setPendingDelete(null)}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form for drivers */}
                  {role === 'driver' && editingRideId === trip.id && !isFinal && (
                    <div className="mt-3 p-3 rounded-md bg-white" style={{ border: '1px dashed var(--color-secondary)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="p-2 border rounded" value={editForm.origin_label} onChange={(e) => setEditForm((s: any) => ({ ...s, origin_label: e.target.value }))} placeholder="Origin label" />
                        <input className="p-2 border rounded" value={editForm.destination_label} onChange={(e) => setEditForm((s: any) => ({ ...s, destination_label: e.target.value }))} placeholder="Destination label" />
                        <input type="datetime-local" className="p-2 border rounded" value={editForm.departure_time} onChange={(e) => setEditForm((s: any) => ({ ...s, departure_time: e.target.value }))} />
                        <input type="number" className="p-2 border rounded" value={editForm.seats_total} onChange={(e) => setEditForm((s: any) => ({ ...s, seats_total: Number(e.target.value) }))} placeholder="Seats total" />
                        <input type="number" step="0.01" className="p-2 border rounded" value={editForm.price_share} onChange={(e) => setEditForm((s: any) => ({ ...s, price_share: Number(e.target.value) }))} placeholder="Price per seat" />
                        <input className="p-2 border rounded" value={editForm.vehicle_make} onChange={(e) => setEditForm((s: any) => ({ ...s, vehicle_make: e.target.value }))} placeholder="Vehicle make" />
                        <input className="p-2 border rounded" value={editForm.vehicle_model} onChange={(e) => setEditForm((s: any) => ({ ...s, vehicle_model: e.target.value }))} placeholder="Vehicle model" />
                        <input className="p-2 border rounded" value={editForm.vehicle_color} onChange={(e) => setEditForm((s: any) => ({ ...s, vehicle_color: e.target.value }))} placeholder="Vehicle color" />
                        <input type="number" className="p-2 border rounded" value={editForm.vehicle_year || ''} onChange={(e) => setEditForm((s: any) => ({ ...s, vehicle_year: e.target.value ? Number(e.target.value) : undefined }))} placeholder="Vehicle year" />
                        <textarea className="p-2 border rounded md:col-span-2" value={editForm.notes} onChange={(e) => setEditForm((s: any) => ({ ...s, notes: e.target.value }))} placeholder="Notes" />
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button className="px-4 py-2 rounded bg-green-600 text-white font-medium" onClick={async () => {
                          const payload: any = {};
                          if (editForm.origin_label !== undefined) payload.origin_label = editForm.origin_label;
                          if (editForm.destination_label !== undefined) payload.destination_label = editForm.destination_label;
                          if (editForm.departure_time) payload.departure_time = localInputToIso(editForm.departure_time);
                          if (editForm.seats_total !== undefined) payload.seats_total = Number(editForm.seats_total);
                          if (editForm.price_share !== undefined) payload.price_share = Number(editForm.price_share);
                          if (editForm.notes !== undefined) payload.notes = editForm.notes;
                          if (editForm.vehicle_make !== undefined) payload.vehicle_make = editForm.vehicle_make || null;
                          if (editForm.vehicle_model !== undefined) payload.vehicle_model = editForm.vehicle_model || null;
                          if (editForm.vehicle_color !== undefined) payload.vehicle_color = editForm.vehicle_color || null;
                          if (editForm.vehicle_year !== undefined) payload.vehicle_year = editForm.vehicle_year || null;

                          await updateRide(trip.id, payload);
                          setEditingRideId(null);
                          fetchMyRides(undefined, true).catch(() => {});
                        }}>Save changes</button>

                        <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setEditingRideId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Inline edit form for passenger-created requests (vehicle-only) */}
                  {role === 'passenger' && editingRequestId === (trip.id ?? trip.ride_id) && !isFinal && (
                    <div className="mt-3 p-3 rounded-md bg-white" style={{ border: '1px dashed var(--color-secondary)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className="p-2 border rounded" value={requestEditForm.origin_label} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, origin_label: e.target.value }))} placeholder="Origin (label)" />
                        <input className="p-2 border rounded" value={requestEditForm.destination_label} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, destination_label: e.target.value }))} placeholder="Destination (label)" />
                        <input type="datetime-local" className="p-2 border rounded" value={requestEditForm.departure_time} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, departure_time: e.target.value }))} />
                        <input type="number" className="p-2 border rounded" value={requestEditForm.seats_total} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, seats_total: Number(e.target.value) }))} placeholder="Seats needed" />
                        <input type="number" step="0.01" className="p-2 border rounded" value={requestEditForm.price_share} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, price_share: Number(e.target.value) }))} placeholder="Price per seat" />
                        <textarea className="p-2 border rounded md:col-span-2" value={requestEditForm.notes} onChange={(e) => setRequestEditForm((s: any) => ({ ...s, notes: e.target.value }))} placeholder="Notes (optional)" />
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <button className="px-4 py-2 rounded bg-green-600 text-white font-medium" onClick={async () => {
                          const payload: any = {};
                          // Send only non-vehicle fields for a passenger request edit
                          if (requestEditForm.origin_label !== undefined) payload.origin_label = requestEditForm.origin_label || null;
                          if (requestEditForm.destination_label !== undefined) payload.destination_label = requestEditForm.destination_label || null;
                          if (requestEditForm.departure_time) payload.departure_time = localInputToIso(requestEditForm.departure_time);
                          if (requestEditForm.seats_total !== undefined) payload.seats_total = Number(requestEditForm.seats_total);
                          if (requestEditForm.price_share !== undefined) payload.price_share = Number(requestEditForm.price_share);
                          if (requestEditForm.notes !== undefined) payload.notes = requestEditForm.notes || null;

                          try {
                            await updateRide((trip.id ?? trip.ride_id), payload);
                            setEditingRequestId(null);
                            // Refresh dashboard data to reflect changes
                            fetchDashboardData(role).catch(() => {});
                          } catch (err: any) {
                            console.warn('Failed to save request info:', err);
                          }
                        }}>Save changes</button>

                        <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setEditingRequestId(null)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
            </div>
          ) : (
            <motion.div 
              className="text-center py-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex flex-col items-center gap-3">
                {role === "passenger" ? <User size={48} /> : <Car size={48} />}
                <p className="text-lg text-gray-500">No trips yet</p>
                <p className="text-sm text-gray-400">
                  {role === "passenger" 
                    ? "Book your first ride to get started!" 
                    : "Post your first ride to start earning!"}
                </p>
              </div>
            </motion.div>
          )}
            </>
          )}

          {/* Bookings Tab Content */}
          {activeTab === "bookings" && (
            <>
              {bookingsError && (
                <motion.div 
                  className="rounded-lg p-4 mb-4 flex items-start gap-3"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Error Loading Bookings</p>
                    <p className="text-sm text-red-700">{bookingsError}</p>
                  </div>
                </motion.div>
              )}

              {bookings && bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.map((booking: Booking, index: number) => {
                    const statusColors: Record<BookingStatus, { bg: string; text: string; icon: any }> = {
                      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
                      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
                      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
                      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
                    };

                    const statusInfo = statusColors[booking.status];
                    const StatusIcon = statusInfo.icon;
                    const isActive = booking.status === 'pending' || booking.status === 'confirmed';
                    const isDriver = user?.id === booking.ride.driver_id;

                    return (
                      <motion.div
                        key={booking.id}
                        className="rounded-xl p-4 md:p-6 hover:shadow-md transition-shadow"
                        style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.05)', border: '1px solid var(--color-secondary)' }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.06 }}
                      >
                        {/* Booking Header */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-3">
                          <div className="flex-1">
                            {/* Status Badge */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${statusInfo.bg} ${statusInfo.text} font-semibold text-sm`}>
                                <StatusIcon size={14} />
                                {booking.status.toUpperCase()}
                              </div>
                              <span className="text-xs text-gray-500">
                                {isDriver ? "As Driver" : "As Passenger"}
                              </span>
                            </div>

                            {/* Route Info */}
                            <div className="flex items-center gap-2 text-base md:text-lg font-semibold text-gray-800 flex-wrap mb-2">
                              <MapPin size={18} style={{ color: 'var(--color-accent)' }} />
                              <span>{booking.ride.origin || 'Unknown'}</span>
                              <span className="text-gray-400">→</span>
                              <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                              <span>{booking.ride.destination || 'Unknown'}</span>
                            </div>

                            {/* Booking Details */}
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} />
                                <span>{new Date(booking.ride.departure_time).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Users size={14} />
                                <span>{booking.seats_reserved} seat{booking.seats_reserved !== 1 ? "s" : ""} reserved</span>
                              </div>
                              {!isDriver && booking.passenger && (
                                <div className="flex items-center gap-2">
                                  <User size={14} />
                                  <span>Passenger: {booking.passenger.full_name}</span>
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-2">
                                Booked: {new Date(booking.created_at).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Price + Actions */}
                          <div className="text-right flex flex-col items-end gap-3">
                            <div>
                              <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                                ${booking.total_price.toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Total</p>
                            </div>

                            {/* Action Buttons */}
                            {isActive && (
                              <div className="flex flex-col gap-2">
                                {/* Driver can confirm pending bookings */}
                                {isDriver && booking.status === 'pending' && (
                                  <motion.button
                                    onClick={async () => {
                                      try {
                                        await updateBookingStatus(booking.id, { status: 'confirmed' });
                                        fetchMyBookings(); // Refresh list
                                      } catch (err) {
                                        console.error('Failed to confirm booking:', err);
                                      }
                                    }}
                                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: 'var(--color-accent)' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <CheckCircle size={16} className="inline mr-1" />
                                    Confirm
                                  </motion.button>
                                )}

                                {/* Driver can complete confirmed bookings */}
                                {isDriver && booking.status === 'confirmed' && (
                                  <motion.button
                                    onClick={async () => {
                                      try {
                                        await updateBookingStatus(booking.id, { status: 'completed' });
                                        fetchMyBookings(); // Refresh list
                                      } catch (err) {
                                        console.error('Failed to complete booking:', err);
                                      }
                                    }}
                                    className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: 'var(--color-accent)' }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <CheckCircle size={16} className="inline mr-1" />
                                    Complete
                                  </motion.button>
                                )}

                                {/* Both driver and passenger can cancel */}
                                <motion.button
                                  onClick={async () => {
                                    try {
                                      await cancelBooking(booking.id);
                                      fetchMyBookings(); // Refresh list
                                    } catch (err) {
                                      console.error('Failed to cancel booking:', err);
                                    }
                                  }}
                                  className="px-4 py-2 rounded-lg text-white font-semibold text-sm transition-opacity hover:opacity-90"
                                  style={{ backgroundColor: '#ef4444' }}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <XCircle size={16} className="inline mr-1" />
                                  Cancel
                                </motion.button>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <motion.div 
                  className="text-center py-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex flex-col items-center gap-3">
                    <CreditCard size={48} style={{ color: 'var(--color-accent)' }} />
                    <p className="text-lg text-gray-500">No bookings yet</p>
                    <p className="text-sm text-gray-400">
                      Book a ride from the search page to get started!
                    </p>
                  </div>
                </motion.div>
              )}
            </>
          )}
          
        </motion.div>
      </div>
    </div>
  );
}
