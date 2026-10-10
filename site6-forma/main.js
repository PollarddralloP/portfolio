(() => {
  const K = SceneKit,
    canvas = document.getElementById("flux-canvas"),
    app = K.create(canvas, {
      background: "#e6e8df",
      position: [13, 14, 20],
      target: [0, 2, 0],
      fov: 39,
    });
  const colors = ["#c4482e", "#edb945", "#2c657b", "#49614b", "#ddd8b3"];
  let bodies = [],
    lines = [],
    preset = "cradle",
    tool = "grab",
    running = true,
    gravity = 9.8,
    bounce = 0.98,
    last = 0,
    acc = 0,
    raf = 0,
    held = null,
    pointer = null,
    active = false,
    stroke = null,
    previousPoint = null,
    cameraSide = 0,
    seed = 42,
    frameCount = 0;
  const ray = new THREE.Raycaster(),
    mouse = new THREE.Vector2(),
    plane = new THREE.Plane(),
    hit = new THREE.Vector3();
  let frame, orbitMark;
  function random() {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  function dispose(m) {
    app.scene.remove(m);
    m.geometry.dispose();
    if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
    else m.material.dispose();
  }
  function sphere(x, y, z, r = 0.55, v = [0, 0, 0], anchor = null) {
    if (!app || bodies.length >= 80) {
      document.getElementById("status").textContent =
        "80 объектов — предел сцены. Сбрось её для нового рисунка.";
      return null;
    }
    const mesh = K.sphere(
      app.scene,
      r,
      K.material(colors[bodies.length % colors.length], {
        roughness: 0.24,
        metalness: 0.16,
      }),
      [x, y, z],
    );
    const b = {
      mesh,
      p: new THREE.Vector3(x, y, z),
      v: new THREE.Vector3(...v),
      r,
      mass: r * r * r,
      anchor: anchor ? new THREE.Vector3(...anchor) : null,
      length: 5,
    };
    if (anchor) {
      b.length = b.p.distanceTo(b.anchor);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([b.anchor, b.p]),
        new THREE.LineBasicMaterial({ color: "#565e52" }),
      );
      app.scene.add(line);
      b.line = line;
    }
    bodies.push(b);
    return b;
  }
  function setup() {
    app.lights({
      sun: "#fff4d4",
      power: 2.7,
      ambient: 0.85,
      pos: [-8, 16, 10],
    });
    K.box(app.scene, [17, 0.3, 12], K.material("#d5d9cd"), [0, -0.2, 0]);
    for (const z of [-6, 6])
      K.box(app.scene, [17, 0.35, 0.12], K.material("#f5f1df"), [0, 0.1, z]);
    for (const x of [-8.5, 8.5])
      K.box(app.scene, [0.12, 0.35, 12], K.material("#f5f1df"), [x, 0.1, 0]);
    const marks = K.texture((c, w, h) => {
      c.fillStyle = "#d5d9cd";
      c.fillRect(0, 0, w, h);
      c.strokeStyle = "#bbc3b2";
      c.lineWidth = 1;
      for (let i = 0; i <= 12; i++) {
        c.beginPath();
        c.moveTo((i * w) / 12, 0);
        c.lineTo((i * w) / 12, h);
        c.stroke();
        c.beginPath();
        c.moveTo(0, (i * h) / 12);
        c.lineTo(w, (i * h) / 12);
        c.stroke();
      }
      c.strokeStyle = "#f3f2e8";
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(w / 2, h / 2, w * 0.33, h * 0.33, 0, 0, Math.PI * 2);
      c.stroke();
      c.font = "18px monospace";
      c.fillStyle = "#65765f";
      c.fillText("FLUX / EXPERIMENT FLOOR", 30, h - 30);
    });
    K.mesh(
      app.scene,
      new THREE.PlaneGeometry(16.9, 11.9),
      new THREE.MeshStandardMaterial({ map: marks, roughness: 0.9 }),
      [0, -0.035, 0],
      [-Math.PI / 2, 0, 0],
    );
    frame = new THREE.Group();
    app.scene.add(frame);
    const chrome = K.material("#687369", { metalness: 0.65, roughness: 0.3 });
    for (const x of [-3.5, 3.5]) {
      K.cylinder(frame, 0.07, 0.07, 8, chrome, [x, 4, -1.4]);
      K.box(frame, [1.1, 0.15, 3], chrome, [x, 0.04, -1.4]);
    }
    K.cylinder(
      frame,
      0.09,
      0.09,
      7.1,
      chrome,
      [0, 8, -1.4],
      [0, 0, Math.PI / 2],
    );
    orbitMark = K.mesh(
      app.scene,
      new THREE.TorusGeometry(0.75, 0.06, 12, 48),
      K.material("#c4482e", {
        emissive: K.color("#c4482e"),
        emissiveIntensity: 0.1,
      }),
      [0, 0.06, 0],
      [Math.PI / 2, 0, 0],
    );
  }
  function clear() {
    held = null;
    active = false;
    stroke = null;
    previousPoint = null;
    for (const b of bodies) {
      dispose(b.mesh);
      if (b.line) dispose(b.line);
    }
    bodies = [];
    for (const l of lines) dispose(l);
    lines = [];
  }
  const descriptions = {
    cradle: "Подними крайний шар и отпусти.\nУдар доберётся до другого края.",
    avalanche: "Нарушь равновесие пирамиды.\nОдин шар сдвинет остальные.",
    orbit:
      "Гравитации нет. Центр притягивает.\nПроведи магнитом — измени орбиту.",
    empty: "Пустая сцена — тоже начало.\nБросай шары или рисуй движением.",
  };
  function load(id) {
    if (!app) return;
    clear();
    preset = id;
    seed = 42;
    gravity = id === "orbit" ? 0 : 9.8;
    bounce = id === "cradle" ? 0.98 : 0.82;
    frame.visible = id === "cradle";
    orbitMark.visible = id === "orbit";
    document.getElementById("gravity").value = gravity;
    document.getElementById("bounce").value = bounce;
    document.getElementById("gravity-value").textContent = gravity.toFixed(1);
    document.getElementById("bounce-value").textContent = bounce.toFixed(2);
    document
      .querySelectorAll("[data-preset]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.preset === id)),
      );
    document.getElementById("scene-note").textContent = descriptions[id];
    if (id === "cradle") {
      for (let i = 0; i < 5; i++)
        sphere(
          (i - 2) * 1.11,
          3,
          -1.4,
          0.55,
          [0, 0, 0],
          [(i - 2) * 1.11, 8, -1.4],
        );
    }
    if (id === "avalanche") {
      for (let layer = 0; layer < 4; layer++)
        for (let x = 0; x < 4 - layer; x++)
          for (let z = 0; z < 4 - layer; z++)
            sphere(
              (x - (3 - layer) / 2) * 1.12,
              0.56 + layer * 0.94,
              (z - (3 - layer) / 2) * 1.12,
              0.55,
            );
      sphere(-4, 7, 0, 0.8, [2, 0, 0]);
    }
    if (id === "orbit") {
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16,
          r = 2.7 + random() * 2;
        sphere(
          Math.cos(a) * r,
          1.2 + random() * 2,
          Math.sin(a) * r,
          0.23 + random() * 0.17,
          [-Math.sin(a) * 3, 0, Math.cos(a) * 3],
        );
      }
    }
    setTool(id === "empty" ? "paint" : "grab");
    document.getElementById("status").textContent =
      id === "cradle"
        ? "Возьми крайний шар и отпусти, или нажми «Толчок»."
        : id === "orbit"
          ? "Держи магнит на сцене. «Толкать» отталкивает шары от пальца."
          : "Нажимай на сцену, бросай объекты, меняй гравитацию.";
    render();
  }
  function setTool(id) {
    tool = id;
    document.body.dataset.tool = id;
    document
      .querySelectorAll("button[data-tool]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.tool === id)),
      );
  }
  function physics(dt) {
    const delta = new THREE.Vector3();
    for (const b of bodies) {
      if (b === held) continue;
      b.v.y -= gravity * dt;
      if (preset === "orbit") {
        delta.copy(b.p).multiplyScalar(-1);
        delta.y = 0;
        const d = Math.max(1, delta.length());
        b.v.addScaledVector(delta, (7 / (d * d)) * dt);
      }
      if (active && pointer && ["magnet", "repel"].includes(tool)) {
        delta.copy(pointer).sub(b.p);
        const d = Math.max(0.8, delta.length());
        b.v.addScaledVector(
          delta,
          (((tool === "magnet" ? 1 : -1) * 55) / (d * d)) * dt,
        );
      }
      b.v.multiplyScalar(Math.pow(0.998, dt * 120));
      b.p.addScaledVector(b.v, dt);
      if (b.anchor) {
        delta.copy(b.p).sub(b.anchor).normalize();
        b.p.copy(b.anchor).addScaledVector(delta, b.length);
        b.v.addScaledVector(delta, -b.v.dot(delta));
      }
      for (const axis of ["x", "z"]) {
        const lim = (axis === "x" ? 8.4 : 5.9) - b.r;
        if (Math.abs(b.p[axis]) > lim) {
          b.p[axis] = Math.sign(b.p[axis]) * lim;
          b.v[axis] *= -bounce;
        }
      }
      if (b.p.y < b.r) {
        b.p.y = b.r;
        if (b.v.y < 0) b.v.y *= -bounce;
        b.v.x *= 0.985;
        b.v.z *= 0.985;
      }
      if (b.p.y > 12) {
        b.p.y = 12;
        b.v.y = -Math.abs(b.v.y) * bounce;
      }
    }
    // Pair impulses conserve momentum; overlap correction is weighted by mass.
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < bodies.length; i++)
        for (let j = i + 1; j < bodies.length; j++) {
          const a = bodies[i],
            b = bodies[j];
          delta.copy(b.p).sub(a.p);
          const d = delta.length(),
            sum = a.r + b.r;
          if (d >= sum) continue;
          const n =
            d > 1e-6 ? delta.multiplyScalar(1 / d) : new THREE.Vector3(1, 0, 0);
          const ia = a === held ? 0 : 1 / a.mass,
            ib = b === held ? 0 : 1 / b.mass,
            total = ia + ib;
          if (!total) continue;
          const correction = (Math.max(0, sum - d - 0.001) * 0.8) / total;
          a.p.addScaledVector(n, -correction * ia);
          b.p.addScaledVector(n, correction * ib);
          const rel = b.v.clone().sub(a.v).dot(n);
          if (rel < 0) {
            const impulse = (-(1 + bounce) * rel) / total;
            a.v.addScaledVector(n, -impulse * ia);
            b.v.addScaledVector(n, impulse * ib);
          }
        }
    for (const b of bodies) {
      if (b.anchor && b !== held) {
        delta.copy(b.p).sub(b.anchor).normalize();
        b.p.copy(b.anchor).addScaledVector(delta, b.length);
        b.v.addScaledVector(delta, -b.v.dot(delta));
      }
      if (!Number.isFinite(b.p.x) || !Number.isFinite(b.v.x)) {
        b.p.set(0, 3, 0);
        b.v.set(0, 0, 0);
      }
    }
  }
  function render() {
    if (!app) return;
    for (const b of bodies) {
      b.mesh.position.copy(b.p);
      if (b.line) {
        b.line.geometry.setFromPoints([b.anchor, b.p]);
        b.line.geometry.attributes.position.needsUpdate = true;
      }
    }
    document.getElementById("count").textContent = bodies.length;
    document.getElementById("energy").textContent = bodies
      .reduce((n, b) => n + 0.5 * b.mass * b.v.lengthSq(), 0)
      .toFixed(2);
    app.invalidate();
  }
  function loop(now) {
    raf = 0;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (running && !document.hidden) {
      acc += dt;
      let steps = 0;
      while (acc >= 1 / 120 && steps < 8) {
        physics(1 / 120);
        acc -= 1 / 120;
        steps++;
      }
      render();
    }
    if (!document.hidden) raf = requestAnimationFrame(loop);
  }
  function toggle() {
    running = !running;
    document.getElementById("play").textContent = running
      ? "Пауза"
      : "Запустить";
    document
      .getElementById("play")
      .setAttribute("aria-pressed", String(!running));
    last = 0;
  }
  function point(e, height = 1.5) {
    const r = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(mouse, app.camera);
    plane.set(new THREE.Vector3(0, 1, 0), -height);
    const p = ray.ray.intersectPlane(plane, hit);
    if (!p) return null;
    return new THREE.Vector3(
      Math.max(-7.7, Math.min(7.7, p.x)),
      Math.max(0.4, Math.min(10, p.y)),
      Math.max(-5.3, Math.min(5.3, p.z)),
    );
  }
  function drop(p, r = 0.5) {
    if (!p) return;
    sphere(p.x, 7 + random() * 2, p.z, r, [random() - 0.5, 0, random() - 0.5]);
    render();
  }
  function paint(p) {
    if (!p) return;
    if (!previousPoint || p.distanceTo(previousPoint) > 0.65) {
      drop(p, 0.23);
      previousPoint = p.clone();
      if (stroke) {
        const points = stroke.userData.points;
        points.push(new THREE.Vector3(p.x, 0.04, p.z));
        stroke.geometry.setFromPoints(points);
      }
      render();
    }
  }
  if (app) {
    setup();
    load("cradle");
    raf = requestAnimationFrame(loop);
    canvas.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      active = true;
      pointer = point(e);
      if (tool === "grab") {
        const intersections = ray.intersectObjects(bodies.map((b) => b.mesh));
        held = intersections.length
          ? bodies.find((b) => b.mesh === intersections[0].object)
          : null;
        if (held) {
          held.v.set(0, 0, 0);
          pointer = point(e, held.p.y);
          held.userTime = performance.now();
          held.old = held.p.clone();
          document.getElementById("status").textContent =
            "Отпусти — и движение продолжится.";
        } else
          document.getElementById("status").textContent =
            "Выбери шар. Или переключись на «Бросать» / «Рисовать».";
      }
      if (tool === "drop") drop(pointer);
      if (tool === "paint") {
        previousPoint = null;
        stroke = new THREE.Line(
          new THREE.BufferGeometry(),
          new THREE.LineBasicMaterial({ color: "#c4482e" }),
        );
        stroke.userData.points = [];
        app.scene.add(stroke);
        lines.push(stroke);
        paint(pointer);
      }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!active) return;
      pointer = point(e, held ? held.p.y : 1.5);
      if (held && pointer) {
        const old = held.p.clone();
        const t = performance.now(),
          dt = Math.max(0.016, (t - held.userTime) / 1000);
        held.p.copy(pointer);
        if (held.anchor) {
          const d = held.p.clone().sub(held.anchor).normalize();
          held.p.copy(held.anchor).addScaledVector(d, held.length);
        }
        held.v
          .copy(held.p)
          .sub(old)
          .multiplyScalar(1 / dt)
          .clampLength(0, 15);
        held.userTime = t;
        render();
      }
      if (tool === "paint") paint(pointer);
    });
    function release() {
      active = false;
      held = null;
      stroke = null;
      previousPoint = null;
    }
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((n) =>
      canvas.addEventListener(n, release),
    );
  }
  document
    .querySelectorAll("[data-preset]")
    .forEach((b) => (b.onclick = () => load(b.dataset.preset)));
  document
    .querySelectorAll("button[data-tool]")
    .forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  document.getElementById("play").onclick = toggle;
  document.getElementById("step").onclick = () => {
    if (running) toggle();
    for (let i = 0; i < 12; i++) physics(1 / 120);
    render();
  };
  document.getElementById("reset").onclick = () => load(preset);
  document.getElementById("gravity").oninput = (e) => {
    gravity = +e.target.value;
    document.getElementById("gravity-value").textContent = gravity.toFixed(1);
  };
  document.getElementById("bounce").oninput = (e) => {
    bounce = +e.target.value;
    document.getElementById("bounce-value").textContent = bounce.toFixed(2);
  };
  document.getElementById("kick").onclick = () => {
    if (!app) return;
    if (preset === "cradle" && bodies.length) {
      const b = bodies[0];
      b.p.copy(b.anchor).add(new THREE.Vector3(-3, -4, 0));
      b.v.set(0, 0, 0);
    } else if (preset === "avalanche") sphere(-3, 8, 0, 1, [4, -2, 0]);
    else
      for (const b of bodies)
        b.v.add(
          new THREE.Vector3(
            (random() - 0.5) * 8,
            3 + random() * 3,
            (random() - 0.5) * 8,
          ),
        );
    if (!running) toggle();
    document.getElementById("status").textContent =
      "Цепная реакция запущена. Теперь измени её.";
    render();
  };
  document.getElementById("camera").onclick = () => {
    if (!app) return;
    cameraSide = (cameraSide + 1) % 3;
    const views = [
      [13, 14, 20],
      [-13, 14, 20],
      [0, 23, 9],
    ];
    app.view(views[cameraSide], [0, 2, 0], 650);
  };
  document.getElementById("export").onclick = () => {
    if (!app) return;
    app.renderer.render(app.scene, app.camera);
    K.downloadCanvas(canvas, "flux-" + preset + ".png");
    document.getElementById("status").textContent = "Кадр сохранён в PNG.";
  };
  document.addEventListener("visibilitychange", () => {
    cancelAnimationFrame(raf);
    last = 0;
    active = false;
    held = null;
    if (!document.hidden) raf = requestAnimationFrame(loop);
  });
  window.addEventListener("resize", () => {
    if (!app) return;
    app.camera.fov = innerWidth < 700 ? 52 : 39;
    app.camera.updateProjectionMatrix();
    app.invalidate();
  });
  if (app && innerWidth < 700) {
    app.camera.fov = 52;
    app.camera.updateProjectionMatrix();
    app.invalidate();
  }
  let keyboardPoint = new THREE.Vector3(0, 1.5, 0);
  canvas.addEventListener("keydown", (e) => {
    if (!app) return;
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Enter",
        " ",
      ].includes(e.key)
    ) {
      e.preventDefault();
      if (e.key === " ") {
        toggle();
        return;
      }
      if (e.key === "ArrowLeft")
        keyboardPoint.x = Math.max(-7, keyboardPoint.x - 1);
      if (e.key === "ArrowRight")
        keyboardPoint.x = Math.min(7, keyboardPoint.x + 1);
      if (e.key === "ArrowUp")
        keyboardPoint.z = Math.max(-5, keyboardPoint.z - 1);
      if (e.key === "ArrowDown")
        keyboardPoint.z = Math.min(5, keyboardPoint.z + 1);
      if (e.key === "Enter") {
        if (tool === "drop" || tool === "paint")
          drop(keyboardPoint, tool === "paint" ? 0.23 : 0.5);
        else document.getElementById("kick").click();
      }
      document.getElementById("status").textContent =
        "Точка: " +
        keyboardPoint.x +
        ", " +
        keyboardPoint.z +
        ". Enter — бросить шар / запустить движение. Пробел — пауза.";
    }
  });
  canvas.addEventListener("webglcontextlost", () => {
    if (running) toggle();
  });
  window.flux = {
    get state() {
      return {
        preset,
        tool,
        running,
        gravity,
        bounce,
        count: bodies.length,
        energy: bodies.reduce((s, b) => s + b.v.lengthSq(), 0),
      };
    },
    get bodies() {
      return bodies;
    },
    app,
    physics,
    load,
  };
})();
