import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useCampusData } from "../hooks/useCampusData";
import { useAuth } from "../lib/auth-context";
import { isOverheat } from "../lib/types";

type Props = {
  onOpenRoom: (roomId: string) => void;
  onBack: () => void;
};

export function SearchScreen({ onOpenRoom, onBack }: Props) {
  const { buildings, rooms } = useCampusData();
  const { profile, toggleFavourite } = useAuth();
  const [query, setQuery] = useState("");

  const favs = profile?.favouriteRoomIds ?? [];

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length === 0) return [];
    const bmap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .map((room) => {
        const b = bmap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return { room, building: b, matches: hay.includes(term) };
      })
      .filter(({ matches }) => matches)
      .slice(0, 40);
  }, [rooms, buildings, query]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Home</Text>
        </Pressable>
        <Text style={styles.title}>Search rooms</Text>
        <Text style={styles.sub}>{buildings.length} buildings · {rooms.length} rooms</Text>
      </View>
      <TextInput
        style={styles.search}
        placeholder="Search e.g. CLH A, TEL 0006, Ross S103…"
        placeholderTextColor="#8a968f"
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      <FlatList
        data={results}
        keyExtractor={(item) => item.room.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query.trim() ? "No rooms match." : "Type above to search all Keele rooms."}
          </Text>
        }
        renderItem={({ item }) => {
          const { room, building } = item;
          const hot = isOverheat(room.tempC);
          const code = building?.code === "VH" ? "VARI" : building?.code;
          const isFav = favs.includes(room.id);
          return (
            <Pressable style={styles.row} onPress={() => onOpenRoom(room.id)}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.rowTitle}>
                  {code} {room.number}
                  {room.source === "live" ? " · live" : ""}
                </Text>
                <Text style={styles.rowSub}>{building?.name}</Text>
              </View>
              <Text style={[styles.rowTemp, { color: hot ? "#c45c26" : "#1f6b4a" }]}>
                {room.tempC.toFixed(1)}°C
              </Text>
              <Pressable
                style={styles.favBtn}
                onPress={() => toggleFavourite(room.id)}
              >
                <Text style={styles.favStar}>{isFav ? "★" : "☆"}</Text>
              </Pressable>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8" },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 10 },
  back: { color: "#1f6b4a", fontWeight: "700", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "700", color: "#154c35" },
  sub: { color: "#5c6b64", marginTop: 2, fontSize: 13 },
  search: {
    marginHorizontal: 16,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    color: "#1c2a24",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#f7f3eb",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#d5cdc0",
    marginBottom: 6,
  },
  rowTitle: { fontWeight: "700", color: "#1c2a24" },
  rowSub: { color: "#5c6b64", marginTop: 2, fontSize: 12 },
  rowTemp: { fontWeight: "700", fontSize: 16 },
  favBtn: { marginLeft: 10, padding: 4 },
  favStar: { fontSize: 20, color: "#1f6b4a" },
  empty: { color: "#5c6b64", textAlign: "center", paddingVertical: 24, fontSize: 14 },
});
