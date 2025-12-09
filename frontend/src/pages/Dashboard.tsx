/**
 * Dashboard Page
 * Displays user bookings and statistics
 * - Shows booking stats from backend
 * - Lists user bookings (as passenger or driver)
 * - Allows managing booking status
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
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
  Clock,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useBookings } from "../hooks/useBookings";
import { ReviewsList } from "../components/ReviewsList";
import { ReviewFormModal } from "../components/ReviewFormModal";
import Background from "../components/Background";
import { StarRating } from "../components/StarRating";
import type { Booking, BookingStatus } from "../types";

export default function Dashboard() {
  // Auth context for user info
  const { user } = useAuth();

  // Bookings hook for managing bookings
  const { 
    bookings, 
    isLoading: bookingsLoading, 
    error: bookingsError, 
    fetchMyBookings,
    updateStatus: updateBookingStatus,
    cancelBooking
  } = useBookings();

  // UI state
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [activeTab, setActiveTab] = useState<"bookings" | "reviews">("bookings");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<Booking | null>(null);

  // Fetch bookings on mount and when role changes
  useEffect(() => {
    if (user?.id) {
      fetchMyBookings(role);
    }
  }, [user?.id, role]);

  // Filter bookings by role
  const filteredBookings = bookings.filter((booking: Booking) => {
    if (role === "passenger") {
      return booking.passenger_id === user?.id;
    } else {
      return booking.ride?.driver_id === user?.id;
    }
  });

  // Calculate stats from filtered bookings
  const completedBookings = filteredBookings.filter((b: Booking) => b.status === "completed");
  const totalBookings = completedBookings.length;
  const totalAmount = completedBookings.reduce((sum: number, b: Booking) => sum + b.amount_paid, 0);
  const avgAmount = totalBookings > 0 ? totalAmount / totalBookings : 0;

  /**
   * Handle opening review modal for a completed booking
   */
  const handleWriteReview = (booking: Booking) => {
    setSelectedBookingForReview(booking);
    setReviewModalOpen(true);
  };

  /**
   * Handle review submission success
   */
  const handleReviewSuccess = () => {
    setReviewModalOpen(false);
    setSelectedBookingForReview(null);
    // Optionally refresh bookings
    if (user?.id) {
      fetchMyBookings(role);
    }
  };

  /**
   * Loading state
   */
  if (bookingsLoading && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Background />
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
  if (bookingsError && bookings.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Background />
        <motion.div 
          className="max-w-md p-6 rounded-lg bg-white flex items-start gap-3"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} style={{ color: 'var(--color-primary)' }} />
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>Error Loading Dashboard</h3>
            <p className="text-sm text-gray-600">{bookingsError}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Background />
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
                  <StarRating rating={user.rating_avg} readonly size="md" />
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
            {/* Total Bookings */}
            <motion.div 
              className="rounded-xl p-4 md:p-6"
              style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.08)', border: '2px solid var(--color-secondary)' }}
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={20} style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-sm md:text-base font-semibold" style={{ color: 'var(--color-primary)' }}>
                  {role === "passenger" ? "Bookings Made" : "Bookings Received"}
                </h3>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-800">{totalBookings}</p>
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
                ${(role === "passenger" ? avgAmount : totalAmount).toFixed(2)}
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <motion.div
          className="bg-white rounded-2xl shadow-lg mb-6"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex border-b" style={{ borderColor: 'var(--color-secondary)' }}>
            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === "bookings" ? "border-b-2" : ""
              }`}
              style={{
                color: activeTab === "bookings" ? 'var(--color-primary)' : '#718096',
                borderColor: activeTab === "bookings" ? 'var(--color-primary)' : 'transparent'
              }}
            >
              <CreditCard size={20} />
              Bookings
            </button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === "reviews" ? "border-b-2" : ""
              }`}
              style={{
                color: activeTab === "reviews" ? 'var(--color-primary)' : '#718096',
                borderColor: activeTab === "reviews" ? 'var(--color-primary)' : 'transparent'
              }}
            >
              <MessageSquare size={20} />
              Reviews ({user?.rating_count || 0})
            </button>
          </div>
        </motion.div>

        {/* Bookings Section */}
        {activeTab === "bookings" && (
        <motion.div 
          className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
          style={{ border: '1px solid var(--color-secondary)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl md:text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {role === "passenger" ? "My Bookings" : "Received Bookings"}
            </h2>
            {bookingsLoading && (
              <span className="text-sm text-gray-500 flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Loading...
              </span>
            )}
          </div>

          {/* Bookings List */}
          {filteredBookings.length > 0 ? (
            <div className="space-y-4">
              {filteredBookings.map((booking: Booking, index: number) => {
                const statusColors: Record<BookingStatus, { bg: string; text: string; icon: typeof Clock }> = {
                  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
                  confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
                  completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
                  cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
                };

                const statusInfo = statusColors[booking.status];
                const StatusIcon = statusInfo.icon;
                const isActive = booking.status === 'pending' || booking.status === 'confirmed';
                const isDriver = user?.id === booking.ride?.driver_id;

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
                          <span>{booking.ride?.origin_label || 'Unknown'}</span>
                          <span className="text-gray-400">→</span>
                          <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                          <span>{booking.ride?.destination_label || 'Unknown'}</span>
                        </div>

                        {/* Booking Details */}
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{booking.ride?.departure_time ? new Date(booking.ride.departure_time).toLocaleString() : 'Unknown'}</span>
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
                            Booked: {new Date(booking.booked_at).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Price + Actions */}
                      <div className="text-right flex flex-col items-end gap-3">
                        <div>
                          <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--color-accent)' }}>
                            ${booking.amount_paid.toFixed(2)}
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
                                    fetchMyBookings(role);
                                  } catch (err: any) {
                                    console.error("Failed to confirm booking:", err);
                                  }
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                style={{ backgroundColor: 'var(--color-accent)' }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Confirm
                              </motion.button>
                            )}

                            {/* Both can cancel/complete */}
                            {booking.status === 'confirmed' && (
                              <motion.button
                                onClick={async () => {
                                  try {
                                    await updateBookingStatus(booking.id, { status: 'completed' });
                                    fetchMyBookings(role);
                                  } catch (err: any) {
                                    console.error("Failed to complete booking:", err);
                                  }
                                }}
                                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                                style={{ backgroundColor: 'var(--color-primary)' }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Complete
                              </motion.button>
                            )}

                            <motion.button
                              onClick={async () => {
                                try {
                                  await cancelBooking(booking.id);
                                  fetchMyBookings(role);
                                } catch (err: any) {
                                  console.error("Failed to cancel booking:", err);
                                }
                              }}
                              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Cancel
                            </motion.button>
                          </div>
                        )}

                        {/* Write Review Button for completed bookings */}
                        {booking.status === 'completed' && (
                          <motion.button
                            onClick={() => handleWriteReview(booking)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2"
                            style={{ backgroundColor: 'var(--color-accent)' }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <MessageSquare size={16} />
                            Write Review
                          </motion.button>
                        )}
                        
                        {/* View Details link - always available when ride exists */}
                        {booking.ride && (
                          <div className="mt-3 text-right">
                            <Link
                              to={`/trip/${booking.ride.id}`}
                              className="inline-block px-4 py-2 rounded-lg text-sm font-medium underline"
                              style={{ color: 'var(--color-accent)' }}
                            >
                              View Details
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <CreditCard size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {role === "passenger" ? "No bookings yet. Start by searching for rides!" : "No bookings received yet."}
              </p>
            </div>
          )}
        </motion.div>
        )}

        {/* Reviews Section */}
        {activeTab === "reviews" && user && (
          <motion.div
            className="bg-white rounded-2xl shadow-lg p-6 md:p-8"
            style={{ border: '1px solid var(--color-secondary)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
                My Reviews
              </h2>
              <p className="text-sm text-gray-600">
                Reviews you've received from other users
              </p>
            </div>
            <ReviewsList userId={user.id} />
          </motion.div>
        )}
      </div>

      {/* Review Modal */}
      {selectedBookingForReview && (
        <ReviewFormModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedBookingForReview(null);
          }}
          rideId={selectedBookingForReview.ride_id}
          revieweeId={
            role === "passenger"
              ? selectedBookingForReview.ride?.driver_id || ""
              : selectedBookingForReview.passenger_id
          }
          revieweeName={
            role === "passenger"
              ? "the driver"
              : selectedBookingForReview.passenger?.full_name || "the passenger"
          }
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}

