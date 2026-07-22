import { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useCampusData } from "../hooks/useCampusData";
import { useAuth } from "../lib/auth-context";
import { isOverheat, LIVE_ROOM_ID, THRESHOLD_C } from "../lib/types";

type Props = {
  onOpenRoom: (roomId: string) => void;
  onOpenSearch: () => void;
  onOpenMap: () => void;
  onOpenAlerts: () => void;
  onOpenSettings: () => void;
};

export function HomeScreen({ onOpenRoom, onOpenSearch, onOpenMap, onOpenAlerts, onOpenSettings }: Props) {
  const { buildings, rooms, latest } = useCampusData();
  const { profile, logout } = useAuth();

  const liveRoom = rooms.find((r) => r.id === LIVE_ROOM_ID);
  const liveTemp = latest?.t ?? liveRoom?.tempC;
  const liveHum = latest?.h ?? liveRoom?.humidity;
  const liveHot = liveTemp != null ? isOverheat(liveTemp) : false;

  const favouriteRooms = useMemo(() => {
    const favs = profile?.favouriteRoomIds ?? [];
    return favs
      .filter((id) => id !== LIVE_ROOM_ID)
      .map((id) => {
        const room = rooms.find((r) => r.id === id);
        const building = room ? buildings.find((b) => b.id === room.buildingId) : undefined;
        return { room, building };
      })
      .filter(({ room }) => room != null);
  }, [profile?.favouriteRoomIds, rooms, buildings]);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brand}>HallSense</Text>
        <View style={styles.headerRight}>
          <Pressable style={styles.ghostBtn} onPress={onOpenSettings}>
            <Text style={styles.ghostBtnText}>⚙</Text>
          </Pressable>
          <Pressable style={styles.ghostBtn} onPress={() => logout()}>
            <Text style={styles.ghostBtnText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      {profile ? (
        <Text style={styles.greeting}>Hey, {profile.displayName}</Text>
      ) : null}

      {/* Live room card */}
      <Pressable
        style={[styles.liveCard, liveHot ? styles.liveHot : styles.liveOk]}
        onPress={() => onOpenRoom(LIVE_ROOM_ID)}
      >
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>
        <Text style={styles.liveRoomName}>Vari Hall A</Text>
        <Text style={styles.liveTemp}>
          {liveTemp != null ? `${liveTemp.toFixed(1)}°C` : "—"}
        </Text>
        <Text style={styles.liveMeta}>
          Humidity {liveHum != null ? `${Math.round(liveHum)}%` : "—"} · threshold {THRESHOLD_C}°C
        </Text>
        <Text style={[styles.liveStatus, { color: liveHot ? "#c45c26" : "#1f6b4a" }]}>
          {liveHot ? "OVERHEAT" : "OPTIMAL"}
        </Text>
      </Pressable>

      {/* Favourites */}
      <Text style={styles.sectionTitle}>Favourites</Text>
      {favouriteRooms.length === 0 ? (
        <Text style={styles.emptyText}>
          Search for rooms you use often and tap ☆ to add them here.
        </Text>
      ) : (
        favouriteRooms.map(({ room, building }) => {
          if (!room) return null;
          const hot = isOverheat(room.tempC);
          const code = building?.code === "VH" ? "VARI" : building?.code;
          return (
            <Pressable key={room.id} style={styles.favRow} onPress={() => onOpenRoom(room.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.favTitle}>{code} {room.number}</Text>
                <Text style={styles.favSub}>{building?.name}</Text>
              </View>
              <Text style={[styles.favTemp, { color: hot ? "#c45c26" : "#1f6b4a" }]}>
                {room.tempC.toFixed(1)}°C
              </Text>
            </Pressable>
          );
        })
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={onOpenSearch}>
          <Text style={styles.actionBtnText}>Search rooms</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onOpenMap}>
          <Text style={styles.actionBtnText}>Campus map</Text>
        </Pressable>
        <Pressable style={[styles.actionBtn, { backgroundColor: "rgba(31,107,74,0.1)" }]} onPress={onOpenAlerts}>
          <Text style={[styles.actionBtnText, { color: "#1f6b4a" }]}>Push alerts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8" },
  content: { paddingBottom: 40 },
  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f7f3eb",
    borderBottomWidth: 1,
    borderBottomColor: "#d5cdc0",
  },
  headerRight: { flexDirection: "row", gap: 8 },
  brand: { fontSize: 28, fontWeight: "700", color: "#154c35" },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  ghostBtnText: { color: "#1c2a24", fontWeight: "600", fontSize: 13 },
  greeting: {
    marginTop: 16,
    marginHorizontal: 16,
    color: "#5c6b64",
    fontSize: 15,
  },
  liveCard: {
    margin: 16,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
  },
  liveOk: {
    backgroundColor: "rgba(31,107,74,0.08)",
    borderColor: "rgba(31,107,74,0.2)",
  },
  liveHot: {
    backgroundColor: "rgba(196,92,38,0.1)",
    borderColor: "rgba(196,92,38,0.25)",
  },
  liveBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1f6b4a",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 8,
  },
  liveBadgeText: { color: "#f4fff8", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  liveRoomName: { fontSize: 14, fontWeight: "700", color: "#5c6b64", letterSpacing: 0.5 },
  liveTemp: { fontSize: 48, fontWeight: "700", color: "#1c2a24", marginTop: 4 },
  liveMeta: { marginTop: 4, color: "#5c6b64", fontSize: 13 },
  liveStatus: { marginTop: 10, fontWeight: "800", fontSize: 14, letterSpacing: 1 },
  sectionTitle: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5c6b64",
  },
  emptyText: {
    marginHorizontal: 16,
    color: "#8a968f",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  favRow: {
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
    marginBottom: 8,
  },
  favTitle: { fontWeight: "700", color: "#1c2a24" },
  favSub: { color: "#5c6b64", marginTop: 2, fontSize: 12 },
  favTemp: { fontWeight: "700", fontSize: 18 },
  actions: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#f7f3eb",
  },
  actionBtnText: { fontWeight: "700", color: "#1c2a24", fontSize: 15 },
});
