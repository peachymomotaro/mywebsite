import { FINISH, GROUND, HEIGHT, PLAYER_X, WIDTH, type Game } from "./game";

const GIRL = [
  "....yyyy....", "...yyyyyy...", "...yysssy...", "...yssbs....",
  "...yysss....", "..yyyss.....", "..y.cccc....", "....ccccs...",
  "...scccc.s..", "....cccc....", "...cccccc...", "...cccccc...",
  "....ss.ss...", "....ss.ss...", "....bb.bb...", "...bbb.bbb..",
];
const MAX = [
  "...hhhhhh...", "..hhhhhhhh..", "..hhhhhshh..", "..hhssbssh..",
  "...hssss....", "....sss.....", "...mmmmmm...", "..smmmmmm...",
  "..smmmmmmss.", "...mmmmmm...", "...pppppp...", "...pp.ppp...",
  "...pp.pp....", "...pp.pp....", "..bbb.bbb...", "..bbb.bbb...",
];
const COLORS: Record<string, string> = { y: "#ffd765", s: "#efbb92", b: "#283645", c: "#dc695f", h: "#573c36", m: "#778c58", p: "#404d61" };

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawCharacter(ctx: CanvasRenderingContext2D, kind: "girl" | "max", x: number, feet: number, frame: number) {
  if (kind === "max") {
    // An acoustic guitar slung over Max's shoulder, behind his running sprite.
    rect(ctx, "#644333", x - 10, feet - 59, 5, 7);
    for (let i = 0; i < 6; i++) rect(ctx, "#b68750", x - 7 + i * 2, feet - 53 + i * 4, 4, 6);
    rect(ctx, "#955732", x - 8, feet - 30, 20, 17);
    rect(ctx, "#c99050", x - 11, feet - 23, 26, 17);
    rect(ctx, "#e5b66d", x - 7, feet - 27, 19, 19);
    rect(ctx, "#493b31", x, feet - 22, 6, 6);
    rect(ctx, "#704a33", x - 1, feet - 11, 8, 2);
  }
  const sprite = kind === "girl" ? GIRL : MAX;
  sprite.forEach((row, y) => [...row].forEach((pixel, col) => {
    if (pixel === ".") return;
    const stride = y > 11 ? (col < 6 ? frame : -frame) : 0;
    const hair = y < 7 && (kind === "max" ? col < 4 : col < 3) ? frame * 0.4 : 0;
    rect(ctx, COLORS[pixel], x + col * 3 + stride + hair, feet - 48 + y * 3, 3, 3);
  }));
  if (kind === "max") {
    rect(ctx, "#f7eed9", x + 26, feet - 35, 12, 3);
    rect(ctx, "#be744d", x + 37, feet - 35, 3, 3);
  }
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, "#fff4d9", x + 12, y, 30, 8);
  rect(ctx, "#fff4d9", x, y + 8, 62, 12);
  rect(ctx, "#f0dfba", x + 8, y + 20, 46, 4);
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  rect(ctx, "#6b6651", x + 14 * scale, y - 12 * scale, 5 * scale, 32 * scale);
  rect(ctx, color, x + 7 * scale, y - 56 * scale, 20 * scale, 12 * scale);
  rect(ctx, color, x, y - 44 * scale, 34 * scale, 24 * scale);
  rect(ctx, color, x + 5 * scale, y - 20 * scale, 26 * scale, 10 * scale);
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number) {
  rect(ctx, "#b67b36", x - 1, y + 1, 16, 16);
  rect(ctx, "#ffe59a", x + 5, y - 3, 4, 20);
  rect(ctx, "#ffe59a", x - 3, y + 5, 20, 4);
  rect(ctx, "#ffd05c", x + 1, y + 1, 12, 12);
  rect(ctx, "#fff5c9", x + 4, y + 3, 3, 3);
}

export function drawGame(ctx: CanvasRenderingContext2D, game: Game, reducedMotion = false) {
  const d = game.distance;
  const forest = d >= 1400 && d < 2800;
  const sunset = d >= 2800;
  const sky = sunset ? "#e9b29a" : forest ? "#b8d0bc" : "#c6dfd3";
  ctx.imageSmoothingEnabled = false;
  rect(ctx, sky, 0, 0, WIDTH, HEIGHT);
  rect(ctx, sunset ? "#f9d195" : "#f6e6ad", 498, 35, 38, 38);
  rect(ctx, sky, 498, 35, 6, 6);
  rect(ctx, sky, 530, 35, 6, 6);
  for (let i = 0; i < 4; i++) {
    cloud(ctx, ((i * 212 + 55 - d * 0.12) % 840 + 840) % 840 - 90, 32 + (i % 3) * 28);
  }
  for (let i = 0; i < 7; i++) {
    const x = ((i * 170 - d * 0.18) % 1190 + 1190) % 1190 - 190;
    rect(ctx, sunset ? "#b0ad8d" : "#96b6a0", x, 170, 180, 112);
    rect(ctx, sunset ? "#b0ad8d" : "#96b6a0", x + 26, 144, 128, 26);
    rect(ctx, sunset ? "#b0ad8d" : "#96b6a0", x + 52, 124, 76, 20);
  }
  for (let i = 0; i < 10; i++) {
    const x = ((i * 103 - d * 0.42) % 1030 + 1030) % 1030 - 90;
    tree(ctx, x, 250, forest ? 2 : 1.3, forest ? "#587c68" : "#75927b");
  }
  rect(ctx, "#66805e", 0, 265, WIDTH, 20);
  rect(ctx, "#e8d5a3", 0, GROUND, WIDTH, HEIGHT - GROUND);
  rect(ctx, "#92a45d", 0, GROUND, WIDTH, 6);
  rect(ctx, "#bca977", 0, GROUND + 10, WIDTH, 3);
  for (let i = 0; i < 35; i++) {
    const x = ((i * 37 - d) % 1295 + 1295) % 1295 - 40;
    rect(ctx, "#c8b583", x, 308 + (i % 4) * 11, 7, 2);
    if (i % 3 === 0) {
      rect(ctx, "#486b50", x + 5, 273, 2, 7);
      rect(ctx, i % 2 ? "#f4d68e" : "#e8a295", x + 3, 269, 6, 5);
    }
  }
  for (const obstacle of game.obstacles) {
    const x = PLAYER_X + obstacle.x - d;
    if (x < -40 || x > WIDTH + 40) continue;
    const y = GROUND - obstacle.height;
    rect(ctx, "#5b6357", x + 4, y, obstacle.width - 8, 4);
    rect(ctx, "#7d8876", x, y + 4, obstacle.width, obstacle.height - 4);
    rect(ctx, "#a6af8a", x + 4, y + 4, obstacle.width - 10, 5);
    rect(ctx, "#5b6357", x + obstacle.width - 6, y + 9, 6, obstacle.height - 9);
    rect(ctx, "#456648", x + 3, y - 3, 8, 4);
  }
  for (const pickup of game.pickups) {
    if (pickup.collected) continue;
    const x = PLAYER_X + pickup.x - d;
    if (x < -20 || x > WIDTH + 20) continue;
    const bob = reducedMotion ? 0 : Math.round(Math.sin(game.elapsed * 4 + pickup.x) * 3);
    star(ctx, x - 7, GROUND - pickup.y + bob);
  }

  const finishX = PLAYER_X + FINISH - d;
  if (finishX < WIDTH + 100) {
    rect(ctx, "#685647", finishX, 171, 5, 111);
    rect(ctx, "#fff0c7", finishX - 25, 174, 55, 24);
    ctx.fillStyle = "#344e41";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText("HOME", finishX + 3, 190);
    rect(ctx, "#df926d", finishX + 40, 210, 78, 72);
    rect(ctx, "#6d5146", finishX + 31, 197, 96, 13);
    rect(ctx, "#6d5146", finishX + 43, 185, 72, 12);
    rect(ctx, "#6d5146", finishX + 55, 177, 48, 8);
    rect(ctx, "#4a6254", finishX + 66, 245, 23, 37);
    rect(ctx, "#ffe4a1", finishX + 96, 225, 13, 14);
  }

  const running = game.status === "playing";
  const frame = running ? (Math.floor(game.elapsed * 12) % 2 ? 3 : -3) : 0;
  const gap = game.status === "caught" ? 28 : 34 + game.lives * 21;
  rect(ctx, "#b7a477", PLAYER_X - gap + 2, GROUND - 1, 34, 3);
  drawCharacter(ctx, "max", PLAYER_X - gap, GROUND, frame);
  const drift = reducedMotion ? 0 : Math.floor(game.elapsed * 5) % 6;
  for (let i = 0; i < 3; i++) {
    rect(ctx, ["#c3c7ae", "#cdd0b8", "#d6d7c0"][i], PLAYER_X - gap + 38 + (i % 2) * 5 - drift, GROUND - 43 - i * 9 - drift, 5 + i * 2, 4);
  }
  ctx.fillStyle = "#304a3c";
  ctx.textAlign = "center";
  ctx.font = "bold 9px monospace";
  ctx.fillText("MAX", PLAYER_X - gap + 17, GROUND - 58);
  rect(ctx, "#b7a477", PLAYER_X + 5, GROUND - 1, 28, 3);
  if (game.invincible === 0 || Math.floor(game.elapsed * 12) % 2 === 0) {
    drawCharacter(ctx, "girl", PLAYER_X, GROUND - game.y, game.y > 0 ? 3 : frame);
  }
  ctx.fillStyle = "#344e41";
  ctx.textAlign = "left";
  ctx.font = "bold 9px monospace";
  ctx.fillText(forest ? "02 / THE WOODS" : sunset ? "03 / THE HOME STRETCH" : "01 / THE MEADOW", 20, 24);
  if (game.status === "won") {
    for (let i = 0; i < 25; i++) {
      rect(ctx, ["#dc695f", "#ffdc76", "#66805e"][i % 3], (i * 83) % WIDTH, 30 + (i * 47) % 220, 4, 6);
    }
  }
}
