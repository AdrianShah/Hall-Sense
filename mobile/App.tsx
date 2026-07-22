import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { AuthProvider, useAuth } from "./src/lib/auth-context";
import { LoginScreen } from "./src/screens/LoginScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SearchScreen } from "./src/screens/SearchScreen";
import { MapScreen } from "./src/screens/MapScreen";
import { RoomDetailScreen } from "./src/screens/RoomDetailScreen";
import { AlertsScreen } from "./src/screens/AlertsScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Home: undefined;
  Search: undefined;
  Map: undefined;
  Room: { roomId: string };
  Alerts: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color="#1f6b4a" />
        <StatusBar style="dark" />
      </View>
    );
  }

  const needsOnboarding = user && profile && !profile.onboardingComplete;
  const needsLogin = !user;

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {needsLogin ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : needsOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <Stack.Screen name="Home">
              {({ navigation }) => (
                <HomeScreen
                  onOpenRoom={(roomId) => navigation.navigate("Room", { roomId })}
                  onOpenSearch={() => navigation.navigate("Search")}
                  onOpenMap={() => navigation.navigate("Map")}
                  onOpenAlerts={() => navigation.navigate("Alerts")}
                  onOpenSettings={() => navigation.navigate("Settings")}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Search">
              {({ navigation }) => (
                <SearchScreen
                  onOpenRoom={(roomId) => navigation.navigate("Room", { roomId })}
                  onBack={() => navigation.goBack()}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Map">
              {({ navigation }) => (
                <MapScreen
                  onOpenRoom={(roomId) => navigation.navigate("Room", { roomId })}
                  onBack={() => navigation.goBack()}
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
            <Stack.Screen name="Settings">
              {({ navigation }) => <SettingsScreen onBack={() => navigation.goBack()} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: "#e8efe8",
    justifyContent: "center",
    alignItems: "center",
  },
});
