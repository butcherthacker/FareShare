/**
 * BookingModal Component
 * Modal for creating a new booking (claiming seats in a ride)
 * Displays ride details, seat selection, and booking confirmation
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    MapPin,
    Calendar,
    Users,
    DollarSign,
    AlertCircle,
    CheckCircle,
    Loader2,
} from 'lucide-react';
import { useBookings } from '../hooks/useBookings';
import { StarRating } from './StarRating';
import type { SearchResultRide } from '../types';

interface BookingModalProps {
    ride: SearchResultRide | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function BookingModal({
    ride,
    isOpen,
    onClose,
    onSuccess,
}: BookingModalProps) {
    const { createBooking, isLoading, error } = useBookings();
    const [seatsToBook, setSeatsToBook] = useState(1);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState<string | null>(null);

    // Reset state when modal opens/closes
    const handleClose = () => {
        setSeatsToBook(1);
        setBookingSuccess(false);
        setBookingError(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!ride) return;

        try {
            setBookingError(null);
            await createBooking({
                ride_id: ride.id,
                seats_reserved: seatsToBook,
            });

            setBookingSuccess(true);

            // Close modal after short delay
            setTimeout(() => {
                handleClose();
                onSuccess?.();
            }, 2000);
        } catch (err: any) {
            setBookingError(err.detail || err.message || 'Failed to create booking');
        }
    };

    if (!ride) return null;

    const totalCost = ride.price * seatsToBook;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop - raised zIndex so it sits above maps (Leaflet panes use high z-index) */}
                    <motion.div
                        className="fixed inset-0"
                        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', zIndex: 1090 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed inset-0 flex items-center justify-center p-4"
                        style={{ zIndex: 1100 }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                            style={{ border: '2px solid var(--color-secondary)' }}
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div
                                className="flex items-center justify-between p-6 border-b"
                                style={{ borderColor: 'var(--color-secondary)' }}
                            >
                                <h2
                                    className="text-2xl font-bold"
                                    style={{ color: 'var(--color-primary)' }}
                                >
                                    {bookingSuccess ? 'Booking Confirmed!' : 'Book This Ride'}
                                </h2>
                                <button
                                    onClick={handleClose}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6">
                                {bookingSuccess ? (
                                    /* Success Message */
                                    <motion.div
                                        className="text-center py-8"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                    >
                                        <div className="flex justify-center mb-4">
                                            <CheckCircle
                                                size={64}
                                                style={{ color: 'var(--color-accent)' }}
                                            />
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-primary)' }}>
                                            Booking Successful!
                                        </h3>
                                        <p className="text-gray-600">
                                            Your booking has been created. The driver will confirm shortly.
                                        </p>
                                        <p className="text-sm text-gray-500 mt-4">
                                            Check the Dashboard to view and manage your bookings.
                                        </p>
                                    </motion.div>
                                ) : (
                                    <>
                                        {/* Ride Details */}
                                        <div
                                            className="rounded-xl p-4 mb-6"
                                            style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.05)' }}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <MapPin size={18} style={{ color: 'var(--color-accent)' }} />
                                                <span className="font-semibold text-gray-800">
                                                    {ride.from || 'Unknown'}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <MapPin size={18} style={{ color: 'var(--color-primary)' }} />
                                                <span className="font-semibold text-gray-800">
                                                    {ride.to || 'Unknown'}
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-sm text-gray-600">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} />
                                                    <span>{new Date(ride.depart_at).toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} />
                                                    <span>{ride.seats_available} seat(s) available</span>
                                                </div>
                                                {ride.driver_rating ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs">Driver:</span>
                                                        <StarRating rating={ride.driver_rating} readonly size="sm" />
                                                        <span className="text-xs">
                                                            {ride.driver_rating.toFixed(1)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500">
                                                        Driver: No ratings yet
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Booking Form */}
                                        <form onSubmit={handleSubmit}>
                                            {/* Seat Selection */}
                                            <div className="mb-6">
                                                <label
                                                    className="block text-sm font-medium mb-2"
                                                    style={{ color: 'var(--color-primary)' }}
                                                >
                                                    <Users size={16} className="inline mr-2" />
                                                    Number of Seats
                                                </label>
                                                <select
                                                    value={seatsToBook}
                                                    onChange={(e) => setSeatsToBook(Number(e.target.value))}
                                                    className="w-full p-3 rounded-lg focus:outline-none focus:ring-2"
                                                    style={{
                                                        border: '1px solid var(--color-secondary)',
                                                    }}
                                                    disabled={isLoading}
                                                >
                                                    {Array.from(
                                                        { length: Math.min(ride.seats_available, 5) },
                                                        (_, i) => i + 1
                                                    ).map((num) => (
                                                        <option key={num} value={num}>
                                                            {num} seat{num > 1 ? 's' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Cost Summary */}
                                            <div
                                                className="rounded-xl p-4 mb-6"
                                                style={{ backgroundColor: 'rgba(var(--color-accent-rgb), 0.08)' }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-gray-600">Price per seat:</span>
                                                    <span className="font-semibold text-gray-800">
                                                        ${ride.price.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-gray-600">Number of seats:</span>
                                                    <span className="font-semibold text-gray-800">
                                                        {seatsToBook}
                                                    </span>
                                                </div>
                                                <div
                                                    className="flex items-center justify-between pt-3 border-t mt-3"
                                                    style={{ borderColor: 'var(--color-secondary)' }}
                                                >
                                                    <span
                                                        className="text-lg font-bold"
                                                        style={{ color: 'var(--color-primary)' }}
                                                    >
                                                        Total Cost:
                                                    </span>
                                                    <span
                                                        className="text-2xl font-bold flex items-center"
                                                        style={{ color: 'var(--color-accent)' }}
                                                    >
                                                        <DollarSign size={20} />
                                                        {totalCost.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Error Message */}
                                            {(bookingError || error) && (
                                                <motion.div
                                                    className="rounded-lg p-4 mb-6 flex items-start gap-3"
                                                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                >
                                                    <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-medium text-red-900">Booking Failed</p>
                                                        <p className="text-sm text-red-700">
                                                            {bookingError || error}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={handleClose}
                                                    className="flex-1 py-3 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                                                    style={{ border: '1px solid var(--color-secondary)' }}
                                                    disabled={isLoading}
                                                >
                                                    Cancel
                                                </button>
                                                <motion.button
                                                    type="submit"
                                                    className="flex-1 py-3 rounded-lg font-semibold text-white transition-opacity flex items-center justify-center gap-2"
                                                    style={{ backgroundColor: 'var(--color-primary)' }}
                                                    disabled={isLoading}
                                                    whileHover={{ scale: isLoading ? 1 : 1.02 }}
                                                    whileTap={{ scale: isLoading ? 1 : 0.98 }}
                                                >
                                                    {isLoading ? (
                                                        <>
                                                            <Loader2 size={20} className="animate-spin" />
                                                            Booking...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={20} />
                                                            Confirm Booking
                                                        </>
                                                    )}
                                                </motion.button>
                                            </div>
                                        </form>

                                        {/* Info Note */}
                                        <div
                                            className="mt-6 p-4 rounded-lg"
                                            style={{ backgroundColor: 'rgba(var(--color-secondary-rgb), 0.1)' }}
                                        >
                                            <p className="text-sm text-gray-600">
                                                <strong>Note:</strong> Your booking will be in "pending" status until
                                                the driver confirms. You'll be able to see and manage your bookings
                                                in the Dashboard.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
