import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { RoomDetailScreen } from "./src/screens/RoomDetailScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { auth, connectEmulatorsIfNeeded } from "./src/lib/firebase";

export type RootStackParamList = {
  Login: undefined;
  Map: undefined;
  Room: { roomId: string };
  Alerts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [booting, setBooting] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    connectEmulatorsIfNeeded();
    const unsub = onAuthStateChanged(auth, (user) => {
      setLoggedIn(Boolean(user));
      setBooting(false);
    });
    return unsub;
  }, []);

  if (booting) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#1f6b4a" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!loggedIn ? (
          <Stack.Screen name="Login">
            {() => <LoginScreen onLoggedIn={() => setLoggedIn(true)} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Map">
              {({ navigation }) => (
                <MapScreen
                  onOpenRoom={(roomId) => navigation.navigate("Room", { roomId })}
                  onOpenAlerts={() => navigation.navigate("Alerts")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Room">
              {({ navigation, route }) => (
                <RoomDetailScreen
                  roomId={route.params.roomId}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Alerts">
              {({ navigation }) => <AlertsScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// Allow demo sign-out from console if needed
export async function demoSignOut() {
  await signOut(auth);
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e8efe8",
  },
});
