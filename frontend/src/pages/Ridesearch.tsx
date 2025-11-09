import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  Search,
  ArrowRight,
  Star,
  Loader2,
  AlertCircle,
  Filter
} from "lucide-react";

type Ride = {
  id: string;
  from: string;
  to: string;
  depart_at: string;
  seats_available: number;
  price: number;
  driver_rating?: number;
};

export default function RidePostAndRequestPage() {
  // Filters
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState<number>(1);
  const [maxPrice, setMaxPrice] = useState<number | "">("");

  // Search results
  const [results, setResults] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce timer id
  const [debounceKey, setDebounceKey] = useState(0);

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
        // Build query string
        const params = new URLSearchParams();
        if (origin) params.append("origin", origin);
        if (destination) params.append("destination", destination);
        if (date) params.append("date", date);
        if (seats) params.append("seats", String(seats));
        if (maxPrice !== "") params.append("max_price", String(maxPrice));
        params.append("page", String(page));

        const baseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api").replace(/\/$/, "");
        const url = `${baseUrl}/rides/search?${params.toString()}`;

        const resp = await fetch(url, { signal: controller.signal });
        if (!resp.ok) {
          const txt = await resp.text().catch(() => "");
          throw new Error(txt || `Server returned ${resp.status}`);
        }

        const data = await resp.json().catch(() => null);

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

  return (
    <div className="overflow-y-auto p-4" style={{ height: 'calc(100vh - 80px)', backgroundColor: 'var(--color-background-warm)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Search area */}
        <motion.div 
          className="p-4 rounded mb-4" 
          style={{ backgroundColor: 'white', border: '1px solid var(--color-secondary)' }}
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
        </motion.div>

        {/* Results / empty / error */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
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
                className="rounded p-3 flex justify-between items-center bg-white cursor-pointer"
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
                <div>
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
                    Seats: {r.seats_available} • 
                    <Star size={14} style={{ fill: 'var(--color-secondary)', color: 'var(--color-secondary)' }} />
                    Rating: {r.driver_rating?.toFixed(1) ?? "N/A"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold flex items-center gap-1 justify-end" style={{ color: 'var(--color-primary)' }}>
                    <DollarSign size={18} />
                    {r.price.toFixed(2)}
                  </div>
                  <div className="mt-2">
                    <Link 
                      to={`/trip/${r.id}`} 
                      className="text-sm underline flex items-center gap-1 justify-end transition-colors hover:opacity-80"
                      style={{ color: 'var(--color-accent)' }}
                    >
                      View Details
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* Pagination */}
        <motion.div 
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-sm flex items-center gap-2" style={{ color: '#718096' }}>
            <Filter size={14} style={{ color: 'var(--color-accent)' }} />
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <motion.button 
              onClick={() => setPage(p => Math.max(1, p-1))} 
              disabled={page <= 1} 
              className="px-3 py-1 rounded disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ 
                border: '1px solid var(--color-secondary)',
                backgroundColor: 'white',
                color: 'var(--color-primary)'
              }}
              whileHover={{ scale: page > 1 ? 1.05 : 1 }}
              whileTap={{ scale: page > 1 ? 0.95 : 1 }}
            >
              Prev
            </motion.button>
            <motion.button 
              onClick={() => setPage(p => Math.min(totalPages, p+1))} 
              disabled={page >= totalPages} 
              className="px-3 py-1 rounded disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ 
                border: '1px solid var(--color-secondary)',
                backgroundColor: 'white',
                color: 'var(--color-primary)'
              }}
              whileHover={{ scale: page < totalPages ? 1.05 : 1 }}
              whileTap={{ scale: page < totalPages ? 0.95 : 1 }}
            >
              Next
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
