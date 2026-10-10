(() => {
  const K = SceneKit,
    canvas = document.getElementById("room-canvas");
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
    artGroup;
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
  }

  const initial = () => ({
    clues: [],
    lamp: true,
    key: false,
    escaped: false,
    visited: [],
    hints: 0,
  });
  let state = initial(),
    selected = null;
  try {
    const s = JSON.parse(localStorage.getItem("room404-v3"));
    if (
      s &&
      Array.isArray(s.clues) &&
      s.clues.every((x) =>
        ["letter", "window", "book", "painting"].includes(x),
      ) &&
      Array.isArray(s.visited) &&
      s.visited.every((x) =>
        [
          "letter",
          "lamp",
          "window",
          "book",
          "painting",
          "safe",
          "door",
        ].includes(x),
      ) &&
      Number.isInteger(s.hints) &&
      s.hints >= 0 &&
      ["lamp", "key", "escaped"].every((x) => typeof s[x] === "boolean")
    )
      state = { ...initial(), ...s };
  } catch {}
  const targets = {
    letter: [0.9, 0.62, 1.2],
    lamp: [0.55, 2.4, 0.4],
    window: [-1.95, 1.7, -2.8],
    book: [1.65, 0.7, -1.15],
    painting: [1.72, 1.9, -2.7],
    safe: [3.15, 0.6, 1.7],
    door: [3.3, 1.4, -2.7],
  };
  let hitboxes = [],
    doorPivot,
    secret;
  if (app) {
    build();
    Object.entries(groups).forEach(([id, g]) => (g.visible = id === "lounge"));
    // An actual safe and door inhabit the space, rather than replacing it with a UI.
    K.box(
      room,
      [0.9, 0.95, 0.75],
      K.material("#303b38", { metalness: 0.5 }),
      targets.safe,
    );
    K.box(
      room,
      [0.7, 0.7, 0.035],
      K.material("#64766b", { metalness: 0.65 }),
      [3.15, 0.6, 2.095],
    );
    K.cylinder(
      room,
      0.13,
      0.13,
      0.04,
      mats.accent,
      [3.33, 0.62, 2.15],
      [Math.PI / 2, 0, 0],
    );
    K.box(room, [1.2, 2.8, 0.16], mats.black, [3.25, 1.4, -2.75]);
    doorPivot = new THREE.Group();
    doorPivot.position.set(2.67, 0, -2.63);
    room.add(doorPivot);
    K.box(doorPivot, [1.05, 2.62, 0.08], mats.wood, [0.525, 1.32, 0]);
    K.sphere(doorPivot, 0.06, mats.accent, [0.86, 1.25, 0.08]);
    const paper = K.texture((c, w, h) => {
      c.fillStyle = "#f5e8c7";
      c.fillRect(0, 0, w, h);
      c.fillStyle = "#413e2e";
      c.font = "38px serif";
      c.fillText("If you forget,", 42, 150);
      c.fillText("follow the light.", 42, 210);
      c.font = "24px serif";
      c.fillText("— yourself", 230, 380);
    });
    K.box(
      room,
      [0.65, 0.02, 0.46],
      new THREE.MeshBasicMaterial({ map: paper }),
      targets.letter,
      [0, 0.2, 0],
    );
    K.box(room, [0.44, 0.09, 0.33], K.material("#6b793f"), targets.book);
    const stars = K.texture((c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = "#ffe7a4";
      c.font = "bold 130px serif";
      c.fillText("2 · 7 · 3", 12, 310);
    });
    secret = K.box(
      room,
      [2.1, 1.7, 0.01],
      new THREE.MeshBasicMaterial({ map: stars, transparent: true }),
      [-1.95, 1.7, -2.72],
    );
    for (const [id, pos] of Object.entries(targets)) {
      const size =
        id === "window"
          ? [2.5, 2, 0.4]
          : id === "painting"
            ? [1.6, 1.7, 0.4]
            : id === "door"
              ? [1.1, 2.5, 0.4]
              : id === "lamp"
                ? [0.9, 0.8, 0.9]
                : [0.95, 0.6, 0.95];
      const b = K.box(
        room,
        size,
        new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
        pos,
      );
      b.userData.id = id;
      hitboxes.push(b);
    }
  }
  const titles = {
    letter: "Письмо себе",
    lamp: "Свет мешает видеть",
    window: "По ту сторону стекла",
    book: "На полях книги",
    painting: "Незаконченный пейзаж",
    safe: "То, что ты спрятал",
    door: "Последний шаг",
  };
  const notes = {
    letter:
      "«Первые три — на стекле в темноте. Последняя — в книге. Картина скажет, зачем уходить».",
    window: "На стекле проступает: 2 · 7 · 3. Слева направо.",
    book: "«Неделю без воскресенья. Это твоя последняя цифра».",
    painting:
      "За рамой: «Этот дом — не ловушка. Это место, куда можно вернуться».",
  };
  function save() {
    try {
      localStorage.setItem("room404-v3", JSON.stringify(state));
    } catch {}
  }
  function clue(id) {
    if (!state.clues.includes(id)) {
      state.clues.push(id);
      save();
    }
  }
  function sync() {
    document.body.classList.toggle("escaped", state.escaped);
    document.getElementById("clue-count").textContent =
      state.clues.length + " / 4";
    const list = document.getElementById("clues");
    list.replaceChildren();
    if (!state.clues.length) {
      const li = document.createElement("li");
      li.textContent = "Пока пусто. Начни с письма.";
      list.append(li);
    }
    for (const id of state.clues) {
      const li = document.createElement("li");
      li.textContent = notes[id];
      list.append(li);
    }
    document.getElementById("inventory").textContent = state.escaped
      ? "ДВЕРЬ ОТКРЫТА"
      : state.key
        ? "В КАРМАНЕ: ЛАТУННЫЙ КЛЮЧ"
        : "КАРМАНЫ ПУСТЫ";
    document.getElementById("chapter").textContent = state.escaped
      ? "04 / ТЫ ДОМА"
      : state.key
        ? "03 / ВЫХОД РЯДОМ"
        : state.clues.length
          ? "02 / СЛЕДУЙ СВЕТУ"
          : "01 / ПРОБУЖДЕНИЕ";
    if (app) {
      lampLight.intensity = state.lamp ? 1.8 : 0;
      mats.bulb.emissiveIntensity = state.lamp ? 1 : 0;
      lights.key.intensity = state.lamp ? 1.8 : 0.6;
      lights.hemi.intensity = state.lamp ? 0.65 : 0.32;
      secret.visible = !state.lamp;
      doorPivot.rotation.y = state.escaped ? -Math.PI * 0.6 : 0;
      app.invalidate();
    }
  }
  function action(label, fn) {
    const b = document.createElement("button");
    b.className = "primary";
    b.textContent = label;
    b.addEventListener("click", fn);
    document.getElementById("object-actions").append(b);
  }
  function inspect(id, focus = true) {
    selected = id;
    state.visited = Array.from(new Set([...state.visited, id]));
    document
      .querySelectorAll("[data-object]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.object === id)),
      );
    document.getElementById("object-title").textContent = titles[id];
    document.getElementById("feedback").textContent = "";
    document.getElementById("object-actions").replaceChildren();
    document.getElementById("safe-form").hidden = id !== "safe" || state.key;
    let text = "";
    if (id === "letter") {
      clue(id);
      text = notes[id];
    }
    if (id === "lamp") {
      text =
        "Иногда нужно убрать свет, чтобы заметить то, что всегда было рядом.";
      action(state.lamp ? "Выключить лампу" : "Включить лампу", () => {
        state.lamp = !state.lamp;
        save();
        inspect("lamp", false);
      });
    }
    if (id === "window") {
      if (state.lamp)
        text =
          "В стекле отражается лампа. За отражением что-то написано, но разобрать невозможно.";
      else {
        clue(id);
        text = notes[id];
      }
    }
    if (id === "book") {
      clue(id);
      text = notes[id];
    }
    if (id === "painting") {
      clue(id);
      text = notes[id];
    }
    if (id === "safe") {
      text = state.key
        ? "На бархатной подкладке осталось углубление от ключа. Теперь он у тебя."
        : "Сейф ждёт четырёх цифр. В комнате есть всё, что нужно, чтобы их найти.";
    }
    if (id === "door") {
      text = state.escaped
        ? "Снаружи пахнет дождём. Ты не сбежал — ты вспомнил дорогу домой."
        : state.key
          ? "В замке подходит тот самый латунный ключ."
          : "Дверь не заперта кодом. Нужен настоящий ключ.";
      if (state.key && !state.escaped)
        action("Повернуть ключ и выйти", () => {
          state.escaped = true;
          save();
          inspect("door", false);
        });
      if (state.escaped) action("Ещё одна попытка", reset);
    }
    document.getElementById("object-text").textContent = text;
    if (app && focus) {
      const t = targets[id];
      const pos = [t[0] + 4.5, t[1] + 3.2, t[2] + 6.5];
      app.view(pos, t, 550);
    }
    sync();
  }
  function reset() {
    state = initial();
    save();
    selected = null;
    home();
    inspect("letter", false);
    document.getElementById("hint-text").textContent = "";
    document.getElementById("safe-code").value = "";
  }
  function home() {
    if (app)
      app.view(innerWidth < 700 ? [11, 10, 15] : [10, 8, 12], [0, 0.8, 0]);
  }
  document
    .querySelectorAll("[data-object]")
    .forEach((b) => (b.onclick = () => inspect(b.dataset.object)));
  document.getElementById("restart").onclick = reset;
  document.getElementById("view-home").onclick = home;
  for (const [id, dir] of [
    ["view-left", -1],
    ["view-right", 1],
  ])
    document.getElementById(id).onclick = () => {
      if (!app) return;
      const d = app.camera.position.clone().sub(app.target);
      d.applyAxisAngle(new THREE.Vector3(0, 1, 0), dir * 0.3);
      app.view(d.add(app.target).toArray(), app.target.toArray(), 300);
    };
  document.getElementById("safe-form").onsubmit = (e) => {
    e.preventDefault();
    if (document.getElementById("safe-code").value === "2736") {
      state.key = true;
      save();
      inspect("safe", false);
      document.getElementById("feedback").textContent =
        "Щелчок. Ты забрал ключ.";
    } else
      document.getElementById("feedback").textContent =
        "Замок не поддался. Первые три цифры — на окне, четвёртая — в книге.";
  };
  document.getElementById("hint").onclick = () => {
    state.hints++;
    save();
    document.getElementById("hint-text").textContent = state.escaped
      ? "Ты уже снаружи. Можно начать заново."
      : state.key
        ? "Ключ подходит к двери справа."
        : !state.clues.includes("letter")
          ? "Прочитай письмо на столе."
          : state.lamp
            ? "Выключи лампу. Потом проверь окно."
            : !state.clues.includes("window")
              ? "На стекле теперь видны три цифры."
              : !state.clues.includes("book")
                ? "В книге спрятана последняя цифра."
                : state.hints > 4
                  ? "Неделя без воскресенья — шесть дней. Код: 2736."
                  : "Соедини цифры с окна и число дней из книги.";
  };
  if (app) {
    const ray = new THREE.Raycaster(),
      pointer = new THREE.Vector2();
    canvas.addEventListener("pointerup", (e) => {
      const r = canvas.getBoundingClientRect();
      pointer.set(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, app.camera);
      const hit = ray.intersectObjects(hitboxes)[0];
      if (hit) inspect(hit.object.userData.id);
    });
  }
  sync();
  if (state.escaped) inspect("door", false);
  else if (state.key) inspect("safe", false);
  home();
  window.room404 = {
    get state() {
      return structuredClone(state);
    },
    app,
    inspect,
  };
})();
