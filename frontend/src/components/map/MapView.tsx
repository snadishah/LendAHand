import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import type { Task, TaskStatus } from "../../types";

const DEFAULT_CENTER: [number, number] = [31.5204, 74.3587]; // Lahore

const STATUS_COLOR: Record<TaskStatus, string> = {
  OPEN: "#0A0A0A",
  IN_PROGRESS: "#595959",
  SUBMITTED: "#2E2E2E",
  DONE: "#AEAAA1",
  CANCELLED: "#D0CDC4",
  DISPUTED: "#7A756B",
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:26px;height:26px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);
    "></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26],
  });
}

const meIcon = L.divIcon({
  className: "",
  html: `<div class="you-are-here-dot" style="
    width:16px;height:16px;border-radius:50%;background:#0A0A0A;border:3px solid white;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/**
 * Leaflet measures its container once at mount, which can happen before a
 * flex-based layout has settled — leaving part of the tile grid unrendered
 * until a window resize. Re-measure after layout settles and whenever the
 * container's size actually changes.
 */
function InvalidateSizeOnLayout() {
  const map = useMap();

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => map.invalidateSize());
    });

    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

function RecenterOnChange({ center }: { center: [number, number] }) {
  const map = useMap();
  useMemo(() => {
    map.setView(center, map.getZoom());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center[0], center[1]]);
  return null;
}

interface MapViewProps {
  tasks: Task[];
  userLocation?: { lat: number; lng: number } | null;
}

export function MapView({ tasks, userLocation }: MapViewProps) {
  const navigate = useNavigate();

  const withCoords = tasks.filter((t) => t.latitude != null && t.longitude != null);
  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : withCoords.length
    ? [withCoords[0].latitude as number, withCoords[0].longitude as number]
    : DEFAULT_CENTER;

  return (
    <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <InvalidateSizeOnLayout />
      <RecenterOnChange center={center} />

      {userLocation && (
        <Marker position={[userLocation.lat, userLocation.lng]} icon={meIcon}>
          <Popup>📍 You are here</Popup>
        </Marker>
      )}

      {withCoords.map((task) => (
        <Marker
          key={task.id}
          position={[task.latitude as number, task.longitude as number]}
          icon={pinIcon(STATUS_COLOR[task.status])}
          eventHandlers={{ click: () => navigate(`/tasks/${task.id}`) }}
        >
          <Popup>
            <p className="font-semibold">
              {task.category.icon} {task.title}
            </p>
            <p>Rs. {task.budget.toFixed(0)}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
