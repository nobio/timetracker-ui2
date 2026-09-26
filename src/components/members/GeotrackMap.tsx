"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Circle, Popup, useMap, Polyline } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { components } from "@/lib/api/schema";
import { format } from "date-fns";

type GeotrackResp = components["schemas"]["GeotrackResp"];

interface GeotrackMapProps {
    data: GeotrackResp[];
    showAccuracy: boolean;
}

// Component to fit map bounds to the provided locations
const FitBounds = ({ data }: { data: GeotrackResp[] }) => {
    const map = useMap();
    useEffect(() => {
        if (data && data.length > 0) {
            const validData = data.filter(loc => loc.latitude && loc.longitude);
            if (validData.length > 0) {
                const bounds = validData.map(loc => [loc.latitude!, loc.longitude!] as [number, number]);
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
            }
        }
    }, [data, map]);
    return null;
};

export default function GeotrackMap({ data, showAccuracy }: GeotrackMapProps) {
    const validData = useMemo(() => {
        return data?.filter(loc => loc.latitude !== undefined && loc.longitude !== undefined) || [];
    }, [data]);

    const { minVelocity, maxVelocity } = useMemo(() => {
        if (validData.length === 0) return { minVelocity: 0, maxVelocity: 0 };
        const velocities = validData.map(d => d.velocity || 0);
        return {
            minVelocity: Math.min(...velocities),
            maxVelocity: Math.max(...velocities)
        };
    }, [validData]);

    const getColorForVelocity = (velocity: number | undefined) => {
        const v = velocity || 0;
        // Map velocity to hue: Green (120) to Red (0)
        let hue = 120;
        if (maxVelocity > minVelocity) {
            const ratio = (v - minVelocity) / (maxVelocity - minVelocity);
            hue = 120 - (ratio * 120);
        }
        return `hsl(${hue}, 70%, 45%)`;
    };

    if (validData.length === 0) {
        return (
            <div className="flex items-center justify-center p-8 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-slate-500 dark:text-slate-400 h-[500px] text-sm">
                No valid geo tracking data available for this time period.
            </div>
        );
    }

    const defaultCenter = { lat: validData[0].latitude!, lng: validData[0].longitude! };

    return (
        <div style={{ height: "500px", width: "100%", position: "relative" }} className="rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <MapContainer
                center={defaultCenter}
                zoom={1}
                style={{ height: "100%", width: "100%", zIndex: 0 }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <FitBounds data={validData} />

                <Polyline
                    positions={validData.map(loc => [loc.latitude!, loc.longitude!] as [number, number])}
                    pathOptions={{ color: '#000000ff', weight: 3, opacity: 0.8 }}
                />

                {validData.map((loc, idx) => {
                    const color = getColorForVelocity(loc.velocity);
                    // Use a small fixed radius if accuracy is disabled or missing
                    const radius = (showAccuracy && loc.accuracy) ? loc.accuracy : 8;
                    // Circle stroke and fill color
                    const pathOptions = { color: color, fillColor: color, fillOpacity: 0.4, weight: 2 };

                    return (
                        <Circle
                            key={`${idx}-${loc.latitude}-${loc.longitude}`}
                            center={[loc.latitude!, loc.longitude!]}
                            radius={radius}
                            pathOptions={pathOptions}
                        >
                            <Popup>
                                <div className="text-sm">
                                    <div className="font-bold mb-1 border-b pb-1">Point {idx + 1}</div>
                                    {loc.date && <div><span className="font-semibold">Time:</span> {format(new Date(loc.date), "dd.MM.yyyy HH:mm:ss")}</div>}
                                    <div><span className="font-semibold">Velocity:</span> {loc.velocity ? loc.velocity.toFixed(2) : 0} m/s</div>
                                    <div><span className="font-semibold">Accuracy:</span> {loc.accuracy ? loc.accuracy.toFixed(1) : "N/A"} m</div>
                                    {loc.source && <div><span className="font-semibold">Source:</span> {loc.source}</div>}
                                </div>
                            </Popup>
                        </Circle>
                    );
                })}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-lg border border-slate-200/80 dark:border-slate-800 z-[400] text-xs">
                <div className="font-semibold mb-1.5 text-slate-800 dark:text-slate-200">Velocity (m/s)</div>
                <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-600 dark:text-slate-400 w-7 text-right">{minVelocity.toFixed(1)}</span>
                    <div className="w-28 sm:w-32 h-2.5 rounded-full bg-gradient-to-r from-[hsl(120,80%,45%)] to-[hsl(0,80%,45%)] shadow-inner"></div>
                    <span className="font-mono text-slate-600 dark:text-slate-400 w-7">{maxVelocity.toFixed(1)}</span>
                </div>
            </div>
        </div>
    );
}
