import { describe, expect, it } from "vitest";
import { createGame, FINISH, jump, SPEED, stepGame } from "../../lib/max-escape/game";

function advance(game: ReturnType<typeof createGame>, seconds: number) {
  for (let i = 0; i < Math.round(seconds * 120); i++) stepGame(game, 1 / 120);
}

describe("Escape from Max", () => {
  it("jumps once, clears a rock, collects its star, and lands", () => {
    const game = createGame();
    game.status = "playing";
    game.distance = 440 - 47;
    expect(jump(game)).toBe(true);
    advance(game, 0.1);
    expect(jump(game)).toBe(false);
    advance(game, 0.75);
    expect(game.lives).toBe(3);
    expect(game.stars).toBe(1);
    expect(game.y).toBe(0);
    expect(jump(game)).toBe(true);
  });

  it("gives one penalty per rock and ends after three collisions", () => {
    const game = createGame();
    game.status = "playing";
    for (let i = 0; i < 3; i++) {
      game.distance = game.obstacles[i].x - 10;
      game.invincible = 0;
      stepGame(game, 1 / 120);
      expect(game.lives).toBe(2 - i);
      advance(game, 0.1);
      expect(game.lives).toBe(2 - i);
    }
    expect(game.status).toBe("caught");
    const distance = game.distance;
    advance(game, 2);
    expect(game.distance).toBe(distance);
  });

  it("freezes completely while paused and resumes at the same speed", () => {
    const game = createGame();
    game.status = "paused";
    expect(jump(game)).toBe(false);
    advance(game, 5);
    expect(game.distance).toBe(0);
    game.status = "playing";
    advance(game, 1);
    expect(game.distance).toBeCloseTo(SPEED, 0);
  });

  it("a well-timed run can win the complete course without taking damage", () => {
    const game = createGame();
    game.status = "playing";
    for (let i = 0; i < 120 * 40 && game.status === "playing"; i++) {
      if (game.obstacles.some((o) => o.x - game.distance > 46 && o.x - game.distance < 48)) jump(game);
      stepGame(game, 1 / 120);
    }
    expect(game.status).toBe("won");
    expect(game.distance).toBe(FINISH);
    expect(game.lives).toBe(3);
    expect(game.stars).toBe(14);
    expect(createGame().status).toBe("ready");
  });
});
