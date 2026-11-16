export type WorldId = "garden" | "flock" | "outbreak" | "evolution" | "city";
export type Tuning = {
  separation: number; alignment: number; cohesion: number;
  infection: number; bridges: number; habitat: number; mutation: number;
  similarity: number;
};
export const INITIAL_TUNING: Tuning = {
  separation: 65, alignment: 75, cohesion: 58,
  infection: 35, bridges: 38, habitat: 78, mutation: 17, similarity: 35,
};
export const W = 960, H = 590;
const GW = 48, GH = 30, CW = 40, CH = 26;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

type Boid = { x: number; y: number; vx: number; vy: number };
type Person = { x: number; y: number; status: "s" | "i" | "r" | "v"; age: number; community: number };
export type WorldState = {
  kind: WorldId; tick: number; cells: Uint8Array; boids: Boid[];
  people: Person[]; links: [number, number][]; traits: number[];
  seats: Int8Array; attract: { x: number; y: number; ttl: number } | null;
};
export type Metrics = {
  primary: string; secondary: string; third: string;
  labels: [string, string, string]; progress: number; success: boolean;
  hint: string;
};
const index = (x: number, y: number, w: number) => y * w + x;
const wrap = (n: number, max: number) => (n + max) % max;

function glider(cells: Uint8Array, x: number, y: number) {
  const points = [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]];
  for (const [dx, dy] of points) cells[index(wrap(x + dx, GW), wrap(y + dy, GH), GW)] = 1;
}

function outbreakGraph(tuning: Tuning): { people: Person[]; links: [number, number][] } {
  const people: Person[] = [];
  const centers = [[275, 180], [685, 180], [275, 420], [685, 420]];
  for (let group = 0; group < 4; group++) {
    for (let j = 0; j < 22; j++) {
      const a = (j / 22) * Math.PI * 2 + rand(-0.16, 0.16);
      const radius = rand(65, 143);
      people.push({
        x: centers[group][0] + Math.cos(a) * radius,
        y: centers[group][1] + Math.sin(a) * radius,
        status: "s", age: 0, community: group,
      });
    }
  }
  const links: [number, number][] = [];
  const used = new Set<string>();
  const add = (a: number, b: number) => {
    if (a === b) return;
    const key = [Math.min(a, b), Math.max(a, b)].join(":");
    if (!used.has(key)) { used.add(key); links.push([a, b]); }
  };
  for (let g = 0; g < 4; g++) {
    for (let i = 0; i < 22; i++) {
      add(g * 22 + i, g * 22 + (i + 1) % 22);
      add(g * 22 + i, g * 22 + (i + 2) % 22);
      add(g * 22 + i, g * 22 + Math.floor(rand(0, 22)));
    }
  }
  const cross = Math.round((tuning.bridges / 100) * 44);
  for (let i = 0; i < cross; i++) {
    const a = Math.floor(rand(0, 88));
    const nextGroup = (people[a].community + 1 + Math.floor(rand(0, 3))) % 4;
    add(a, nextGroup * 22 + Math.floor(rand(0, 22)));
  }
  for (const g of [0, 1, 2, 3]) people[g * 22 + 5].status = g === 0 ? "i" : "s";
  return { people, links };
}

export function createWorld(kind: WorldId, tuning: Tuning): WorldState {
  const state: WorldState = {
    kind, tick: 0, cells: new Uint8Array(GW * GH), boids: [],
    people: [], links: [], traits: [], seats: new Int8Array(CW * CH), attract: null,
  };
  if (kind === "garden") {
    glider(state.cells, 7, 7);
    glider(state.cells, 33, 17);
    for (const [x, y] of [[23, 14], [24, 14], [25, 14], [25, 13], [24, 12], [23, 12], [23, 13]]) {
      state.cells[index(x, y, GW)] = 1;
    }
  } else if (kind === "flock") {
    state.boids = Array.from({ length: 110 }, () => {
      const a = rand(0, Math.PI * 2);
      return { x: rand(30, W - 30), y: rand(30, H - 30), vx: Math.cos(a) * 2.8, vy: Math.sin(a) * 2.8 };
    });
  } else if (kind === "outbreak") {
    const graph = outbreakGraph(tuning);
    state.people = graph.people;
    state.links = graph.links;
  } else if (kind === "evolution") {
    state.traits = Array.from({ length: 160 }, () => rand(0.12, 0.43));
  } else if (kind === "city") {
    for (let i = 0; i < state.seats.length; i++) {
      state.seats[i] = Math.random() < 0.16 ? 0 : Math.random() < 0.5 ? -1 : 1;
    }
  }
  return state;
}

const gardenNeighbours = (cells: Uint8Array, x: number, y: number) => {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (dx || dy) count += cells[index(wrap(x + dx, GW), wrap(y + dy, GH), GW)];
  }
  return count;
};

function stepGarden(state: WorldState) {
  const next = new Uint8Array(GW * GH);
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const neighbours = gardenNeighbours(state.cells, x, y);
    const alive = state.cells[index(x, y, GW)] === 1;
    next[index(x, y, GW)] = (neighbours === 3 || (alive && neighbours === 2)) ? 1 : 0;
  }
  state.cells = next;
}

function stepFlock(state: WorldState, tuning: Tuning) {
  const next = state.boids.map(b => ({ ...b }));
  for (let i = 0; i < state.boids.length; i++) {
    const b = state.boids[i];
    let sx = 0, sy = 0, avx = 0, avy = 0, cx = 0, cy = 0, n = 0;
    for (let j = 0; j < state.boids.length; j++) {
      if (i === j) continue;
      const other = state.boids[j];
      const dx = other.x - b.x, dy = other.y - b.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 110 * 110) continue;
      avx += other.vx; avy += other.vy; cx += other.x; cy += other.y; n++;
      if (d2 < 39 * 39 && d2 > 0.1) {
        sx -= dx / d2; sy -= dy / d2;
      }
    }
    let fx = sx * (tuning.separation / 70) * 24;
    let fy = sy * (tuning.separation / 70) * 24;
    if (n) {
      fx += ((avx / n) - b.vx) * (tuning.alignment / 100) * 0.14;
      fy += ((avy / n) - b.vy) * (tuning.alignment / 100) * 0.14;
      fx += ((cx / n) - b.x) * (tuning.cohesion / 100) * 0.0026;
      fy += ((cy / n) - b.y) * (tuning.cohesion / 100) * 0.0026;
    }
    if (state.attract && state.attract.ttl > 0) {
      fx += (state.attract.x - b.x) * 0.0009;
      fy += (state.attract.y - b.y) * 0.0009;
    }
    let vx = b.vx + clamp(fx, -0.21, 0.21);
    let vy = b.vy + clamp(fy, -0.21, 0.21);
    const norm = Math.hypot(vx, vy) || 1;
    vx = vx / norm * 3;
    vy = vy / norm * 3;
    const x = b.x + vx, y = b.y + vy;
    next[i] = { x: wrap(x, W), y: wrap(y, H), vx, vy };
  }
  state.boids = next;
  if (state.attract) state.attract.ttl--;
}

function stepOutbreak(state: WorldState, tuning: Tuning) {
  const exposed = new Set<number>();
  for (const [a, b] of state.links) {
    const p = state.people[a], q = state.people[b];
    if (p.status === "i" && q.status === "s" && Math.random() < tuning.infection / 100) exposed.add(b);
    if (q.status === "i" && p.status === "s" && Math.random() < tuning.infection / 100) exposed.add(a);
  }
  for (const person of state.people) {
    if (person.status === "i") {
      person.age++;
      if (person.age >= 7) person.status = "r";
    }
  }
  for (const i of exposed) { state.people[i].status = "i"; state.people[i].age = 0; }
}

function stepEvolution(state: WorldState, tuning: Tuning) {
  const preferred = tuning.habitat / 100;
  const weights = state.traits.map(x => 0.02 + Math.exp(-Math.pow((x - preferred) / 0.23, 2) * 1.8));
  const total = weights.reduce((a, b) => a + b, 0);
  const children: number[] = [];
  for (let i = 0; i < state.traits.length; i++) {
    let sample = Math.random() * total;
    let parent = state.traits[state.traits.length - 1];
    for (let j = 0; j < weights.length; j++) {
      sample -= weights[j];
      if (sample <= 0) { parent = state.traits[j]; break; }
    }
    const variation = (Math.random() + Math.random() + Math.random() - 1.5) * (tuning.mutation / 100) * 1.1;
    children.push(clamp(parent + variation, 0.005, 0.995));
  }
  state.traits = children;
}

function sameFraction(seats: Int8Array, i: number, hypothetical?: number): number {
  const v = hypothetical ?? seats[i];
  if (!v) return 1;
  const x = i % CW, y = Math.floor(i / CW);
  let same = 0, total = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
    const other = seats[index(nx, ny, CW)];
    if (other) { total++; if (other === v) same++; }
  }
  return total ? same / total : 1;
}

function stepCity(state: WorldState, tuning: Tuning) {
  const seats = state.seats;
  const tolerance = tuning.similarity / 100;
  for (let attempt = 0; attempt < 20; attempt++) {
    const occupied = Math.floor(rand(0, seats.length));
    if (!seats[occupied] || sameFraction(seats, occupied) >= tolerance) continue;
    const empties: number[] = [];
    for (let i = 0; i < seats.length; i++) if (!seats[i]) empties.push(i);
    if (!empties.length) break;
    const moving = seats[occupied];
    seats[occupied] = 0;
    let destination = -1;
    for (let tryIndex = 0; tryIndex < 30; tryIndex++) {
      const candidate = empties[Math.floor(rand(0, empties.length))];
      if (sameFraction(seats, candidate, moving) >= tolerance) { destination = candidate; break; }
    }
    if (destination < 0) { seats[occupied] = moving; continue; }
    seats[destination] = moving;
  }
}

export function stepWorld(state: WorldState, tuning: Tuning) {
  switch (state.kind) {
    case "garden": stepGarden(state); break;
    case "flock": stepFlock(state, tuning); break;
    case "outbreak": stepOutbreak(state, tuning); break;
    case "evolution": stepEvolution(state, tuning); break;
    case "city": stepCity(state, tuning); break;
  }
  state.tick++;
}

export function actionWorld(state: WorldState, action: string, tuning: Tuning) {
  if (action === "reset") return createWorld(state.kind, tuning);
  if (state.kind === "garden") {
    if (action === "clear") state.cells.fill(0);
    if (action === "random") for (let i = 0; i < state.cells.length; i++) state.cells[i] = Math.random() < 0.24 ? 1 : 0;
    if (action === "glider") glider(state.cells, Math.floor(rand(2, GW - 5)), Math.floor(rand(2, GH - 5)));
  }
  if (state.kind === "flock" && action === "scatter") return createWorld("flock", tuning);
  if (state.kind === "flock" && action === "gather") state.attract = { x: W / 2, y: H / 2, ttl: 220 };
  if (state.kind === "outbreak" && action === "vaccinate") {
    const available = state.people.filter(p => p.status === "s");
    for (let i = 0; i < Math.ceil(state.people.length * 0.20) && available.length; i++) {
      const item = Math.floor(rand(0, available.length));
      available.splice(item, 1)[0].status = "v";
    }
  }
  if (state.kind === "evolution" && action === "shift") tuning.habitat = tuning.habitat > 50 ? 20 : 80;
  if (state.kind === "city" && action === "mix") return createWorld("city", tuning);
  return state;
}

export function interactWorld(state: WorldState, x: number, y: number, tuning: Tuning, erase = false) {
  x = clamp(x, 0, W - 0.01); y = clamp(y, 0, H - 0.01);
  if (state.kind === "garden") {
    const gx = Math.floor(x / (W / GW)), gy = Math.floor(y / (H / GH));
    state.cells[index(gx, gy, GW)] = erase ? 0 : 1;
  } else if (state.kind === "flock") {
    state.attract = { x, y, ttl: 200 };
  } else if (state.kind === "outbreak") {
    const nearest = state.people.reduce((best, p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      return d < best.distance ? { i, distance: d } : best;
    }, { i: -1, distance: 30 * 30 });
    if (nearest.i >= 0 && state.people[nearest.i].status === "s") state.people[nearest.i].status = "v";
  } else if (state.kind === "evolution") {
    tuning.habitat = Math.round((x / W) * 100);
  } else if (state.kind === "city") {
    const gx = Math.floor(x / (W / CW)), gy = Math.floor(y / (H / CH));
    const i = index(gx, gy, CW);
    state.seats[i] = state.seats[i] === 1 ? -1 : state.seats[i] === -1 ? 0 : 1;
  }
}

const percent = (n: number) => String(Math.round(n * 100)) + "%";
export function getMetrics(state: WorldState, tuning: Tuning): Metrics {
  if (state.kind === "garden") {
    const alive = state.cells.reduce((a, b) => a + b, 0);
    const progress = clamp(state.tick / 16, 0, 1);
    return {
      primary: String(alive), secondary: String(state.tick), third: percent(alive / state.cells.length),
      labels: ["Living cells", "Generations", "Occupied"], progress,
      success: state.tick >= 16 && alive >= 5,
      hint: alive === 0 ? "Everything died out. Plant a glider or random seed." : "Look for shapes that move or repeat without being directed.",
    };
  }
  if (state.kind === "flock") {
    let sum = 0, count = 0;
    for (const b of state.boids) {
      let avgx = 0, avgy = 0, n = 0;
      for (const other of state.boids) {
        const d = Math.hypot(other.x - b.x, other.y - b.y);
        if (d > 0 && d < 110) { avgx += other.vx; avgy += other.vy; n++; }
      }
      if (n) { const norm = Math.hypot(avgx, avgy); sum += norm / (3 * n); count++; }
    }
    const synchrony = count ? clamp(sum / count, 0, 1) : 0;
    return {
      primary: percent(synchrony), secondary: String(state.tick), third: String(state.boids.length),
      labels: ["Local alignment", "Frames", "Agents"], progress: clamp(synchrony / 0.75, 0, 1),
      success: state.tick >= 70 && synchrony >= 0.75,
      hint: "Alignment measures how similarly nearby agents are moving, not whether the entire flock travels in one direction.",
    };
  }
  if (state.kind === "outbreak") {
    const infected = state.people.filter(p => p.status === "i").length;
    const untouched = state.people.filter(p => p.status === "s" || p.status === "v").length;
    const vaccinated = state.people.filter(p => p.status === "v").length;
    const safe = untouched / state.people.length;
    return {
      primary: String(infected), secondary: percent(safe), third: String(vaccinated),
      labels: ["Currently infectious", "Never infected", "Vaccinated"], progress: clamp(safe / 0.60, 0, 1),
      success: state.tick >= 8 && infected === 0 && safe >= 0.60,
      hint: infected === 0 ? "Outbreak ended. Reset to compare a different number of bridges or transmission rate." : "Fewer cross-community bridges often slow the epidemic. Click susceptible people to vaccinate.",
    };
  }
  if (state.kind === "evolution") {
    const average = state.traits.reduce((a, b) => a + b, 0) / state.traits.length;
    const goal = tuning.habitat / 100;
    const difference = Math.abs(average - goal);
    return {
      primary: percent(average), secondary: percent(goal), third: String(state.tick),
      labels: ["Mean trait", "Habitat optimum", "Generations"], progress: clamp(1 - difference / 0.55, 0, 1),
      success: state.tick >= 10 && difference <= 0.10,
      hint: "Selection changes which inherited traits are common. Move the habitat target and see how quickly the population responds.",
    };
  }
  let same = 0, different = 0, unhappy = 0, occupied = 0;
  const seats = state.seats;
  for (let i = 0; i < seats.length; i++) {
    if (!seats[i]) continue;
    occupied++;
    if (sameFraction(seats, i) < tuning.similarity / 100) unhappy++;
    const x = i % CW, y = Math.floor(i / CW);
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || nx >= CW || ny >= CH) continue;
      const other = seats[index(nx, ny, CW)];
      if (!other) continue;
      if (other === seats[i]) same++; else different++;
    }
  }
  const clustering = same + different ? same / (same + different) : 0;
  return {
    primary: percent(clustering), secondary: percent(unhappy / (occupied || 1)),
    third: String(state.tick), labels: ["Same-group neighbours", "Unhappy residents", "Rounds"],
    progress: clamp(clustering / 0.66, 0, 1),
    success: state.tick >= 35 && clustering >= 0.66 && tuning.similarity <= 45,
    hint: "Mild individual preferences can lead to much stronger collective separation. This is a model, not a claim about every real city.",
  };
}

const colours = { bg: "#0d1c25", grid: "#1d3440", mint: "#a6e0c2", gold: "#f4bd6b", red: "#f17e72", blue: "#7db4e4", faint: "#56707b" };
function background(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = colours.bg; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#23404a"; ctx.lineWidth = 0.65;
  for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
}
function drawGarden(ctx: CanvasRenderingContext2D, state: WorldState) {
  const sx = W / GW, sy = H / GH;
  ctx.strokeStyle = "#1b303a"; ctx.lineWidth = 0.8;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    const left = x * sx, top = y * sy;
    if (state.cells[index(x, y, GW)]) {
      ctx.fillStyle = ((x * 7 + y * 11) % 4 === 0) ? colours.gold : colours.mint;
      ctx.fillRect(left + 2, top + 2, sx - 4, sy - 4);
    } else { ctx.strokeRect(left + 0.5, top + 0.5, sx - 1, sy - 1); }
  }
}
function drawFlock(ctx: CanvasRenderingContext2D, state: WorldState) {
  if (state.attract) {
    const { x, y } = state.attract;
    ctx.strokeStyle = colours.gold; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 31, 0, Math.PI * 2); ctx.stroke();
  }
  for (const b of state.boids) {
    const angle = Math.atan2(b.vy, b.vx);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(angle);
    ctx.fillStyle = colours.mint;
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -4.8); ctx.lineTo(-4, 0); ctx.lineTo(-8, 4.8); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}
function drawOutbreak(ctx: CanvasRenderingContext2D, state: WorldState) {
  ctx.lineWidth = 1;
  for (const [a, b] of state.links) {
    const p = state.people[a], q = state.people[b];
    ctx.strokeStyle = p.community === q.community ? "#35505d" : "#9b795e";
    ctx.globalAlpha = p.community === q.community ? 0.55 : 0.85;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const p of state.people) {
    const radius = p.status === "i" ? 8.4 : 6.4;
    ctx.fillStyle = p.status === "s" ? colours.mint : p.status === "i" ? colours.red : p.status === "r" ? colours.gold : colours.blue;
    if (p.status === "i") {
      ctx.fillStyle = "rgba(241, 126, 114, 0.16)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, 2 * Math.PI); ctx.fill();
      ctx.fillStyle = colours.red;
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI); ctx.fill();
  }
}
function drawEvolution(ctx: CanvasRenderingContext2D, state: WorldState, tuning: Tuning) {
  const bins = Array(32).fill(0) as number[];
  for (const trait of state.traits) bins[Math.min(31, Math.floor(trait * 32))]++;
  const max = Math.max(12, ...bins);
  const base = 495, scale = 320;
  ctx.fillStyle = "#9bb1b5"; ctx.font = "17px ui-monospace, monospace";
  ctx.fillText("TRAIT DISTRIBUTION", 68, 70);
  ctx.fillText("LOW", 68, 550); ctx.fillText("HIGH", 836, 550);
  for (let i = 0; i < bins.length; i++) {
    const height = bins[i] / max * scale;
    const x = 66 + i * 26;
    ctx.fillStyle = (i % 4 === 0) ? colours.gold : colours.mint;
    ctx.fillRect(x, base - height, 19, height);
  }
  const tx = 66 + tuning.habitat / 100 * 32 * 26;
  ctx.strokeStyle = colours.red; ctx.lineWidth = 3; ctx.setLineDash([8, 8]);
  ctx.beginPath(); ctx.moveTo(tx, 105); ctx.lineTo(tx, base + 15); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = colours.red; ctx.font = "16px ui-monospace, monospace";
  ctx.fillText("HABITAT TARGET", clamp(tx - 65, 65, 735), 98);
  ctx.strokeStyle = "#9bb1b5"; ctx.beginPath(); ctx.moveTo(62, base + 1); ctx.lineTo(910, base + 1); ctx.stroke();
}
function drawCity(ctx: CanvasRenderingContext2D, state: WorldState) {
  const sx = W / CW, sy = H / CH;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const v = state.seats[index(x, y, CW)];
    ctx.fillStyle = v === 1 ? colours.gold : v === -1 ? colours.blue : colours.grid;
    ctx.fillRect(x * sx + 2, y * sy + 2, sx - 4, sy - 4);
  }
}
export function drawWorld(ctx: CanvasRenderingContext2D, state: WorldState, tuning: Tuning) {
  background(ctx);
  switch (state.kind) {
    case "garden": drawGarden(ctx, state); break;
    case "flock": drawFlock(ctx, state); break;
    case "outbreak": drawOutbreak(ctx, state); break;
    case "evolution": drawEvolution(ctx, state, tuning); break;
    case "city": drawCity(ctx, state); break;
  }
}
