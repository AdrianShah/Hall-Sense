"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { KEELE_CENTER, isOverheat, type Building, type Room } from "@/lib/types";

import "leaflet/dist/leaflet.css";

type Props = {
  buildings: Building[];
  rooms: Room[];
  selectedBuildingId: string | null;
  focusRoomId: string | null;
};

function markerIcon(hot: boolean, selected: boolean) {
  const color = hot ? "#c45c26" : "#1f6b4a";
  const size = selected ? 18 : 14;
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #f7f3eb;box-shadow:0 1px 4px rgba(0,0,0,.35)"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function FocusMap({
  buildings,
  selectedBuildingId,
}: {
  buildings: Building[];
  selectedBuildingId: string | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedBuildingId) {
      map.setView([KEELE_CENTER.lat, KEELE_CENTER.lng], KEELE_CENTER.zoom);
      return;
    }
    const b = buildings.find((x) => x.id === selectedBuildingId);
    if (b) map.setView([b.lat, b.lng], 17);
  }, [selectedBuildingId, buildings, map]);
  return null;
}

export default function CampusMap({
  buildings,
  rooms,
  selectedBuildingId,
  focusRoomId,
}: Props) {
  const roomsByBuilding = useMemo(() => {
    const map = new Map<string, Room[]>();
    for (const room of rooms) {
      const list = map.get(room.buildingId) ?? [];
      list.push(room);
      map.set(room.buildingId, list);
    }
    return map;
  }, [rooms]);

  return (
    <section className="panel overflow-hidden p-0">
      <div className="border-b border-[var(--line)] px-5 py-4">
        <p className="eyebrow">YorkU Keele campus</p>
        <h2 className="section-title mt-1">Building temperatures</h2>
      </div>
      <div className="h-[28rem] w-full">
        <MapContainer
          center={[KEELE_CENTER.lat, KEELE_CENTER.lng]}
          zoom={KEELE_CENTER.zoom}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FocusMap buildings={buildings} selectedBuildingId={selectedBuildingId} />
          {buildings.map((b) => {
            const buildingRooms = roomsByBuilding.get(b.id) ?? [];
            const hotCount = buildingRooms.filter((r) => isOverheat(r.tempC)).length;
            const selected = selectedBuildingId === b.id;
            return (
              <Marker
                key={b.id}
                position={[b.lat, b.lng]}
                icon={markerIcon(hotCount > 0, selected)}
              >
                <Popup>
                  <div className="min-w-[10rem]">
                    <strong>{b.name}</strong>
                    <div className="text-xs opacity-70">{b.code}</div>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm">
                      {buildingRooms.map((r) => (
                        <li
                          key={r.id}
                          style={{
                            fontWeight: focusRoomId === r.id ? 700 : 400,
                            color: isOverheat(r.tempC) ? "#c45c26" : "#1f6b4a",
                          }}
                        >
                          {r.number}: {r.tempC.toFixed(1)}°C
                          {r.source === "live" ? " ●" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}
