"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { sanitizeHTML } from "@/lib/utils-security";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Report, CommunityAlert, GeoJSONPoint } from "@/types";

// Custom Icon for Community Alerts (Pulsing Orange)
const communityIcon = L.divIcon({
  className: "custom-div-icon",
  html: `<div class="relative">
            <div class="absolute w-8 h-8 bg-orange-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-8 h-8 bg-orange-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// GPS-style User Location Icon — Distinctive blue pulsing rings (like a radar/GPS indicator)
const userLocationIcon = L.divIcon({
  className: "user-location-marker",
  html: `
    <style>
      .user-location-marker { background: transparent !important; border: none !important; }
      @keyframes gps-pulse-outer {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
        100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
      }
      @keyframes gps-pulse-inner {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0.4; }
      }
      .gps-ring-outer {
        position: absolute;
        top: 50%; left: 50%;
        width: 36px; height: 36px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.3);
        border: 2px solid rgba(59, 130, 246, 0.6);
        animation: gps-pulse-outer 2s ease-out infinite;
      }
      .gps-ring-inner {
        position: absolute;
        top: 50%; left: 50%;
        width: 24px; height: 24px;
        border-radius: 50%;
        background: rgba(59, 130, 246, 0.4);
        border: 2px solid rgba(59, 130, 246, 0.8);
        animation: gps-pulse-inner 2s ease-out infinite 0.3s;
      }
      .gps-core {
        position: absolute;
        top: 50%; left: 50%;
        width: 14px; height: 14px;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        border: 2.5px solid white;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.5), inset 0 1px 2px rgba(255,255,255,0.3);
      }
    </style>
    <div style="position: relative; width: 40px; height: 40px;">
      <div class="gps-ring-outer"></div>
      <div class="gps-ring-inner"></div>
      <div class="gps-core"></div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Fix for default Leaflet marker icons
const DefaultIconPrototype = L.Icon.Default.prototype;
delete (DefaultIconPrototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CrimeMapProps {
  mode: "view" | "pick";
  initialPos?: [number, number];
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (pos: [number, number]) => void;
  reports?: Report[];
  communityAlerts?: CommunityAlert[];
  selectedReportId?: string;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

function MapController({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    const targetZoom = zoom ?? map.getZoom();
    map.setView([center[1], center[0]], targetZoom);
  }, [center, zoom, map]);
  return null;
}

function LocateButton({ onLocationSelect }: { onLocationSelect?: (pos: [number, number]) => void }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLocate = () => {
    if (navigator.geolocation) {
      setLocating(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng: [number, number] = [pos.coords.longitude, pos.coords.latitude];
          map.setView(latlng, 14); // Zoom to user's location at a good level
          if (onLocationSelect) onLocationSelect(latlng);
          setLocating(false);
        },
        (err) => {
          let msg = "Unable to find your location";
          if (err.code === err.PERMISSION_DENIED) {
            msg = "Location access denied. Please enable GPS/location in your browser settings.";
          } else if (err.code === err.TIMEOUT) {
            msg = "Location request timed out. Please try again.";
          }
          setError(msg);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  useMapEvents({
    locationfound(e) {
      const pos: [number, number] = [e.latlng.lng, e.latlng.lat];
      map.setView(pos, 14);
      if (onLocationSelect) onLocationSelect(pos);
      setLocating(false);
    },
    locationerror() {
      // Error already handled in handleLocate via getCurrentPosition
    },
  });

  return (
    <div className="absolute bottom-6 right-6 z-[1000] flex flex-col items-end gap-2">
      {error && (
        <div className="bg-destructive/90 text-destructive-foreground text-xs px-3 py-2 rounded-lg shadow-lg max-w-[250px] animate-in fade-in slide-in-from-bottom-2">
          {error}
        </div>
      )}
      <Button
        onClick={handleLocate}
        disabled={locating}
        className={`rounded-full w-12 h-12 p-0 shadow-xl transition-all ${
          locating ? "animate-pulse bg-primary/80" : "bg-background text-foreground hover:bg-accent"
        }`}
      >
        {locating ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <MapPin className="w-6 h-6" />
        )}
      </Button>
    </div>
  );
}

// GPS-style User Location Marker — Shows user's position on the safety view map
function UserLocationMarker({ position }: { position: [number, number] }) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    // Remove old marker if exists
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create new GPS-style marker at user's location
    const gpsMarker = L.marker([position[1], position[0]], {
      icon: userLocationIcon,
      zIndexOffset: 1000, // Ensure it appears above other markers
      interactive: false, // Not clickable — just a visual indicator
    });

    gpsMarker.bindPopup(`
      <div class="p-2 text-center">
        <div class="text-blue-600 font-bold text-sm mb-1">📍 Your Location</div>
        <div class="text-[10px] text-muted-foreground">
          ${position[0].toFixed(5)}, ${position[1].toFixed(5)}
        </div>
      </div>
    `);

    gpsMarker.addTo(map);
    markerRef.current = gpsMarker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [position, map]);

  return null;
}

function MarkerClusterLayer({ reports, selectedReportId }: { reports: Report[]; selectedReportId?: string }) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!reports || reports.length === 0) return;

    // Pre-sanitize all report data (async, but safe inside useEffect)
    const sanitizePromises = reports.map(async (report) => ({
      ...report,
      type: await sanitizeHTML(report.type),
      description: await sanitizeHTML(report.description),
    }));

    Promise.all(sanitizePromises).then((sanitizedReports) => {
      const group = L.markerClusterGroup();
      sanitizedReports.forEach((report) => {
        const location = report.location as unknown as GeoJSONPoint;

        // Create custom icon based on risk level
        let markerColor = '#22c55e'; // green for LOW
        if (report.riskLevel === 'MEDIUM') markerColor = '#f97316'; // orange
        else if (report.riskLevel === 'HIGH') markerColor = '#ef4444'; // red

        const isSelected = report.id === selectedReportId;
        const iconSize = isSelected ? 28 : 20;

        const customIcon = L.divIcon({
          className: `custom-marker ${isSelected ? 'selected-marker' : ''}`,
          html: `<div style="position:relative; width:${iconSize}px; height:${iconSize}px;">
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:${iconSize-8}px; height:${iconSize-8}px; background:${markerColor}; border-radius:50%; border:2px solid white; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            ${isSelected ? '<div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:' + (iconSize+8) + 'px; height:' + (iconSize+8) + 'px; border:2px solid ' + markerColor + '; border-radius:50%; animation:pulse-ring 1.5s infinite;"></div>' : ''}
          </div>`,
          iconSize: [iconSize, iconSize],
          iconAnchor: [iconSize / 2, iconSize / 2],
        });

        const marker = L.marker([location.coordinates[1], location.coordinates[0]] as [number, number], { icon: customIcon });

        marker.on('add', () => {
          const el = marker.getElement();
          if (el) el.style.cursor = 'pointer';
        });

        marker.bindPopup(`
          <div class="p-1 min-w-[200px]">
            <strong class="block text-sm">${report.type}</strong>
            <p class="text-xs text-muted-foreground mt-1">${report.description}</p>
            <div class="mt-2 flex items-center gap-2">
              <span class="text-[10px] font-bold ${report.riskLevel === 'HIGH' ? 'text-red-600' : report.riskLevel === 'MEDIUM' ? 'text-orange-600' : 'text-green-600'}">${report.riskLevel} Risk</span>
              <span class="text-[10px] font-bold text-green-600">✓ Verified</span>
            </div>
          </div>
        `);
        group.addLayer(marker);
      });
      group.addTo(map);
      clusterGroupRef.current = group;
    });

    return () => {
      const group = clusterGroupRef.current;
      if (group) map.removeLayer(group);
    };
  }, [reports, map, selectedReportId]);
  return null;
}

function CommunityAlertLayer({ alerts, selectedAlertId }: { alerts: CommunityAlert[]; selectedAlertId?: string }) {
  const map = useMap();
  const alertGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;

    // Pre-sanitize all alert data (async, but safe inside useEffect)
    const sanitizePromises = alerts.map(async (alert) => ({
      ...alert,
      type: await sanitizeHTML(alert.type),
    }));

    Promise.all(sanitizePromises).then((sanitizedAlerts) => {
      const group = L.layerGroup();
      sanitizedAlerts.forEach((alert) => {
        const location = alert.location as unknown as GeoJSONPoint;

        const isSelected = alert.id === selectedAlertId;
        const scale = isSelected ? 1.3 : 1;

        const customIcon = L.divIcon({
          className: `custom-alert-marker ${isSelected ? 'selected-alert' : ''}`,
          html: `<div style="position:relative; transform:scale(${scale}); transform-origin:center center;">
            <div class="absolute w-8 h-8 bg-orange-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-8 h-8 bg-orange-600 rounded-full border-2 ${isSelected ? 'border-yellow-400 border-[3px]' : 'border-white'} flex items-center justify-center text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            </div>
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });

        const marker = L.marker([location.coordinates[1], location.coordinates[0]] as [number, number], { icon: customIcon });

        marker.on('add', () => {
          const el = marker.getElement();
          if (el) el.style.cursor = 'pointer';
        });

        marker.bindPopup(`
          <div class="p-1 min-w-[200px]">
            <div class="flex items-center justify-center gap-1 text-orange-600 font-bold text-sm mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Community Alert
            </div>
            <p class="text-xs font-medium">${alert.type}</p>
            <p class="text-[10px] text-muted-foreground mt-1">
              Reported by ${alert.reportCount} citizens. <br/>
              <span class="italic">Awaiting official verification.</span>
            </p>
          </div>
        `);
        group.addLayer(marker);
      });
      group.addTo(map);
      alertGroupRef.current = group;
    });

    return () => {
      const group = alertGroupRef.current;
      if (group) map.removeLayer(group);
    };
  }, [alerts, map, selectedAlertId]);
  return null;
}

export default function CrimeMap({ mode, initialPos = [3.3792, 6.5244], center, zoom, onLocationSelect, reports = [], communityAlerts = [], selectedReportId }: CrimeMapProps) {
  const [position, setPosition] = useState<[number, number]>(initialPos);

  // Update position when center prop changes (from card clicks)
  useEffect(() => {
    if (center) {
      setPosition(center);
    }
  }, [center]);

  // Geolocation: get user's current location on mount
  useEffect(() => {
    let mounted = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latlng: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        if (mounted) {
          setPosition(latlng);
          if (onLocationSelect) onLocationSelect(latlng);
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
    return () => { mounted = false; };
  }, [onLocationSelect]);

  // Extract position value once before JSX to avoid ref access during render
  const displayPosition = useMemo(() => position, [position]);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[displayPosition[1], displayPosition[0]]} zoom={zoom ?? 13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={displayPosition} zoom={zoom} />
        <LocateButton onLocationSelect={(pos) => {
          setPosition(pos);
          if (onLocationSelect) onLocationSelect(pos);
        }} />
        {mode === "pick" && (
          <>
            <LocationMarker onLocationSelect={(pos) => {
              setPosition(pos);
              if (onLocationSelect) onLocationSelect(pos);
            }} />
            <Marker position={[displayPosition[1], displayPosition[0]]}><Popup>Incident Location</Popup></Marker>
          </>
        )}
        {mode === "view" && (
          <>
            {/* GPS-style user location marker — distinct from alerts */}
            <UserLocationMarker position={displayPosition} />
            <MarkerClusterLayer reports={reports} selectedReportId={selectedReportId} />
            <CommunityAlertLayer alerts={communityAlerts} selectedAlertId={undefined} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
