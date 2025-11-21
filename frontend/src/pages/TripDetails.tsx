import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Calendar, Users, DollarSign, ArrowLeft, User, CheckCircle, Clock } from "lucide-react";
import { getRide } from "../utils/api";
import { listBookings } from "../utils/api";
import BookingModal from "../components/BookingModal";
import ErrorBoundary from "../components/ErrorBoundary";
import { StarRating } from "../components/StarRating";
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
      <div className="p-6 max-w-4xl mx-auto">
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
        <div className="bg-white p-6 rounded shadow" style={{ border: '1px solid var(--color-secondary)'}}>
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

              {/* Map placeholder */}
              <div className="mt-5 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-secondary)' }}>
                <div style={{ height: 220, background: 'linear-gradient(90deg, rgba(249,250,251,1) 0%, rgba(255,255,255,1) 100%)' }} className="flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <div style={{ width: 120, height: 80, borderRadius: 8, backgroundColor: '#f3f4f6', display: 'inline-block', marginBottom: 8 }}></div>
                    <div className="text-sm">Map placeholder</div>
                    <div className="text-xs text-gray-400">Map will appear here</div>
                  </div>
                </div>
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
                  {bookings.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 p-3 rounded" style={{ backgroundColor: 'rgba(var(--color-primary-rgb),0.03)' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#fff' }} className="flex items-center justify-center border">
                        <User size={20} className="text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{b.passenger?.full_name ?? 'Guest'}</div>
                        <div className="text-xs text-gray-500">{b.seats_reserved} seat{b.seats_reserved>1?'s':''} • {b.status}</div>
                      </div>
                      <div className="text-sm text-gray-500">{b.booked_at ? new Date(b.booked_at).toLocaleString() : ''}</div>
                    </li>
                  ))}
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
    </ErrorBoundary>
  );
}
