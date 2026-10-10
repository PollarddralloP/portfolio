(() => {
  const K = SceneKit,
    canvas = document.getElementById("ocean-canvas");
  const app = K.create(canvas, {
    background: "#052b3a",
    position: [8, 6, 18],
    target: [2, 0, 0],
    fov: 48,
    shadows: false,
  });
  const origin = () => ({
    x: 0,
    y: 0,
    oxygen: 100,
    hull: 100,
    collected: [],
    time: 0,
    status: "ready",
    sonar: 0,
    hits: 0,
    boost: 0,
  });
  let state = origin(),
    keys = new Set(),
    sub,
    arm,
    beam,
    particles,
    station,
    sonarRing,
    objects = [],
    hazards = [],
    last = 0,
    raf = 0,
    invulnerable = 0,
    sonarUntil = 0,
    seed = 781;
  const sites = [
      [13, -3],
      [27, -7],
      [41, -2],
      [56, -10],
      [71, -5],
    ],
    names = [
      "Спора рассвета",
      "Светящийся кварц",
      "Сердце полипа",
      "Чёрный жемчуг",
      "Последний огонёк",
    ];
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function build() {
    const s = app.scene;
    s.fog = new THREE.FogExp2("#052b3a", 0.022);
    app.lights({ sun: "#b9eff5", power: 1.8, ambient: 1, pos: [10, 18, 7] });
    sub = new THREE.Group();
    s.add(sub);
    const yellow = K.material("#d9b94a", { metalness: 0.25, roughness: 0.42 }),
      dark = K.material("#233b40", { metalness: 0.5, roughness: 0.4 }),
      white = K.material("#ccd8ca");
    K.cylinder(sub, 1.05, 1.05, 2.6, yellow, [0, 0, 0], [0, 0, Math.PI / 2]);
    K.sphere(sub, 1.05, yellow, [-1.3, 0, 0]);
    const glass = K.material("#264b58", { metalness: 0.65, roughness: 0.14 });
    K.sphere(sub, 1.05, glass, [1.28, 0, 0]);
    const ring = K.mesh(
      sub,
      new THREE.TorusGeometry(1.04, 0.075, 12, 64),
      dark,
      [1.25, 0, 0],
      [0, Math.PI / 2, 0],
    );
    K.sphere(
      sub,
      0.92,
      K.material("#73a5ad", { metalness: 0.55, roughness: 0.1 }),
      [1.42, 0, 0],
      [1, 0.75, 0.75],
    );
    K.cylinder(sub, 0.38, 0.38, 0.38, dark, [-2.22, 0, 0], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.position.set(-2.44, 0, 0);
      g.rotation.x = (i * Math.PI) / 2;
      K.box(g, [0.08, 0.6, 0.17], dark, [0, 0.32, 0], [0.3, 0, 0]);
      sub.add(g);
    }
    // Outer frame, ballast pods, antenna and stripes.
    for (const z of [-0.85, 0.85]) {
      K.box(sub, [3.9, 0.13, 0.14], dark, [0, -1.08, z]);
      for (const x of [-1.45, 1.35])
        K.box(sub, [0.11, 0.8, 0.11], dark, [x, -0.68, z]);
      K.cylinder(
        sub,
        0.28,
        0.28,
        2.9,
        white,
        [-0.15, 0.42, z],
        [0, 0, Math.PI / 2],
      );
    }
    K.box(sub, [0.92, 0.42, 0.7], yellow, [-0.38, 1.18, 0]);
    K.cylinder(sub, 0.04, 0.04, 0.75, dark, [-0.38, 1.78, 0]);
    K.sphere(sub, 0.08, white, [-0.38, 2.18, 0]);
    for (let i = 0; i < 3; i++)
      K.box(sub, [0.23, 0.045, 1.65], dark, [-0.9 + i * 0.4, 1.04, 0]);
    const labelTex = K.texture(
      (c, w, h) => {
        c.fillStyle = "#cbb242";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#1c3540";
        c.font = "bold 64px monospace";
        c.fillText("ATLAS / 07", 24, 290);
      },
      512,
      512,
    );
    K.box(
      sub,
      [1.2, 0.4, 0.03],
      new THREE.MeshBasicMaterial({ map: labelTex }),
      [-0.55, -0.08, 1.015],
    );
    arm = new THREE.Group();
    sub.add(arm);
    K.cylinder(arm, 0.055, 0.075, 1.1, dark, [1.1, -1.12, 0.8], [0, 0, 0.58]);
    K.cylinder(
      arm,
      0.065,
      0.065,
      0.62,
      yellow,
      [1.44, -1.65, 0.8],
      [0, 0, -0.35],
    );
    for (const sign of [-1, 1])
      K.box(
        arm,
        [0.06, 0.25, 0.06],
        dark,
        [1.54 + sign * 0.1, -2, 0.8],
        [0, 0, sign * 0.35],
      );
    const bulb = K.material("#fff0b8", {
      emissive: K.color("#ffe3a1"),
      emissiveIntensity: 2,
    });
    for (const z of [-0.65, 0.65]) K.sphere(sub, 0.15, bulb, [1.52, -0.67, z]);

    beam = K.mesh(
      sub,
      new THREE.ConeGeometry(2, 8, 28, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#def3b2",
        transparent: true,
        opacity: 0.07,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      [5, -0.7, 0],
      [0, 0, Math.PI / 2],
    );
    const light = new THREE.PointLight("#e6ecae", 3, 18);
    light.position.set(3, 0, 0);
    sub.add(light);
    sub.scale.setScalar(0.65);
    sonarRing = K.mesh(
      s,
      new THREE.TorusGeometry(1, 0.035, 8, 64),
      new THREE.MeshBasicMaterial({
        color: "#dce98e",
        transparent: true,
        opacity: 0.65,
      }),
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    sonarRing.visible = false;
    station = new THREE.Group();
    s.add(station);
    K.cylinder(
      station,
      1.8,
      1.8,
      0.7,
      K.material("#466569", { metalness: 0.7 }),
      [0, -1, 0],
    );
    K.mesh(
      station,
      new THREE.TorusGeometry(2, 0.17, 16, 64),
      K.material("#cbe986", {
        emissive: K.color("#cbe986"),
        emissiveIntensity: 1,
      }),
      [0, 0, 0],
      [Math.PI / 2, 0, 0],
    );
    K.box(station, [2.4, 2.5, 0.5], K.material("#253e47"), [-1, 0, -2.4]);
    const bed = new THREE.PlaneGeometry(160, 65, 90, 35),
      pos = bed.attributes.position;
    for (let i = 0; i < pos.count; i++)
      pos.setZ(
        i,
        Math.sin(pos.getX(i) * 0.21) * Math.cos(pos.getY(i) * 0.17) * 1.8,
      );
    bed.computeVertexNormals();
    K.mesh(
      s,
      bed,
      K.material("#143d44", { flatShading: true }),
      [35, -16, -5],
      [-Math.PI / 2, 0, 0],
    );
    for (let i = 0; i < 85; i++) {
      const x = random() * 100 - 8,
        z = -6 - random() * 24,
        h = 3 + random() * 14;
      const rock = K.mesh(
        s,
        new THREE.DodecahedronGeometry(1.5, 0),
        K.material(i % 2 ? "#204b52" : "#315b5e", { flatShading: true }),
        [x, -16 + h * 0.35, z],
      );
      rock.scale.set(1 + random() * 2, h / 2, 1 + random() * 2);
      rock.rotation.y = random() * 6;
    }
    for (let i = 0; i < sites.length; i++) {
      const g = new THREE.Group();
      g.position.set(sites[i][0], sites[i][1], 0);
      s.add(g);
      const glow = K.material("#e2f2a0", {
        emissive: K.color("#cee982"),
        emissiveIntensity: 1.7,
        metalness: 0.2,
        roughness: 0.3,
      });
      K.mesh(g, new THREE.IcosahedronGeometry(0.65, 1), glow);
      K.mesh(
        g,
        new THREE.TorusGeometry(1, 0.025, 8, 40),
        glow,
        [0, 0, 0],
        [Math.PI / 2, 0, 0],
      );
      objects.push(g);
    }
    for (let i = 0; i < 12; i++) {
      const x = 9 + i * 5.8,
        y = -2 - ((i * 3) % 10);
      const g = new THREE.Group();
      g.position.set(x, y, -0.2);
      s.add(g);
      const pink = K.material("#dba8d5", {
        transparent: true,
        opacity: 0.66,
        emissive: K.color("#885286"),
        emissiveIntensity: 0.8,
      });
      K.sphere(g, 0.9, pink, [0, 0, 0], [1, 0.6, 1]);
      for (let t = 0; t < 7; t++) {
        const angle = (t * Math.PI * 2) / 7;
        const points = [];
        for (let j = 0; j < 9; j++)
          points.push(
            new THREE.Vector3(
              Math.cos(angle) * (0.4 + j * 0.03) + Math.sin(j) * 0.12,
              -j * 0.28,
              Math.sin(angle) * 0.4,
            ),
          );
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: "#cf9eca",
            transparent: true,
            opacity: 0.65,
          }),
        );
        g.add(line);
      }
      hazards.push({ g, x, y });
    }
    const points = new Float32Array(1800);
    for (let i = 0; i < 600; i++) {
      points[i * 3] = random() * 130 - 20;
      points[i * 3 + 1] = random() * 38 - 18;
      points[i * 3 + 2] = random() * 42 - 22;
    }
    particles = new THREE.Points(
      new THREE.BufferGeometry().setAttribute(
        "position",
        new THREE.BufferAttribute(points, 3),
      ),
      new THREE.PointsMaterial({
        color: "#a8dcd9",
        size: 0.04,
        transparent: true,
        opacity: 0.6,
      }),
    );
    s.add(particles);
    app.invalidate();
  }
  if (app) build();
  else document.getElementById("start").disabled = true;
  const map = document.getElementById("map"),
    ctx = map.getContext("2d");
  function chart() {
    const r = map.getBoundingClientRect();
    map.width = Math.max(1, Math.round(r.width * devicePixelRatio));
    map.height = Math.max(1, Math.round(r.height * devicePixelRatio));
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const w = r.width,
      h = r.height,
      X = (x) => 14 + (x / 80) * (w - 28),
      Y = (y) => 8 + ((3 - y) / 16) * (h - 16);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#34525a";
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 8 + (i * (h - 16)) / 3);
      ctx.lineTo(w, 8 + (i * (h - 16)) / 3);
      ctx.stroke();
    }
    ctx.strokeStyle = "#dce98e";
    ctx.strokeRect(X(0) - 4, Y(0) - 4, 8, 8);
    sites.forEach(([x, y], i) => {
      ctx.beginPath();
      ctx.arc(X(x), Y(y), state.collected.includes(i) ? 2 : 4, 0, Math.PI * 2);
      ctx.fillStyle = state.collected.includes(i) ? "#607878" : "#dce98e";
      ctx.fill();
    });
    hazards.forEach((o) => {
      ctx.fillStyle = "#cb99bd";
      ctx.fillRect(X(o.x) - 2, Y(o.g.position.y) - 2, 4, 4);
    });
    ctx.beginPath();
    ctx.arc(X(state.x), Y(state.y), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  function update() {
    document.getElementById("oxygen").textContent =
      Math.ceil(state.oxygen) + "%";
    document.getElementById("hull").textContent = Math.ceil(state.hull) + "%";
    document.getElementById("oxygen-bar").value = state.oxygen;
    document.getElementById("hull-bar").value = state.hull;
    document.getElementById("samples").textContent =
      state.collected.length + " / 5";
    document.getElementById("depth").textContent =
      Math.round(120 - state.y * 36) + " м";
    document.getElementById("timer").textContent =
      String(Math.floor(state.time / 60)).padStart(2, "0") +
      ":" +
      String(Math.floor(state.time % 60)).padStart(2, "0");
    const target = sites.findIndex((_, i) => !state.collected.includes(i));
    document.getElementById("phase").textContent =
      target < 0 ? "ВОЗВРАЩАЙСЯ К ШЛЮЗУ" : "ОБРАЗЕЦ " + (target + 1) + " / 5";
    document.getElementById("target-label").textContent =
      target < 0
        ? "Шлюз ← " + Math.round(Math.hypot(state.x, state.y)) + " м"
        : names[target] +
          " · " +
          Math.round(
            Math.hypot(sites[target][0] - state.x, sites[target][1] - state.y),
          ) +
          " м";
    document.getElementById("sonar").disabled =
      state.status !== "playing" || state.sonar > 0;
    document.getElementById("sonar").innerHTML =
      state.sonar > 0
        ? "Сонар<br><small>" + Math.ceil(state.sonar) + " с</small>"
        : "Сонар<br><small>−4% O₂</small>";
    chart();
  }
  function tell(text) {
    document.getElementById("message").textContent = text;
  }
  function finish(won) {
    state.status = won ? "won" : "lost";
    keys.clear();
    document.getElementById("pause").disabled = true;
    const gate = document.getElementById("gate");
    gate.hidden = false;
    gate.classList.add("ending");
    gate.querySelector("h2").textContent = won
      ? "Ты вернулся. С живым светом."
      : "Глубина не прощает спешки.";
    document.getElementById("gate-text").textContent = won
      ? "Пять новых форм жизни. " +
        Math.round(state.time) +
        " секунд под водой. Повреждений: " +
        state.hits +
        ". Осталось кислорода: " +
        Math.ceil(state.oxygen) +
        "%."
      : (state.oxygen <= 0
          ? "Кислород закончился."
          : "Корпус не выдержал столкновений.") +
        " Найдено образцов: " +
        state.collected.length +
        " из 5. Смотри на карту и обходи розовые сигналы.";
    document.getElementById("start").textContent = "Новый спуск →";
    gate.querySelector(".gate-help").hidden = true;
    update();
  }
  function step(dt) {
    if (state.status !== "playing") return;
    dt = Math.min(dt, 0.04);
    state.time += dt;
    state.sonar = Math.max(0, state.sonar - dt);
    invulnerable = Math.max(0, invulnerable - dt);
    const boosted = keys.has(" "),
      speed = boosted ? 7 : 3.6;
    let dx =
        Number(keys.has("ArrowRight") || keys.has("d")) -
        Number(keys.has("ArrowLeft") || keys.has("a")),
      dy =
        Number(keys.has("ArrowUp") || keys.has("w")) -
        Number(keys.has("ArrowDown") || keys.has("s"));
    const norm = Math.hypot(dx, dy) || 1;
    state.x = Math.max(-1, Math.min(79, state.x + (dx / norm) * speed * dt));
    state.y = Math.max(-12, Math.min(3, state.y + (dy / norm) * speed * dt));
    state.oxygen = Math.max(
      0,
      state.oxygen - dt * (0.58 + (boosted && (dx || dy) ? 1.3 : 0)),
    );
    if (boosted) state.boost += dt;
    sonarRing.visible = state.sonar > 7;
    sonarRing.position.set(state.x, state.y, 0);
    sonarRing.scale.setScalar(1 + (10 - state.sonar) * 5);
    sonarRing.material.opacity = Math.max(0, (state.sonar - 7) / 3) * 0.65;
    for (const g of sub.children)
      if (g.isGroup && g.position.x === -2.44)
        g.rotation.x += dt * (boosted ? 22 : 12);
    sub.position.set(state.x, state.y, 0);
    sub.rotation.z += (dy * 0.13 - sub.rotation.z) * Math.min(1, dt * 8);
    sub.rotation.y +=
      (dx < 0 ? Math.PI - sub.rotation.y : -sub.rotation.y) *
      Math.min(1, dt * 7);
    hazards.forEach((o, i) => {
      o.g.position.y = o.y + Math.sin(state.time * 0.65 + i) * 0.75;
      if (
        !invulnerable &&
        Math.hypot(state.x - o.x, state.y - o.g.position.y) < 1.35
      ) {
        state.hull = Math.max(0, state.hull - 18);
        state.hits++;
        invulnerable = 2;
        tell("Разряд медузы. Корпус −18%. Обойди розовый сигнал.");
      }
    });
    objects.forEach((g, i) => {
      g.rotation.y += dt * 0.8;
      g.rotation.z = Math.sin(state.time + i) * 0.12;
      g.scale.setScalar(state.sonar > 7 ? 1.3 : 1);
      if (
        !state.collected.includes(i) &&
        Math.hypot(state.x - sites[i][0], state.y - sites[i][1]) < 1.8
      ) {
        state.collected.push(i);
        g.visible = false;
        state.oxygen = Math.min(100, state.oxygen + 4);
        tell(
          "Образец «" +
            names[i] +
            "» в контейнере. " +
            (state.collected.length === 5
              ? "Теперь вернись в шлюз слева."
              : "Ищи следующий огонёк."),
        );
      }
    });
    if (state.oxygen <= 0 || state.hull <= 0) finish(false);
    else if (state.collected.length === 5 && Math.hypot(state.x, state.y) < 2)
      finish(true);
    const off = innerWidth < 700 ? [5, 5.5, 16] : [7, 5, 18];
    app.camera.position.set(state.x + off[0], state.y + off[1], off[2]);
    app.target.set(state.x + 2, state.y - 1, 0);
    app.invalidate();
    update();
  }
  function loop(now) {
    raf = 0;
    if (state.status !== "playing") return;
    step(last ? (now - last) / 1000 : 0);
    last = now;
    if (state.status === "playing") raf = requestAnimationFrame(loop);
  }
  function start() {
    if (!app) return;
    cancelAnimationFrame(raf);
    state = origin();
    state.status = "playing";
    keys.clear();
    invulnerable = 0;
    objects.forEach((g) => (g.visible = true));
    document.getElementById("gate").hidden = true;
    document.getElementById("gate").classList.remove("ending");
    document.getElementById("pause").disabled = false;
    document.getElementById("pause").textContent = "Пауза";
    document.body.classList.remove("paused");
    tell("Держи курс на бело-зелёные сигналы.");
    last = 0;
    raf = requestAnimationFrame(loop);
    canvas.focus({ preventScroll: true });
    update();
  }
  function pause() {
    if (state.status === "playing") {
      state.status = "paused";
      cancelAnimationFrame(raf);
      keys.clear();
      document.getElementById("pause").textContent = "Продолжить";
      document.body.classList.add("paused");
    } else if (state.status === "paused") {
      state.status = "playing";
      last = 0;
      raf = requestAnimationFrame(loop);
      document.getElementById("pause").textContent = "Пауза";
      document.body.classList.remove("paused");
    }
    update();
  }
  document.getElementById("start").onclick = start;
  document.getElementById("pause").onclick = pause;
  document.getElementById("sonar").onclick = () => {
    if (state.status !== "playing" || state.sonar > 0) return;
    if (state.oxygen <= 4) {
      tell("Не хватает кислорода для сонара.");
      return;
    }
    state.oxygen -= 4;
    state.sonar = 10;
    tell("Сигналы подсвечены. Зелёные — образцы, розовые — медузы.");
    update();
  };
  const allowed = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "w",
    "a",
    "s",
    "d",
    " ",
  ];
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (allowed.includes(key) && ["playing", "paused"].includes(state.status)) {
      e.preventDefault();
      if (state.status === "playing") keys.add(key);
    }
    if (!e.repeat && key === "p") pause();
    if (!e.repeat && key === "e") document.getElementById("sonar").click();
  });
  window.addEventListener("keyup", (e) =>
    keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key),
  );
  document.querySelectorAll("[data-key]").forEach((b) => {
    b.addEventListener("pointerdown", (e) => {
      if (state.status !== "playing") return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.key);
      b.classList.add("pressed");
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
      b.addEventListener(name, () => {
        keys.delete(b.dataset.key);
        b.classList.remove("pressed");
      }),
    );
  });
  window.addEventListener("blur", () => {
    if (state.status === "playing") pause();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.status === "playing") pause();
  });
  window.addEventListener("resize", chart);
  update();
  canvas.addEventListener("webglcontextlost", () => {
    if (state.status === "playing") pause();
  });
  window.deepRun = {
    get state() {
      return structuredClone(state);
    },
    app,
    sites,
    step,
    pause,
  };
})();
