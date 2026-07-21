import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCampusData } from "../hooks/useCampusData";
import { isOverheat } from "../lib/types";
import { LIVE_ROOM_ID, THRESHOLD_C } from "../lib/firebase";

type Props = {
  roomId: string;
  onBack: () => void;
};

export function RoomDetailScreen({ roomId, onBack }: Props) {
  const { buildings, rooms, latest } = useCampusData();
  const room = rooms.find((r) => r.id === roomId);
  const building = buildings.find((b) => b.id === room?.buildingId);

  const temp =
    roomId === LIVE_ROOM_ID && latest?.t != null ? latest.t : room?.tempC;
  const hum =
    roomId === LIVE_ROOM_ID && latest?.h != null ? latest.h : room?.humidity;
  const hot = temp != null ? isOverheat(temp) : false;

  if (!room) {
    return (
      <View style={styles.root}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Room not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Campus map</Text>
      </Pressable>
      <Text style={styles.eyebrow}>{building?.name ?? "Building"}</Text>
      <Text style={styles.title}>
        {building?.code} {room.number}
      </Text>
      <Text style={styles.sub}>{room.name}</Text>

      <View style={[styles.card, hot ? styles.cardHot : styles.cardOk]}>
        <Text style={styles.temp}>{temp != null ? `${temp.toFixed(1)}°C` : "—"}</Text>
        <Text style={styles.meta}>
          Humidity {hum != null ? `${Math.round(hum)}%` : "—"} · threshold {THRESHOLD_C}°C
        </Text>
        <Text style={[styles.status, { color: hot ? "#c45c26" : "#1f6b4a" }]}>
          {hot ? "OVERHEAT" : "OPTIMAL"}
        </Text>
      </View>

      <Text style={styles.note}>
        Source:{" "}
        {room.source === "live"
          ? "live Grove sensor via USB bridge"
          : "mock campus data"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8", paddingTop: 56, paddingHorizontal: 20 },
  back: { color: "#1f6b4a", fontWeight: "700", marginBottom: 18 },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 12,
    color: "#5c6b64",
    fontWeight: "700",
  },
  title: { fontSize: 32, fontWeight: "700", color: "#154c35", marginTop: 4 },
  sub: { color: "#5c6b64", marginTop: 4, marginBottom: 20 },
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardOk: {
    backgroundColor: "rgba(31,107,74,0.1)",
    borderColor: "rgba(31,107,74,0.25)",
  },
  cardHot: {
    backgroundColor: "rgba(196,92,38,0.12)",
    borderColor: "rgba(196,92,38,0.3)",
  },
  temp: { fontSize: 48, fontWeight: "700", color: "#1c2a24" },
  meta: { marginTop: 6, color: "#5c6b64" },
  status: { marginTop: 14, fontWeight: "800", letterSpacing: 1 },
  note: { marginTop: 18, color: "#5c6b64", fontSize: 13, lineHeight: 18 },
});
