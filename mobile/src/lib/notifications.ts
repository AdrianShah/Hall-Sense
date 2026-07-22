import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/** EAS project id for @adrianshah/hallsense — required by getExpoPushTokenAsync */
const EAS_PROJECT_ID = "ce0352d8-73da-462a-9ae2-52292b3f7e68";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function resolveProjectId(): string {
  const fromConfig =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    undefined;
  return typeof fromConfig === "string" && fromConfig.length > 0
    ? fromConfig
    : EAS_PROJECT_ID;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    throw new Error("Push alerts need a physical phone (not a simulator).");
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
    throw new Error("Notification permission was denied.");
  }

  const projectId = resolveProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
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
