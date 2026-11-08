export type Platform = { x: number; y: number; width: number; height: number };
export type PickupKind = "gem" | "key" | "shield" | "coffee" | "heart";
export type Pickup = { x: number; y: number; kind: PickupKind; collected: boolean };
export type Enemy = { x: number; y: number; origin: number; range: number; alive: boolean };
export type Level = {
  name: string; theme: "jungle" | "ruins" | "temple"; width: number;
  spawn: { x: number; y: number }; checkpoint: { x: number; y: number };
  exit: { x: number; y: number }; platforms: Platform[]; pickups: Pickup[];
  enemies: Enemy[]; spikes: { x: number; y: number; width: number }[];
};
const platform = (x: number, y: number, width: number, height = 20): Platform => ({ x, y, width, height });
const pickup = (x: number, y: number, kind: PickupKind = "gem"): Pickup => ({ x, y, kind, collected: false });
const gems = (x: number, y: number, count = 4) => Array.from({ length: count }, (_, i) => pickup(x + i * 30, y - Math.sin(i / (count - 1) * Math.PI) * 22));
const snake = (x: number, floor: number, range = 38): Enemy => ({ x, y: floor - 18, origin: x, range, alive: true });

export const LEVELS: Level[] = [
  {
    name: "Jungle Run", theme: "jungle", width: 2700,
    spawn: { x: 100, y: 360 }, checkpoint: { x: 1250, y: 360 }, exit: { x: 2560, y: 360 },
    platforms: [platform(0, 360, 440, 72), platform(520, 360, 500, 72), platform(1110, 360, 550, 72), platform(1750, 360, 950, 72), platform(260, 280, 150), platform(570, 260, 160), platform(850, 280, 130), platform(1050, 260, 150), platform(1360, 240, 180), platform(1820, 275, 150), platform(2160, 250, 170)],
    pickups: [...gems(270, 245), ...gems(540, 320), ...gems(840, 245), ...gems(1120, 315), ...gems(1370, 205), ...gems(1810, 240), ...gems(2160, 215), ...gems(2420, 315), pickup(1470, 205, "key"), pickup(675, 225, "shield"), pickup(1900, 325, "coffee")],
    enemies: [snake(760, 360), snake(1480, 360, 65), snake(1990, 360), snake(2360, 360, 50)],
    spikes: [{ x: 2110, y: 344, width: 42 }],
  },
  {
    name: "Flooded Ruins", theme: "ruins", width: 2900,
    spawn: { x: 90, y: 360 }, checkpoint: { x: 1450, y: 360 }, exit: { x: 2760, y: 360 },
    platforms: [platform(0, 360, 360, 72), platform(470, 340, 360, 92), platform(950, 360, 420, 72), platform(1450, 360, 400, 72), platform(1960, 340, 300, 92), platform(2380, 360, 520, 72), platform(240, 270, 140), platform(540, 235, 140), platform(800, 255, 170), platform(1120, 250, 160), platform(1510, 265, 140), platform(1780, 235, 160), platform(2080, 225, 160), platform(2430, 265, 160)],
    pickups: [...gems(240, 235), ...gems(510, 200), ...gems(820, 220), ...gems(1120, 215), ...gems(1510, 230), ...gems(1790, 200), ...gems(2080, 190), ...gems(2430, 230), pickup(1190, 215, "key"), pickup(1640, 325, "heart"), pickup(2180, 190, "shield")],
    enemies: [snake(650, 340), snake(1190, 360, 58), snake(1720, 360), snake(2110, 340), snake(2580, 360, 60)],
    spikes: [{ x: 1550, y: 344, width: 42 }, { x: 2480, y: 344, width: 42 }],
  },
  {
    name: "Midnight Temple", theme: "temple", width: 3100,
    spawn: { x: 90, y: 360 }, checkpoint: { x: 1500, y: 360 }, exit: { x: 2960, y: 360 },
    platforms: [platform(0, 360, 390, 72), platform(500, 360, 380, 72), platform(990, 340, 370, 92), platform(1470, 360, 480, 72), platform(2060, 360, 370, 72), platform(2530, 360, 570, 72), platform(260, 260, 140), platform(590, 245, 140), platform(830, 255, 140), platform(1140, 230, 160), platform(1570, 265, 150), platform(1860, 240, 160), platform(2180, 245, 150), platform(2460, 240, 160), platform(2750, 255, 160)],
    pickups: [...gems(260, 225), ...gems(590, 210), ...gems(830, 220), ...gems(1140, 195), ...gems(1570, 230), ...gems(1860, 205), ...gems(2180, 210), ...gems(2460, 205), ...gems(2760, 220), pickup(2280, 210, "key"), pickup(650, 325, "coffee"), pickup(1630, 230, "shield"), pickup(2840, 325, "heart")],
    enemies: [snake(290, 360), snake(700, 360, 55), snake(1170, 340, 58), snake(1700, 360, 65), snake(2290, 360), snake(2730, 360, 55)],
    spikes: [{ x: 1810, y: 344, width: 44 }, { x: 2130, y: 344, width: 42 }, { x: 2640, y: 344, width: 44 }],
  },
];

export function loadLevel(index: number): Level {
  return structuredClone(LEVELS[index]);
}
