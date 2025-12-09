/**
 * RideMap Component
 * 
 * A reusable map component for displaying ride origin and destination markers.
 * Uses OpenStreetMap tiles via react-leaflet for interactive map display.
 * 
 * Features:
 * - Displays origin and destination markers with custom colors
 * - Auto-fits bounds to show both markers
 * - Optional route line between points
 * - Responsive design matching site theme
 * - Graceful handling of missing/invalid coordinates
 * 
 * @example
 * ```tsx
 * <RideMap
 *   originLat={43.6532}
 *   originLng={-79.3832}
 *   destinationLat={43.7}
 *   destinationLng={-79.4}
 *   originLabel="Downtown Toronto"
 *   destinationLabel="Pearson Airport"
 *   showRoute={true}
 * />
 * ```
 */

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import { Icon, LatLngBounds } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { MapPin, MapPinned, AlertCircle } from 'lucide-react';
import { hasValidCoordinates } from '../utils/geocoding';
import 'leaflet/dist/leaflet.css';

/**
 * Props for the RideMap component
 */
interface RideMapProps {
  /** Origin latitude coordinate */
  originLat?: number | null;
  /** Origin longitude coordinate */
  originLng?: number | null;
  /** Destination latitude coordinate */
  destinationLat?: number | null;
  /** Destination longitude coordinate */
  destinationLng?: number | null;
  /** Optional label for origin marker popup */
  originLabel?: string;
  /** Optional label for destination marker popup */
  destinationLabel?: string;
  /** Whether to show a route line between origin and destination */
  showRoute?: boolean;
  /** Height of the map container (default: "300px") */
  height?: string;
  /** CSS class name for the container */
  className?: string;
}

/**
 * Helper component to auto-fit map bounds to show all markers
 * Must be used inside MapContainer
 */
function MapBoundsController({ 
  bounds 
}: { 
  bounds: LatLngBounds | null 
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      // Fit map to show all markers with some padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);

  return null;
}

/**
 * Create custom map marker icons with themed colors
 * These match the site's color scheme
 */
function createCustomIcon(color: 'primary' | 'accent'): Icon {
  // Use inline SVG for custom colored markers
  const svgColor = color === 'primary' ? '#fc4a1a' : '#3bbdca';
  
  const svgIcon = `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11 16 26 16 26s16-15 16-26C32 7.163 24.837 0 16 0z" 
            fill="${svgColor}" 
            stroke="white" 
            stroke-width="2"/>
      <circle cx="16" cy="16" r="6" fill="white"/>
    </svg>
  `;

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -42],
  });
}

/**
 * RideMap Component
 * 
 * Displays an interactive map with origin and destination markers for a ride.
 * Automatically handles coordinate validation and map bounds adjustment.
 */
export default function RideMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originLabel = 'Origin',
  destinationLabel = 'Destination',
  showRoute = true,
  height = '300px',
  className = '',
}: RideMapProps) {
  // Validate coordinates
  const hasOrigin = hasValidCoordinates(originLat, originLng);
  const hasDestination = hasValidCoordinates(destinationLat, destinationLng);
  const hasAnyCoordinates = hasOrigin || hasDestination;

  // State for custom icons (triggers re-render when created)
  const [originIcon, setOriginIcon] = useState<Icon | null>(null);
  const [destinationIcon, setDestinationIcon] = useState<Icon | null>(null);

  // Create icons on first render
  useEffect(() => {
    setOriginIcon(createCustomIcon('accent'));
    setDestinationIcon(createCustomIcon('primary'));
  }, []);

  // If no valid coordinates, show placeholder
  if (!hasAnyCoordinates) {
    return (
      <div 
        className={`rounded-lg overflow-hidden flex items-center justify-center ${className}`}
        style={{ 
          height,
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '2px solid var(--color-secondary)'
        }}
      >
        <div className="text-center p-6">
          <AlertCircle 
            size={48} 
            style={{ color: 'var(--color-secondary)', margin: '0 auto 1rem' }} 
          />
          <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
            Location coordinates not available
          </p>
          <p className="text-xs mt-2" style={{ color: '#718096' }}>
            The trip will not be shown on the map
          </p>
        </div>
      </div>
    );
  }

  // Prepare coordinates for map
  const coordinates: LatLngExpression[] = [];
  let bounds: LatLngBounds | null = null;

  if (hasOrigin && originLat != null && originLng != null) {
    coordinates.push([originLat, originLng]);
  }

  if (hasDestination && destinationLat != null && destinationLng != null) {
    coordinates.push([destinationLat, destinationLng]);
  }

  // Calculate bounds to fit all markers
  if (coordinates.length > 0) {
    bounds = new LatLngBounds(coordinates);
  }

  // Default center (used if only showing map with no bounds)
  const defaultCenter: LatLngExpression = coordinates[0] || [43.6532, -79.3832];

  return (
    <div className={className}>
      <div 
        className="rounded-lg overflow-hidden relative"
        style={{ 
          height,
          backgroundColor: 'rgba(255, 255, 255, 0.65)',
          backdropFilter: 'blur(8px)',
          border: '2px solid var(--color-secondary)'
        }}
      >
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          {/* OpenStreetMap tile layer */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-fit bounds controller */}
          {bounds && <MapBoundsController bounds={bounds} />}

          {/* Origin marker */}
          {hasOrigin && originLat != null && originLng != null && originIcon && (
            <Marker 
              position={[originLat, originLng]} 
              icon={originIcon}
              title={originLabel}
            />
          )}

          {/* Destination marker */}
          {hasDestination && destinationLat != null && destinationLng != null && destinationIcon && (
            <Marker 
              position={[destinationLat, destinationLng]} 
              icon={destinationIcon}
              title={destinationLabel}
            />
          )}

          {/* Route line between markers */}
          {showRoute && hasOrigin && hasDestination && coordinates.length === 2 && (
            <Polyline
              positions={coordinates}
              pathOptions={{ 
                color: '#fc4a1a',  // Primary color
                weight: 3,
                opacity: 0.7,
                dashArray: '10, 10'  // Dashed line
              }}
            />
          )}
        </MapContainer>
      </div>

      {/* Legend showing marker meanings - positioned below map */}
      <div 
        className="rounded-lg shadow-md p-2 text-xs mt-2"
        style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid var(--color-secondary)',
          display: 'inline-block'
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} style={{ color: 'var(--color-accent)' }} />
          <span style={{ color: '#4a5568' }}>Origin</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinned size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ color: '#4a5568' }}>Destination</span>
        </div>
      </div>
    </div>
  );
}
