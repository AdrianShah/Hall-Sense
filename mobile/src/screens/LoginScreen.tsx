import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, connectEmulatorsIfNeeded } from "../lib/firebase";

const DEMO_EMAIL = "admin@hallsense.demo";
const DEMO_PASSWORD = "HallSense2026!";

type Props = {
  onLoggedIn: () => void;
};

export function LoginScreen({ onLoggedIn }: Props) {
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      connectEmulatorsIfNeeded();
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onLoggedIn();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : "";
      const message = err instanceof Error ? err.message : String(err);
      const authNotReady =
        code === "auth/configuration-not-found" ||
        code === "auth/operation-not-allowed" ||
        message.includes("configuration-not-found");

      if (
        authNotReady &&
        email.trim().toLowerCase() === DEMO_EMAIL &&
        password === DEMO_PASSWORD
      ) {
        onLoggedIn();
        return;
      }

      setError(
        authNotReady
          ? "Firebase Auth not enabled — use admin@hallsense.demo / HallSense2026! for demo login."
          : message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.brand}>HallSense</Text>
      <Text style={styles.tagline}>Know the lecture hall before you walk across Keele.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Admin email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#f4fff8" /> : <Text style={styles.buttonText}>Sign in</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#e8efe8",
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    fontSize: 42,
    fontWeight: "700",
    color: "#154c35",
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 8,
    marginBottom: 28,
    color: "#5c6b64",
    fontSize: 16,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#f7f3eb",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#d5cdc0",
  },
  label: {
    fontSize: 12,
    color: "#5c6b64",
    marginBottom: 6,
    marginTop: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1c2a24",
  },
  button: {
    marginTop: 18,
    backgroundColor: "#1f6b4a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#f4fff8",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    marginTop: 10,
    color: "#c45c26",
  },
});
