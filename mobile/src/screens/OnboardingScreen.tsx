import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../lib/auth-context";
import { useCampusData } from "../hooks/useCampusData";
import type { ThemePreference } from "../lib/types";

type Step = "welcome" | "favourites" | "theme";

export function OnboardingScreen() {
  const { profile, updateProfile, toggleFavourite } = useAuth();
  const { buildings, rooms } = useCampusData();
  const [step, setStep] = useState<Step>("welcome");
  const [searchQ, setSearchQ] = useState("");

  const favs = profile?.favouriteRoomIds ?? [];

  const searchResults = useMemo(() => {
    const term = searchQ.trim().toLowerCase();
    if (term.length < 1) return [];
    const bmap = new Map(buildings.map((b) => [b.id, b]));
    return rooms
      .map((room) => {
        const b = bmap.get(room.buildingId);
        const hay = `${room.name} ${room.number} ${b?.name ?? ""} ${b?.code ?? ""}`.toLowerCase();
        return { room, building: b, matches: hay.includes(term) };
      })
      .filter(({ matches }) => matches)
      .slice(0, 20);
  }, [buildings, rooms, searchQ]);

  async function finishOnboarding(selectedTheme: ThemePreference) {
    await updateProfile({ onboardingComplete: true, theme: selectedTheme });
  }

  if (step === "welcome") {
    return (
      <View style={styles.root}>
        <View style={styles.centerCard}>
          <Text style={styles.brand}>HallSense</Text>
          <Text style={styles.tagline}>
            Know the lecture hall before you walk across Keele.
          </Text>
          <Pressable style={styles.btn} onPress={() => setStep("favourites")}>
            <Text style={styles.btnText}>Get started</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === "favourites") {
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.stepLabel}>Step 1 of 2</Text>
          <Text style={styles.stepTitle}>Pick your rooms</Text>
          <Text style={styles.stepDesc}>
            Search for rooms you use often. They'll appear on your home screen.
          </Text>
          <TextInput
            style={styles.search}
            placeholder="Search e.g. CLH A, LAS 1006…"
            placeholderTextColor="#8a968f"
            value={searchQ}
            onChangeText={setSearchQ}
          />
          {favs.length > 0 ? (
            <Text style={styles.selected}>{favs.length} room{favs.length !== 1 ? "s" : ""} selected</Text>
          ) : null}
          {searchResults.map(({ room, building }) => {
            const isFav = favs.includes(room.id);
            const code = building?.code === "VH" ? "VARI" : building?.code;
            return (
              <Pressable
                key={room.id}
                style={[styles.roomRow, isFav && styles.roomRowActive]}
                onPress={() => toggleFavourite(room.id)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.roomTitle}>{code} {room.number}</Text>
                  <Text style={styles.roomSub}>{building?.name}</Text>
                </View>
                <Text style={styles.star}>{isFav ? "★" : "☆"}</Text>
              </Pressable>
            );
          })}
          {searchQ.trim().length > 0 && searchResults.length === 0 ? (
            <Text style={styles.empty}>No rooms found.</Text>
          ) : null}
          <Pressable style={[styles.btn, { marginTop: 20 }]} onPress={() => setStep("theme")}>
            <Text style={styles.btnText}>{favs.length > 0 ? "Continue" : "Skip"}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (step === "theme") {
    return (
      <View style={styles.root}>
        <View style={styles.centerCard}>
          <Text style={styles.stepLabel}>Step 2 of 2</Text>
          <Text style={styles.stepTitle}>Choose your theme</Text>
          <Pressable style={styles.btn} onPress={() => finishOnboarding("light")}>
            <Text style={styles.btnText}>Light</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, { backgroundColor: "#1c2a24", marginTop: 10 }]}
            onPress={() => finishOnboarding("dark")}
          >
            <Text style={styles.btnText}>Dark</Text>
          </Pressable>
          <Pressable
            style={[styles.ghostBtn, { marginTop: 10 }]}
            onPress={() => finishOnboarding("system")}
          >
            <Text style={styles.ghostBtnText}>Follow system</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8", justifyContent: "center" },
  scrollContent: { paddingHorizontal: 24, paddingVertical: 40 },
  centerCard: {
    marginHorizontal: 24,
    backgroundColor: "#f7f3eb",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: "#d5cdc0",
  },
  brand: { fontSize: 36, fontWeight: "700", color: "#154c35", textAlign: "center" },
  tagline: { marginTop: 10, color: "#5c6b64", textAlign: "center", fontSize: 15, lineHeight: 22 },
  stepLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#5c6b64",
  },
  stepTitle: { fontSize: 26, fontWeight: "700", color: "#154c35", marginTop: 4 },
  stepDesc: { color: "#5c6b64", marginTop: 6, fontSize: 14, lineHeight: 20, marginBottom: 14 },
  search: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#1c2a24",
    fontSize: 15,
    marginBottom: 8,
  },
  selected: { color: "#1f6b4a", fontWeight: "600", fontSize: 13, marginBottom: 8 },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f3eb",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#d5cdc0",
    marginBottom: 6,
  },
  roomRowActive: { borderColor: "#1f6b4a", borderWidth: 2 },
  roomTitle: { fontWeight: "700", color: "#1c2a24" },
  roomSub: { color: "#5c6b64", marginTop: 2, fontSize: 12 },
  star: { fontSize: 22, color: "#1f6b4a" },
  empty: { color: "#5c6b64", textAlign: "center", paddingVertical: 16, fontSize: 13 },
  btn: {
    marginTop: 24,
    backgroundColor: "#1f6b4a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnText: { color: "#f4fff8", fontWeight: "700", fontSize: 16 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  ghostBtnText: { color: "#1c2a24", fontWeight: "600", fontSize: 16 },
});
