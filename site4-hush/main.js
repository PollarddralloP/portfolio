(() => {
  const K = SceneKit,
    canvas = document.getElementById("room-canvas"),
    storageKey = "hush-room-v1";
  const palettes = {
    oak: {
      wall: "#ddd4be",
      wood: "#af8356",
      fabric: "#dfcdb4",
      accent: "#a46e4c",
      label: "Тёплый дуб",
    },
    sage: {
      wall: "#d2d8c5",
      wood: "#ab9470",
      fabric: "#9bac93",
      accent: "#637859",
      label: "Шалфей",
    },
    clay: {
      wall: "#e4d3c5",
      wood: "#936342",
      fabric: "#c38468",
      accent: "#b66040",
      label: "Красная глина",
    },
  };
  let state = {
      layout: "lounge",
      palette: "oak",
      daylight: 20,
      lamp: true,
      plants: true,
      art: true,
    },
    storageAvailable = true,
    dirty = false;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (
      saved &&
      Object.hasOwn(palettes, saved.palette) &&
      ["lounge", "reading", "work"].includes(saved.layout) &&
      Number.isFinite(saved.daylight) &&
      saved.daylight >= 0 &&
      saved.daylight <= 100 &&
      ["lamp", "plants", "art"].every((k) => typeof saved[k] === "boolean")
    )
      state = saved;
  } catch {
    storageAvailable = false;
  }
  const app = K.create(canvas, {
    background: "transparent",
    position: [10, 8, 12],
    target: [0, 0.8, 0],
    fov: 34,
  });
  let room,
    groups = {},
    mats = {},
    lampLight,
    lights,
    plantGroup,
    artGroup,
    orbit;
  function build() {
    const s = app.scene;
    room = new THREE.Group();
    s.add(room);
    mats = {
      wall: K.material("#ddd4be"),
      wood: K.material("#af8356"),
      fabric: K.material("#dfcdb4"),
      accent: K.material("#a46e4c"),
      black: K.material("#3e483a"),
      paper: K.material("#eee7d6"),
      leaf: K.material("#60765c"),
    };
    const floorTex = K.texture((c, w, h) => {
      c.fillStyle = "#bba181";
      c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 51) {
        c.strokeStyle = "#6c4e333d";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x, h);
        c.stroke();
        for (let y = ((x / 51) % 2) * 128; y < h; y += 256) {
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + 51, y);
          c.stroke();
        }
      }
    });
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(2, 2);
    K.box(
      room,
      [8, 0.18, 6],
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.9 }),
      [0, -0.1, 0],
    );
    K.box(room, [8, 3.15, 0.16], mats.wall, [0, 1.48, -3]);
    K.box(room, [0.16, 3.15, 6], mats.wall, [-4, 1.48, 0]);
    K.box(room, [8, 0.1, 0.07], mats.paper, [0, 0.1, -2.87]);
    K.box(room, [0.07, 0.1, 6], mats.paper, [-3.87, 0.1, 0]);
    // Recessed window with mullions, sheer blinds and a view of drawn trees.
    const view = K.texture((c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#bccdcc");
      g.addColorStop(1, "#f0e7c9");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) {
        c.fillStyle = i % 2 ? "#8a9e81" : "#718873";
        c.beginPath();
        c.ellipse(i * 70, 360, 60, 140, 0, 0, Math.PI * 2);
        c.fill();
      }
    });
    K.box(
      room,
      [2.45, 2.15, 0.045],
      new THREE.MeshBasicMaterial({ map: view }),
      [-1.95, 1.75, -2.9],
    );
    for (const x of [-3.22, -2.02, -0.68])
      K.box(room, [0.05, 2.25, 0.08], mats.paper, [x, 1.75, -2.81]);
    for (const y of [0.62, 1.75, 2.88])
      K.box(room, [2.65, 0.05, 0.08], mats.paper, [-1.95, y, -2.81]);
    const curtain = new THREE.MeshStandardMaterial({
      color: K.color("#ede8d5"),
      transparent: true,
      opacity: 0.8,
      roughness: 1,
    });
    for (let i = 0; i < 10; i++)
      K.cylinder(room, 0.04, 0.04, 2.6, curtain, [
        -3.5 + i * 0.045,
        1.58,
        -2.7,
      ]);
    // Rug with hand-drawn borders.
    const rug = K.texture((c, w, h) => {
      c.fillStyle = "#e6ddc8";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#887963";
      c.lineWidth = 3;
      for (let i = 14; i < 52; i += 12)
        c.strokeRect(i, i, w - i * 2, h - i * 2);
      c.strokeStyle = "#cabda64a";
      for (let y = 0; y < h; y += 8) {
        c.beginPath();
        c.moveTo(0, y);
        c.lineTo(w, y);
        c.stroke();
      }
    });
    K.box(
      room,
      [4.7, 0.018, 3.7],
      new THREE.MeshStandardMaterial({ map: rug, roughness: 1 }),
      [0.15, 0.02, 0.6],
    );
    groups.lounge = new THREE.Group();
    groups.reading = new THREE.Group();
    groups.work = new THREE.Group();
    Object.values(groups).forEach((g) => room.add(g));
    function sofa(g, x, z, scale = 1) {
      K.box(g, [3.25 * scale, 0.38, 1.25], mats.fabric, [x, 0.52, z]);
      K.box(g, [3.2 * scale, 0.72, 0.22], mats.fabric, [x, 0.88, z - 0.54]);
      for (const dx of [-1.54, 1.54])
        K.box(g, [0.23, 0.6, 1.3], mats.fabric, [x + dx * scale, 0.7, z]);
      for (const dx of [-1.2, 1.2])
        for (const dz of [-0.42, 0.42])
          K.cylinder(g, 0.06, 0.065, 0.35, mats.wood, [
            x + dx * scale,
            0.2,
            z + dz,
          ]);
      for (let i = 0; i < 3; i++) {
        const cushion = K.sphere(
          g,
          0.42,
          mats.fabric,
          [x + (i - 1) * 0.9 * scale, 0.82, z - 0.28],
          [1, 0.32, 0.65],
        );
        cushion.rotation.z = 0.08;
      }
      K.sphere(
        g,
        0.37,
        mats.accent,
        [x - 1 * scale, 1.01, z - 0.4],
        [1, 0.65, 0.3],
      );
    }
    sofa(groups.lounge, 0.9, -1.2);
    K.cylinder(groups.lounge, 0.95, 1, 0.12, mats.wood, [0.9, 0.52, 1.2]);
    for (let i = 0; i < 3; i++)
      K.cylinder(groups.lounge, 0.045, 0.06, 0.46, mats.black, [
        0.9 + Math.sin((i * Math.PI * 2) / 3) * 0.62,
        0.25,
        1.2 + Math.cos((i * Math.PI * 2) / 3) * 0.62,
      ]);
    const book = K.box(
      groups.lounge,
      [0.5, 0.06, 0.38],
      mats.paper,
      [0.52, 0.62, 1.14],
    );
    book.rotation.y = 0.2;
    K.cylinder(groups.lounge, 0.12, 0.08, 0.23, mats.accent, [1.25, 0.7, 1.15]);
    function chair(g, x, z) {
      K.box(g, [1.18, 0.28, 1.1], mats.fabric, [x, 0.6, z]);
      K.box(g, [1.18, 0.72, 0.2], mats.fabric, [x, 0.97, z - 0.45]);
      for (const dx of [-0.48, 0.48]) {
        K.box(g, [0.12, 0.18, 1.1], mats.wood, [x + dx, 0.87, z]);
        K.box(g, [0.09, 0.75, 0.09], mats.wood, [x + dx, 0.37, z + 0.38]);
        K.box(g, [0.09, 0.75, 0.09], mats.wood, [x + dx, 0.37, z - 0.38]);
      }
    }
    chair(groups.lounge, -2.2, 1.12);
    chair(groups.reading, -1.9, -0.9);
    K.cylinder(groups.reading, 0.44, 0.44, 0.09, mats.wood, [-0.4, 0.54, -0.9]);
    K.cylinder(
      groups.reading,
      0.07,
      0.16,
      0.52,
      mats.black,
      [-0.4, 0.25, -0.9],
    );
    for (let i = 0; i < 4; i++) {
      K.box(groups.reading, [1.5, 0.07, 0.35], mats.wood, [
        1.8,
        0.62 + i * 0.5,
        -2.6,
      ]);
      for (let j = 0; j < 5; j++) {
        const cover = K.material(
          ["#a0805b", "#57745c", "#b99076", "#ded6be", "#636d5a"][j],
        );
        K.box(groups.reading, [0.12, 0.28 + j * 0.018, 0.2], cover, [
          1.24 + j * 0.18,
          0.8 + i * 0.5,
          -2.6,
        ]);
      }
    }
    K.box(groups.reading, [0.44, 0.04, 0.3], mats.accent, [-0.4, 0.61, -0.9]);
    K.box(groups.work, [3.8, 0.12, 1.25], mats.wood, [0, 0.87, -0.75]);
    for (const x of [-1.5, 1.5])
      K.box(groups.work, [0.1, 0.85, 1.1], mats.black, [x, 0.43, -0.75]);
    chair(groups.work, 0, 0.54);
    K.box(groups.work, [0.72, 0.022, 0.5], mats.paper, [-0.45, 0.96, -0.72]);
    K.box(
      groups.work,
      [0.04, 0.028, 0.45],
      mats.black,
      [-0.1, 0.99, -0.72],
      [0, 0.2, 0],
    );
    K.cylinder(groups.work, 0.15, 0.12, 0.2, mats.accent, [0.76, 1.03, -0.75]);
    // Pendant and task lamp, plus actual warm light.
    K.cylinder(room, 0.035, 0.035, 0.82, mats.black, [0.55, 2.95, 0.4]);
    K.cylinder(room, 0.15, 0.62, 0.34, mats.accent, [0.55, 2.4, 0.4]);
    const bulb = K.material("#ffe5a4", {
      emissive: K.color("#ffcf84"),
      emissiveIntensity: 1,
    });
    mats.bulb = bulb;
    K.sphere(room, 0.13, bulb, [0.55, 2.22, 0.4]);
    lampLight = new THREE.PointLight("#ffbc74", 1.8, 8, 2);
    lampLight.position.set(0.55, 2.2, 0.4);
    room.add(lampLight);
    K.cylinder(room, 0.22, 0.22, 0.07, mats.black, [-2.95, 0.05, -0.8]);
    K.cylinder(room, 0.024, 0.024, 1.55, mats.black, [-2.95, 0.8, -0.8]);
    K.cylinder(room, 0.25, 0.43, 0.35, mats.paper, [-2.95, 1.76, -0.8]);
    plantGroup = new THREE.Group();
    room.add(plantGroup);
    for (const [x, z] of [
      [2.98, -2.15],
      [-3.2, 2.08],
    ]) {
      K.cylinder(plantGroup, 0.28, 0.23, 0.5, mats.accent, [x, 0.3, z]);
      for (let i = 0; i < 9; i++) {
        const angle = i * 2.4,
          yy = 0.8 + i * 0.075;
        K.cylinder(plantGroup, 0.012, 0.014, yy, mats.leaf, [
          x,
          0.5 + yy / 2,
          z,
        ]);
        const leaf = K.sphere(
          plantGroup,
          0.3,
          mats.leaf,
          [x + Math.sin(angle) * 0.3, yy + 0.4, z + Math.cos(angle) * 0.3],
          [0.42, 1.6, 1],
        );
        leaf.rotation.z = Math.sin(angle) * 0.55;
      }
    }
    artGroup = new THREE.Group();
    room.add(artGroup);
    K.box(artGroup, [1.56, 1.65, 0.08], mats.wood, [1.72, 1.92, -2.83]);
    const drawing = K.texture((c, w, h) => {
      c.fillStyle = "#e9dfc9";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#b87350";
      c.beginPath();
      c.arc(252, 240, 135, Math.PI, 0);
      c.lineTo(387, 390);
      c.lineTo(117, 390);
      c.fill();
      c.fillStyle = "#6f7d60";
      c.beginPath();
      c.ellipse(255, 350, 125, 30, -0.2, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#434b38";
      c.lineWidth = 3;
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(95 + i * 14, 420);
        c.bezierCurveTo(130 + i * 14, 270, 270, 310, 400, 90 + i * 13);
        c.stroke();
      }
    });
    K.box(
      artGroup,
      [1.38, 1.48, 0.03],
      new THREE.MeshBasicMaterial({ map: drawing }),
      [1.72, 1.92, -2.76],
    );
    lights = app.lights({ power: 1.8, ambient: 0.65, pos: [-3, 9, 5] });
    orbit = app.enableOrbit({
      radius: 17,
      azimuth: 0.7,
      elevation: 0.43,
      target: [0, 0.8, 0],
      min: 9,
      max: 21,
    });
  }
  if (app) build();
  function sync() {
    const p = palettes[state.palette];
    if (app) {
      mats.wall.color.copy(K.color(p.wall));
      mats.wood.color.copy(K.color(p.wood));
      mats.fabric.color.copy(K.color(p.fabric));
      mats.accent.color.copy(K.color(p.accent));
      Object.entries(groups).forEach(
        ([id, g]) => (g.visible = id === state.layout),
      );
      plantGroup.visible = state.plants;
      artGroup.visible = state.art;
      const evening = state.daylight / 100;
      lights.key.intensity = 1.9 - evening * 1.5;
      lights.key.color.set(evening > 0.65 ? "#f9bc85" : "#fff5e3");
      lights.hemi.intensity = 0.75 - evening * 0.45;
      lampLight.intensity = state.lamp ? 1.2 + evening * 2 : 0;
      mats.bulb.emissiveIntensity = state.lamp ? 1 : 0;
      app.invalidate();
    }
    document.querySelectorAll("[data-layout]").forEach((b) => {
      const active = b.dataset.layout === state.layout;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-palette]").forEach((b) => {
      const active = b.dataset.palette === state.palette;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("daylight").value = state.daylight;
    document.getElementById("light-label").textContent =
      state.daylight < 35
        ? "Утро"
        : state.daylight < 70
          ? "После полудня"
          : "Вечер";
    ["lamp", "plant", "art"].forEach(
      (k) =>
        (document.getElementById(`${k}-toggle`).checked =
          state[k === "plant" ? "plants" : k]),
    );
    document.getElementById("room-label").textContent =
      `ROOM ${["lounge", "reading", "work"].indexOf(state.layout) + 1} / ${p.label.toUpperCase()}`;
    if (storageAvailable && dirty)
      document.getElementById("room-status").textContent =
        "Комната изменилась. Сохрани, чтобы продолжить с этих решений позже.";
    if (!storageAvailable)
      document.getElementById("room-status").textContent =
        "Хранилище недоступно. Комната работает в этой вкладке; решения можно скачать.";
  }
  function focusDetail() {
    if (!app) return;
    const poses = {
      lounge: [
        [7, 4, 7],
        [0.5, 0.8, -0.2],
      ],
      reading: [
        [2.5, 3.7, 5],
        [-1.3, 1, -1.2],
      ],
      work: [
        [5, 4, 5],
        [0, 0.8, -0.6],
      ],
    };
    app.view(...poses[state.layout]);
    document
      .getElementById("main")
      .scrollIntoView({ behavior: K.reduced ? "instant" : "smooth" });
  }
  document.querySelectorAll("[data-layout]").forEach((b) =>
    b.addEventListener("click", () => {
      state.layout = b.dataset.layout;
      dirty = true;
      sync();
      focusDetail();
    }),
  );
  document.querySelectorAll("[data-palette]").forEach((b) =>
    b.addEventListener("click", () => {
      state.palette = b.dataset.palette;
      dirty = true;
      sync();
    }),
  );
  document.getElementById("daylight").addEventListener("input", (e) => {
    state.daylight = Number(e.target.value);
    dirty = true;
    sync();
  });
  ["lamp", "plant", "art"].forEach((k) =>
    document.getElementById(`${k}-toggle`).addEventListener("change", (e) => {
      state[k === "plant" ? "plants" : k] = e.target.checked;
      dirty = true;
      sync();
    }),
  );
  document
    .getElementById("focus-detail")
    .addEventListener("click", focusDetail);
  document.querySelectorAll("[data-orbit]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!orbit) return;
      if (b.dataset.orbit === "reset") orbit.reset();
      else orbit.step(b.dataset.orbit);
    }),
  );
  document.getElementById("save-room").addEventListener("click", () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      dirty = false;
      document.getElementById("room-status").textContent =
        "Твоя комната сохранена. Она встретит тебя при следующем открытии.";
    } catch {
      storageAvailable = false;
      sync();
    }
  });
  document
    .getElementById("export-room")
    .addEventListener("click", () =>
      K.download(
        "hush-room.txt",
        `HUSH — моя комната\nЗанятие: ${{ lounge: "Быть вместе", reading: "Читать у окна", work: "Поймать мысль" }[state.layout]}\nМатериалы: ${palettes[state.palette].label}\nВремя дня: ${document.getElementById("light-label").textContent}\nЛампа: ${state.lamp ? "включена" : "выключена"}\nРастения: ${state.plants ? "да" : "нет"}\nРисунок: ${state.art ? "да" : "нет"}\n\nКонцептуальный эскиз комнаты. Предметы концептуальные, покупки не оформляются.\n`,
        "text/plain;charset=utf-8",
      ),
    );
  sync();
  window.hush = {
    get state() {
      return state;
    },
    app,
    sync,
  };
})();
