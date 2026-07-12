import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { LatLngExpression } from "leaflet";
import type { VehicleLocation, VehicleStatus, GeoPoint } from "@/types/domain";
import { DEFAULT_MAP_CENTER } from "@/lib/constants";

// Fix default icon paths for bundlers.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TILE_URL =
  (import.meta.env.VITE_MAP_TILE_URL as string) || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION =
  (import.meta.env.VITE_MAP_ATTRIBUTION as string) || "© OpenStreetMap contributors";

function statusColor(status: VehicleStatus): string {
  switch (status) {
    case "available":
      return "#16a34a";
    case "on_trip":
      return "#2563eb";
    case "in_shop":
      return "#d97706";
    case "retired":
      return "#dc2626";
  }
}

function markerIcon(status: VehicleStatus): L.DivIcon {
  const color = statusColor(status);
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};color:#fff;border-radius:9999px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid #fff;font-size:12px;font-weight:600;">●</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function FitBounds({ points }: { points: LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export interface FleetMapProps {
  locations?: VehicleLocation[];
  routeSource?: GeoPoint;
  routeDestination?: GeoPoint;
  onMarkerClick?: (loc: VehicleLocation) => void;
  height?: number | string;
  className?: string;
}

export function FleetMap({
  locations = [],
  routeSource,
  routeDestination,
  onMarkerClick,
  height = 480,
  className,
}: FleetMapProps) {
  const points: LatLngExpression[] = [];
  locations.forEach((l) => points.push([l.latitude, l.longitude]));
  if (routeSource) points.push([routeSource.lat, routeSource.lng]);
  if (routeDestination) points.push([routeDestination.lat, routeDestination.lng]);

  const routeLine: LatLngExpression[] | null =
    routeSource && routeDestination
      ? [
          [routeSource.lat, routeSource.lng],
          [routeDestination.lat, routeDestination.lng],
        ]
      : null;

  return (
    <div className={className} style={{ height, width: "100%" }}>
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={6}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        scrollWheelZoom
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        {locations.map((loc) => (
          <Marker
            key={loc.vehicleId}
            position={[loc.latitude, loc.longitude]}
            icon={markerIcon(loc.status)}
            eventHandlers={{ click: () => onMarkerClick?.(loc) }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{loc.registrationNumber}</div>
                <div>Status: {loc.status.replace("_", " ")}</div>
                {loc.tripId && <div>Trip: {loc.tripId}</div>}
                {loc.speedKph != null && <div>Speed: {loc.speedKph} km/h</div>}
                <div className="text-muted-foreground">
                  Updated {new Date(loc.updatedAt).toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        {routeSource && (
          <Marker position={[routeSource.lat, routeSource.lng]}>
            <Popup>Source</Popup>
          </Marker>
        )}
        {routeDestination && (
          <Marker position={[routeDestination.lat, routeDestination.lng]}>
            <Popup>Destination</Popup>
          </Marker>
        )}
        {routeLine && <Polyline positions={routeLine} color="#2563eb" weight={4} opacity={0.7} />}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
