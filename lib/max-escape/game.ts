export const WIDTH = 640;
export const HEIGHT = 360;
export const GROUND = 282;
export const PLAYER_X = 164;
export const FINISH = 4200;
export const SPEED = 126;
export type Status = "ready" | "playing" | "paused" | "caught" | "won";
export type Obstacle = { x: number; width: number; height: number; hit: boolean };
export type Star = { x: number; y: number; collected: boolean };
export type Game = {
  status: Status;
  distance: number;
  y: number;
  velocity: number;
  lives: number;
  stars: number;
  invincible: number;
  elapsed: number;
  obstacles: Obstacle[];
  pickups: Star[];
};
export type GameEvent = "jump" | "star" | "hit" | "won" | "caught";

export function createGame(): Game {
  const obstacles = Array.from({ length: 14 }, (_, i) => ({
    x: 440 + i * 260,
    width: i % 3 === 1 ? 32 : 23,
    height: i % 3 === 2 ? 29 : 22,
    hit: false,
  }));
  return {
    status: "ready", distance: 0, y: 0, velocity: 0, lives: 3,
    stars: 0, invincible: 0, elapsed: 0, obstacles,
    pickups: obstacles.map((obstacle) => ({ x: obstacle.x + 8, y: 100, collected: false })),
  };
}

export function jump(game: Game): boolean {
  if (game.status !== "playing" || game.y > 0 || game.velocity !== 0) return false;
  game.velocity = 390;
  return true;
}

/** Advance at a fixed 1/120 second step; rendering never controls game speed. */
export function stepGame(game: Game, dt: number): GameEvent[] {
  if (game.status !== "playing") return [];
  const events: GameEvent[] = [];
  game.elapsed += dt;
  game.distance += SPEED * dt;
  game.invincible = Math.max(0, game.invincible - dt);
  game.y = Math.max(0, game.y + game.velocity * dt);
  game.velocity = game.y > 0 ? game.velocity - 960 * dt : 0;

  for (const obstacle of game.obstacles) {
    const relativeX = obstacle.x - game.distance;
    if (!obstacle.hit && game.invincible === 0 && relativeX < 17 && relativeX + obstacle.width > -13 && game.y < obstacle.height - 4) {
      obstacle.hit = true;
      game.lives -= 1;
      game.invincible = 1.25;
      events.push("hit");
      if (game.lives === 0) {
        game.status = "caught";
        events.push("caught");
        return events;
      }
    }
  }
  for (const star of game.pickups) {
    if (!star.collected && Math.abs(star.x - game.distance) < 23 && Math.abs(star.y - (game.y + 27)) < 24) {
      star.collected = true;
      game.stars += 1;
      events.push("star");
    }
  }
  if (game.distance >= FINISH) {
    game.distance = FINISH;
    game.status = "won";
    events.push("won");
  }
  return events;
}
