(() => {
  const K = SceneKit,
    canvas = document.getElementById("ocean-canvas"),
    story = document.getElementById("mission");
  const chapters = [
    {
      name: "Поверхность",
      title: "Вниз,\nк невидимому.",
      description:
        "Один аппарат, пять остановок. Прокрути страницу, чтобы уйти с поверхности и собрать историю глубины.",
      action: "Подготовить аппарат",
      result: "Аппарат подготовлен. Первая запись появилась в журнале.",
      note: "Проверены обзорная сфера, свет и контейнер для образцов. Маршрут готов.",
      depth: 0,
    },
    {
      name: "Сумерки",
      title: "Поверхность\nстала воспоминанием.",
      description:
        "Солнечный свет остаётся наверху. Проверь связь перед следующим участком маршрута.",
      action: "Проверить связь",
      result: "Связь установлена. Можно продолжать погружение.",
      note: "Установлен канал связи с поверхностью. В модели сигнал проходит через буи маршрута.",
      depth: 600,
    },
    {
      name: "Свет",
      title: "Здесь темнота\nумеет светиться.",
      description:
        "Перед аппаратом появилась колония светящихся форм. Подсвети её мягко и сохрани наблюдение.",
      action: "Наблюдать колонию",
      result: "Колония отмечена. Светящиеся формы появились рядом с аппаратом.",
      note: "Зафиксирован рисунок светящейся колонии. Это художественные формы, созданные для экспедиции.",
      depth: 1400,
    },
    {
      name: "Дно",
      title: "У каждого следа\nесть история.",
      description:
        "На дне лежит слоистый фрагмент. Направь манипулятор и добавь его в контейнер.",
      action: "Взять образец",
      result: "Образец в контейнере. Манипулятор закончил работу.",
      note: "В контейнер помещён условный минеральный фрагмент. Наблюдение: слои и различие оттенков.",
      depth: 2400,
    },
    {
      name: "Возвращение",
      title: "Глубина остаётся.\nТы возвращаешься.",
      description:
        "Подготовь маршрут наверх. Самое важное теперь — собрать наблюдения в одну историю.",
      action: "Завершить маршрут",
      result: "Маршрут завершён. Журнал готов к скачиванию ниже.",
      note: "Аппарат вернулся к поверхности. Доступные наблюдения собраны в журнал экспедиции.",
      depth: 0,
    },
  ];
  let completed = new Set(),
    storageAvailable = true,
    current = -1,
    progress = 0;
  const storageKey = "abyss-expedition-v1";
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    if (Array.isArray(saved))
      saved
        .filter((n) => Number.isInteger(n) && n >= 0 && n < 5)
        .forEach((n) => completed.add(n));
  } catch {
    storageAvailable = false;
  }
  const app = K.create(canvas, {
    background: "#0d3543",
    position: [9, 4.5, 14],
    target: [0, 0, 0],
    fov: 41,
    shadows: false,
  });
  let sub, terrain, colony, sample, arm, beam, headlight, particles, ambient;
  function build() {
    const s = app.scene;
    s.fog = new THREE.FogExp2("#0d3543", 0.025);
    ambient = new THREE.HemisphereLight("#86bbcb", "#061820", 1.4);
    s.add(ambient);
    const key = new THREE.DirectionalLight("#c3e6ef", 2);
    key.position.set(-5, 10, 8);
    s.add(key);
    sub = new THREE.Group();
    sub.position.set(2, 0, 0);
    sub.rotation.y = -0.48;
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
    headlight = new THREE.SpotLight("#c7e2ca", 8, 20, 0.45, 0.8, 1);
    headlight.position.set(3, -0.4, 0);
    headlight.target.position.set(7, -4, 0);
    s.add(headlight, headlight.target);
    beam = K.mesh(
      sub,
      new THREE.ConeGeometry(2.2, 8, 40, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#bad8b7",
        transparent: true,
        opacity: 0.055,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      [5, -1.8, 0],
      [0, 0, Math.PI / 2 - 0.3],
    );
    terrain = new THREE.Group();
    terrain.position.y = -8;
    s.add(terrain);
    const seabed = new THREE.PlaneGeometry(65, 45, 45, 30);
    const pos = seabed.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        y = pos.getY(i);
      pos.setZ(
        i,
        Math.sin(x * 0.6) * Math.cos(y * 0.5) * 0.5 +
          Math.sin(x * 0.21 + y * 0.31) * 0.8,
      );
    }
    seabed.computeVertexNormals();
    K.mesh(
      terrain,
      seabed,
      K.material("#27413d", { flatShading: true }),
      [0, 0, 0],
      [-Math.PI / 2, 0, 0],
    );
    let seed = 341;
    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    for (let i = 0; i < 38; i++) {
      const m = K.mesh(
        terrain,
        new THREE.DodecahedronGeometry(0.4 + random() * 0.8, 0),
        K.material(i % 2 ? "#3d5850" : "#526059", { flatShading: true }),
        [(random() - 0.5) * 34, 0.25, (random() - 0.5) * 22],
      );
      m.scale.set(1 + random(), 0.6 + random(), 1 + random());
      m.rotation.set(random(), random(), random());
    }
    colony = new THREE.Group();
    colony.position.set(4, -1.8, 2);
    s.add(colony);
    for (let i = 0; i < 14; i++) {
      const x = (random() - 0.5) * 4,
        z = (random() - 0.5) * 2,
        height = 0.4 + random() * 1.2;
      K.cylinder(colony, 0.018, 0.025, height, K.material("#406f65"), [
        x,
        height / 2,
        z,
      ]);
      const glow = K.material("#b4d9bd", {
        emissive: K.color("#81dbb1"),
        emissiveIntensity: 1.2,
      });
      const cap = K.sphere(colony, 0.22, glow, [x, height, z], [1, 0.4, 1]);
      K.mesh(
        colony,
        new THREE.TorusGeometry(0.18, 0.018, 8, 20),
        glow,
        [x, height - 0.035, z],
        [Math.PI / 2, 0, 0],
      );
    }
    sample = K.mesh(
      sub,
      new THREE.IcosahedronGeometry(0.24, 0),
      K.material("#b6ad83", { flatShading: true }),
      [0.45, -0.95, 1.22],
    );
    const points = new Float32Array(330 * 3);
    for (let i = 0; i < points.length; i++) points[i] = (random() - 0.5) * 38;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    particles = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: "#bfdcdb",
        size: 0.035,
        transparent: true,
        opacity: 0.3,
      }),
    );
    s.add(particles);
  }
  if (app) build();
  function renderScene() {
    if (!app) return;
    const phase = Math.min(4, progress * 5),
      idx = Math.min(4, Math.floor(phase)),
      fraction = phase - idx;
    const colors = ["#0d3543", "#082632", "#061c28", "#081b21", "#15414c"];
    const a = K.color(colors[idx]),
      b = K.color(colors[Math.min(4, idx + 1)]);
    app.scene.background.copy(a.lerp(b, fraction));
    app.scene.fog.color.copy(app.scene.background);
    sub.rotation.y = -0.48 + Math.sin(phase * 0.8) * 0.23;
    sub.rotation.z = phase < 4 ? -0.09 * Math.sin(phase) : 0.08;
    sub.position.y = Math.sin(phase * 1.2) * 0.22;
    terrain.position.y = -9 + Math.min(phase / 3, 1) * 6;
    terrain.visible = phase > 1.6;
    terrain.traverse((o) => {
      if (o.material) {
        o.material.transparent = true;
        o.material.opacity = Math.max(0, Math.min(1, (phase - 1.6) / 1.1));
      }
    });
    colony.visible = idx === 2 || idx === 3;
    colony.children.forEach((o, i) => (o.scale.y = completed.has(2) ? 1 : 0.5));
    sample.visible = completed.has(3);
    arm.rotation.z = completed.has(3) ? -0.6 : 0;
    particles.position.y = (phase * 2) % 6;
    beam.visible = idx > 0 && idx < 4;
    ambient.intensity = idx === 0 || idx === 4 ? 1.4 : 0.85;
    app.invalidate();
  }
  function renderChapter(index) {
    if (current === index) return;
    current = index;
    const c = chapters[index];
    document.getElementById("chapter-number").textContent =
      `0${index + 1} / ${c.name.toUpperCase()}`;
    const title = document.getElementById("chapter-title");
    title.replaceChildren();
    c.title.split("\n").forEach((line, i) => {
      if (i) title.append(document.createElement("br"));
      title.append(document.createTextNode(line));
    });
    document.getElementById("chapter-description").textContent = c.description;
    const text = document.getElementById("chapter-text");
    text.classList.remove("changing");
    if (!K.reduced) {
      void text.offsetWidth;
      text.classList.add("changing");
    }
    updateAction();
    document.querySelectorAll("[data-chapter]").forEach((b) => {
      const active = Number(b.dataset.chapter) === index;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
  }
  function updateAction() {
    const done = completed.has(current),
      button = document.getElementById("chapter-action");
    button.textContent = done
      ? "Запись сохранена ✓"
      : chapters[current].action + " ↗";
    button.disabled = done;
    document.getElementById("action-status").textContent = done
      ? chapters[current].result
      : "";
  }
  function renderJournal() {
    document.getElementById("journal-progress").textContent =
      `ЗАПИСЕЙ: ${completed.size} / 5`;
    const list = document.getElementById("journal-entries");
    list.replaceChildren();
    chapters.forEach((c, i) => {
      const done = completed.has(i),
        li = document.createElement("li");
      li.className = done ? "" : "pending";
      const num = document.createElement("span");
      num.className = "mono";
      num.textContent = `0${i + 1}`;
      const body = document.createElement("div"),
        h = document.createElement("h3");
      h.textContent = c.name;
      const p = document.createElement("p");
      p.textContent = done ? c.note : "Эта остановка ещё ждёт твоего действия.";
      body.append(h, p);
      const status = document.createElement("span");
      status.className = "status";
      status.textContent = done ? "ЗАПИСАНО ✓" : "НЕ ПРОЙДЕНО";
      li.append(num, body, status);
      list.append(li);
    });
    document.getElementById("export-log").disabled = completed.size === 0;
    if (!storageAvailable)
      document.getElementById("journal-status").textContent =
        "Хранилище недоступно. Записи доступны в этой вкладке; скачай журнал, чтобы сохранить их.";
  }
  function persist() {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...completed]));
    } catch {
      storageAvailable = false;
    }
  }
  function onScroll() {
    if (app && innerWidth < 650) app.view([9, 5.5, 14], [0, 3.9, 0], 0);
    else if (app) app.view([9, 4.5, 14], [0, 0, 0], 0);
    const r = story.getBoundingClientRect();
    progress = Math.max(0, Math.min(1, -r.top / (r.height - innerHeight)));
    const index = Math.min(4, Math.floor(progress * 5));
    renderChapter(index);
    const depth =
      index === 4
        ? Math.round(2400 * (1 - (progress - 0.8) / 0.2))
        : Math.round((progress / 0.8) * 2400);
    document.getElementById("depth-value").textContent = String(
      Math.max(0, depth),
    ).padStart(4, "0");
    document.getElementById("depth-fill").style.height = progress * 100 + "%";
    document.getElementById("scroll-hint").textContent =
      index === 4
        ? "ПРОКРУТИ К ЖУРНАЛУ ЭКСПЕДИЦИИ ↓"
        : "ПРОКРУТИ, ЧТОБЫ ПОГРУЗИТЬСЯ ↓";
    renderScene();
  }
  let scrollFrame = 0;
  addEventListener(
    "scroll",
    () => {
      if (!scrollFrame)
        scrollFrame = requestAnimationFrame(() => {
          scrollFrame = 0;
          onScroll();
        });
    },
    { passive: true },
  );
  addEventListener("resize", onScroll);
  document.querySelectorAll("[data-chapter]").forEach((b) =>
    b.addEventListener("click", () => {
      const r = story.getBoundingClientRect(),
        max = r.height - innerHeight;
      scrollTo({
        top: scrollY + r.top + ((Number(b.dataset.chapter) + 0.08) / 5) * max,
        behavior: K.reduced ? "instant" : "smooth",
      });
    }),
  );
  document.getElementById("chapter-action").addEventListener("click", () => {
    completed.add(current);
    persist();
    updateAction();
    renderJournal();
    renderScene();
  });
  document
    .getElementById("export-log")
    .addEventListener("click", () =>
      K.download(
        "abyss-expedition.txt",
        "ABYSS — журнал вымышленной экспедиции\n\n" +
          chapters
            .map(
              (c, i) =>
                `${i + 1}. ${c.name}\n${completed.has(i) ? c.note : "Не пройдено."}`,
            )
            .join("\n\n") +
          "\n\nХудожественная модель; маршрут, аппарат и наблюдения вымышлены.\n",
        "text/plain;charset=utf-8",
      ),
    );
  document.getElementById("reset-log").addEventListener("click", () => {
    completed.clear();
    persist();
    renderJournal();
    updateAction();
    renderScene();
    document.getElementById("journal-status").textContent = storageAvailable
      ? "Журнал очищен. Можно пройти маршрут заново."
      : "Журнал очищен в этой вкладке. Хранилище недоступно.";
  });
  onScroll();
  renderJournal();
  window.abyss = {
    get current() {
      return current;
    },
    get completed() {
      return [...completed];
    },
    app,
    onScroll,
  };
})();
