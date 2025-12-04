import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Search,
  Loader2,
  AlertCircle,
  Filter,
  MapPinned
} from "lucide-react";
import { searchRides } from "../utils/api";
import { Link } from "react-router-dom";
import { geocodeAddress } from "../utils/geocoding";
import BookingModal from "../components/BookingModal";
import { StarRating } from "../components/StarRating";
import RideMap from "../components/RideMap";
import Background from "../components/Background";
import type { SearchResultRide } from "../types";

type Ride = {
  id: string;
  from: string;
  to: string;
  depart_at: string;
  seats_available: number;
  price: number;
  driver_rating?: number;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
};

export default function RidePostAndRequestPage() {
  // Filters
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState<number>(1);
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  // Geocoding state for search filters
  const [searchCoords, setSearchCoords] = useState<{
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
  }>({ origin: null, destination: null });
  const [geocodingStatus, setGeocodingStatus] = useState<{
    origin: 'idle' | 'loading' | 'success' | 'error';
    destination: 'idle' | 'loading' | 'success' | 'error';
  }>({ origin: 'idle', destination: 'idle' });

  // Search results
  const [results, setResults] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce timer id
  const [debounceKey, setDebounceKey] = useState(0);

  // Booking modal state
  const [selectedRideForBooking, setSelectedRideForBooking] = useState<SearchResultRide | null>(null);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  /**
   * Geocode search origin address
   */
  const geocodeSearchOrigin = useCallback(async (address: string) => {
    if (!address || address.trim().length < 3) {
      setSearchCoords(prev => ({ ...prev, origin: null }));
      setGeocodingStatus(prev => ({ ...prev, origin: 'idle' }));
      return;
    }

    setGeocodingStatus(prev => ({ ...prev, origin: 'loading' }));

    try {
      const results = await geocodeAddress(address, 1);
      
      if (results.length > 0) {
        const { lat, lon } = results[0];
        setSearchCoords(prev => ({ ...prev, origin: { lat, lng: lon } }));
        setGeocodingStatus(prev => ({ ...prev, origin: 'success' }));
      } else {
        setSearchCoords(prev => ({ ...prev, origin: null }));
        setGeocodingStatus(prev => ({ ...prev, origin: 'error' }));
      }
    } catch (error) {
      console.error('Search origin geocoding error:', error);
      setSearchCoords(prev => ({ ...prev, origin: null }));
      setGeocodingStatus(prev => ({ ...prev, origin: 'error' }));
    }
  }, []);

  /**
   * Geocode search destination address
   */
  const geocodeSearchDestination = useCallback(async (address: string) => {
    if (!address || address.trim().length < 3) {
      setSearchCoords(prev => ({ ...prev, destination: null }));
      setGeocodingStatus(prev => ({ ...prev, destination: 'idle' }));
      return;
    }

    setGeocodingStatus(prev => ({ ...prev, destination: 'loading' }));

    try {
      const results = await geocodeAddress(address, 1);
      
      if (results.length > 0) {
        const { lat, lon } = results[0];
        setSearchCoords(prev => ({ ...prev, destination: { lat, lng: lon } }));
        setGeocodingStatus(prev => ({ ...prev, destination: 'success' }));
      } else {
        setSearchCoords(prev => ({ ...prev, destination: null }));
        setGeocodingStatus(prev => ({ ...prev, destination: 'error' }));
      }
    } catch (error) {
      console.error('Search destination geocoding error:', error);
      setSearchCoords(prev => ({ ...prev, destination: null }));
      setGeocodingStatus(prev => ({ ...prev, destination: 'error' }));
    }
  }, []);

  /**
   * Debounced geocoding for origin
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      geocodeSearchOrigin(origin);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [origin, geocodeSearchOrigin]);

  /**
   * Debounced geocoding for destination
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      geocodeSearchDestination(destination);
    }, 800);

    return () => clearTimeout(timeoutId);
  }, [destination, geocodeSearchDestination]);

  // Trigger search with debounce
  useEffect(() => {
    setError(null);
    setLoading(false);

    const id = window.setTimeout(() => setDebounceKey((k) => k + 1), 450);
    return () => window.clearTimeout(id);
  }, [origin, destination, date, seats, maxPrice, page]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function doSearch() {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = {
          origin: origin || undefined,
          destination: destination || undefined,
          date: date || undefined,
          seats: seats || undefined,
          max_price: maxPrice === "" ? undefined : maxPrice,
          page,
          page_size: 6,
        };

        const data = await searchRides(params as any);

        if (!cancelled) {
          const rides = Array.isArray(data?.rides)
            ? data.rides.map((item: any) => ({
                id: item.id,
                from: item.from ?? item.origin_label ?? "",
                to: item.to ?? item.destination_label ?? "",
                depart_at: item.depart_at ?? item.departure_time,
                seats_available: item.seats_available ?? item.seats ?? 0,
                price: item.price ?? item.price_share ?? 0,
                driver_rating: item.driver_rating ?? item.driver?.rating_avg ?? undefined,
                origin_lat: item.origin_lat ?? null,
                origin_lng: item.origin_lng ?? null,
                destination_lat: item.destination_lat ?? null,
                destination_lng: item.destination_lng ?? null,
              }))
            : [];

          setResults(rides);
          const incomingTotal = typeof data?.total_pages === "number" ? data.total_pages : 1;
          setTotalPages(incomingTotal > 0 ? incomingTotal : 1);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    doSearch();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debounceKey]);

  function resetPagination() {
    setPage(1);
  }

  // Refresh search results after successful booking
  function handleBookingSuccess() {
    setDebounceKey(k => k + 1); // Trigger refresh
  }

  return (
    <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 80px)' }}>
      <Background />
      <div className="max-w-5xl mx-auto">
        {/* Search area */}
        <motion.div 
          className="p-4 rounded mb-4" 
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)', border: '1px solid var(--color-secondary)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-primary)' }}>Search Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <MapPin size={14} />
                Origin
              </label>
              <input 
                value={origin} 
                onChange={(e) => { setOrigin(e.target.value); resetPagination(); }} 
                className="mt-1 w-full rounded p-2 focus:outline-none focus:ring-2" 
                style={{ border: '1px solid var(--color-secondary)' }}
                placeholder="Where from?" 
              />
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <MapPin size={14} style={{ color: 'var(--color-accent)' }} />
                Destination
              </label>
              <input 
                value={destination} 
                onChange={(e) => { setDestination(e.target.value); resetPagination(); }} 
                className="mt-1 w-full rounded p-2 focus:outline-none focus:ring-2" 
                style={{ border: '1px solid var(--color-secondary)' }}
                placeholder="Where to?" 
              />
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <Calendar size={14} />
                Travel Date
              </label>
              <input 
                value={date} 
                onChange={(e) => { setDate(e.target.value); resetPagination(); }} 
                type="date" 
                className="mt-1 w-full rounded p-2 focus:outline-none focus:ring-2" 
                style={{ border: '1px solid var(--color-secondary)' }}
              />
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <Users size={14} />
                Seats
              </label>
              <select 
                value={seats} 
                onChange={(e) => { setSeats(Number(e.target.value)); resetPagination(); }} 
                className="mt-1 w-full rounded p-2 focus:outline-none focus:ring-2" 
                style={{ border: '1px solid var(--color-secondary)' }}
              >
                {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} seat{n>1?"s":""}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium flex items-center gap-1" style={{ color: 'var(--color-primary)' }}>
                <DollarSign size={14} />
                Max Price ($)
              </label>
              <input 
                value={maxPrice} 
                onChange={(e) => { const v = e.target.value; setMaxPrice(v === "" ? "" : Number(v)); resetPagination(); }} 
                type="number" 
                min={0} 
                className="mt-1 w-full rounded p-2 focus:outline-none focus:ring-2" 
                style={{ border: '1px solid var(--color-secondary)' }}
              />
            </div>
            <div className="flex items-end">
              <motion.button 
                onClick={() => { setPage(1); setDebounceKey(k=>k+1); }} 
                className="w-full text-white py-2 rounded font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: 'var(--color-primary)' }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search size={18} />
                Search
              </motion.button>
            </div>
          </div>

          {/* Search Area Preview Map */}
          {(origin || destination) && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPinned size={16} style={{ color: 'var(--color-accent)' }} />
                <h3 className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                  Search Area
                  {(geocodingStatus.origin === 'loading' || geocodingStatus.destination === 'loading') && (
                    <Loader2 size={14} className="inline ml-2 animate-spin" style={{ color: 'var(--color-accent)' }} />
                  )}
                </h3>
              </div>
              
              {(geocodingStatus.origin === 'error' || geocodingStatus.destination === 'error') && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="text-yellow-600" />
                  <span className="text-yellow-800">
                    {geocodingStatus.origin === 'error' && 'Cannot find origin address. '}
                    {geocodingStatus.destination === 'error' && 'Cannot find destination address. '}
                  </span>
                </div>
              )}

              <RideMap
                originLat={searchCoords.origin?.lat}
                originLng={searchCoords.origin?.lng}
                destinationLat={searchCoords.destination?.lat}
                destinationLng={searchCoords.destination?.lng}
                originLabel={origin || 'Origin'}
                destinationLabel={destination || 'Destination'}
                showRoute={true}
                height="200px"
              />
            </div>
          )}
        </motion.div>

        {/* Results / empty / error */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Top pagination (Prev / Next) */}
          <div className="flex items-center justify-between mb-3 p-2 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(8px)' }}>
            <div className="text-sm flex items-center gap-2" style={{ color: '#4a5568', fontWeight: '500' }}>
              <Filter size={14} style={{ color: 'var(--color-accent)' }} />
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded font-medium disabled:opacity-50 transition-all hover:opacity-90"
                style={{
                  border: '1px solid var(--color-secondary)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--color-primary)',
                  fontWeight: '600'
                }}
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p+1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 rounded font-medium disabled:opacity-50 transition-all hover:opacity-90"
                style={{
                  border: '1px solid var(--color-secondary)',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: 'var(--color-primary)',
                  fontWeight: '600'
                }}
              >
                Next
              </button>
            </div>
          </div>
          {loading && (
            <div className="p-6 text-center flex items-center justify-center gap-2" style={{ color: 'var(--color-primary)' }}>
              <Loader2 size={20} className="animate-spin" />
              Loading results…
            </div>
          )}
          
          {error && (
            <motion.div 
              className="p-4 rounded text-white flex items-center gap-2" 
              style={{ backgroundColor: 'rgba(var(--color-primary-rgb), 0.8)' }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <AlertCircle size={20} />
              {error}
            </motion.div>
          )}

          {!loading && !error && results.length === 0 && (
            <motion.div 
              className="p-6 text-center flex flex-col items-center gap-2" 
              style={{ color: '#718096' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Search size={40} style={{ color: 'var(--color-accent)' }} />
              <p>No trips found. Try adjusting your filters.</p>
            </motion.div>
          )}

          <ul className="space-y-3">
            {results.map((r, index) => (
              <motion.li 
                key={r.id} 
                className="rounded p-3 bg-white"
                style={{ border: '1px solid var(--color-secondary)' }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  scale: 1.01,
                  boxShadow: '0 4px 12px rgba(252, 74, 26, 0.15)',
                  borderColor: 'var(--color-primary)'
                }}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
                      <MapPin size={16} />
                      {r.from} → {r.to}
                    </div>
                    <div className="text-sm flex items-center gap-2 mt-1" style={{ color: '#718096' }}>
                      <Calendar size={14} />
                      Departing: {new Date(r.depart_at).toLocaleString()}
                    </div>
                    <div className="text-sm flex items-center gap-2 mt-1" style={{ color: '#718096' }}>
                      <Users size={14} />
                      Seats: {r.seats_available}
                    </div>
                    {r.driver_rating && (
                      <div className="text-sm flex items-center gap-1 mt-1">
                        <StarRating rating={r.driver_rating} readonly size="sm" />
                        <span style={{ color: '#718096' }}>({r.driver_rating.toFixed(1)})</span>
                      </div>
                    )}
                  </div>
                  {/* Right-side compact actions: price, view details, book
                      Removed duplicate 'Seats' and duplicate driver rating which are already
                      shown on the left. Kept UI changes minimal while adding navigation. */}
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-2xl font-bold flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
                      <DollarSign size={18} />
                      {(typeof r.price === 'number' ? r.price : Number(r.price || 0)).toFixed(2)}
                    </div>
                    <div className="flex gap-2">
                      <Link
                        to={`/trip/${r.id}`}
                        className="px-3 py-1 rounded text-sm"
                        style={{ border: '1px solid var(--color-secondary)', color: 'var(--color-primary)' }}
                        title="View ride details"
                      >
                        View details
                      </Link>
                      <button
                        onClick={() => {
                          // Prepare the lightweight ride object BookingModal expects
                          setSelectedRideForBooking({
                            id: r.id,
                            from: r.from,
                            to: r.to,
                            depart_at: r.depart_at,
                            seats_available: r.seats_available,
                            price: r.price,
                            driver_rating: r.driver_rating,
                          } as SearchResultRide);
                          setIsBookingModalOpen(true);
                        }}
                        className="px-3 py-1 rounded text-white font-semibold"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                        title="Book this ride"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trip Route Mini Map */}
                <div className="mt-3">
                  <RideMap
                    originLat={r.origin_lat}
                    originLng={r.origin_lng}
                    destinationLat={r.destination_lat}
                    destinationLng={r.destination_lng}
                    originLabel={r.from}
                    destinationLabel={r.to}
                    showRoute={true}
                    height="180px"
                  />
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Pagination */}
        <motion.div 
          className="flex items-center justify-between p-2 rounded-lg"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.65)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-sm flex items-center gap-2" style={{ color: '#4a5568', fontWeight: '500' }}>
            <Filter size={14} style={{ color: 'var(--color-accent)' }} />
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <motion.button 
              onClick={() => setPage(p => Math.max(1, p-1))} 
              disabled={page <= 1} 
              className="px-3 py-1.5 rounded font-medium disabled:opacity-50 transition-all hover:opacity-90"
              style={{ 
                border: '1px solid var(--color-secondary)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: 'var(--color-primary)',
                fontWeight: '600'
              }}
              whileHover={{ scale: page > 1 ? 1.05 : 1 }}
              whileTap={{ scale: page > 1 ? 0.95 : 1 }}
            >
              Prev
            </motion.button>
            <motion.button 
              onClick={() => setPage(p => Math.min(totalPages, p+1))} 
              disabled={page >= totalPages} 
              className="px-3 py-1.5 rounded font-medium disabled:opacity-50 transition-all hover:opacity-90"
              style={{ 
                border: '1px solid var(--color-secondary)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                color: 'var(--color-primary)',
                fontWeight: '600'
              }}
              whileHover={{ scale: page < totalPages ? 1.05 : 1 }}
              whileTap={{ scale: page < totalPages ? 0.95 : 1 }}
            >
              Next
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        ride={selectedRideForBooking}
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setSelectedRideForBooking(null);
        }}
        onSuccess={handleBookingSuccess}
      />
    </div>
  );
}