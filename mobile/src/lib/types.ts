export type Building = {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
};

export type Room = {
  id: string;
  buildingId: string;
  name: string;
  number: string;
  tempC: number;
  humidity: number;
  source: "mock" | "live";
  overheat?: boolean;
  updatedAt?: number;
};

export type Reading = {
  roomId: string;
  t: number;
  h: number;
  overheat: boolean;
  ts: number;
};

export function isOverheat(tempC: number, threshold = 25): boolean {
  return tempC > threshold;
}
