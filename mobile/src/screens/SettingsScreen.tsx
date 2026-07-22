import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../lib/auth-context";

type Props = {
  onBack: () => void;
};

export function SettingsScreen({ onBack }: Props) {
  const { profile, logout } = useAuth();

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Home</Text>
      </Pressable>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <Text style={styles.value}>{profile?.username ?? "—"}</Text>

        <Text style={[styles.label, { marginTop: 14 }]}>Display name</Text>
        <Text style={styles.value}>{profile?.displayName ?? "—"}</Text>

        {profile?.studentNumber ? (
          <>
            <Text style={[styles.label, { marginTop: 14 }]}>Student number</Text>
            <Text style={styles.value}>{profile.studentNumber}</Text>
          </>
        ) : null}

        <Text style={[styles.label, { marginTop: 14 }]}>Favourites</Text>
        <Text style={styles.value}>
          {(profile?.favouriteRoomIds ?? []).length} room
          {(profile?.favouriteRoomIds ?? []).length === 1 ? "" : "s"}
        </Text>
      </View>

      <Pressable style={styles.signOut} onPress={() => logout()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8", paddingTop: 56, paddingHorizontal: 20 },
  back: { color: "#1f6b4a", fontWeight: "700", marginBottom: 18 },
  title: { fontSize: 32, fontWeight: "700", color: "#154c35", marginBottom: 20 },
  card: {
    backgroundColor: "#f7f3eb",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d5cdc0",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#5c6b64",
  },
  value: { marginTop: 4, fontSize: 17, fontWeight: "600", color: "#1c2a24" },
  signOut: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#c45c26",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  signOutText: { color: "#c45c26", fontWeight: "700", fontSize: 16 },
});
