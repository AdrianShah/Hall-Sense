import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("hallsense-alerts", {
      name: "HallSense alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#C45C26",
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;

  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResponse.data;
}

export async function saveDemoPushToken(token: string) {
  await setDoc(
    doc(db, "devices", "demo"),
    {
      expoPushToken: token,
      label: "Demo phone",
      updatedAt: Date.now(),
      platform: Platform.OS,
    },
    { merge: true }
  );
}
