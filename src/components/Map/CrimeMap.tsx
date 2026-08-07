"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
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

function MarkerClusterLayer({ reports, selectedReportId }: { reports: Report[]; selectedReportId?: string }) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (!reports || reports.length === 0) return;
    const group = L.markerClusterGroup();
    reports.forEach((report) => {
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
        iconAnchor: [iconSize/2, iconSize/2],
      });

      const marker = L.marker([location.coordinates[1], location.coordinates[0]] as [number, number], { icon: customIcon });
      
      marker.on('add', () => {
        const el = marker.getElement();
        if (el) el.style.cursor = 'pointer';
      });

      marker.bindPopup(`
        <div class="p-1 min-w-[200px]">
          <strong class="block text-sm">${sanitizeHTML(report.type)}</strong>
          <p class="text-xs text-muted-foreground mt-1">${sanitizeHTML(report.description)}</p>
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
    return () => { if (group) map.removeLayer(group); };
  }, [reports, map, selectedReportId]);
  return null;
}

function CommunityAlertLayer({ alerts, selectedAlertId }: { alerts: CommunityAlert[]; selectedAlertId?: string }) {
  const map = useMap();
  const alertGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const group = L.layerGroup();
    alerts.forEach((alert) => {
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
          <p class="text-xs font-medium">${sanitizeHTML(alert.type)}</p>
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
    return () => { if (group) map.removeLayer(group); };
  }, [alerts, map, selectedAlertId]);
  return null;
}

export default function CrimeMap({ mode, initialPos = [3.3792, 6.5244], center, onLocationSelect, reports = [], communityAlerts = [], selectedReportId }: CrimeMapProps) {
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
      <MapContainer center={[displayPosition[1], displayPosition[0]]} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapController center={displayPosition} />
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
            <MarkerClusterLayer reports={reports} selectedReportId={selectedReportId} />
            <CommunityAlertLayer alerts={communityAlerts} selectedAlertId={undefined} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
