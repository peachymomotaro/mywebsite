import { LEVELS, loadLevel, type Level } from "./levels";

export const WIDTH = 768;
export const HEIGHT = 432;
export const PLAYER_WIDTH = 22;
export const PLAYER_HEIGHT = 36;
export const SPEED = 205;
export const STEP = 1 / 120;
export type Status = "ready" | "playing" | "paused" | "caught" | "stageclear" | "won";
export type Input = { left: boolean; right: boolean };
export type GameEvent = "jump" | "double" | "dash" | "gem" | "key" | "power" | "hit" | "stomp" | "checkpoint" | "stageclear" | "won" | "caught";
export type Game = {
  status: Status; level: number; world: Level;
  x: number; y: number; vx: number; vy: number; facing: number;
  grounded: boolean; jumps: number; coyote: number;
  lives: number; score: number; gems: number; key: boolean; checkpoint: boolean;
  invincible: number; shield: number; coffee: number; dashTime: number; dashCooldown: number;
  combo: number; comboTime: number; time: number; elapsed: number; camera: number;
  maxX: number; maxY: number; maxGrace: number; trail: { x: number; y: number }[]; trailTimer: number;
  message: string; messageTime: number;
};

export function createGame(level = 0): Game {
  const world = loadLevel(level);
  return {
    status: "ready", level, world, x: world.spawn.x, y: world.spawn.y - PLAYER_HEIGHT,
    vx: 0, vy: 0, facing: 1, grounded: true, jumps: 0, coyote: 0.1,
    lives: 3, score: 0, gems: 0, key: false, checkpoint: false,
    invincible: 0, shield: 0, coffee: 0, dashTime: 0, dashCooldown: 0,
    combo: 0, comboTime: 0, time: 75, elapsed: 0, camera: 0,
    maxX: world.spawn.x - 155, maxY: world.spawn.y, maxGrace: 2.5, trail: [], trailTimer: 0,
    message: "Find the golden key. Reach the temple gate.", messageTime: 4,
  };
}

export function jump(game: Game): GameEvent | null {
  if (game.status !== "playing" || game.jumps >= 2) return null;
  const first = game.grounded || game.coyote > 0;
  game.jumps = first ? 1 : 2;
  game.vy = first ? -410 : -380;
  game.grounded = false;
  game.coyote = 0;
  return first ? "jump" : "double";
}

export function dash(game: Game): boolean {
  if (game.status !== "playing" || game.dashCooldown > 0) return false;
  game.dashTime = 0.22;
  game.dashCooldown = game.coffee > 0 ? 0.65 : 1.25;
  game.vy = Math.min(game.vy, 0);
  return true;
}

export function nextStage(game: Game): boolean {
  if (game.status !== "stageclear" || game.level >= LEVELS.length - 1) return false;
  const fresh = createGame(game.level + 1);
  Object.assign(game, fresh, { status: "playing", score: game.score, gems: game.gems, lives: Math.min(3, game.lives + 1) });
  return true;
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function say(game: Game, message: string, duration = 2.5) {
  game.message = message;
  game.messageTime = duration;
}

function hurt(game: Game, events: GameEvent[], pit = false) {
  if (game.invincible > 0 && !pit) return;
  if (game.shield > 0 && !pit) {
    game.shield = 0;
    game.invincible = 1.2;
    game.maxX = Math.min(game.maxX, game.x - 150);
    events.push("power");
    say(game, "Shield saved you!");
    return;
  }
  game.lives -= 1;
  game.combo = 0;
  game.invincible = 1.8;
  game.maxGrace = 1.8;
  game.maxX = game.x - 170;
  events.push("hit");
  if (game.lives <= 0) {
    game.status = "caught";
    events.push("caught");
    say(game, "Max got you. One more go?", 99);
    return;
  }
  if (pit) {
    const spawn = game.checkpoint ? game.world.checkpoint : game.world.spawn;
    game.x = spawn.x;
    game.y = spawn.y - PLAYER_HEIGHT;
    game.vx = game.vy = game.dashTime = 0;
    game.grounded = true;
    game.jumps = 0;
    game.trail = [];
    game.maxX = game.x - 170;
    game.maxY = spawn.y;
    say(game, game.checkpoint ? "Back at the checkpoint. Keep going!" : "Mind the gap. Try a double jump!");
  } else {
    game.vy = -220;
    game.vx = -game.facing * 120;
    say(game, "Ouch! Jump on snakes or dash through them.");
  }
}

/** Fixed-step platform physics; input and rendering are independent of frame rate. */
export function stepGame(game: Game, dt: number, input: Input = { left: false, right: false }): GameEvent[] {
  if (game.status !== "playing") return [];
  const events: GameEvent[] = [];
  game.elapsed += dt;
  game.time = Math.max(0, game.time - dt);
  for (const field of ["invincible", "shield", "coffee", "dashTime", "dashCooldown", "comboTime", "messageTime", "maxGrace"] as const) game[field] = Math.max(0, game[field] - dt);
  if (game.comboTime === 0) game.combo = 0;
  if (game.time === 0) {
    game.status = "caught";
    events.push("caught");
    say(game, "Time’s up. Max caught up!", 99);
    return events;
  }

  const direction = Number(input.right) - Number(input.left);
  if (direction) game.facing = direction;
  if (game.dashTime > 0) game.vx = game.facing * 560;
  else {
    const target = direction * (game.coffee > 0 ? 265 : SPEED);
    const change = (direction ? 1500 : 1900) * dt;
    game.vx += Math.max(-change, Math.min(change, target - game.vx));
  }
  const previousBottom = game.y + PLAYER_HEIGHT;
  game.x = Math.max(0, Math.min(game.world.width - PLAYER_WIDTH, game.x + game.vx * dt));
  game.vy = Math.min(700, game.vy + 1180 * dt * (game.dashTime > 0 ? 0.15 : 1));
  game.y += game.vy * dt;
  game.coyote = game.grounded ? 0.1 : Math.max(0, game.coyote - dt);
  game.grounded = false;
  if (game.vy >= 0) {
    for (const platform of game.world.platforms) {
      if (game.x + PLAYER_WIDTH > platform.x + 2 && game.x < platform.x + platform.width - 2 && previousBottom <= platform.y + 1 && game.y + PLAYER_HEIGHT >= platform.y) {
        game.y = platform.y - PLAYER_HEIGHT;
        game.vy = 0;
        game.grounded = true;
        game.jumps = 0;
        break;
      }
    }
  }
  if (game.y > HEIGHT + 40) {
    hurt(game, events, true);
    return events;
  }

  for (const pickup of game.world.pickups) {
    if (pickup.collected || !overlaps(game.x - 6, game.y - 5, PLAYER_WIDTH + 12, PLAYER_HEIGHT + 10, pickup.x - 10, pickup.y - 10, 20, 20)) continue;
    pickup.collected = true;
    if (pickup.kind === "gem") {
      game.gems += 1;
      game.combo = Math.min(5, game.combo + 1);
      game.comboTime = 2;
      game.score += 25 * game.combo;
      events.push("gem");
    } else if (pickup.kind === "key") {
      game.key = true;
      game.score += 250;
      events.push("key");
      say(game, "Key found! Get to the temple gate.");
    } else {
      if (pickup.kind === "shield") { game.shield = 12; say(game, "Shield! One free hit for 12 seconds."); }
      if (pickup.kind === "coffee") { game.coffee = 9; say(game, "Espresso rush! Faster feet, faster dash."); }
      if (pickup.kind === "heart") { game.lives = Math.min(3, game.lives + 1); say(game, "An extra chance. Keep it!"); }
      game.score += 100;
      events.push("power");
    }
  }
  for (const enemy of game.world.enemies) {
    if (!enemy.alive) continue;
    enemy.x = enemy.origin + Math.sin(game.elapsed * 1.6 + enemy.origin) * enemy.range;
    if (!overlaps(game.x, game.y, PLAYER_WIDTH, PLAYER_HEIGHT, enemy.x, enemy.y, 30, 18)) continue;
    if (game.dashTime > 0 || (game.vy > 0 && previousBottom <= enemy.y + 10)) {
      enemy.alive = false;
      game.score += 150;
      if (game.dashTime === 0) { game.vy = -315; game.jumps = 1; }
      events.push("stomp");
      say(game, "+150! Nice one.", 1);
    } else hurt(game, events);
  }
  for (const spike of game.world.spikes) {
    if (game.dashTime === 0 && overlaps(game.x + 3, game.y, PLAYER_WIDTH - 6, PLAYER_HEIGHT, spike.x, spike.y + 3, spike.width, 13)) hurt(game, events);
  }
  if (game.status !== "playing") return events;

  if (!game.checkpoint && game.x >= game.world.checkpoint.x && game.grounded) {
    game.checkpoint = true;
    game.score += 100;
    events.push("checkpoint");
    say(game, "Checkpoint! Falls bring you back here.");
  }
  game.trailTimer += dt;
  if (game.trailTimer > 0.06) {
    game.trail.push({ x: game.x, y: game.y + PLAYER_HEIGHT });
    if (game.trail.length > 220) game.trail.shift();
    game.trailTimer = 0;
  }
  if (game.maxGrace === 0) game.maxX += (172 + game.level * 10) * dt;
  const nearest = game.trail.reduce<{ x: number; y: number } | undefined>((best, point) => !best || Math.abs(point.x - game.maxX) < Math.abs(best.x - game.maxX) ? point : best, undefined);
  if (nearest) game.maxY = nearest.y;
  if (game.x - game.maxX < 23 && game.maxGrace === 0 && game.dashTime === 0) hurt(game, events);

  const exit = game.world.exit;
  if (game.x + PLAYER_WIDTH >= exit.x && Math.abs(game.y + PLAYER_HEIGHT - exit.y) < 60) {
    if (game.key) {
      game.score += 500 + Math.floor(game.time) * 10;
      game.status = game.level === LEVELS.length - 1 ? "won" : "stageclear";
      events.push(game.status);
      say(game, game.status === "won" ? "You escaped Max!" : "Gate unlocked. Onward!", 99);
    } else if (game.messageTime < 0.5) say(game, "The gate needs a key. Look on the upper platforms!");
  }
  const targetCamera = Math.max(0, Math.min(game.world.width - WIDTH, game.x - WIDTH * 0.3));
  game.camera += (targetCamera - game.camera) * Math.min(1, dt * 9);
  return events;
}
