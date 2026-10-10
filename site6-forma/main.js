(() => {
  const K = SceneKit,
    paint = document.getElementById("paint-canvas"),
    ctx = paint.getContext("2d"),
    storageKey = "forma-piece-v1";
  const glazes = { ivory: "#f3e9d8", cobalt: "#264b98", clay: "#b87352" },
    inks = ["#214caa", "#26382f", "#c66b49", "#f3e9d8"];
  let state = {
      shape: "vase",
      height: 100,
      ribs: 0,
      glaze: "ivory",
      ink: inks[0],
      size: 8,
      pattern: "waves",
      seed: 1,
      strokes: [],
    },
    redo = [],
    activeStroke = null,
    paintPointer = null,
    storageAvailable = true;
  function valid(v) {
    return (
      v &&
      ["vase", "bottle", "bowl"].includes(v.shape) &&
      Number.isFinite(v.height) &&
      v.height >= 70 &&
      v.height <= 140 &&
      Number.isFinite(v.ribs) &&
      v.ribs >= 0 &&
      v.ribs <= 8 &&
      Object.hasOwn(glazes, v.glaze) &&
      inks.includes(v.ink) &&
      Number.isFinite(v.size) &&
      v.size >= 2 &&
      v.size <= 24 &&
      ["waves", "botanical", "orbit", "blank"].includes(v.pattern) &&
      Number.isInteger(v.seed) &&
      v.seed >= 0 &&
      v.seed < 1000000 &&
      Array.isArray(v.strokes) &&
      v.strokes.length <= 40 &&
      v.strokes.every(
        (s) =>
          s &&
          inks.includes(s.color) &&
          Number.isFinite(s.size) &&
          s.size >= 2 &&
          s.size <= 24 &&
          Array.isArray(s.points) &&
          s.points.length <= 1500 &&
          s.points.every(
            (p) =>
              Array.isArray(p) &&
              p.length === 2 &&
              p.every((n) => Number.isFinite(n) && n >= 0 && n <= 1),
          ),
      )
    );
  }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (valid(saved)) state = saved;
  } catch {
    storageAvailable = false;
  }
  const texture = new THREE.CanvasTexture(paint);
  texture.encoding = THREE.sRGBEncoding;
  texture.anisotropy = 4;
  const hero = K.create(document.getElementById("hero-vessel"), {
      background: "transparent",
      position: [6, 4, 8],
      target: [0, 1.35, 0],
      fov: 34,
    }),
    preview = K.create(document.getElementById("preview-vessel"), {
      background: "transparent",
      position: [5, 3.5, 7],
      target: [0, 1.4, 0],
      fov: 36,
    });
  let objects = [],
    previewOrbit,
    heroOrbit;
  [hero, preview].filter(Boolean).forEach((app, i) => {
    app.lights({ power: 2.2, ambient: 0.75, pos: [-4, 8, 6] });
    const floor = K.mesh(
      app.scene,
      new THREE.PlaneGeometry(80, 80),
      new THREE.ShadowMaterial({color: "#343b33", opacity: .18}),
      [0, -0.015, 0],
      [-Math.PI / 2, 0, 0],
    );
    floor.castShadow = false;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.3,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    app.scene.add(mesh);
    objects.push({ app, mesh });
    const orbit = app.enableOrbit({
      radius: i ? 8 : 9,
      azimuth: 0.65,
      elevation: 0.3,
      target: [0, 1.4, 0],
      min: 5.5,
      max: 13,
    });
    if (app === hero) heroOrbit = orbit;
    else previewOrbit = orbit;
  });
  function shapeGeometry() {
    const profiles = {
      vase: [
        [0.35, 0],
        [0.57, 0.12],
        [0.84, 0.4],
        [1.05, 0.95],
        [1.04, 1.45],
        [0.89, 1.95],
        [0.57, 2.4],
        [0.5, 2.72],
        [0.57, 3],
      ],
      bottle: [
        [0.45, 0],
        [0.76, 0.15],
        [0.91, 0.7],
        [0.9, 1.6],
        [0.66, 2.1],
        [0.34, 2.45],
        [0.34, 3.1],
        [0.4, 3.22],
      ],
      bowl: [
        [0.38, 0],
        [0.6, 0.15],
        [0.86, 0.5],
        [1.15, 1.03],
        [1.36, 1.65],
      ],
    };
    const controls = profiles[state.shape],
      points = [new THREE.Vector2(0, 0)];
    const curve = new THREE.SplineCurve(
      controls.map((p) => new THREE.Vector2(p[0], p[1])),
    );
    const sampled = curve
      .getPoints(64)
      .map((p) => [
        Math.max(0.15, p.x + state.ribs * 0.009 * Math.sin(p.y * 24)),
        (Math.max(0, p.y) * state.height) / 100,
      ]);
    sampled.forEach((p) => points.push(new THREE.Vector2(...p)));
    for (let i = sampled.length - 1; i >= 1; i--) {
      const [r, y] = sampled[i];
      points.push(
        new THREE.Vector2(Math.max(0.12, r - 0.08), Math.max(0.12, y)),
      );
    }
    points.push(new THREE.Vector2(0, 0.12));
    const geometry = new THREE.LatheGeometry(points, 80);
    const positions = geometry.attributes.position, uv = geometry.attributes.uv;
    const top = sampled.at(-1)[1];
    for (let i = 0; i < uv.count; i++) uv.setY(i, Math.min(1, positions.getY(i) / top));
    uv.needsUpdate = true;
    return geometry;
  }
  let morphFrame = 0;
  function rebuild(animate = false) {
    cancelAnimationFrame(morphFrame);
    const transitions = [];
    objects.forEach((o) => {
      const next = shapeGeometry(),
        old = o.mesh.geometry.getAttribute("position");
      if (
        animate &&
        !K.reduced &&
        old &&
        old.count === next.getAttribute("position").count
      ) {
        transitions.push({
          o,
          from: old.array.slice(),
          to: next.getAttribute("position").array.slice(),
        });
        next.getAttribute("position").array.set(old.array);
      }
      o.mesh.geometry.dispose();
      o.mesh.geometry = next;
      o.app.invalidate();
    });
    if (!transitions.length) return;
    const start = performance.now();
    function frame(now) {
      const t = Math.min(1, (now - start) / 500),
        ease = 1 - Math.pow(1 - t, 3);
      transitions.forEach(({ o, from, to }) => {
        const position = o.mesh.geometry.getAttribute("position");
        for (let i = 0; i < position.array.length; i++)
          position.array[i] = from[i] + (to[i] - from[i]) * ease;
        position.needsUpdate = true;
        o.mesh.geometry.computeVertexNormals();
        o.app.invalidate();
      });
      if (t < 1) morphFrame = requestAnimationFrame(frame);
    }
    morphFrame = requestAnimationFrame(frame);
  }
  function renderPaint() {
    ctx.fillStyle = glazes[state.glaze];
    ctx.fillRect(0, 0, 512, 512);
    const ink = state.glaze === "ivory" ? "#214caa" : "#f3e9d8";
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const shift = (state.seed % 5) * 9;
    if (state.pattern === "waves") {
      ctx.lineWidth = 6;
      for (let row = 0; row < 6; row++) {
        ctx.beginPath();
        for (let x = 0; x <= 512; x += 4) {
          const y =
            55 +
            row * 78 +
            Math.sin(((x + shift) / 512) * Math.PI * (4 + (state.seed % 3))) *
              (17 + (state.seed % 4) * 3);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    if (state.pattern === "botanical") {
      ctx.lineWidth = 3;
      for (let branch = 0; branch < 4 + (state.seed % 3); branch++) {
        const x =
          branch * (512 / (4 + (state.seed % 3))) + 8 + (state.seed % 4) * 4;
        ctx.beginPath();
        ctx.moveTo(x, 460);
        ctx.bezierCurveTo(x + 30, 320, x + 65, 190, x + 40, 55);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
          const y = 110 + i * 53,
            side = i % 2 ? 1 : -1;
          ctx.beginPath();
          ctx.ellipse(x + 40 + side * 17, y, 9, 24, side * 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (state.pattern === "orbit") {
      ctx.lineWidth = 4;
      for (let row = 0; row < 3; row++)
        for (let col = 0; col < 3; col++) {
          ctx.beginPath();
          ctx.ellipse(
            86 + col * 170,
            86 + row * 170,
            59,
            28,
            0.35 + (state.seed % 4) * 0.15,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(
            86 + col * 170,
            86 + row * 170,
            24,
            57,
            -0.45,
            0,
            Math.PI * 2,
          );
          ctx.stroke();
        }
    }
    for (const s of [
      ...state.strokes,
      ...(activeStroke ? [activeStroke] : []),
    ]) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = s.size;
      if (s.points.length === 1) {
        ctx.beginPath();
        ctx.arc(
          s.points[0][0] * 512,
          s.points[0][1] * 512,
          s.size / 2,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      } else {
        ctx.beginPath();
        s.points.forEach((p, i) =>
          i
            ? ctx.lineTo(p[0] * 512, p[1] * 512)
            : ctx.moveTo(p[0] * 512, p[1] * 512),
        );
        ctx.stroke();
      }
    }
    texture.needsUpdate = true;
    objects.forEach((o) => o.app.invalidate());
    document.getElementById("undo").disabled = state.strokes.length === 0;
    document.getElementById("redo").disabled = redo.length === 0;
  }
  function sync() {
    document.querySelectorAll("[data-shape]").forEach((b) => {
      const active = b.dataset.shape === state.shape;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-pattern]").forEach((b) => {
      const active = b.dataset.pattern === state.pattern;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll("[data-ink]").forEach((b) => {
      const active = b.dataset.ink === state.ink;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    document.getElementById("height").value = state.height;
    document.getElementById("height-label").textContent = state.height + "%";
    document.getElementById("ribs").value = state.ribs;
    document.getElementById("ribs-label").textContent = state.ribs
      ? "Выраженность " + state.ribs
      : "Гладкий";
    document.getElementById("brush-size").value = state.size;
    document.getElementById("brush-label").textContent = state.size + " px";
    document.getElementById("glaze").value = state.glaze;
    document.getElementById("new-variation").disabled =
      state.pattern === "blank";
    const name = { vase: "Ваза", bottle: "Бутыль", bowl: "Чаша" }[state.shape];
    document.getElementById("form-name").textContent = name.toUpperCase();
    document.getElementById("object-summary").textContent =
      `${name} · высота ${state.height}% · ${state.ribs ? "рельеф " + state.ribs : "гладкая поверхность"}`;
    if (!storageAvailable)
      document.getElementById("studio-status").textContent =
        "Хранилище недоступно. Работа останется в этой вкладке; скачай рисунок.";
    renderPaint();
  }
  function point(e) {
    const r = paint.getBoundingClientRect();
    return [
      Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    ];
  }
  paint.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || activeStroke) return;
    e.preventDefault();
    if (state.strokes.length >= 40) {
      document.getElementById("studio-status").textContent =
        "На листе уже 40 штрихов. Отмени лишний штрих или скачай рисунок и начни заново.";
      return;
    }
    paintPointer = e.pointerId;
    activeStroke = { color: state.ink, size: state.size, points: [point(e)] };
    paint.setPointerCapture(e.pointerId);
    renderPaint();
  });
  let paintFrame = 0;
  paint.addEventListener("pointermove", (e) => {
    if (!activeStroke || e.pointerId !== paintPointer) return;
    if (activeStroke.points.length < 1500) activeStroke.points.push(point(e));
    if (!paintFrame)
      paintFrame = requestAnimationFrame(() => {
        paintFrame = 0;
        renderPaint();
      });
  });
  function endStroke(e) {
    if (!activeStroke || (e && e.pointerId !== paintPointer)) return;
    state.strokes.push(activeStroke);
    activeStroke = null;
    paintPointer = null;
    redo = [];
    renderPaint();
  }
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
    paint.addEventListener(name, endStroke),
  );
  document.getElementById("undo").addEventListener("click", () => {
    if (state.strokes.length) redo.push(state.strokes.pop());
    renderPaint();
  });
  document.getElementById("redo").addEventListener("click", () => {
    if (redo.length && state.strokes.length < 40)
      state.strokes.push(redo.pop());
    renderPaint();
  });
  document.getElementById("clear-paint").addEventListener("click", () => {
    state.pattern = "blank";
    state.strokes = [];
    redo = [];
    activeStroke = null;
    sync();
  });
  document.querySelectorAll("[data-shape]").forEach((b) =>
    b.addEventListener("click", () => {
      state.shape = b.dataset.shape;
      rebuild(true);
      sync();
    }),
  );
  document.querySelectorAll("[data-pattern]").forEach((b) =>
    b.addEventListener("click", () => {
      state.pattern = b.dataset.pattern;
      sync();
    }),
  );
  document.querySelectorAll("[data-ink]").forEach((b) =>
    b.addEventListener("click", () => {
      state.ink = b.dataset.ink;
      sync();
    }),
  );
  document.getElementById("height").addEventListener("input", (e) => {
    state.height = Number(e.target.value);
    rebuild();
    sync();
  });
  document.getElementById("ribs").addEventListener("input", (e) => {
    state.ribs = Number(e.target.value);
    rebuild();
    sync();
  });
  document.getElementById("brush-size").addEventListener("input", (e) => {
    state.size = Number(e.target.value);
    sync();
  });
  document.getElementById("glaze").addEventListener("change", (e) => {
    state.glaze = e.target.value;
    sync();
  });
  document.getElementById("new-variation").addEventListener("click", () => {
    state.seed = (state.seed + 1) % 1000000;
    sync();
  });
  document.querySelectorAll("[data-object-view]").forEach((b) =>
    b.addEventListener("click", () => {
      if (!previewOrbit) return;
      if (b.dataset.objectView === "reset") previewOrbit.reset();
      else previewOrbit.step(b.dataset.objectView);
    }),
  );
  document.getElementById("save-piece").addEventListener("click", () => {
    endStroke();
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
      document.getElementById("studio-status").textContent =
        "Работа сохранена. Форма и каждый штрих будут ждать тебя при следующем открытии.";
    } catch {
      storageAvailable = false;
      sync();
    }
  });
  document.getElementById("export-pattern").addEventListener("click", () => {
    endStroke();
    K.downloadCanvas(paint, "forma-pattern.png");
  });
  // The hero slowly turns with the first screen's natural scroll; drawing remains direct.
  let scrollFrame = 0;
  addEventListener(
    "scroll",
    () => {
      if (K.reduced || !objects.length || scrollFrame) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        objects[0].mesh.rotation.y = Math.min(1, scrollY / innerHeight) * 0.8;
        objects[0].app.invalidate();
      });
    },
    { passive: true },
  );
  rebuild();
  sync();
  window.forma = {
    get state() {
      return state;
    },
    hero,
    preview,
    valid,
  };
})();
