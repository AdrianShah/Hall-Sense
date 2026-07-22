/**
 * Generates shared/campus-seed.json with Keele lecture halls.
 * Featured on map: CLH, VARI (VH), LAS. Everything else is searchable.
 *
 *   node scripts/generate-campus-seed.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {{ id: string, name: string, code: string, lat: number, lng: number, featured?: boolean, rooms: string[] }[]} */
const BUILDINGS = [
  {
    id: "vari",
    name: "Vari Hall",
    code: "VH",
    lat: 43.7735,
    lng: -79.5019,
    featured: true,
    rooms: ["A", "B", "C", "1001", "1002", "2005", "3006", "1003", "1004", "2001", "2002", "2003", "2004", "3001", "3002", "3003", "3004", "3005"],
  },
  {
    id: "curtis",
    name: "Curtis Lecture Halls",
    code: "CLH",
    lat: 43.7731,
    lng: -79.5052,
    featured: true,
    rooms: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"],
  },
  {
    id: "lassonde",
    name: "Lassonde Building",
    code: "LAS",
    lat: 43.7741,
    lng: -79.5058,
    featured: true,
    rooms: ["B", "C", "1002", "1006", "3033", "3038", "3050", "C112", "C114", "C116", "1004", "1008", "2002", "2006", "2008", "3002", "3006", "3010", "C118", "C120", "1012"],
  },
  {
    id: "accolade-east",
    name: "Accolade East",
    code: "ACE",
    lat: 43.7728,
    lng: -79.5032,
    rooms: ["001", "002", "003", "009", "010", "011", "012", "013", "102", "203", "004", "005", "006", "007", "008", "101", "103", "104", "201", "202"],
  },
  {
    id: "accolade-west",
    name: "Accolade West",
    code: "ACW",
    lat: 43.7730,
    lng: -79.5044,
    rooms: ["001", "002", "003", "004", "005", "006", "106", "206", "306", "007", "008", "009", "010", "105", "107", "205", "305"],
  },
  {
    id: "bergeron",
    name: "Bergeron Centre",
    code: "BRG",
    lat: 43.7718,
    lng: -79.5070,
    rooms: ["211", "212", "213", "311", "312", "313", "413", "414", "115", "116", "217", "314", "315", "415", "416", "517"],
  },
  {
    id: "chemistry",
    name: "Chemistry Building",
    code: "CB",
    lat: 43.7739,
    lng: -79.5040,
    rooms: ["115", "121", "122", "215", "221", "306", "315", "116", "117", "216", "217", "301", "302", "307"],
  },
  {
    id: "ross",
    name: "Ross Building",
    code: "R",
    lat: 43.7715,
    lng: -79.5048,
    rooms: ["N102", "N103", "S101", "S102", "S103", "S104", "S105", "N201", "S201", "S202", "N202", "N203", "S203", "S204", "S205", "N301", "N302", "S301", "S302"],
  },
  {
    id: "petrie",
    name: "Petrie Science & Engineering",
    code: "PSE",
    lat: 43.7736,
    lng: -79.5065,
    rooms: ["101", "103", "104", "201", "203", "317", "321", "102", "105", "106", "202", "204", "301", "302", "303", "318", "319"],
  },
  {
    id: "farquharson",
    name: "Farquharson Building",
    code: "FAR",
    lat: 43.7745,
    lng: -79.5045,
    rooms: ["101", "102", "104", "203", "204", "205"],
  },
  {
    id: "lsb",
    name: "Life Sciences Building",
    code: "LSB",
    lat: 43.7748,
    lng: -79.5030,
    rooms: ["101", "103", "105", "106", "107", "205", "206", "102", "104", "108", "109", "201", "202", "203", "204"],
  },
  {
    id: "bsb",
    name: "Behavioural Science Building",
    code: "BSB",
    lat: 43.7733,
    lng: -79.5025,
    rooms: ["A", "B", "C", "D", "105", "106", "107", "108", "109", "110", "111", "201", "202", "203", "204"],
  },
  {
    id: "steacie",
    name: "Steacie Science & Engineering Library",
    code: "SSL",
    lat: 43.7725,
    lng: -79.5060,
    rooms: ["001", "002", "101", "102"],
  },
  {
    id: "tel",
    name: "Technology Enhanced Learning",
    code: "TEL",
    lat: 43.7712,
    lng: -79.5025,
    rooms: ["0001", "0002", "0004", "0006", "1001", "1005", "2001", "3001", "0003", "0005", "0007", "1002", "1003", "1004", "2002", "2003", "3002", "3003"],
  },
  {
    id: "dahdaleh",
    name: "Victor Phillip Dahdaleh Building",
    code: "DB",
    lat: 43.7720,
    lng: -79.5015,
    rooms: ["0001", "0010", "0014", "1005", "1014", "1016", "2005", "0002", "0003", "1001", "1002", "1003", "2001", "2002", "2003", "2004"],
  },
  {
    id: "founders",
    name: "Founders College",
    code: "FC",
    lat: 43.7705,
    lng: -79.5035,
    rooms: ["103", "105", "106", "203", "204", "205"],
  },
  {
    id: "vanier",
    name: "Vanier College",
    code: "VC",
    lat: 43.7698,
    lng: -79.5045,
    rooms: ["101", "102", "103", "104", "115", "135"],
  },
  {
    id: "winters",
    name: "Winters College",
    code: "WC",
    lat: 43.7700,
    lng: -79.5055,
    rooms: ["115", "116", "117", "135", "136"],
  },
  {
    id: "mclaughlin",
    name: "McLaughlin College",
    code: "MC",
    lat: 43.7695,
    lng: -79.5065,
    rooms: ["109", "111", "113", "114", "215"],
  },
  {
    id: "stong",
    name: "Stong College",
    code: "SC",
    lat: 43.7708,
    lng: -79.5075,
    rooms: ["101", "102", "103", "104", "201"],
  },
  {
    id: "bethune",
    name: "Bethune College",
    code: "BC",
    lat: 43.7710,
    lng: -79.5085,
    rooms: ["203", "204", "205", "215", "320"],
  },
  {
    id: "calumet",
    name: "Calumet College",
    code: "CC",
    lat: 43.7715,
    lng: -79.5095,
    rooms: ["101", "102", "108", "109", "210"],
  },
  {
    id: "atkinson",
    name: "Atkinson Building",
    code: "ATK",
    lat: 43.7725,
    lng: -79.5005,
    rooms: ["001", "002", "003", "004", "005", "009", "006", "007", "008", "009", "010", "011", "012"],
  },
  {
    id: "schulich",
    name: "Schulich School of Business",
    code: "SSB",
    lat: 43.7732,
    lng: -79.4988,
    rooms: ["E111", "E112", "N100", "N109", "S123", "S128", "W132", "W253", "E113", "E114", "N101", "N102", "N103", "S124", "S125", "W134", "W135"],
  },
  {
    id: "osgoode",
    name: "Osgoode Hall Law School",
    code: "OSG",
    lat: 43.7705,
    lng: -79.5050,
    rooms: ["1001", "1002", "1003", "2001", "2002", "1004", "1005", "2003", "2004", "2005", "3001", "3002"],
  },
  {
    id: "health-nursing",
    name: "Health, Nursing and Environmental Studies",
    code: "HNES",
    lat: 43.7745,
    lng: -79.5020,
    rooms: ["101", "102", "103", "104", "036"],
  },
  {
    id: "kaneff",
    name: "Kaneff Tower",
    code: "KT",
    lat: 43.7718,
    lng: -79.5032,
    rooms: ["519", "520", "521", "701", "702"],
  },
  {
    id: "william-small",
    name: "William Small Centre",
    code: "WSC",
    lat: 43.7740,
    lng: -79.5075,
    rooms: ["N100", "N101", "N102", "N105"],
  },
  {
    id: "central-square",
    name: "Central Square",
    code: "CSQ",
    lat: 43.7728,
    lng: -79.5038,
    rooms: ["109", "110", "111"],
  },
  {
    id: "scott",
    name: "Scott Library",
    code: "SCL",
    lat: 43.7722,
    lng: -79.5055,
    rooms: ["102", "103", "104", "205"],
  },
  {
    id: "york-lanes",
    name: "York Lanes",
    code: "YL",
    lat: 43.7738,
    lng: -79.5028,
    rooms: ["109", "190", "191"],
  },
  {
    id: "podium",
    name: "The Podium",
    code: "POD",
    lat: 43.7726,
    lng: -79.5042,
    rooms: ["250", "251", "252", "253", "370"],
  },
  {
    id: "lumbers",
    name: "Lumbers Building",
    code: "LUM",
    lat: 43.7734,
    lng: -79.5055,
    rooms: ["101", "102", "103", "104"],
  },
  {
    id: "physical-resources",
    name: "Physical Resources Building",
    code: "PRB",
    lat: 43.7748,
    lng: -79.5065,
    rooms: ["100", "101", "102"],
  },
  {
    id: "fine-arts",
    name: "Joan & Martin Goldfarb Centre for Fine Arts",
    code: "CFA",
    lat: 43.7710,
    lng: -79.5010,
    rooms: ["112", "113", "114", "204", "205"],
  },
  {
    id: "centre-film",
    name: "Centre for Film and Theatre",
    code: "CFT",
    lat: 43.7714,
    lng: -79.5002,
    rooms: ["101", "102", "103", "104", "105"],
  },
  {
    id: "seneca-at-york",
    name: "Seneca@York",
    code: "SaY",
    lat: 43.7758,
    lng: -79.4995,
    rooms: ["101", "102", "103", "104", "201", "202", "203", "204", "301", "302"],
  },
  {
    id: "tait-mckenzie",
    name: "Tait McKenzie Centre",
    code: "TM",
    lat: 43.7680,
    lng: -79.5065,
    rooms: ["101", "102", "103", "201", "202", "203"],
  },
  {
    id: "ignat-kaneff",
    name: "Ignat Kaneff Building",
    code: "IKB",
    lat: 43.7738,
    lng: -79.4998,
    rooms: ["1001", "1002", "1003", "2001", "2002", "2003", "3001"],
  },
  {
    id: "new-student-centre",
    name: "Second Student Centre",
    code: "SSC",
    lat: 43.7719,
    lng: -79.5038,
    rooms: ["101", "102", "103", "201", "202", "203", "301", "302"],
  },
  {
    id: "pond-road-residences",
    name: "Pond Road Residence",
    code: "PRR",
    lat: 43.7688,
    lng: -79.5030,
    rooms: ["101", "201", "301"],
  },
  {
    id: "observatory",
    name: "York Observatory",
    code: "OBS",
    lat: 43.7760,
    lng: -79.5080,
    rooms: ["001", "002"],
  },
  {
    id: "executive-learning-centre",
    name: "Executive Learning Centre",
    code: "ELC",
    lat: 43.7728,
    lng: -79.4982,
    rooms: ["A", "B", "C", "D", "101", "102", "201", "202"],
  },
];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function mockClimate(roomId) {
  const h = hash(roomId);
  const tempC = Math.round((20 + (h % 90) / 10) * 10) / 10; // 20.0 – 28.9
  const humidity = 40 + (h % 35);
  return { tempC, humidity };
}

const buildings = BUILDINGS.map(({ rooms: _r, featured, ...b }) => ({
  ...b,
  featured: Boolean(featured),
}));

const rooms = [];
for (const b of BUILDINGS) {
  for (const number of b.rooms) {
    const id = `${b.id}-${number}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
    const climate = mockClimate(id);
    const isLive = id === "vari-a";
    rooms.push({
      id,
      buildingId: b.id,
      name: `${b.code} ${number}`,
      number,
      tempC: isLive ? 22.4 : climate.tempC,
      humidity: isLive ? 48 : climate.humidity,
      source: isLive ? "live" : "mock",
    });
  }
}

const seed = {
  liveRoomId: "vari-a",
  thresholdC: 25,
  featuredBuildingIds: ["curtis", "vari", "lassonde"],
  buildings,
  rooms,
};

const out = join(__dirname, "..", "shared", "campus-seed.json");
writeFileSync(out, JSON.stringify(seed, null, 2) + "\n");
console.log(
  `Wrote ${buildings.length} buildings, ${rooms.length} rooms → ${out}`
);
console.log(
  `Featured on map: ${buildings.filter((b) => b.featured).map((b) => b.code).join(", ")}`
);
