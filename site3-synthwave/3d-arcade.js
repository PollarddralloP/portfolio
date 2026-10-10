// Fixed 60 Hz simulation; canvas has a stable logical size on every screen.
const canvas = document.getElementById("synthwave-canvas"),
  ctx = canvas.getContext("2d");
const GRID_SIZE = 13,
  tileSize = 32,
  DIRS = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
canvas.width = canvas.height = GRID_SIZE * tileSize;
let currentRound = 1,
  currentDifficulty = "easy",
  score = 0,
  playerLives = 3,
  enemiesRemaining = 10;
let state = "ready",
  currentGrid = [],
  enemyTanks = [],
  shells = [],
  explosions = [],
  spawnTicks = 0,
  invincible = 0;
let heldKeys = { up: false, down: false, left: false, right: false },
  player = { x: 0, y: 0, dir: 0, width: 26, height: 26, cooldown: 0 };
const maps = {
  1: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 2, 2, 0, 2, 2, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 0],
    [0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 2, 4, 2, 0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0, 2, 0, 2, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  2: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 2, 2, 0, 3, 0, 0, 0, 3, 0, 2, 2, 0],
    [0, 2, 2, 0, 3, 3, 0, 3, 3, 0, 2, 2, 0],
    [0, 1, 1, 0, 1, 1, 2, 1, 1, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [3, 3, 0, 2, 1, 1, 0, 1, 1, 2, 0, 3, 3],
    [3, 3, 0, 2, 1, 1, 0, 1, 1, 2, 0, 3, 3],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 2, 2, 2, 2, 2, 0, 1, 1, 0],
    [0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 2, 2, 0, 0, 2, 4, 2, 0, 0, 2, 2, 0],
    [0, 2, 2, 0, 0, 2, 0, 2, 0, 0, 2, 2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  3: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0],
    [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [2, 2, 0, 1, 1, 1, 2, 1, 1, 1, 0, 2, 2],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 3, 3, 3, 3, 0, 2, 0, 3, 3, 3, 3, 0],
    [0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [2, 2, 0, 1, 1, 2, 2, 2, 1, 1, 0, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 0, 0, 2, 4, 2, 0, 0, 1, 1, 0],
    [0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
  4: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 2, 0, 2, 0, 0, 0, 2, 0, 2, 1, 0],
    [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 3, 3, 1, 2, 2, 0, 2, 2, 1, 3, 3, 1],
    [1, 3, 3, 1, 2, 2, 0, 2, 2, 1, 3, 3, 1],
    [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0],
    [2, 2, 1, 1, 0, 1, 2, 1, 0, 1, 1, 2, 2],
    [2, 2, 1, 1, 0, 1, 2, 1, 0, 1, 1, 2, 2],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 2, 2, 0, 0, 2, 4, 2, 0, 0, 2, 2, 1],
    [1, 2, 2, 0, 0, 1, 0, 1, 0, 0, 2, 2, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  ],
};

function syncHUD() {
  document.getElementById("game-round-val").textContent = `${currentRound} / 4`;
  document.getElementById("game-score-val").textContent = score;
  document.getElementById("game-lives-val").textContent =
    `${playerLives} LIVES`;
  document.getElementById("game-diff-label").textContent =
    currentDifficulty.toUpperCase();
}
function clearKeys() {
  for (const key in heldKeys) heldKeys[key] = false;
}
function loadRound(round) {
  currentRound = round;
  currentGrid = maps[round].map((row) => [...row]);
  enemyTanks = [];
  shells = [];
  explosions = [];
  spawnTicks = 0;
  enemiesRemaining = 8 + round * 2;
  invincible = 90;
  player.x = 4 * tileSize + 3;
  player.y = 12 * tileSize + 3;
  player.dir = 0;
  player.cooldown = 0;
  clearKeys();
  document.getElementById("game-base-status").textContent = "SECURE";
  syncHUD();
  document.querySelectorAll(".round-btn").forEach((btn, i) => {
    btn.classList.toggle("active", i + 1 === round);
    btn.setAttribute("aria-pressed", String(i + 1 === round));
  });
}
function setDifficulty(diff) {
  currentDifficulty = diff;
  syncHUD();
  document.querySelectorAll(".diff-btn").forEach((btn) => {
    const active = btn.getAttribute("onclick").includes(`'${diff}'`);
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
function selectRound(round) {
  loadRound(round);
  drawGame();
}
function overlay(title, detail, button) {
  document.getElementById("game-message").textContent = title;
  document.getElementById("game-message-detail").textContent = detail;
  document.getElementById("game-start").textContent = button;
  document.getElementById("game-overlay").hidden = false;
}
function startGame() {
  if (state === "over" || state === "victory") {
    score = 0;
    playerLives = 3;
    loadRound(1);
  }
  state = "playing";
  document.getElementById("game-overlay").hidden = true;
  const pause = document.getElementById("pause-game");
  pause.disabled = false;
  pause.textContent = "Pause Ⅱ";
  document
    .getElementById("synth-3d")
    .scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" });
  canvas.focus({ preventScroll: true });
  playCoinSound();
}
function togglePause() {
  if (state === "playing") {
    state = "paused";
    clearKeys();
    overlay(
      "Take a breather.",
      `Score: ${score} · Round ${currentRound}`,
      "Resume ↗",
    );
    document.getElementById("pause-game").textContent = "Resume ▷";
  } else if (state === "paused") startGame();
}
function restartGame() {
  score = 0;
  playerLives = 3;
  loadRound(currentRound);
  startGame();
}
function endGame(victory = false) {
  state = victory ? "victory" : "over";
  clearKeys();
  syncHUD();
  document.getElementById("pause-game").disabled = true;
  overlay(
    victory ? "Arcade legend." : "One more try?",
    `Final score: ${score} · ${victory ? "All four rounds cleared." : "Your mission ends here."}`,
    "Play again ↗",
  );
  document.getElementById("game-start").focus({ preventScroll: true });
}
const keyDirections = {
  w: "up",
  ArrowUp: "up",
  s: "down",
  ArrowDown: "down",
  a: "left",
  ArrowLeft: "left",
  d: "right",
  ArrowRight: "right",
};
canvas.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    e.preventDefault();
    togglePause();
    return;
  }
  if (state !== "playing") return;
  const direction = keyDirections[e.key] || keyDirections[e.key.toLowerCase()];
  if (direction) {
    e.preventDefault();
    heldKeys[direction] = true;
  } else if (e.code === "Space") {
    e.preventDefault();
    firePlayerShell();
  }
});
window.addEventListener("keyup", (e) => {
  const direction = keyDirections[e.key] || keyDirections[e.key.toLowerCase()];
  if (direction) heldKeys[direction] = false;
});
canvas.addEventListener("blur", clearKeys);
window.addEventListener("blur", () => {
  clearKeys();
  if (state === "playing") togglePause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") togglePause();
});
["up", "left", "down", "right"].forEach((direction) => {
  const button = document.getElementById(`btn-${direction}`);
  button.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (state !== "playing") return;
    button.setPointerCapture(e.pointerId);
    heldKeys[direction] = true;
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((event) =>
    button.addEventListener(event, () => (heldKeys[direction] = false)),
  );
});
document.getElementById("btn-fire").addEventListener("click", firePlayerShell);
function collision(x, y, w = 26, h = 26) {
  if (x < 0 || y < 0 || x + w > canvas.width || y + h > canvas.height)
    return true;
  for (
    let row = Math.floor((y + 1) / tileSize);
    row <= Math.floor((y + h - 1) / tileSize);
    row++
  )
    for (
      let col = Math.floor((x + 1) / tileSize);
      col <= Math.floor((x + w - 1) / tileSize);
      col++
    )
      if (currentGrid[row][col]) return true;
  return false;
}
function firePlayerShell() {
  if (state !== "playing" || player.cooldown > 0) return;
  player.cooldown = 17;
  const d = DIRS[player.dir];
  shells.push({
    x: player.x + 13,
    y: player.y + 13,
    vx: d.x * 7.5,
    vy: d.y * 7.5,
    isPlayer: true,
  });
  playLaserSound();
}
function spawnEnemy() {
  if (enemyTanks.length >= 4 || enemiesRemaining <= 0) return;
  const x = [0, 6, 12][Math.floor(Math.random() * 3)] * tileSize + 3,
    y = 3;
  if (enemyTanks.some((bot) => Math.hypot(bot.x - x, bot.y - y) < 32)) return;
  const hard = currentDifficulty === "hard",
    medium = currentDifficulty === "medium";
  enemyTanks.push({
    x,
    y,
    dir: 2,
    width: 26,
    height: 26,
    hp: hard ? 2 : 1,
    speed: hard ? 2.4 : medium ? 1.8 : 1.2,
    color: hard ? "#b6a3fa" : medium ? "#edd780" : "#e990ab",
    ticks: 0,
  });
  enemiesRemaining--;
}
function burst(x, y, color) {
  explosions.push({ x, y, color, radius: 3, life: 15 });
}
function stepGame() {
  if (state !== "playing") return;
  if (player.cooldown > 0) player.cooldown--;
  if (invincible > 0) invincible--;
  const dir = heldKeys.up
    ? 0
    : heldKeys.right
      ? 1
      : heldKeys.down
        ? 2
        : heldKeys.left
          ? 3
          : -1;
  if (dir !== -1) {
    player.dir = dir;
    const x = player.x + DIRS[dir].x * 2.5,
      y = player.y + DIRS[dir].y * 2.5;
    if (!collision(x, y)) {
      player.x = x;
      player.y = y;
    }
  }
  if (++spawnTicks >= 150) {
    spawnEnemy();
    spawnTicks = 0;
  }
  for (const bot of enemyTanks) {
    bot.ticks++;
    if (bot.ticks % 45 === 0)
      bot.dir =
        Math.random() < (currentDifficulty === "easy" ? 0.25 : 0.65)
          ? 2
          : Math.floor(Math.random() * 4);
    let d = DIRS[bot.dir];
    const x = bot.x + d.x * bot.speed,
      y = bot.y + d.y * bot.speed;
    if (collision(x, y)) bot.dir = Math.floor(Math.random() * 4);
    else {
      bot.x = x;
      bot.y = y;
    }
    d = DIRS[bot.dir];
    if (
      Math.random() <
      (currentDifficulty === "hard"
        ? 1 / 40
        : currentDifficulty === "medium"
          ? 1 / 70
          : 1 / 110)
    )
      shells.push({
        x: bot.x + 13,
        y: bot.y + 13,
        vx: d.x * 4.5,
        vy: d.y * 4.5,
        isPlayer: false,
      });
  }
  for (let i = shells.length - 1; i >= 0; i--) {
    const shot = shells[i];
    shot.x += shot.vx;
    shot.y += shot.vy;
    if (
      shot.x < 0 ||
      shot.y < 0 ||
      shot.x >= canvas.width ||
      shot.y >= canvas.height
    ) {
      shells.splice(i, 1);
      continue;
    }
    const row = Math.floor(shot.y / tileSize),
      col = Math.floor(shot.x / tileSize),
      tile = currentGrid[row][col];
    if (tile === 1 || tile === 2 || tile === 4) {
      if (tile !== 2) currentGrid[row][col] = 0;
      burst(shot.x, shot.y, "#e8cda1");
      shells.splice(i, 1);
      if (tile === 4) {
        document.getElementById("game-base-status").textContent = "LOST";
        endGame();
        return;
      }
      continue;
    }
    if (
      !shot.isPlayer &&
      invincible === 0 &&
      Math.hypot(shot.x - player.x - 13, shot.y - player.y - 13) < 15
    ) {
      shells.splice(i, 1);
      burst(player.x, player.y, "#b7fa6d");
      playerLives--;
      syncHUD();
      if (playerLives === 0) {
        endGame();
        return;
      }
      player.x = 131;
      player.y = 387;
      invincible = 90;
      continue;
    }
    if (shot.isPlayer) {
      const index = enemyTanks.findIndex(
        (bot) => Math.hypot(shot.x - bot.x - 13, shot.y - bot.y - 13) < 15,
      );
      if (index >= 0) {
        const bot = enemyTanks[index];
        shells.splice(i, 1);
        burst(bot.x + 13, bot.y + 13, bot.color);
        if (--bot.hp <= 0) {
          enemyTanks.splice(index, 1);
          score += currentDifficulty === "hard" ? 400 : 200;
          syncHUD();
          playExplosionSound();
        }
      }
    }
  }
  explosions.forEach((exp) => {
    exp.radius += 1.5;
    exp.life--;
  });
  explosions = explosions.filter((exp) => exp.life > 0);
  if (enemiesRemaining === 0 && enemyTanks.length === 0) {
    if (currentRound === 4) endGame(true);
    else {
      loadRound(currentRound + 1);
      showToast(`Round ${currentRound - 1} cleared. Next battlefield ready.`);
    }
  }
}
function drawTank(tank, color) {
  ctx.save();
  ctx.translate(tank.x + 13, tank.y + 13);
  ctx.rotate((tank.dir * Math.PI) / 2);
  ctx.fillStyle = "#16101f";
  ctx.fillRect(-14, -12, 5, 24);
  ctx.fillRect(9, -12, 5, 24);
  ctx.fillStyle = color;
  ctx.fillRect(-10, -11, 20, 22);
  ctx.fillStyle = "#ffffff66";
  ctx.fillRect(-8, -9, 3, 18);
  ctx.fillStyle = "#ece6f4";
  ctx.fillRect(-3, -16, 6, 14);
  ctx.fillStyle = "#393249";
  ctx.fillRect(-5, -4, 10, 10);
  ctx.restore();
}
function drawGame() {
  ctx.fillStyle = "#16101f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let r = 0; r < 13; r++)
    for (let c = 0; c < 13; c++) {
      const tile = currentGrid[r][c],
        x = c * 32,
        y = r * 32;
      if (tile === 1) {
        ctx.fillStyle = "#aa795b";
        ctx.fillRect(x + 1, y + 1, 30, 30);
        ctx.strokeStyle = "#654a40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, y + 16);
        ctx.lineTo(x + 32, y + 16);
        ctx.moveTo(x + 16, y);
        ctx.lineTo(x + 16, y + 16);
        ctx.moveTo(x + 8, y + 16);
        ctx.lineTo(x + 8, y + 32);
        ctx.stroke();
      }
      if (tile === 2) {
        ctx.fillStyle = "#7e8891";
        ctx.fillRect(x + 1, y + 1, 30, 30);
        ctx.fillStyle = "#b8c3c6";
        ctx.fillRect(x + 4, y + 4, 24, 24);
        ctx.fillStyle = "#7e8891";
        ctx.fillRect(x + 8, y + 8, 16, 16);
      }
      if (tile === 3) {
        ctx.fillStyle = "#3b6380";
        ctx.fillRect(x, y, 32, 32);
        ctx.fillStyle = "#ffffff15";
        ctx.fillRect(x + 4, y + 12, 24, 2);
      }
      if (tile === 4) {
        ctx.fillStyle = "#edd780";
        ctx.fillRect(x + 2, y + 2, 28, 28);
        ctx.fillStyle = "#342a43";
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 8);
        ctx.lineTo(x + 16, y + 14);
        ctx.lineTo(x + 28, y + 8);
        ctx.lineTo(x + 23, y + 22);
        ctx.lineTo(x + 16, y + 27);
        ctx.lineTo(x + 9, y + 22);
        ctx.closePath();
        ctx.fill();
      }
    }
  ctx.globalAlpha = invincible > 0 ? 0.65 : 1;
  drawTank(player, "#b7fa6d");
  ctx.globalAlpha = 1;
  enemyTanks.forEach((bot) => drawTank(bot, bot.color));
  shells.forEach((shot) => {
    ctx.fillStyle = shot.isPlayer ? "#edd780" : "#e990ab";
    ctx.fillRect(shot.x - 2, shot.y - 2, 4, 4);
  });
  explosions.forEach((exp) => {
    ctx.globalAlpha = exp.life / 15;
    ctx.fillStyle = exp.color;
    ctx.beginPath();
    ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
let lastFrame = 0,
  accumulator = 0;
function gameLoop(time) {
  requestAnimationFrame(gameLoop);
  if (document.hidden) {
    lastFrame = time;
    accumulator = 0;
    return;
  }
  const delta = Math.min(time - lastFrame, 100);
  lastFrame = time;
  accumulator += delta;
  while (accumulator >= 1000 / 60) {
    stepGame();
    accumulator -= 1000 / 60;
  }
  if (state === "playing") drawGame();
}
loadRound(1);
drawGame();
requestAnimationFrame(gameLoop);
