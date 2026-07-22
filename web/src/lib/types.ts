export const THRESHOLD_C = 25;

export const LIVE_ROOM_ID = "vari-a";

export const KEELE_CENTER = {
  lat: 43.7735,
  lng: -79.5035,
  zoom: 16,
} as const;

export type Building = {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  featured?: boolean;
};

export type RoomSource = "mock" | "live";

export type Room = {
  id: string;
  buildingId: string;
  name: string;
  number: string;
  tempC: number;
  humidity: number;
  source: RoomSource;
  overheat?: boolean;
  updatedAt?: number;
};

export type Reading = {
  id?: string;
  roomId: string;
  t: number;
  h: number;
  overheat: boolean;
  ts: number;
};

export type ThemePreference = "light" | "dark" | "system";

export type UserProfile = {
  uid: string;
  username: string;
  displayName: string;
  studentNumber?: string;
  favouriteRoomIds: string[];
  onboardingComplete: boolean;
  theme: ThemePreference;
  createdAt: number;
  updatedAt: number;
};

export function isOverheat(tempC: number, threshold = THRESHOLD_C): boolean {
  return tempC > threshold;
}

export function statusColor(tempC: number, threshold = THRESHOLD_C): "green" | "red" {
  return isOverheat(tempC, threshold) ? "red" : "green";
}
