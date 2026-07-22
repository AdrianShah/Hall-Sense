import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  registerForPushNotificationsAsync,
  saveDemoPushToken,
} from "../lib/notifications";

type Props = {
  onBack: () => void;
};

export function AlertsScreen({ onBack }: Props) {
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Not registered");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // no auto-register; admin taps button during demo setup
  }, []);

  async function register() {
    setBusy(true);
    setStatus("Requesting permission…");
    try {
      const pushToken = await registerForPushNotificationsAsync();
      if (!pushToken) {
        setStatus("Permission denied or not a physical device / need dev build on Android.");
        setToken(null);
        return;
      }
      await saveDemoPushToken(pushToken);
      setToken(pushToken);
      setStatus("Demo phone registered. Bridge will push on overheat.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <Pressable onPress={onBack}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Push alerts</Text>
      <Text style={styles.body}>
        Register this phone as the HallSense demo device. When Vari Hall A goes above 25°C,
        the Python bridge sends an Expo push notification here.
      </Text>

      <Pressable style={styles.button} onPress={register} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#f4fff8" />
        ) : (
          <Text style={styles.buttonText}>Register this phone</Text>
        )}
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.status}>{status}</Text>
        {token ? (
          <>
            <Text style={[styles.label, { marginTop: 12 }]}>Expo push token</Text>
            <Text selectable style={styles.token}>
              {token}
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#e8efe8", paddingTop: 56, paddingHorizontal: 20 },
  back: { color: "#1f6b4a", fontWeight: "700", marginBottom: 18 },
  title: { fontSize: 32, fontWeight: "700", color: "#154c35" },
  body: { marginTop: 10, color: "#5c6b64", lineHeight: 22, marginBottom: 20 },
  button: {
    backgroundColor: "#1f6b4a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: { color: "#f4fff8", fontWeight: "700", fontSize: 16 },
  card: {
    marginTop: 20,
    backgroundColor: "#f7f3eb",
    borderRadius: 14,
    padding: 16,
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
  status: { marginTop: 6, color: "#1c2a24", lineHeight: 20 },
  token: { marginTop: 6, color: "#1c2a24", fontSize: 12, lineHeight: 18 },
});
