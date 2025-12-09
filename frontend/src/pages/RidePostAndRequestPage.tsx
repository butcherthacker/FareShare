import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, 
  Calendar, 
  Users, 
  DollarSign, 
  MessageSquare, 
  Car, 
  Star,
  MapPinned,
  Clock,
  CheckCircle2,
  ArrowRight,
  Edit2,
  Trash2,
  XCircle,
  Loader2,
  AlertCircle,
  UserCircle
} from "lucide-react";
import { useRides } from "../hooks/useRides";
import { useAuth } from "../hooks/useAuth";
import { geocodeAddress } from "../utils/geocoding";
import RideMap from "../components/RideMap";
import Background from "../components/Background";
import type { RideCreateData, Ride } from "../types";

type Mode = "rider" | "driver";

/**
 * Form data interface for ride creation
 */
interface RideFormData {
  from: string;
  to: string;
  date: string;
  seats: number;
  cost: number;
  note: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  vehicle_year: number | undefined;
}

/**
 * Editing state interface
 */
interface EditingRide {
  id: string;
  data: RideFormData;
}

/**
 * RidePostAndRequestPage Component
 * Allows users to post ride offers (as driver) or ride requests (as rider)
 * Displays user's current postings/requests below the map
 * Supports creating, updating, and deleting rides
 */
export default function RidePostAndRequestPage() {
  const { user, isAuthenticated } = useAuth();
  const { 
    rides, 
    isLoading, 
    error, 
    createRide, 
    updateRide, 
    deleteRide,
    fetchMyRides,
    clearError
  } = useRides();

  // UI state
  const [mode, setMode] = useState<Mode>("rider");
  const [form, setForm] = useState<RideFormData>({
    from: "",
    to: "",
    date: "",
    seats: 1,
    cost: 0,
    note: "",
    vehicle_make: "",
    vehicle_model: "",
    vehicle_color: "",
    vehicle_year: undefined,
  });
  const [coords, setCoords] = useState<{
    origin: { lat: number; lng: number } | null;
    destination: { lat: number; lng: number } | null;
  }>({ origin: null, destination: null });
  const [geocodingStatus, setGeocodingStatus] = useState<{
    origin: 'idle' | 'loading' | 'success' | 'error';
    destination: 'idle' | 'loading' | 'success' | 'error';
  }>({ origin: 'idle', destination: 'idle' });
  const [confirmation, setConfirmation] = useState("");
  const [editingRide, setEditingRide] = useState<EditingRide | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  /**
   * Fetch user's rides on component mount and when user changes
   * Only fetch if user is authenticated - don't show errors on initial load
   */
  useEffect(() => {
    if (isAuthenticated && user && !hasInitialLoad) {
      setHasInitialLoad(true);
      
      // Fetch user's rides in silent mode (won't set error state)
      // This prevents "Not Found" errors from showing on initial page load
      fetchMyRides(undefined, true);
    }
  }, [isAuthenticated, user, hasInitialLoad, fetchMyRides]);

  /**
   * Geocode origin address when it changes
   * Debounced to prevent excessive API calls
   */
  const geocodeOrigin = useCallback(async (address: string) => {
    if (!address || address.trim().length < 3) {
      setCoords(prev => ({ ...prev, origin: null }));
      setGeocodingStatus(prev => ({ ...prev, origin: 'idle' }));
      return;
    }

    setGeocodingStatus(prev => ({ ...prev, origin: 'loading' }));

    try {
      const results = await geocodeAddress(address, 1);
      
      if (results.length > 0) {
        const { lat, lon } = results[0];
        setCoords(prev => ({ ...prev, origin: { lat, lng: lon } }));
        setGeocodingStatus(prev => ({ ...prev, origin: 'success' }));
      } else {
        setCoords(prev => ({ ...prev, origin: null }));
        setGeocodingStatus(prev => ({ ...prev, origin: 'error' }));
      }
    } catch (error) {
      console.error('Origin geocoding error:', error);
      setCoords(prev => ({ ...prev, origin: null }));
      setGeocodingStatus(prev => ({ ...prev, origin: 'error' }));
    }
  }, []);

  /**
   * Geocode destination address when it changes
   * Debounced to prevent excessive API calls
   */
  const geocodeDestination = useCallback(async (address: string) => {
    if (!address || address.trim().length < 3) {
      setCoords(prev => ({ ...prev, destination: null }));
      setGeocodingStatus(prev => ({ ...prev, destination: 'idle' }));
      return;
    }

    setGeocodingStatus(prev => ({ ...prev, destination: 'loading' }));

    try {
      const results = await geocodeAddress(address, 1);
      
      if (results.length > 0) {
        const { lat, lon } = results[0];
        setCoords(prev => ({ ...prev, destination: { lat, lng: lon } }));
        setGeocodingStatus(prev => ({ ...prev, destination: 'success' }));
      } else {
        setCoords(prev => ({ ...prev, destination: null }));
        setGeocodingStatus(prev => ({ ...prev, destination: 'error' }));
      }
    } catch (error) {
      console.error('Destination geocoding error:', error);
      setCoords(prev => ({ ...prev, destination: null }));
      setGeocodingStatus(prev => ({ ...prev, destination: 'error' }));
    }
  }, []);

  /**
   * Debounced effect for geocoding origin
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      geocodeOrigin(form.from);
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [form.from, geocodeOrigin]);

  /**
   * Debounced effect for geocoding destination
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      geocodeDestination(form.to);
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [form.to, geocodeDestination]);

  /**
   * Clear confirmation message after 5 seconds
   */
  useEffect(() => {
    if (confirmation) {
      const timer = setTimeout(() => setConfirmation(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [confirmation]);

  /**
   * Handle form input changes
   */
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Convert form data to API format
   * Uses real coordinates from geocoding results
   */
  const formToRideData = (formData: RideFormData): RideCreateData => {
    const rideData: RideCreateData = {
      ride_type: mode === "driver" ? "offer" : "request",
      origin_label: formData.from,
      destination_label: formData.to,
      // Use geocoded coordinates if available
      origin_lat: coords.origin?.lat,
      origin_lng: coords.origin?.lng,
      destination_lat: coords.destination?.lat,
      destination_lng: coords.destination?.lng,
      departure_time: new Date(formData.date).toISOString(),
      seats_total: formData.seats,
      price_share: formData.cost,
      notes: formData.note || undefined,
    };

    // Add vehicle info only for driver mode (offers)
    if (mode === "driver") {
      rideData.vehicle_make = formData.vehicle_make || undefined;
      rideData.vehicle_model = formData.vehicle_model || undefined;
      rideData.vehicle_color = formData.vehicle_color || undefined;
      rideData.vehicle_year = formData.vehicle_year || undefined;
    }

    return rideData;
  };

  /**
   * Handle form submission - create new ride
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    clearError();

    try {
      const rideData = formToRideData(form);
      const newRide = await createRide(rideData);

      if (newRide) {
        setConfirmation(
          `✅ ${mode === "driver" ? "Ride posted" : "Request sent"} successfully!`
        );
        
        // Reset form
        setForm({
          from: "",
          to: "",
          date: "",
          seats: 1,
          cost: 0,
          note: "",
          vehicle_make: "",
          vehicle_model: "",
          vehicle_color: "",
          vehicle_year: undefined,
        });
        
        // No need to call fetchMyRides() - createRide already updates local state
      }
    } catch (err) {
      console.error("Error creating ride:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Start editing a ride
   */
  const handleEditRide = (ride: Ride) => {
    // Convert ride data back to form format
    const editData: RideFormData = {
      from: ride.origin_label || "",
      to: ride.destination_label || "",
      date: new Date(ride.departure_time).toISOString().slice(0, 16), // Format for datetime-local input
      seats: ride.seats_total,
      cost: ride.price_share,
      note: ride.notes || "",
      vehicle_make: ride.vehicle_make || "",
      vehicle_model: ride.vehicle_model || "",
      vehicle_color: ride.vehicle_color || "",
      vehicle_year: ride.vehicle_year || undefined,
    };

    setEditingRide({ id: ride.id, data: editData });
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Cancel editing
   */
  const handleCancelEdit = () => {
    setEditingRide(null);
  };

  /**
   * Submit edited ride
   */
  const handleUpdateRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRide) return;

    setIsSubmitting(true);
    clearError();

    try {
      const updateData = {
        origin_label: editingRide.data.from,
        destination_label: editingRide.data.to,
        departure_time: new Date(editingRide.data.date).toISOString(),
        seats_total: editingRide.data.seats,
        price_share: editingRide.data.cost,
        notes: editingRide.data.note || undefined,
        vehicle_make: editingRide.data.vehicle_make || undefined,
        vehicle_model: editingRide.data.vehicle_model || undefined,
        vehicle_color: editingRide.data.vehicle_color || undefined,
        vehicle_year: editingRide.data.vehicle_year || undefined,
      };

      const updated = await updateRide(editingRide.id, updateData);

      if (updated) {
        setConfirmation("✅ Ride updated successfully!");
        setEditingRide(null);
        // No need to call fetchMyRides() - updateRide already updates local state
      }
    } catch (err) {
      console.error("Error updating ride:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Delete a ride
   */
  const handleDeleteRide = async (rideId: string) => {
    if (!window.confirm("Are you sure you want to delete this ride?")) {
      return;
    }

    const success = await deleteRide(rideId);
    if (success) {
      setConfirmation("✅ Ride deleted successfully!");
      // No need to call fetchMyRides() - deleteRide already updates local state
    }
  };

  /**
   * Handle edit form changes
   */
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!editingRide) return;
    
    const { name, value } = e.target;
    setEditingRide({
      ...editingRide,
      data: { ...editingRide.data, [name]: value }
    });
  };

  /**
   * Get user's rides filtered by mode
   */
  const getUserRides = () => {
    if (!user) return [];
    
    return rides.filter(ride => {
      const isRequest = ride.ride_type === "request" || ride.status === "requested";
      return mode === "rider" ? isRequest : !isRequest;
    });
  };

  const userRides = getUserRides();
  const currentFormData = editingRide ? editingRide.data : form;
  const isEditing = !!editingRide;

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <Background />
      <div className="max-w-5xl mx-auto w-full">
      {/* Mode Toggle */}
      <motion.div 
        className="flex justify-center mt-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="inline-flex rounded-lg overflow-hidden shadow-sm" style={{ border: '1px solid var(--color-secondary)' }}>
          <motion.button
            type="button"
            onClick={() => {
              setMode("rider");
              setEditingRide(null);
            }}
            className="px-6 py-2 font-medium border-r transition-all flex items-center gap-2"
            style={{
              backgroundColor: mode === "rider" ? 'var(--color-primary)' : 'white',
              color: mode === "rider" ? 'white' : '#4a5568',
              borderRightColor: 'var(--color-secondary)'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Users size={18} />
            Rider
          </motion.button>
          <motion.button
            type="button"
            onClick={() => {
              setMode("driver");
              setEditingRide(null);
            }}
            className="px-6 py-2 font-medium transition-all flex items-center gap-2"
            style={{
              backgroundColor: mode === "driver" ? 'var(--color-primary)' : 'white',
              color: mode === "driver" ? 'white' : '#4a5568'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Car size={18} />
            Driver
          </motion.button>
        </div>
      </motion.div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle size={20} className="text-red-600 shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Form */}
      <motion.form
        onSubmit={isEditing ? handleUpdateRide : handleSubmit}
        className="p-4 bg-white shadow-sm space-y-3 mt-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {isEditing && (
          <div className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Edit2 size={16} />
              Editing ride
            </p>
            <button
              type="button"
              onClick={handleCancelEdit}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <XCircle size={16} />
              Cancel
            </button>
          </div>
        )}

        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-accent)' }} />
          <input
            name="from"
            value={currentFormData.from}
            onChange={isEditing ? handleEditChange : handleChange}
            placeholder="Departure location"
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
            required
          />
        </div>
        
        <div className="relative">
          <MapPinned className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
          <input
            name="to"
            value={currentFormData.to}
            onChange={isEditing ? handleEditChange : handleChange}
            placeholder="Destination"
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
            required
          />
        </div>
        
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-accent)' }} />
          <input
            type="datetime-local"
            name="date"
            value={currentFormData.date}
            onChange={isEditing ? handleEditChange : handleChange}
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
            required
          />
        </div>
        
        <div className="relative">
          <Users className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
          <input
            type="number"
            name="seats"
            value={currentFormData.seats}
            min={1}
            max={10}
            onChange={isEditing ? handleEditChange : handleChange}
            placeholder={mode === "rider" ? "Number of seats needed" : "Available seats"}
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
            required
          />
        </div>
        
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-accent)' }} />
          <input
            type="number"
            step="0.01"
            name="cost"
            value={currentFormData.cost}
            min={0}
            max={9999.99}
            onChange={isEditing ? handleEditChange : handleChange}
            placeholder={mode === "rider" ? "Budget per seat ($)" : "Cost per passenger ($)"}
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
            required
          />
        </div>
        
        {mode === "driver" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            <div className="relative">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
              <input
                type="text"
                name="vehicle_make"
                value={currentFormData.vehicle_make}
                onChange={isEditing ? handleEditChange : handleChange}
                placeholder="Vehicle make (e.g., Toyota)"
                className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
                style={{ 
                  border: '1px solid var(--color-secondary)'
                }}
              />
            </div>
            
            <div className="relative">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
              <input
                type="text"
                name="vehicle_model"
                value={currentFormData.vehicle_model}
                onChange={isEditing ? handleEditChange : handleChange}
                placeholder="Vehicle model (e.g., Camry)"
                className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
                style={{ 
                  border: '1px solid var(--color-secondary)'
                }}
              />
            </div>
            
            <div className="relative">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
              <input
                type="text"
                name="vehicle_color"
                value={currentFormData.vehicle_color}
                onChange={isEditing ? handleEditChange : handleChange}
                placeholder="Vehicle color"
                className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
                style={{ 
                  border: '1px solid var(--color-secondary)'
                }}
              />
            </div>
            
            <div className="relative">
              <Car className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--color-primary)' }} />
              <input
                type="number"
                name="vehicle_year"
                value={currentFormData.vehicle_year || ''}
                onChange={isEditing ? handleEditChange : handleChange}
                placeholder="Vehicle year (e.g., 2020)"
                min={1900}
                max={new Date().getFullYear() + 1}
                className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
                style={{ 
                  border: '1px solid var(--color-secondary)'
                }}
              />
            </div>
          </motion.div>
        )}
        
        <div className="relative">
          <MessageSquare className="absolute left-3 top-3" size={18} style={{ color: 'var(--color-accent)' }} />
          <textarea
            name="note"
            value={currentFormData.note}
            onChange={isEditing ? handleEditChange : handleChange}
            placeholder="Notes or preferences"
            maxLength={500}
            rows={3}
            className="w-full rounded-md p-2 pl-10 focus:outline-none focus:ring-2"
            style={{ 
              border: '1px solid var(--color-secondary)'
            }}
          />
        </div>
        
        <motion.button
          type="submit"
          disabled={isSubmitting}
          className="w-full text-white py-2 rounded-md font-semibold transition-opacity hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--color-primary)' }}
          whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
          whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              {isEditing ? "Updating..." : "Posting..."}
            </>
          ) : (
            <>
              {isEditing ? "Update Ride" : (mode === "rider" ? "Request Ride" : "Post Ride")}
              <ArrowRight size={18} />
            </>
          )}
        </motion.button>
        
        <AnimatePresence>
          {confirmation && (
            <motion.p 
              className="text-center font-medium mt-2 flex items-center justify-center gap-2"
              style={{ color: 'var(--color-accent)' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <CheckCircle2 size={18} />
              {confirmation}
            </motion.p>
          )}
        </AnimatePresence>
      </motion.form>

      {/* Map Preview */}
      <motion.div
        className="rounded-lg p-4"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-secondary)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h3 
          className="text-sm font-semibold mb-2 flex items-center gap-2" 
          style={{ color: 'var(--color-primary)' }}
          initial={{ x: -20 }}
          animate={{ x: 0 }}
        >
          <MapPinned size={18} />
          Route Preview
          {(geocodingStatus.origin === 'loading' || geocodingStatus.destination === 'loading') && (
            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
          )}
        </motion.h3>
          
          {/* Geocoding status indicator */}
          {(geocodingStatus.origin === 'error' || geocodingStatus.destination === 'error') && (
            <motion.div
              className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs flex items-center gap-2"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle size={14} className="text-yellow-600" />
              <span className="text-yellow-800">
                {geocodingStatus.origin === 'error' && 'Cannot find origin address. '}
                {geocodingStatus.destination === 'error' && 'Cannot find destination address. '}
                Trip will not be shown on map.
              </span>
            </motion.div>
          )}

          <motion.div
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.2 }}
          >
            <RideMap
              originLat={coords.origin?.lat}
              originLng={coords.origin?.lng}
              destinationLat={coords.destination?.lat}
              destinationLng={coords.destination?.lng}
              originLabel={form.from || 'Origin'}
              destinationLabel={form.to || 'Destination'}
              showRoute={true}
              height="256px"
            />
          </motion.div>
      </motion.div>

      {/* Current User's Rides/Requests */}
      <motion.div 
        className="rounded-lg p-4 space-y-3 mt-4"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-secondary)'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-primary)' }}>
          <Clock size={20} />
          {mode === "rider" ? "Your Ride Requests" : "Your Posted Rides"}
        </h3>
          
          {!isAuthenticated ? (
            <motion.div
              className="flex flex-col items-center justify-center py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <UserCircle size={48} style={{ color: 'var(--color-secondary)', marginBottom: '1rem' }} />
              <p className="text-sm" style={{ color: '#718096' }}>
                Please log in to view and manage your rides.
              </p>
            </motion.div>
          ) : isLoading ? (
            <motion.div
              className="flex flex-col items-center justify-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Loader2 size={48} style={{ color: 'var(--color-primary)' }} className="animate-spin" />
              <p className="text-sm mt-4" style={{ color: '#718096' }}>
                Loading your rides...
              </p>
            </motion.div>
          ) : userRides.length === 0 ? (
            <motion.div
              className="flex flex-col items-center justify-center py-8 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Car size={48} style={{ color: 'var(--color-secondary)', marginBottom: '1rem' }} />
              <p className="text-sm" style={{ color: '#718096' }}>
                {mode === "rider" 
                  ? "You haven't requested any rides yet. Create a request above!" 
                  : "You haven't posted any rides yet. Post a ride above!"}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {userRides.map((ride, index) => (
                <motion.div
                  key={ride.id}
                  className="rounded-lg p-4 bg-white shadow-sm"
                  style={{ border: '1px solid var(--color-secondary)' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.01,
                    boxShadow: '0 4px 12px rgba(252, 74, 26, 0.15)',
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin size={16} style={{ color: 'var(--color-accent)' }} />
                        <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                          {ride.origin_label} → {ride.destination_label}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm" style={{ color: '#718096' }}>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(ride.departure_time).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {ride.seats_available}/{ride.seats_total} seats
                        </span>
                        <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--color-primary)' }}>
                          <DollarSign size={14} />
                          ${ride.price_share.toFixed(2)}
                        </span>
                      </div>

                      {mode === "driver" && ride.vehicle_make && (
                        <div className="flex items-center gap-1 text-sm mt-2" style={{ color: '#718096' }}>
                          <Car size={14} />
                          {ride.vehicle_year} {ride.vehicle_make} {ride.vehicle_model}
                          {ride.vehicle_color && ` - ${ride.vehicle_color}`}
                        </div>
                      )}

                      {ride.notes && (
                        <div className="mt-2 text-sm p-2 rounded" style={{ backgroundColor: '#f7fafc', color: '#4a5568' }}>
                          <MessageSquare size={12} className="inline mr-1" />
                          {ride.notes}
                        </div>
                      )}

                      <div className="mt-2">
                        <span 
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: 
                              ride.status === 'open' ? '#d4edda' :
                              ride.status === 'requested' ? '#fff3cd' :
                              ride.status === 'cancelled' ? '#f8d7da' :
                              ride.status === 'completed' ? '#d1ecf1' :
                              '#e2e8f0',
                            color:
                              ride.status === 'open' ? '#155724' :
                              ride.status === 'requested' ? '#856404' :
                              ride.status === 'cancelled' ? '#721c24' :
                              ride.status === 'completed' ? '#0c5460' :
                              '#4a5568'
                          }}
                        >
                          {ride.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {ride.status !== 'completed' && ride.status !== 'cancelled' && (
                      <div className="flex gap-2 ml-4">
                        <motion.button
                          onClick={() => handleEditRide(ride)}
                          className="p-2 rounded-lg hover:bg-blue-50 transition-colors"
                          style={{ color: 'var(--color-primary)' }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Edit ride"
                        >
                          <Edit2 size={18} />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDeleteRide(ride.id)}
                          className="p-2 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          title="Delete ride"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    )}
                  </div>

                  {ride.driver && ride.driver.rating_count > 0 && (
                    <div className="flex items-center gap-2 text-sm pt-3 border-t" style={{ borderColor: 'var(--color-secondary)', color: '#718096' }}>
                      <Star size={14} style={{ fill: 'var(--color-secondary)', color: 'var(--color-secondary)' }} />
                      Rating: {ride.driver.rating_avg.toFixed(1)} ({ride.driver.rating_count} reviews)
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
      </motion.div>
      </div>
    </div>
  );
}
