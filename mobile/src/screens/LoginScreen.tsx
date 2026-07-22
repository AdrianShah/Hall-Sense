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
import { useAuth } from "../lib/auth-context";

type Mode = "login" | "signup";

export function LoginScreen() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signup") {
        await signup(username, password, displayName || username, studentNumber || undefined);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, mode === "login" && styles.tabActive]}
          onPress={() => { setMode("login"); setError(null); }}
        >
          <Text style={[styles.tabText, mode === "login" && styles.tabTextActive]}>Sign in</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "signup" && styles.tabActive]}
          onPress={() => { setMode("signup"); setError(null); }}
        >
          <Text style={[styles.tabText, mode === "signup" && styles.tabTextActive]}>Create account</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. jdoe42"
          placeholderTextColor="#8a968f"
          value={username}
          onChangeText={setUsername}
        />
        {mode === "signup" ? (
          <>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Jane Doe"
              placeholderTextColor="#8a968f"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <Text style={styles.label}>Student number (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 218012345"
              placeholderTextColor="#8a968f"
              keyboardType="number-pad"
              value={studentNumber}
              onChangeText={setStudentNumber}
            />
          </>
        ) : null}
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Min 6 characters"
          placeholderTextColor="#8a968f"
          value={password}
          onChangeText={setPassword}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.button} onPress={submit} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#f4fff8" />
          ) : (
            <Text style={styles.buttonText}>
              {mode === "signup" ? "Create account" : "Sign in"}
            </Text>
          )}
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
    marginBottom: 20,
    color: "#5c6b64",
    fontSize: 16,
    lineHeight: 22,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    borderWidth: 1,
    borderColor: "#d5cdc0",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: "#fffdf8",
  },
  tabActive: {
    backgroundColor: "rgba(31,107,74,0.12)",
    borderColor: "#1f6b4a",
  },
  tabText: { color: "#5c6b64", fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: "#154c35" },
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
