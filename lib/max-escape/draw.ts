import { HEIGHT, PLAYER_HEIGHT, PLAYER_WIDTH, WIDTH, type Game } from "./game";
import type { Platform } from "./levels";

export const GIRL = [
  "....yyyy....", "...yyyyyy...", "...yysssy...", "...yssbs....",
  "...yysss....", "..yyyss.....", "..y.cccc....", "....ccccs...",
  "...scccc.s..", "....cccc....", "...cccccc...", "...cccccc...",
  "....ss.ss...", "....ss.ss...", "....bb.bb...", "...bbb.bbb..",
];
export const MAX = [
  "...hhhhhh...", "..hhhhhhhh..", "..hhhhhshh..", "..hhssbssh..",
  "...hssss....", "....sss.....", "...mmmmmm...", "..smmmmmm...",
  "..smmmmmmss.", "...mmmmmm...", "...pppppp...", "...pp.ppp...",
  "...pp.pp....", "...pp.pp....", "..bbb.bbb...", "..bbb.bbb...",
];
export const COLORS: Record<string, string> = { y: "#ffe34d", s: "#ffc49b", b: "#5d260e", c: "#ff5a85", h: "#91400c", m: "#f2e8dd", p: "#2b59e9" };

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}
function polygon(ctx: CanvasRenderingContext2D, color: string, points: number[][]) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(Math.round(x), Math.round(y)) : ctx.moveTo(Math.round(x), Math.round(y)));
  ctx.closePath(); ctx.fill();
}

export function drawCharacter(ctx: CanvasRenderingContext2D, kind: "girl" | "max", x: number, feet: number, frame: number, facing = 1, elapsed = 0) {
  ctx.save();
  const scale = kind === "girl" ? 2.4 : 2.8;
  ctx.translate(Math.round(x), Math.round(feet));
  if (facing < 0) { ctx.translate(12 * scale, 0); ctx.scale(-1, 1); }
  if (kind === "max") {
    rect(ctx, "#8c390d", -8, -42, 14, 20);
    rect(ctx, "#e58f19", -11, -32, 20, 20);
    rect(ctx, "#ffc655", -7, -36, 14, 21);
    rect(ctx, "#351616", -2, -30, 5, 5);
    for (let i = 0; i < 6; i++) rect(ctx, "#b56d1a", -14 + i * 2, -59 + i * 5, 4, 6);
  }
  (kind === "girl" ? GIRL : MAX).forEach((row, y) => [...row].forEach((pixel, col) => {
    if (pixel === ".") return;
    const stride = y > 11 ? (col < 6 ? frame : -frame) : 0;
    rect(ctx, COLORS[pixel], col * scale + stride, -16 * scale + y * scale, scale, scale);
  }));
  if (kind === "max") {
    rect(ctx, "#fff8df", 25, -33, 11, 3);
    rect(ctx, "#ff582e", 35, -33, 3, 3);
    const drift = Math.floor(elapsed * 6) % 7;
    for (let i = 0; i < 3; i++) rect(ctx, ["#a49aaf", "#716678", "#4c4058"][i], 36 + (i % 2) * 5 - drift, -40 - i * 9 - drift, 5 + i * 2, 4);
  }
  ctx.restore();
}

function palm(ctx: CanvasRenderingContext2D, x: number, floor: number, scale = 1, dark = false) {
  ctx.save(); ctx.translate(Math.round(x), Math.round(floor)); ctx.scale(scale, scale);
  for (let i = 0; i < 8; i++) {
    rect(ctx, dark ? "#183620" : "#9c3c08", Math.sin(i * 0.3) * 7, -i * 13, 13, 14);
    rect(ctx, dark ? "#204a22" : "#ef8f16", Math.sin(i * 0.3) * 7 + 2, -i * 13, 5, 9);
  }
  const leaves = [[-1,-108,-47,-105,-67,-74,-51,-82,-25,-96], [5,-106,-17,-127,-35,-119,-22,-118,0,-100], [8,-108,37,-121,62,-101,39,-109,18,-99], [12,-103,65,-88,70,-60,53,-82,15,-94], [4,-105,-33,-78,-34,-54,-23,-74,12,-99]];
  leaves.forEach((p, i) => {
    polygon(ctx, dark ? "#126036" : i % 2 ? "#35c916" : "#79e521", Array.from({length:p.length/2}, (_, j) => [p[j*2],p[j*2+1]]));
  });
  ctx.restore();
}

function mountain(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  polygon(ctx, "#4e287a", [[x,y],[x+width*.4,y-height],[x+width*.55,y-height*.6],[x+width*.7,y-height*.78],[x+width,y]]);
  polygon(ctx, "#a369e6", [[x,y],[x+width*.4,y-height],[x+width*.55,y-height*.6],[x+width*.45,y-height*.67],[x+width*.4,y-height*.82],[x+width*.25,y-height*.35]]);
  polygon(ctx, "#7542a3", [[x+width*.44,y-height*.82],[x+width*.55,y-height*.6],[x+width*.7,y-height*.78],[x+width*.75,y-height*.5],[x+width*.7,y-height*.58],[x+width*.55,y-height*.4]]);
}

function ruin(ctx: CanvasRenderingContext2D, x: number, floor: number, width: number, height: number, dark = false) {
  for (let row = 0; row < height / 22; row++) {
    for (let col = 0; col < width / 32; col++) {
      const offset = row % 2 ? 13 : 0;
      const bx = x + col * 32 + offset;
      if (bx > x + width - 10) continue;
      const by = floor - height + row * 22;
      rect(ctx, dark ? "#33234f" : "#76608f", bx, by, 28, 18);
      rect(ctx, dark ? "#4b3369" : "#bba0cf", bx + 2, by, 23, 3);
      rect(ctx, dark ? "#211a35" : "#493457", bx + 24, by + 4, 4, 14);
      if ((row * 7 + col * 3) % 5 === 0) rect(ctx, dark ? "#21501e" : "#5abb1d", bx + 2, by + 10, 3, 9);
    }
  }
}

function temple(ctx: CanvasRenderingContext2D, x: number, floor: number, locked: boolean, elapsed: number) {
  ruin(ctx, x - 42, floor, 115, 160);
  rect(ctx, "#050308", x - 9, floor - 105, 50, 105);
  rect(ctx, locked ? "#79578f" : "#ffe645", x - 9, floor - 109, 50, 5);
  for (let i = 0; i < 3; i++) rect(ctx, "#a187b6", x - 17 - i * 6, floor - 10 + i * 7, 67 + i * 12, 5);
  if (locked) {
    for (let i = 0; i < 4; i++) rect(ctx, "#7b6a91", x - 3 + i * 11, floor - 104, 4, 95);
    rect(ctx, "#ffe645", x + 6, floor - 63, 18, 14);
    rect(ctx, "#130b21", x + 13, floor - 60, 4, 8);
  } else {
    rect(ctx, "#314f20", x, floor - 100, 33, 85);
    rect(ctx, "#e4d956", x + 6, floor - 91, 22, 76);
  }
  for (const side of [-1, 1]) {
    const tx = x + (side < 0 ? -29 : 57);
    rect(ctx, "#a44b0b", tx, floor - 74, 5, 26);
    const flame = Math.floor(elapsed * 8) % 2 ? 4 : 0;
    polygon(ctx, "#fb421c", [[tx-6,floor-75],[tx-4,floor-91],[tx+2,floor-104-flame],[tx+10,floor-84],[tx+9,floor-75]]);
    rect(ctx, "#ffdc33", tx - 1, floor - 88, 6, 14);
  }
}

function ground(ctx: CanvasRenderingContext2D, platform: Platform, camera: number, templeTheme: boolean) {
  const x = platform.x - camera;
  if (x > WIDTH || x + platform.width < 0) return;
  const top = platform.y;
  const floating = platform.height <= 22;
  rect(ctx, "#6f2a09", x, top, platform.width, platform.height);
  const from = Math.max(0, Math.floor((camera - platform.x) / 28));
  const to = Math.min(Math.ceil(platform.width / 28), Math.ceil((camera + WIDTH - platform.x) / 28));
  for (let row = 0; row < Math.ceil(platform.height / 24); row++) {
    for (let col = from; col < to; col++) {
      const bx = x + col * 28;
      const by = top + row * 24 + 10;
      const height = Math.min(20, top + platform.height - by);
      if (height <= 0) continue;
      const purple = templeTheme || floating;
      rect(ctx, purple ? "#70509a" : "#be4f0a", bx + 2, by, 24, height);
      rect(ctx, purple ? "#a17bcb" : "#f28a17", bx + 3, by, 17, Math.min(4,height));
      rect(ctx, "#170b1b", bx + 17 + row % 3 * 2, by + 6, 4, Math.max(0,height - 6));
    }
  }
  rect(ctx, templeTheme ? "#5baa19" : "#53bd0e", x, top, platform.width, 9);
  rect(ctx, "#b4f332", x, top, platform.width, 3);
  for (let i = 0; i < platform.width / 16; i++) rect(ctx, "#78de17", x + i * 16 + 2, top + 7, 6, 5 + i % 3 * 3);
}

function gem(ctx: CanvasRenderingContext2D, x: number, y: number, color = "#ffe634", scale = 1) {
  ctx.save(); ctx.translate(Math.round(x),Math.round(y)); ctx.scale(scale,scale);
  polygon(ctx, color, [[-5,-7],[5,-7],[10,-1],[0,11],[-10,-1]]);
  polygon(ctx, "#fff9c3", [[-5,-7],[0,-7],[-3,-1],[-10,-1]]);
  polygon(ctx, "#b89408", [[5,-7],[10,-1],[0,11],[3,-1]]);
  rect(ctx, "#fffdf1", -9, -2, 18, 2);
  rect(ctx, "#fffdf1", -1, -6, 2, 14);
  ctx.restore();
}

function snake(ctx: CanvasRenderingContext2D, x: number, y: number, elapsed: number) {
  const wobble = Math.floor(elapsed * 7) % 2 * 2;
  rect(ctx, "#259d12", x + 5, y + 10, 27, 8);
  rect(ctx, "#9eec20", x, y + 2, 17, 10);
  rect(ctx, "#9eec20", x + 12, y + 7, 8, 11);
  rect(ctx, "#cde857", x + 12, y + 9, 4, 9);
  rect(ctx, "#000000", x + 3, y + 4, 3, 3);
  rect(ctx, "#000000", x + 10, y + 4, 3, 3);
  rect(ctx, "#e82635", x - 8 - wobble, y + 11, 15, 2);
  rect(ctx, "#e82635", x - 9 - wobble, y + 9, 3, 2);
  rect(ctx, "#9eec20", x + 23, y + 7 + wobble, 5, 8);
}

export function drawGame(ctx: CanvasRenderingContext2D, game: Game, reducedMotion = false) {
  ctx.imageSmoothingEnabled = false;
  const camera = game.status === "ready" ? 0 : game.camera;
  const time = reducedMotion ? 0 : game.elapsed;
  rect(ctx, "#050309", 0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 28; i++) {
    const x = ((i * 151 - camera * .06) % WIDTH + WIDTH) % WIDTH;
    rect(ctx, i % 4 ? "#514179" : "#b9a0de", x, 22 + i * 31 % 190, 2, 2);
  }
  for (let i = -1; i < 5; i++) mountain(ctx, i * 240 - camera * .15 % 240, 230 + i % 2 * 12, 290, 95 + i % 2 * 40);
  for (let i = -1; i < 8; i++) palm(ctx, i * 150 - camera * .32 % 150, 366, .8 + (i % 3) * .16, true);
  const backRuin = 615 - camera * .12 % 1000;
  ruin(ctx, backRuin, 355, 164, 210, true);
  rect(ctx, "#030207", backRuin + 46, 237, 45, 90);
  if (game.world.theme !== "jungle") ruin(ctx, 80 - camera * .2 % 900, 353, 110, 140, true);

  // Water or lava remains visible in every gap, with pixel reflections and falls.
  rect(ctx, game.world.theme === "temple" ? "#a22a13" : "#1549c9", 0, 393, WIDTH, 39);
  for (let i = 0; i < 35; i++) {
    const x = (i * 43 + Math.floor(time * 20) - camera) % WIDTH;
    rect(ctx, game.world.theme === "temple" ? "#ff831b" : "#58bdfa", x, 398 + i % 4 * 8, 18 + i % 3 * 5, 3);
  }
  for (const platform of game.world.platforms) {
    if (platform.height > 30 && platform.x > 0) {
      const wx = platform.x - camera - 28;
      if (wx > -40 && wx < WIDTH) {
        rect(ctx, "#1336b9", wx, platform.y + 2, 27, HEIGHT - platform.y);
        for (let i = 0; i < 5; i++) rect(ctx, i % 2 ? "#a5f4ff" : "#408df7", wx + i * 6, platform.y + 4 + (time * 45 + i * 13) % 30, 4, HEIGHT - platform.y);
        rect(ctx, "#a5f4ff", wx - 9, 389, 44, 5);
      }
    }
    ground(ctx, platform, camera, game.world.theme === "temple");
  }
  for (let i = 0; i < 7; i++) {
    const worldX = 50 + i * 490;
    const platform = game.world.platforms.find(p => p.height > 30 && worldX >= p.x && worldX <= p.x + p.width);
    if (platform) palm(ctx, worldX - camera, platform.y, 1.1 + i % 2 * .15);
  }
  if (game.status === "ready") {
    // A temple silhouette makes the title screen read as the supplied arcade reference.
    temple(ctx, 655, 360, true, time);
  }
  temple(ctx, game.world.exit.x - camera, game.world.exit.y, !game.key, time);
  for (const pickup of game.world.pickups) {
    if (pickup.collected) continue;
    const x = pickup.x - camera;
    if (x < -30 || x > WIDTH + 30) continue;
    const y = pickup.y + Math.sin(time * 4 + pickup.x) * 3;
    if (pickup.kind === "gem") gem(ctx, x, y);
    if (pickup.kind === "key") {
      rect(ctx, "#ffdf2f", x - 9, y - 6, 13, 13); rect(ctx, "#050309", x - 5, y - 3, 5, 6);
      rect(ctx, "#ffdf2f", x + 2, y - 1, 16, 4); rect(ctx, "#ffdf2f", x + 12, y + 2, 4, 6);
    }
    if (pickup.kind === "shield") {
      polygon(ctx, "#55beff", [[x-10,y-10],[x+10,y-10],[x+8,y+5],[x,y+13],[x-8,y+5]]);
      rect(ctx, "#dbf9ff", x - 2, y - 8, 4, 15); rect(ctx, "#dbf9ff", x - 7, y - 3, 14, 4);
    }
    if (pickup.kind === "coffee") {
      rect(ctx, "#fff8df", x - 8, y - 7, 15, 16); rect(ctx, "#9e4c15", x - 6, y - 5, 11, 4);
      rect(ctx, "#fff8df", x + 7, y - 4, 6, 8); rect(ctx, "#050309", x + 8, y - 2, 3, 4);
      rect(ctx, "#ffd541", x - 2, y - 15, 3, 5);
    }
    if (pickup.kind === "heart") {
      polygon(ctx, "#ff527b", [[x-9,y-5],[x-4,y-9],[x,y-5],[x+4,y-9],[x+9,y-5],[x+9,y],[x,y+10],[x-9,y]]);
    }
  }
  for (const spike of game.world.spikes) {
    for (let i = 0; i < spike.width / 12; i++) polygon(ctx, "#e4d2ef", [[spike.x-camera+i*12,spike.y+16],[spike.x-camera+i*12+6,spike.y],[spike.x-camera+i*12+12,spike.y+16]]);
  }
  for (const enemy of game.world.enemies) if (enemy.alive && enemy.x > camera - 40 && enemy.x < camera + WIDTH) snake(ctx, enemy.x - camera, enemy.y, time);
  const checkpoint = game.world.checkpoint;
  rect(ctx, "#d0c0d7", checkpoint.x - camera + 3, checkpoint.y - 70, 3, 70);
  rect(ctx, game.checkpoint ? "#8ce62b" : "#f25160", checkpoint.x - camera + 6, checkpoint.y - 68, 27, 18);

  const running = game.status === "playing";
  const frame = running && Math.abs(game.vx) > 15 ? (Math.floor(game.elapsed * 13) % 2 ? 2 : -2) : 0;
  const maxFrame = running ? (Math.floor(game.elapsed * 11) % 2 ? 2 : -2) : 0;
  const maxX = game.status === "ready" ? 170 : game.maxX;
  drawCharacter(ctx, "max", (game.status === "ready" ? maxX : game.maxVisualX) - camera, game.status === "ready" ? 360 : game.maxY, maxFrame, 1, time);
  if (game.dashTime > 0) {
    for (let i = 1; i < 4; i++) {
      ctx.globalAlpha = .32 / i;
      drawCharacter(ctx, "girl", game.x - camera - game.facing * i * 18, game.y + PLAYER_HEIGHT, 3, game.facing);
    }
    ctx.globalAlpha = 1;
  }
  if (game.invincible === 0 || Math.floor(game.elapsed * 12) % 2 === 0) drawCharacter(ctx, "girl", (game.status === "ready" ? 280 : game.x) - camera - 3, game.y + PLAYER_HEIGHT, game.grounded ? frame : 3, game.facing);
  if (game.shield > 0) {
    ctx.strokeStyle = "#64caff"; ctx.lineWidth = 2;
    ctx.strokeRect(Math.round(game.x - camera - 9), Math.round(game.y - 9), PLAYER_WIDTH + 18, PLAYER_HEIGHT + 15);
  }
  if (game.status === "won") {
    for (let i = 0; i < 45; i++) rect(ctx, ["#ffdf2f", "#ff527b", "#7ae922", "#9367e9"][i % 4], i * 61 % WIDTH, 20 + i * 43 % 330, 3, 6);
  }
}
