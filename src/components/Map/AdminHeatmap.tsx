"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

interface AdminHeatmapProps {
  reports: any[];
}

function HeatLayer({ reports }: { reports: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!reports || reports.length === 0) return;

    // Prepare data for leaflet.heat: [[lat, lng, intensity], ...]
    const heatData = reports.map((r) => [
      r.location.coordinates[1], // lat
      r.location.coordinates[0], // lng,
      r.riskLevel === "HIGH" ? 1.0 : r.riskLevel === "MEDIUM" ? 0.5 : 0.2,
    ]);

    const heatLayer = (L as any).heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [reports, map]);

  return null;
}

export default function AdminHeatmap({ reports }: AdminHeatmapProps) {
  return (
    <MapContainer
      center={[6.5244, 3.3792]} 
      zoom={11}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <HeatLayer reports={reports} />
    </MapContainer>
  );
}
