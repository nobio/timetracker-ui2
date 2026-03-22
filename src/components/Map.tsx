"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Next.js/Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type Location = {
  lat: number;
  lng: number;
  label?: string;
};

export default function Map({ locations }: { locations: Location[] }) {
  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
        No locations available for this date.
      </div>
    );
  }

  // Default center; will be overridden by FitBounds
  const defaultCenter = locations.length > 0 ? { lat: locations[0].lat, lng: locations[0].lng } : { lat: 0, lng: 0 };

  // Component to fit map bounds to the provided locations
  const FitBounds = () => {
    const map = useMap();
    useEffect(() => {
      if (locations.length > 0) {
        const bounds = locations.map(loc => [loc.lat, loc.lng] as [number, number]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }, [locations, map]);
    return null;
  };

  return (
    <div style={{ height: "400px", width: "100%", position: "relative" }}>
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem", zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds />
        {locations.map((loc, idx) => (
          <Marker key={idx} position={[loc.lat, loc.lng]} icon={icon}>
            {loc.label && <Popup>{loc.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
