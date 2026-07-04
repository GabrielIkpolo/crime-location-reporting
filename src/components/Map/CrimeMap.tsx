"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

// Fix for default Leaflet marker icons in Next.js
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
  
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 16 });
  };

  useMapEvents({
    locationfound(e) {
      const pos: [number, number] = [e.latlng.lng, e.latlng.lat];
      if (onLocationSelect) onLocationSelect(pos);
    },
    locationerror(e) {
      console.error("Unable to find your location", e);
    },
  });

  return (
    <div className="absolute bottom-6 right-6 z-[1000]">
      <Button 
        onClick={handleLocate}
        className="rounded-full w-12 h-12 p-0 shadow-xl bg-background text-foreground hover:bg-accent"
        title="Center on my location"
      >
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
          <strong class="block">${report.type}</strong>
          <p class="text-xs">${report.description}</p>
        </div>
      `);
      group.addLayer(marker);
    });

    group.addTo(map);
    setClusterGroup(group);

    return () => {
      if (group) map.removeLayer(group);
    };
  }, [reports, map]);

  return null;
}

export default function CrimeMap({ mode, initialPos = [3.3792, 6.5244], onLocationSelect, reports = [] }: CrimeMapProps) {
  const [position, setPosition] = useState<[number, number]>(initialPos);

  useEffect(() => {
    // Auto-locate user on load
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
      <MapContainer
        center={[position[1], position[0]]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
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
            <Marker position={[position[1], position[0]]}>
              <Popup>Incident Location</Popup>
            </Marker>
          </>
        )}

        {mode === "view" && <MarkerClusterLayer reports={reports} />}
      </MapContainer>
    </div>
  );
}
