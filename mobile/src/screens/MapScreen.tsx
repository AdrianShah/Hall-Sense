import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { useCampusData } from "../hooks/useCampusData";
import { isOverheat, type Room } from "../lib/types";
import { KEELE_CENTER, LIVE_ROOM_ID, THRESHOLD_C } from "../lib/firebase";

type Props = {
  onOpenRoom: (roomId: string) => void;
  onOpenAlerts: () => void;
};

export function MapScreen({ onOpenRoom, onOpenAlerts }: Props) {
  const { buildings, rooms, latest } = useCampusData();
  const [query, setQuery] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const liveTemp = latest?.t ?? rooms.find((r) => r.id === LIVE_ROOM_ID)?.tempC;
  const liveHot = liveTemp != null ? isOverheat(liveTemp) : false;

  const filteredRooms = useMemo(() => {
    const term = query.trim().toLowerCase();
    const bmap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .filter((room) => {
        if (selectedBuildingId && room.buildingId !== selectedBuildingId) return false;
        if (!term) return true;
        const b = bmap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 6);
  }, [rooms, buildings, query, selectedBuildingId]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>HallSense</Text>
          <Text style={styles.sub}>Keele campus · live + mock rooms</Text>
        </View>
        <Pressable style={styles.alertBtn} onPress={onOpenAlerts}>
          <Text style={styles.alertBtnText}>Alerts</Text>
        </Pressable>
      </View>

      <View style={[styles.liveBanner, liveHot ? styles.liveHot : styles.liveOk]}>
        <Text style={styles.liveLabel}>Vari Hall A (live)</Text>
        <Text style={styles.liveTemp}>
          {liveTemp != null ? `${liveTemp.toFixed(1)}°C` : "—"} · threshold {THRESHOLD_C}°C
        </Text>
      </View>

      <MapView style={styles.map} initialRegion={KEELE_CENTER}>
        {buildings.map((b) => {
          const buildingRooms = rooms.filter((r) => r.buildingId === b.id);
          const hot = buildingRooms.some((r) => isOverheat(r.tempC));
          return (
            <Marker
              key={b.id}
              coordinate={{ latitude: b.lat, longitude: b.lng }}
              pinColor={hot ? "#c45c26" : "#1f6b4a"}
              onPress={() => setSelectedBuildingId(b.id)}
            >
              <Callout onPress={() => onOpenRoom(buildingRooms[0]?.id ?? LIVE_ROOM_ID)}>
                <View style={{ minWidth: 140 }}>
                  <Text style={{ fontWeight: "700" }}>{b.name}</Text>
                  <Text>{buildingRooms.length} rooms</Text>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.sheet}>
        <TextInput
          style={styles.search}
          placeholder="Search building or room"
          placeholderTextColor="#8a968f"
          value={query}
          onChangeText={setQuery}
        />
        <View style={styles.chips}>
          <Chip
            label="All"
            active={!selectedBuildingId}
            onPress={() => setSelectedBuildingId(null)}
          />
          {buildings.map((b) => (
            <Chip
              key={b.id}
              label={b.code}
              active={selectedBuildingId === b.id}
              onPress={() => setSelectedBuildingId(b.id)}
            />
          ))}
        </View>
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 160 }}
          renderItem={({ item }) => (
            <RoomRow
              room={item}
              buildingCode={buildings.find((b) => b.id === item.buildingId)?.code ?? ""}
              onPress={() => onOpenRoom(item.id)}
            />
          )}
        />
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function RoomRow({
  room,
  buildingCode,
  onPress,
}: {
  room: Room;
  buildingCode: string;
  onPress: () => void;
}) {
  const hot = isOverheat(room.tempC);
  return (
    <Pressable style={styles.roomRow} onPress={onPress}>
      <View>
        <Text style={styles.roomTitle}>
          {buildingCode} {room.number}
          {room.source === "live" ? " · live" : ""}
        </Text>
        <Text style={styles.roomSub}>{room.name}</Text>
      </View>
      <Text style={[styles.roomTemp, { color: hot ? "#c45c26" : "#1f6b4a" }]}>
        {room.tempC.toFixed(1)}°C
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f7f3eb",
    borderBottomWidth: 1,
    borderBottomColor: "#d5cdc0",
  },
  brand: { fontSize: 28, fontWeight: "700", color: "#154c35" },
  sub: { color: "#5c6b64", marginTop: 2 },
  alertBtn: {
    backgroundColor: "#1f6b4a",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  alertBtnText: { color: "#f4fff8", fontWeight: "700" },
  liveBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  liveOk: { backgroundColor: "rgba(31,107,74,0.12)" },
  liveHot: { backgroundColor: "rgba(196,92,38,0.16)" },
  liveLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase" },
  liveTemp: { marginTop: 2, fontSize: 16, fontWeight: "600", color: "#1c2a24" },
  map: { flex: 1 },
  sheet: {
    backgroundColor: "#f7f3eb",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#d5cdc0",
    maxHeight: 280,
  },
  search: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#1c2a24",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fffdf8",
  },
  chipActive: { backgroundColor: "rgba(31,107,74,0.12)", borderColor: "#1f6b4a" },
  chipText: { color: "#5c6b64", fontWeight: "600", fontSize: 12 },
  chipTextActive: { color: "#154c35" },
  roomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#d5cdc0",
  },
  roomTitle: { fontWeight: "700", color: "#1c2a24" },
  roomSub: { color: "#5c6b64", marginTop: 2, fontSize: 12 },
  roomTemp: { fontWeight: "700", fontSize: 16 },
});
