(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const overlay = document.getElementById("overlay");
  const startCard = document.getElementById("start-card");
  const overCard = document.getElementById("over-card");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const finalScoreEl = document.getElementById("final-score");

  const W = canvas.width;
  const H = canvas.height;
  const LANES = 3;
  const ROAD_LEFT = 78;
  const ROAD_RIGHT = W - 78;
  const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
  const LANE_W = ROAD_W / LANES;

  const BEST_KEY = "autumn-drive-best";
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  bestEl.textContent = String(best);

  const leafLayer = document.getElementById("leaf-layer");
  const LEAF_CHARS = ["🍁", "🍂", "🍃"];
  for (let i = 0; i < 18; i += 1) {
    const el = document.createElement("span");
    el.className = "leaf";
    el.textContent = LEAF_CHARS[i % LEAF_CHARS.length];
    el.style.left = `${Math.random() * 100}%`;
    el.style.animationDuration = `${7 + Math.random() * 8}s`;
    el.style.animationDelay = `${-Math.random() * 10}s`;
    el.style.setProperty("--drift", `${-40 + Math.random() * 80}px`);
    el.style.fontSize = `${16 + Math.random() * 16}px`;
    leafLayer.appendChild(el);
  }

  const state = {
    running: false,
    over: false,
    time: 0,
    score: 0,
    speed: 4.2,
    lane: 1,
    targetLane: 1,
    carX: 0,
    carY: H - 150,
    obstacles: [],
    pickups: [],
    trees: [],
    sparks: [],
    lastSpawn: 0,
    lastPickup: 0,
    lastTree: 0,
    shake: 0,
  };

  function laneCenter(lane) {
    return ROAD_LEFT + LANE_W * lane + LANE_W / 2;
  }

  function reset() {
    state.running = true;
    state.over = false;
    state.time = 0;
    state.score = 0;
    state.speed = 4.2;
    state.lane = 1;
    state.targetLane = 1;
    state.carX = laneCenter(1);
    state.obstacles = [];
    state.pickups = [];
    state.trees = [];
    state.sparks = [];
    state.lastSpawn = 0;
    state.lastPickup = 400;
    state.lastTree = 0;
    state.shake = 0;
    overlay.classList.add("hidden");
    scoreEl.textContent = "0";
  }

  function gameOver() {
    state.running = false;
    state.over = true;
    state.shake = 12;
    const rounded = Math.floor(state.score);
    if (rounded > best) {
      best = rounded;
      localStorage.setItem(BEST_KEY, String(best));
      bestEl.textContent = String(best);
    }
    finalScoreEl.textContent = String(rounded);
    overlay.classList.remove("hidden");
    startCard.classList.add("hidden");
    overCard.classList.remove("hidden");
  }

  function spawnObstacle() {
    const occupied = new Set(state.obstacles.filter((o) => o.y < 160).map((o) => o.lane));
    const free = [0, 1, 2].filter((l) => !occupied.has(l));
    if (free.length === 0) return;
    const lane = free[Math.floor(Math.random() * free.length)];
    const kinds = ["pumpkin", "hay", "log", "squirrel", "leafpile"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    state.obstacles.push({
      lane,
      x: laneCenter(lane),
      y: -70,
      kind,
      w: 54,
      h: 50,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function spawnPickup() {
    const lane = Math.floor(Math.random() * LANES);
    state.pickups.push({
      lane,
      x: laneCenter(lane),
      y: -40,
      spin: Math.random() * Math.PI * 2,
    });
  }

  function spawnTree(side) {
    state.trees.push({
      side,
      y: -90,
      scale: 0.85 + Math.random() * 0.35,
      hue: Math.random(),
    });
  }

  function goLeft() {
    if (!state.running) return;
    state.targetLane = Math.max(0, state.targetLane - 1);
  }

  function goRight() {
    if (!state.running) return;
    state.targetLane = Math.min(LANES - 1, state.targetLane + 1);
  }

  document.getElementById("start-btn").addEventListener("click", reset);
  document.getElementById("again-btn").addEventListener("click", reset);
  document.getElementById("left-btn").addEventListener("click", goLeft);
  document.getElementById("right-btn").addEventListener("click", goRight);

  window.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
      e.preventDefault();
      goLeft();
    }
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
      e.preventDefault();
      goRight();
    }
    if ((e.key === "Enter" || e.key === " ") && !state.running) {
      reset();
    }
  });

  function roundRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#7ec8e3");
    g.addColorStop(0.45, "#f6c57a");
    g.addColorStop(1, "#ee8a4a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#fff2b0";
    ctx.beginPath();
    ctx.arc(86, 78, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 248, 210, 0.35)";
    ctx.beginPath();
    ctx.arc(86, 78, 58, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRoad(scroll) {
    ctx.fillStyle = "#5aa85a";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#6fbf63";
    for (let i = 0; i < 8; i += 1) {
      const y = ((i * 110 + scroll * 0.35) % (H + 110)) - 80;
      ctx.beginPath();
      ctx.ellipse(28, y, 34, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(W - 28, y + 40, 30, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#6b5a4a";
    roundRect(ROAD_LEFT - 18, -10, ROAD_W + 36, H + 20, 28);
    ctx.fill();

    ctx.fillStyle = "#8a7a68";
    roundRect(ROAD_LEFT, -10, ROAD_W, H + 20, 22);
    ctx.fill();

    ctx.strokeStyle = "#fff3d6";
    ctx.lineWidth = 6;
    ctx.setLineDash([28, 26]);
    ctx.lineDashOffset = -scroll;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT + LANE_W, 0);
    ctx.lineTo(ROAD_LEFT + LANE_W, H);
    ctx.moveTo(ROAD_LEFT + LANE_W * 2, 0);
    ctx.lineTo(ROAD_LEFT + LANE_W * 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = "#f4a261";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT + 4, 0);
    ctx.lineTo(ROAD_LEFT + 4, H);
    ctx.moveTo(ROAD_RIGHT - 4, 0);
    ctx.lineTo(ROAD_RIGHT - 4, H);
    ctx.stroke();
  }

  function drawTree(tree) {
    const x = tree.side === "left" ? 40 : W - 40;
    const s = tree.scale;
    ctx.save();
    ctx.translate(x, tree.y);
    ctx.scale(s, s);
    ctx.fillStyle = "#6b4226";
    roundRect(-7, 18, 14, 28, 4);
    ctx.fill();
    const colors = tree.hue < 0.33
      ? ["#e76f51", "#f4a261", "#e9c46a"]
      : tree.hue < 0.66
        ? ["#d62828", "#f77f00", "#fcbf49"]
        : ["#c44536", "#e09f3e", "#fff3b0"];
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.arc(-16, 6, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[1];
    ctx.beginPath();
    ctx.arc(16, 8, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors[2];
    ctx.beginPath();
    ctx.arc(0, -8, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawCar() {
    const x = state.carX;
    const y = state.carY;
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = "rgba(61, 41, 20, 0.2)";
    ctx.beginPath();
    ctx.ellipse(0, 42, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2b2b2b";
    roundRect(-28, 8, 16, 22, 5);
    ctx.fill();
    roundRect(12, 8, 16, 22, 5);
    ctx.fill();
    roundRect(-28, -18, 16, 18, 5);
    ctx.fill();
    roundRect(12, -18, 16, 18, 5);
    ctx.fill();

    ctx.fillStyle = "#e76f51";
    roundRect(-26, -34, 52, 62, 16);
    ctx.fill();
    ctx.fillStyle = "#f4a261";
    roundRect(-22, -28, 44, 22, 12);
    ctx.fill();

    ctx.fillStyle = "#7ec8e3";
    roundRect(-16, -24, 32, 16, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    roundRect(-14, -22, 14, 8, 4);
    ctx.fill();

    ctx.fillStyle = "#fff6e8";
    ctx.beginPath();
    ctx.arc(-18, 20, 5, 0, Math.PI * 2);
    ctx.arc(18, 20, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3d2914";
    ctx.beginPath();
    ctx.arc(0, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff6e8";
    ctx.beginPath();
    ctx.arc(-2, 6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawObstacle(o) {
    const x = o.x;
    const y = o.y;
    ctx.save();
    ctx.translate(x, y + Math.sin(state.time * 0.008 + o.wobble) * 2);

    if (o.kind === "pumpkin") {
      ctx.fillStyle = "#e76f51";
      ctx.beginPath();
      ctx.ellipse(0, 6, 26, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#c44536";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(-10, 6, 8, 20, 0, 0, Math.PI * 2);
      ctx.ellipse(10, 6, 8, 20, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#2a9d8f";
      roundRect(-4, -22, 8, 12, 3);
      ctx.fill();
      ctx.fillStyle = "#3d2914";
      ctx.beginPath();
      ctx.arc(-8, 4, 3, 0, Math.PI * 2);
      ctx.arc(8, 4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#3d2914";
      ctx.beginPath();
      ctx.arc(0, 12, 8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (o.kind === "hay") {
      ctx.fillStyle = "#e9c46a";
      roundRect(-24, -10, 48, 32, 10);
      ctx.fill();
      ctx.strokeStyle = "#c9a227";
      ctx.lineWidth = 3;
      for (let i = -16; i <= 16; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, -8);
        ctx.lineTo(i + 4, 20);
        ctx.stroke();
      }
      ctx.fillStyle = "#f4a261";
      roundRect(-10, -18, 20, 10, 5);
      ctx.fill();
    } else if (o.kind === "log") {
      ctx.fillStyle = "#8d5a2b";
      roundRect(-22, -8, 44, 24, 12);
      ctx.fill();
      ctx.fillStyle = "#e9c46a";
      ctx.beginPath();
      ctx.ellipse(-22, 4, 8, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6b3f1a";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-22, 4, 4, 0, Math.PI * 2);
      ctx.stroke();
    } else if (o.kind === "squirrel") {
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.ellipse(4, 10, 18, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-10, -2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(20, 4, 8, 16, 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3d2914";
      ctx.beginPath();
      ctx.arc(-14, -4, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff6e8";
      ctx.beginPath();
      ctx.arc(-18, 2, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = "#d62828";
      ctx.beginPath();
      ctx.ellipse(-10, 8, 16, 10, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f77f00";
      ctx.beginPath();
      ctx.ellipse(8, 10, 18, 11, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e9c46a";
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 9, 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawPickup(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.spin);
    ctx.fillStyle = "#e9c46a";
    ctx.beginPath();
    ctx.ellipse(0, 0, 12, 7, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e76f51";
    ctx.beginPath();
    ctx.ellipse(2, 1, 8, 5, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#6b4226";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(10, -6);
    ctx.stroke();
    ctx.restore();
  }

  function hit(ax, ay, aw, ah, bx, by, bw, bh) {
    return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
  }

  function update(dt) {
    if (!state.running) return;
    state.time += dt;
    state.speed = Math.min(11, 4.2 + state.time / 14000);
    state.score += (state.speed * dt) / 80;
    scoreEl.textContent = String(Math.floor(state.score));

    const targetX = laneCenter(state.targetLane);
    state.carX += (targetX - state.carX) * 0.18;
    if (Math.abs(state.carX - targetX) < 2) {
      state.lane = state.targetLane;
    }

    const gap = Math.max(520, 980 - state.time / 18);
    if (state.time - state.lastSpawn > gap) {
      spawnObstacle();
      if (Math.random() < 0.28 && state.speed > 5.5) spawnObstacle();
      state.lastSpawn = state.time;
    }
    if (state.time - state.lastPickup > 1400) {
      spawnPickup();
      state.lastPickup = state.time;
    }
    if (state.time - state.lastTree > 420) {
      spawnTree(Math.random() < 0.5 ? "left" : "right");
      state.lastTree = state.time;
    }

    const dy = state.speed * (dt / 16);
    state.obstacles.forEach((o) => {
      o.y += dy;
    });
    state.pickups.forEach((p) => {
      p.y += dy;
      p.spin += 0.08;
    });
    state.trees.forEach((t) => {
      t.y += dy * 0.92;
    });

    state.obstacles = state.obstacles.filter((o) => o.y < H + 80);
    state.pickups = state.pickups.filter((p) => p.y < H + 40);
    state.trees = state.trees.filter((t) => t.y < H + 80);

    for (const o of state.obstacles) {
      if (hit(state.carX, state.carY, 40, 52, o.x, o.y, o.w, o.h)) {
        gameOver();
        return;
      }
    }

    state.pickups = state.pickups.filter((p) => {
      if (hit(state.carX, state.carY, 40, 52, p.x, p.y, 22, 22)) {
        state.score += 25;
        for (let i = 0; i < 8; i += 1) {
          state.sparks.push({
            x: p.x,
            y: p.y,
            vx: -2 + Math.random() * 4,
            vy: -3 - Math.random() * 2,
            life: 1,
          });
        }
        return false;
      }
      return true;
    });

    state.sparks.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.12;
      s.life -= 0.04;
    });
    state.sparks = state.sparks.filter((s) => s.life > 0);
  }

  function draw() {
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
      state.shake *= 0.88;
    }
    drawSky();
    drawRoad(state.time * (state.speed * 0.35));
    state.trees.forEach(drawTree);
    state.pickups.forEach(drawPickup);
    state.obstacles.forEach(drawObstacle);
    drawCar();
    state.sparks.forEach((s) => {
      ctx.globalAlpha = s.life;
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.restore();
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(40, now - last);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  draw();
  requestAnimationFrame(loop);
})();
