"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle } from "lucide-react";
import { sanitizeHTML } from "@/lib/utils-security";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

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

// Fix for default Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface CrimeMapProps {
  mode: "view" | "pick";
  initialPos?: [number, number];
  onLocationSelect?: (pos: [number, number]) => void;
  reports?: any[];
  communityAlerts?: any[];
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      onLocationSelect([e.latlng.lng, e.latlng.lat]);
    },
  });
  return null;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center[1], center[0]], map.getZoom());
  }, [center, map]);
  return null;
}

function LocateButton({ onLocationSelect }: { onLocationSelect?: (pos: [number, number]) => void }) {
  const map = useMap();
  const handleLocate = () => { map.locate({ setView: true, maxZoom: 16 }); };
  useMapEvents({
    locationfound(e) {
      const pos: [number, number] = [e.latlng.lng, e.latlng.lat];
      if (onLocationSelect) onLocationSelect(pos);
    },
    locationerror(e) { console.error("Unable to find location", e); },
  });
  return (
    <div className="absolute bottom-6 right-6 z-[1000]">
      <Button onClick={handleLocate} className="rounded-full w-12 h-12 p-0 shadow-xl bg-background text-foreground hover:bg-accent">
        <MapPin className="w-6 h-6" />
      </Button>
    </div>
  );
}

function MarkerClusterLayer({ reports }: { reports: any[] }) {
  const map = useMap();
  const [clusterGroup, setClusterGroup] = useState<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!reports || reports.length === 0) return;
    const group = (L as any).markerClusterGroup();
    reports.forEach((report) => {
      const marker = L.marker([report.location.coordinates[1], report.location.coordinates[0]]);
      marker.bindPopup(`
        <div class="p-1">
          <strong class="block text-sm">${sanitizeHTML(report.type)}</strong>
          <p class="text-xs text-muted-foreground">${sanitizeHTML(report.description)}</p>
          <div class="mt-2 text-[10px] font-bold text-green-600">✓ Officially Verified</div>
        </div>
      `);
      group.addLayer(marker);
    });
    group.addTo(map);
    setClusterGroup(group);
    return () => { if (group) map.removeLayer(group); };
  }, [reports, map]);
  return null;
}

function CommunityAlertLayer({ alerts }: { alerts: any[] }) {
  const map = useMap();
  const [alertGroup, setAlertGroup] = useState<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const group = L.layerGroup();
    alerts.forEach((alert) => {
      const marker = L.marker([alert.location.coordinates[1], alert.location.coordinates[0]], { icon: communityIcon });
      marker.bindPopup(`
        <div class="p-1 text-center">
          <div class="flex items-center justify-center gap-1 text-orange-600 font-bold text-sm mb-1">
            <AlertTriangle className="w-3 h-3" /> Community Alert
          </div>
          <p class="text-xs font-medium">${sanitizeHTML(alert.type)}</p>
          <p class="text-[10px] text-muted-foreground mt-1">
            Reported by ${alert.reportCount} citizens. <br/>
            <span className="italic">Awaiting official verification.</span>
          </p>
        </div>
      `);
      group.addLayer(marker);
    });
    group.addTo(map);
    setAlertGroup(group);
    return () => { if (group) map.removeLayer(group); };
  }, [alerts, map]);
  return null;
}

export default function CrimeMap({ mode, initialPos = [3.3792, 6.5244], onLocationSelect, reports = [], communityAlerts = [] }: CrimeMapProps) {
  const [position, setPosition] = useState<[number, number]>(initialPos);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude, latitude } = pos.coords;
        setPosition([longitude, latitude]);
        if (onLocationSelect) onLocationSelect([longitude, latitude]);
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true }
    );
  }, []);

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[position[1], position[0]]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={position} />
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
            <Marker position={[position[1], position[0]]}><Popup>Incident Location</Popup></Marker>
          </>
        )}
        {mode === "view" && (
          <>
            <MarkerClusterLayer reports={reports} />
            <CommunityAlertLayer alerts={communityAlerts} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
