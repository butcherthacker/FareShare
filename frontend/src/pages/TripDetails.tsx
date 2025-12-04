import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Users, DollarSign, ArrowLeft, User, CheckCircle, Clock, MapPin, MessageSquare, Send, X } from "lucide-react";
import { getRide } from "../utils/api";
import { listBookings } from "../utils/api";
import BookingModal from "../components/BookingModal";
import ErrorBoundary from "../components/ErrorBoundary";
import { StarRating } from "../components/StarRating";
import RideMap from "../components/RideMap";
import Background from "../components/Background";
import { useMessages } from "../hooks/useMessages";
import { useAuth } from "../hooks/useAuth";
import type { Ride } from "../types/ride";
import type { SearchResultRide } from "../types";
import type { Booking } from "../types/booking";

export default function TripDetails() {
  const { id } = useParams<{ id: string }>();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  // Messaging state
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<{ id: any; name: string; role: string } | null>(null);
  const [messageText, setMessageText] = useState("");

  const { sendMessage, loading: sendingMessage, error: messageError, clearError } = useMessages();
  const { isAuthenticated } = useAuth();

  function formatApiError(err: any): string {
    if (!err) return 'Unknown error';
    // Prefer .detail (could be string or object)
    if (typeof err.detail === 'string') return err.detail;
    if (typeof err.detail === 'object') return JSON.stringify(err.detail, null, 2);
    if (typeof err.message === 'string') return err.message;
    if (typeof err === 'string') return err;
    try {
      return JSON.stringify(err, null, 2);
    } catch (e) {
      return String(err);
    }
  }

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getRide(id)
      .then((r) => {
        if (!cancelled) setRide(r);
      })
      .catch((err: any) => {
        // eslint-disable-next-line no-console
        console.error('Error fetching ride:', err);
        if (!cancelled) setError(formatApiError(err) || "Failed to load ride");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Fetch bookings for this ride
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setBookingsLoading(true);
    setBookingsError(null);

    (async () => {
      try {
        const res: any = await listBookings({ ride_id: id, page_size: 100 } as any);
        if (!cancelled) setBookings(res.bookings ?? []);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('Error fetching bookings (first attempt):', err);
        const status = err?.statusCode ?? err?.status;
        if (status === 422) {
          // Try alternate query param 'ride'
            try {
            const alt: any = await listBookings({ ride: id, page_size: 100 } as any);
            if (!cancelled) setBookings(alt.bookings ?? []);
          } catch (err2: any) {
            // eslint-disable-next-line no-console
            console.error('Error fetching bookings (fallback):', err2);
            // Final fallback: fetch all bookings and filter client-side
            try {
              const all: any = await listBookings({ page_size: 100 });
              const filtered = (all.bookings ?? []).filter((b: any) => b.ride_id === id || b.ride?.id === id);
              if (!cancelled) setBookings(filtered);
            } catch (err3: any) {
              // eslint-disable-next-line no-console
              console.error('Error fetching bookings (final fallback):', err3);
              if (!cancelled) setBookingsError(formatApiError(err3) || "Failed to load bookings");
            }
          }
        } else {
          if (!cancelled) setBookingsError(formatApiError(err) || "Failed to load bookings");
        }
      } finally {
        if (!cancelled) setBookingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Handle opening message modal
  const handleOpenMessage = (recipient: { id: any; name: string; role: string }) => {
    console.log('handleOpenMessage called with:', recipient);
    setSelectedRecipient(recipient);
    setMessageText("");
    clearError();
    setShowMessageModal(true);
  };

  // Handle sending message
  const handleSendMessage = async () => {
    if (!selectedRecipient || !messageText.trim() || !id) return;

    console.log('Selected recipient:', selectedRecipient);
    console.log('Selected recipient ID:', selectedRecipient.id, 'type:', typeof selectedRecipient.id);

    const response = await sendMessage(
      selectedRecipient.id.toString(),
      messageText.trim(),
      id // Pass ride ID as string (UUID)
    );

    if (response) {
      // Success
      setMessageText("");
      setShowMessageModal(false);
      setSelectedRecipient(null);
      alert(`Message sent to ${selectedRecipient.name}!`);
    } else {
      // Error - error state is already set in the hook
      // The error will be displayed in the modal
    }
  };

  // Convert full Ride into the lightweight shape BookingModal expects
  function toSearchRide(r: Ride | null): SearchResultRide | null {
    if (!r) return null;
    return {
      id: r.id,
      from: r.origin_label ?? null,
      to: r.destination_label ?? null,
      depart_at: r.departure_time,
      seats_available: r.seats_available ?? r.seats_total ?? 0,
      price: (r.price_share ?? 0) as number,
      driver_rating: r.driver?.rating_avg ?? undefined,
      ride_type: r.ride_type,
    } as SearchResultRide;
  }

  return (
    <ErrorBoundary>
      <div className="overflow-y-auto p-6" style={{ height: 'calc(100vh - 80px)' }}>
        <Background />
        <div className="max-w-4xl mx-auto">
        <div className="mb-4">
        <Link to="/ridesearch" className="text-sm flex items-center gap-2" style={{ color: 'var(--color-accent)'}}>
          <ArrowLeft size={14} /> Back to search
        </Link>
      </div>

      {loading && <div>Loading ride details…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && !ride && (
        <div className="text-gray-600">Ride not found.</div>
      )}

      {ride && (
        <div className="rounded-lg p-6 shadow" style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(8px)', border: '1px solid var(--color-secondary)'}}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--color-primary)'}}>
                {ride.origin_label} → {ride.destination_label}
              </h1>
              <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} /> {ride.departure_time ? new Date(ride.departure_time).toLocaleString() : '—'}
                </div>
                <div className="flex items-center gap-2">
                  <Users size={14} /> {ride.seats_available ?? ride.seats_total ?? 0} seats available
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} /> {ride.created_at ? new Date(ride.created_at).toLocaleDateString() : '—'}
                </div>
              </div>

              {/* Trip Route Map */}
              <div className="mt-5">
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--color-primary)'}}>
                  <MapPin size={16} />
                  Trip Route
                </h3>
                <RideMap
                  originLat={ride.origin_lat}
                  originLng={ride.origin_lng}
                  destinationLat={ride.destination_lat}
                  destinationLng={ride.destination_lng}
                  originLabel={ride.origin_label || 'Origin'}
                  destinationLabel={ride.destination_label || 'Destination'}
                  showRoute={true}
                  height="280px"
                />
              </div>

              {ride.notes && (
                <div className="mt-4">
                  <h3 className="font-semibold" style={{ color: 'var(--color-primary)'}}>Notes</h3>
                  <p className="text-gray-700 mt-2">{ride.notes}</p>
                </div>
              )}
            </div>

            <div className="w-full md:w-64 shrink-0">
              <div className="text-right">
                <div className="text-2xl font-bold flex items-center gap-2 justify-end" style={{ color: 'var(--color-accent)'}}>
                  <DollarSign size={20} /> {(ride.price_share ?? 0).toFixed(2)}
                </div>
                {ride.driver && (
                  <div className="mt-4 text-sm text-gray-700 text-left">
                    <div className="font-semibold mb-3">Driver</div>
                    <div className="flex items-center gap-3">
                      <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f3f4f6' }} />
                      <div>
                        <div className="font-medium">{ride.driver.full_name}</div>
                        {ride.driver.rating_avg > 0 ? (
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={ride.driver.rating_avg} readonly size="sm" />
                            <span className="text-xs text-gray-500">
                              {ride.driver.rating_avg.toFixed(1)} ({ride.driver.rating_count || 0})
                            </span>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">No ratings yet</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <button
                    onClick={() => setIsBookingOpen(true)}
                    className="w-full px-4 py-2 rounded font-semibold text-white flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--color-primary)'}}
                  >
                    <CheckCircle size={16} /> Book this ride
                  </button>

                  <Link to="/dashboard" className="mt-3 block w-full text-center px-4 py-2 rounded font-semibold" style={{ border: '1px solid var(--color-secondary)' }}>
                    View my bookings
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bookings summary */}
          <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--color-secondary)' }}>
            <h3 className="text-lg font-semibold" style={{ color: 'var(--color-primary)'}}>Passengers & bookings</h3>

            {bookingsLoading && <div className="text-sm text-gray-500 mt-2">Loading bookings…</div>}
            {bookingsError && <div className="text-sm text-red-600 mt-2">{bookingsError}</div>}

            {!bookingsLoading && bookings.length === 0 && (
              <div className="text-sm text-gray-600 mt-2">No bookings yet for this ride.</div>
            )}

            {!bookingsLoading && bookings.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                  <div>
                    Seats taken: <strong className="text-gray-800">{bookings.reduce((s, b) => s + (b.status === 'cancelled' ? 0 : (b.seats_reserved ?? 0)), 0)}</strong>
                    {' '} / {ride.seats_total ?? ride.seats_available ?? 0}
                  </div>
                  <div>Bookings: {bookings.length}</div>
                </div>

                <ul className="space-y-3">
                  {bookings.map((b) => {
                    return (
                      <li key={b.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'rgba(var(--color-primary-rgb),0.03)' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#fff' }} className="flex items-center justify-center border">
                          <User size={20} className="text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{b.passenger?.full_name ?? 'Guest'}</div>
                          <div className="text-xs text-gray-500">{b.seats_reserved} seat{b.seats_reserved>1?'s':''} • {b.status}</div>
                        </div>
                        <div className="text-sm text-gray-500">{b.booked_at ? new Date(b.booked_at).toLocaleString() : ''}</div>
                        {isAuthenticated && b.passenger && (
                          <button
                            onClick={() => handleOpenMessage({
                              id: b.passenger!.id,
                              name: b.passenger!.full_name || 'Guest',
                              role: 'Passenger'
                            })}
                            className="px-3 py-1 text-sm rounded flex items-center gap-1 hover:opacity-90 transition-opacity"
                            style={{ 
                              backgroundColor: 'var(--color-primary)', 
                              color: 'white'
                            }}
                            title="Send message"
                          >
                            <MessageSquare size={14} />
                            Message
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <BookingModal
        ride={toSearchRide(ride)}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={() => setIsBookingOpen(false)}
      />
        </div>
      </div>

      {/* Message Modal - Outside main container for proper overlay */}
      {showMessageModal && selectedRecipient && (
        <div 
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999
          }}
        >
          <div className="rounded-lg shadow-xl max-w-lg w-full p-6 relative" style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                Send Message to {selectedRecipient.name}
              </h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>Role:</strong> {selectedRecipient.role}
              </p>
              <p className="text-xs text-gray-500">
                Your message will be sent via email. User email addresses are kept private.
              </p>
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2"
              style={{ 
                borderColor: 'var(--color-secondary)',
                minHeight: '150px'
              }}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right mt-1">
              {messageText.length} / 500 characters
            </div>

            {messageError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {messageError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                style={{ 
                  border: '1px solid var(--color-secondary)',
                  color: 'var(--color-primary)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
                className="flex-1 px-4 py-2 rounded-lg font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {sendingMessage ? (
                  'Sending...'
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}


