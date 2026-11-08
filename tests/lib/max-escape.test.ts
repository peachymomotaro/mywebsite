import { describe, expect, it } from "vitest";
import { createGame, dash, jump, nextStage, PLAYER_HEIGHT, SPEED, STEP, stepGame, type Game, type Input } from "../../lib/max-escape/game";
import { LEVELS } from "../../lib/max-escape/levels";

const right = { left: false, right: true };
const still = { left: false, right: false };
function playing(level = 0) { const game = createGame(level); game.status = "playing"; return game; }
function advance(game: Game, seconds: number, input: Input = still) {
  const events: string[] = [];
  for (let i = 0; i < Math.round(seconds / STEP); i++) events.push(...stepGame(game, STEP, input));
  return events;
}

describe("Max Danger platform chase", () => {
  it("moves in either direction, stops on release, and remains inside the world", () => {
    const game = playing();
    game.maxGrace = 99;
    advance(game, .7, right);
    expect(game.x).toBeGreaterThan(200);
    expect(game.vx).toBeCloseTo(SPEED);
    advance(game, .2);
    expect(game.vx).toBe(0);
    advance(game, 1.8, { left: true, right: false });
    expect(game.x).toBe(0);
  });

  it("allows a second jump in the air, refuses a third, and resets on landing", () => {
    const game = playing();
    expect(jump(game)).toBe("jump");
    advance(game, .3);
    const before = game.y;
    expect(jump(game)).toBe("double");
    expect(jump(game)).toBeNull();
    advance(game, .25);
    expect(game.y).toBeLessThan(before - 40);
    advance(game, 1);
    expect(game.grounded).toBe(true);
    expect(game.jumps).toBe(0);
  });

  it("lands on upper platforms instead of falling through them", () => {
    const game = playing();
    game.x = 280; game.y = 180; game.vy = 120; game.grounded = false;
    advance(game, .3);
    expect(game.y + PLAYER_HEIGHT).toBe(280);
    expect(game.grounded).toBe(true);
  });

  it("dash defeats a snake, then enforces and recharges its cooldown", () => {
    const game = playing();
    const enemy = game.world.enemies[0];
    enemy.origin = 155; enemy.x = 155; enemy.range = 0;
    expect(dash(game)).toBe(true);
    expect(dash(game)).toBe(false);
    expect(advance(game, .12, right)).toContain("stomp");
    expect(enemy.alive).toBe(false);
    expect(game.lives).toBe(3);
    advance(game, 1.2);
    expect(dash(game)).toBe(true);
  });

  it("stomping a snake gives a bounce and score", () => {
    const game = playing();
    const enemy = game.world.enemies[0];
    enemy.origin = 300; enemy.range = 0;
    game.x = 303; game.y = enemy.y - PLAYER_HEIGHT - 3; game.vy = 200;
    const events = advance(game, .04);
    expect(events).toContain("stomp");
    expect(game.vy).toBeLessThan(0);
    expect(game.score).toBeGreaterThanOrEqual(150);
  });

  it("a shield absorbs one hit without taking a life", () => {
    const game = playing();
    game.shield = 10;
    const enemy = game.world.enemies[0];
    enemy.origin = 105; enemy.range = 0;
    stepGame(game, STEP);
    expect(game.shield).toBe(0);
    expect(game.lives).toBe(3);
    game.invincible = 0;
    stepGame(game, STEP);
    expect(game.lives).toBe(2);
  });

  it("chains nearby gems into a combo and expires it after a pause in collecting", () => {
    const game = playing();
    game.world.pickups = [0,1,2].map(i => ({ x: 110 + i * 5, y: 335, kind: "gem", collected: false }));
    stepGame(game, STEP);
    expect(game.gems).toBe(3);
    expect(game.combo).toBe(3);
    expect(game.score).toBe(150);
    advance(game, 2.1);
    expect(game.combo).toBe(0);
  });

  it("coffee temporarily raises movement speed and a heart restores a chance", () => {
    const game = playing();
    game.lives = 2;
    game.world.pickups = [{ x: 110, y: 335, kind: "coffee", collected: false }, { x: 110, y: 335, kind: "heart", collected: false }];
    stepGame(game, STEP);
    expect(game.lives).toBe(3);
    advance(game, .4, right);
    expect(game.vx).toBeGreaterThan(SPEED);
  });

  it("activates a checkpoint, then respawns there after falling", () => {
    const game = playing();
    game.x = game.world.checkpoint.x;
    stepGame(game, STEP);
    expect(game.checkpoint).toBe(true);
    game.y = 500;
    stepGame(game, STEP);
    expect(game.x).toBe(game.world.checkpoint.x);
    expect(game.y + PLAYER_HEIGHT).toBe(game.world.checkpoint.y);
    expect(game.lives).toBe(2);
  });

  it("locks exits until a key is collected and advances all three stages", () => {
    const game = playing();
    for (let level = 0; level < LEVELS.length; level++) {
      game.x = game.world.exit.x; game.y = game.world.exit.y - PLAYER_HEIGHT;
      stepGame(game, STEP);
      expect(game.status).toBe("playing");
      game.key = true;
      stepGame(game, STEP);
      expect(game.status).toBe(level === 2 ? "won" : "stageclear");
      const score = game.score;
      if (level < 2) {
        expect(nextStage(game)).toBe(true);
        expect(game.level).toBe(level + 1);
        expect(game.key).toBe(false);
        expect(game.score).toBe(score);
      }
    }
    expect(nextStage(game)).toBe(false);
  });

  it("freezes physics while paused and ends when the clock or lives run out", () => {
    const game = playing();
    game.status = "paused";
    const before = structuredClone(game);
    advance(game, 1, right);
    expect(game).toEqual(before);
    expect(jump(game)).toBeNull(); expect(dash(game)).toBe(false);
    game.status = "playing"; game.time = .01;
    advance(game, .1);
    expect(game.status).toBe("caught");
    const fresh = playing(); fresh.lives = 1; fresh.y = 500;
    stepGame(fresh, STEP);
    expect(fresh.status).toBe("caught");
  });

  it("every key and exit is reachable with movement, double jumps, and dashes", () => {
    for (let level = 0; level < LEVELS.length; level++) {
      const game = playing(level);
      for (let i = 0; i < 120 * 70 && game.status === "playing"; i++) {
        const key = game.world.pickups.find(p => p.kind === "key")!;
        const target = game.key ? game.world.exit.x + 10 : key.x - 7;
        const input = { left: game.x > target + 7, right: game.x < target - 7 };
        const floor = game.world.platforms.find(p => Math.abs(p.y - (game.y + PLAYER_HEIGHT)) < 2 && game.x + 11 > p.x && game.x + 11 < p.x + p.width);
        const gap = floor && floor.x + floor.width - game.x < 40 && input.right;
        const reachingKey = !game.key && Math.abs(game.x - key.x) < 110;
        const snake = game.world.enemies.some(e => e.alive && e.x > game.x && e.x - game.x < 60);
        const spikes = game.world.spikes.some(s => s.x > game.x && s.x - game.x < 55);
        if ((game.grounded && (gap || reachingKey || snake || spikes)) || (game.jumps === 1 && game.vy > -45)) jump(game);
        const overGap = !game.world.platforms.some(p => p.height > 30 && game.x + 11 >= p.x && game.x + 11 <= p.x + p.width);
        if (overGap && game.vy > 100 && game.jumps === 2) dash(game);
        stepGame(game, STEP, input);
      }
      expect(game.status, `stage ${level + 1}: x=${Math.round(game.x)}, key=${game.key}, lives=${game.lives}`).toBe(level === 2 ? "won" : "stageclear");
    }
  });

  it("restarting restores independent enemies and collectibles", () => {
    const game = playing();
    game.world.enemies[0].alive = false;
    game.world.pickups[0].collected = true;
    const fresh = createGame();
    expect(fresh.world.enemies[0].alive).toBe(true);
    expect(fresh.world.pickups[0].collected).toBe(false);
  });
});
