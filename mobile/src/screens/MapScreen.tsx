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
import { isOverheat } from "../lib/types";
import { KEELE_CENTER, LIVE_ROOM_ID } from "../lib/firebase";

type Props = {
  onOpenRoom: (roomId: string) => void;
  onBack: () => void;
};

export function MapScreen({ onOpenRoom, onBack }: Props) {
  const { buildings, rooms } = useCampusData();
  const [query, setQuery] = useState("");

  const filteredRooms = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return [];
    const bmap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .filter((room) => {
        const b = bmap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return hay.includes(term);
      })
      .slice(0, 30);
  }, [rooms, buildings, query]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.brand}>Campus Map</Text>
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
          placeholder="Search any Keele building or room"
          placeholderTextColor="#8a968f"
          value={query}
          onChangeText={setQuery}
        />
        <FlatList
          data={filteredRooms}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 160 }}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query.trim()
                ? "No rooms match."
                : "Search to find rooms on the map."}
            </Text>
          }
          renderItem={({ item }) => {
            const hot = isOverheat(item.tempC);
            const building = buildings.find((b) => b.id === item.buildingId);
            const code = building?.code === "VH" ? "VARI" : building?.code ?? "";
            return (
              <Pressable style={styles.roomRow} onPress={() => onOpenRoom(item.id)}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.roomTitle}>
                    {code} {item.number}
                    {item.source === "live" ? " · live" : ""}
                  </Text>
                  <Text style={styles.roomSub}>{building?.name}</Text>
                </View>
                <Text style={[styles.roomTemp, { color: hot ? "#c45c26" : "#1f6b4a" }]}>
                  {item.tempC.toFixed(1)}°C
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8" },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "#f7f3eb",
    borderBottomWidth: 1,
    borderBottomColor: "#d5cdc0",
  },
  back: { color: "#1f6b4a", fontWeight: "700", marginBottom: 8 },
  brand: { fontSize: 24, fontWeight: "700", color: "#154c35" },
  map: { flex: 1 },
  sheet: {
    backgroundColor: "#f7f3eb",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 14,
    borderTopWidth: 1,
    borderColor: "#d5cdc0",
    maxHeight: 260,
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
  empty: { color: "#5c6b64", textAlign: "center", paddingVertical: 16, fontSize: 13 },
});
