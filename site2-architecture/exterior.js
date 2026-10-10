// Local Three.js r128, demand rendering: no permanent animation loop.
const exteriorCanvas = document.getElementById("exterior-canvas");
let exteriorRenderer, exteriorScene, exteriorCamera, houseGroup;
let azimuth = 0.7,
  elevation = 0.38,
  distance = 25,
  exteriorTarget = new THREE.Vector3(0, 2, 0);
const textureCache = new Map();
function finishTexture(kind, color) {
  const key = kind + color;
  if (textureCache.has(key)) return textureCache.get(key);
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = kind === "brick" ? "#e6ddd580" : "#252e2828";
  ctx.lineWidth = kind === "brick" ? 3 : 1;
  if (kind === "timber") {
    for (let x = 0; x < 256; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
      ctx.strokeStyle = "#ffffff18";
      ctx.beginPath();
      ctx.moveTo(x + 3, 0);
      ctx.lineTo(x + 3, 256);
      ctx.stroke();
      ctx.strokeStyle = "#252e2840";
    }
  }
  if (kind === "brick") {
    for (let y = 0; y < 256; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
      for (let x = ((y / 24) % 2) * 32; x < 256; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 24);
        ctx.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 2);
  t.encoding = THREE.sRGBEncoding;
  textureCache.set(key, t);
  if (textureCache.size > 32) {
    const oldest = textureCache.keys().next().value;
    textureCache.get(oldest).dispose();
    textureCache.delete(oldest);
  }
  return t;
}
function glassReflection() {
  if (textureCache.has("glass")) return textureCache.get("glass");
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#adcbd1");
  g.addColorStop(0.5, "#d5e0d7");
  g.addColorStop(0.51, "#718b78");
  g.addColorStop(1, "#344d48");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#e9f3ef30";
  ctx.beginPath();
  ctx.moveTo(0, 15);
  ctx.lineTo(256, 140);
  ctx.lineTo(256, 190);
  ctx.lineTo(0, 65);
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.encoding = THREE.sRGBEncoding;
  textureCache.set("glass", t);
  return t;
}
function setupExterior() {
  try {
    exteriorRenderer = new THREE.WebGLRenderer({
      canvas: exteriorCanvas,
      antialias: true,
    });
  } catch {
    exteriorCanvas.hidden = true;
    pavilion.hidden = false;
    document.getElementById("exterior-help").textContent =
      "Объёмная модель требует WebGL. План и редактор доступны; попробуй браузер с аппаратным ускорением.";
    return false;
  }
  exteriorRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  exteriorRenderer.outputEncoding = THREE.sRGBEncoding;
  exteriorRenderer.shadowMap.enabled = true;
  exteriorRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  exteriorRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  exteriorRenderer.toneMappingExposure = 1.15;
  exteriorScene = new THREE.Scene();
  exteriorScene.background = new THREE.Color("#dbe4dc");
  exteriorScene.fog = new THREE.Fog("#dbe4dc", 45, 95);
  exteriorCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 150);
  exteriorScene.add(new THREE.HemisphereLight("#f3f6ff", "#7a8565", 0.65));
  const sun = new THREE.DirectionalLight("#fff1d7", 1.6);
  sun.position.set(-12, 20, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -24,
    right: 24,
    top: 24,
    bottom: -24,
    near: 1,
    far: 70,
  });
  sun.shadow.bias = -0.0004;
  exteriorScene.add(sun);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: "#a1ae8c", roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  exteriorScene.add(ground);
  return true;
}
function paintExterior() {
  if (!exteriorRenderer || exteriorCanvas.hidden) return;
  const r = exteriorCanvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  exteriorRenderer.setSize(r.width, r.height, false);
  exteriorCamera.aspect = r.width / r.height;
  exteriorCamera.updateProjectionMatrix();
  exteriorCamera.position.set(
    Math.sin(azimuth) * Math.cos(elevation) * distance,
    exteriorTarget.y + Math.sin(elevation) * distance,
    Math.cos(azimuth) * Math.cos(elevation) * distance,
  );
  exteriorCamera.lookAt(exteriorTarget);
  exteriorRenderer.render(exteriorScene, exteriorCamera);
}
function renderExterior() {
  if (drawingView !== "volume") return;
  if (!exteriorRenderer && !setupExterior()) return;
  if (houseGroup) {
    exteriorScene.remove(houseGroup);
    houseGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => m.dispose());
      }
    });
  }
  houseGroup = new THREE.Group();
  exteriorScene.add(houseGroup);
  const f = design.facade,
    w = Math.sqrt(design.area / design.floors / 0.75),
    depth = w * 0.75,
    height = design.floors * 3.1;
  const mat = (color, roughness = 0.85) =>
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).convertSRGBToLinear(),
      roughness,
    });
  const trim = mat("#353e3b"),
    glass = new THREE.MeshStandardMaterial({
      map: glassReflection(),
      color: "#c3d4d1",
      metalness: 0.55,
      roughness: 0.13,
    }),
    stone = mat("#c2c4b4");
  function box(x, y, z, sx, sy, sz, m) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    houseGroup.add(mesh);
    return mesh;
  }
  box(0, 0.15, 0, w + 0.4, 0.3, depth + 0.4, stone);
  // Separate cladding surfaces; clockwise front/right/rear/left.
  const surfaces = [
    ["front", 0, height / 2 + 0.3, depth / 2, w, height, 0.18],
    ["side", w / 2, height / 2 + 0.3, 0, 0.18, height, depth],
    ["rear", 0, height / 2 + 0.3, -depth / 2, w, height, 0.18],
    ["left", -w / 2, height / 2 + 0.3, 0, 0.18, height, depth],
  ];
  surfaces.forEach(([side, x, y, z, sx, sy, sz]) => {
    const m = new THREE.MeshStandardMaterial({
      map: finishTexture(f[side], f.color),
      roughness: 0.87,
    });
    box(x, y, z, sx, sy, sz, m);
  });
  // Windows follow boundary room sectors, so partition edits change the elevation.
  for (let floor = 1; floor <= design.floors; floor++) {
    const rooms = flattenRooms(design.layouts[floor]);
    const base = (floor - 1) * 3.1 + 0.3;
    ["front", "rear", "side", "left"].forEach((side) => {
      const front = side === "front" || side === "rear",
        length = front ? w : depth;
      const boundary = rooms.filter((r) =>
        side === "front"
          ? Math.abs(r.y + r.h - 1) < 0.001
          : side === "rear"
            ? r.y < 0.001
            : side === "side"
              ? Math.abs(r.x + r.w - 1) < 0.001
              : r.x < 0.001,
      );
      boundary.forEach((r) => {
        const start = front ? r.x : r.y,
          span = front ? r.w : r.h,
          center = (start + span / 2 - 0.5) * length;
        const windowW = Math.max(
          0.25,
          span *
            length *
            (r.type === "bath" ? 0.32 : f.windows === "wide" ? 0.76 : 0.43),
        );
        const windowH =
            r.type === "bath" ? 0.7 : f.windows === "wide" ? 2.25 : 1.45,
          cy = base + (r.type === "bath" ? 1.9 : 1.55);
        const wx = front
            ? center
            : side === "side"
              ? w / 2 + 0.11
              : -w / 2 - 0.11,
          wz = front
            ? side === "front"
              ? depth / 2 + 0.11
              : -depth / 2 - 0.11
            : center;
        const frame = box(
          wx,
          cy,
          wz,
          front ? windowW + 0.16 : 0.14,
          windowH + 0.16,
          front ? 0.14 : windowW + 0.16,
          trim,
        );
        const outward = side === "front" ? 0.09 : side === "rear" ? -0.09 : 0;
        box(
          wx + (side === "side" ? 0.09 : side === "left" ? -0.09 : 0),
          cy,
          wz + outward,
          front ? windowW : 0.07,
          windowH,
          front ? 0.07 : windowW,
          glass,
        );
        box(
          wx + (side === "side" ? 0.14 : side === "left" ? -0.14 : 0),
          cy,
          wz + (side === "front" ? 0.14 : side === "rear" ? -0.14 : 0),
          front ? 0.045 : 0.08,
          windowH,
          front ? 0.08 : 0.045,
          trim,
        );
      });
    });
  }
  // Front entry, generous roof overhang, detailed terrace.
  box(w * 0.36, 1.4, depth / 2 + 0.16, 0.94, 2.2, 0.13, mat("#65654f"));
  box(w * 0.32, 1.42, depth / 2 + 0.25, 0.035, 0.35, 0.035, mat("#d7d1ba"));
  const roof = mat(f.roofColor, 0.65);
  if (f.roof === "flat") {
    box(0, height + 0.42, 0, w + 0.7, 0.24, depth + 0.7, roof);
    box(0, height + 0.59, 0, w + 0.4, 0.1, depth + 0.4, mat("#6c776c"));
  } else {
    const rise = 2.1,
      half = depth / 2 + 0.48,
      slope = Math.atan2(rise, half),
      len = Math.hypot(half, rise);
    [-1, 1].forEach((sign) => {
      const m = box(
        0,
        height + 0.4 + rise / 2,
        (sign * half) / 2,
        w + 0.9,
        0.18,
        len,
        roof,
      );
      m.rotation.x = sign * slope;
      for (let x = -w / 2 - 0.35; x < w / 2 + 0.4; x += 0.55) {
        const seam = box(
          x,
          height + 0.4 + rise / 2 + 0.115,
          (sign * half) / 2,
          0.025,
          0.03,
          len,
          roof,
        );
        seam.rotation.x = sign * slope;
      }
    });
    const shape = new THREE.Shape();
    shape.moveTo(-depth / 2, 0);
    shape.lineTo(depth / 2, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    [-1, 1].forEach((sign) => {
      const gm = mat(f.color);
      gm.side = THREE.DoubleSide;
      const g = new THREE.Mesh(geo, gm);
      g.rotation.y = Math.PI / 2;
      g.position.set((sign * w) / 2, height + 0.3, 0);
      houseGroup.add(g);
    });
    box(0, height + 0.4 + rise, 0, w + 0.95, 0.12, 0.14, roof);
  }
  if (f.terrace) {
    box(0, 0.14, depth / 2 + 1.65, w + 0.6, 0.28, 3.1, mat("#a5987c"));
    for (let x = -w / 2; x < w / 2; x += 0.23)
      box(x, 0.29, depth / 2 + 1.65, 0.014, 0.012, 3.05, mat("#6f725e"));
    box(0, 0.07, depth / 2 + 3.45, 3, 0.14, 0.6, stone);
    box(-w * 0.28, 0.53, depth / 2 + 1.6, 2, 0.46, 0.8, mat("#7c8774"));
    box(-w * 0.28, 0.84, depth / 2 + 1.95, 2, 0.18, 0.18, mat("#7c8774"));
    box(-w * 0.28, 0.8, depth / 2 + 1.6, 1.85, 0.12, 0.65, mat("#e6ded0"));
    box(w * 0.12, 0.58, depth / 2 + 1.6, 1.1, 0.1, 0.8, trim);
  }
  // Restrained landscape, planting bed and approach path.
  box(w * 0.65, 0.015, depth / 2 + 5.4, 1.5, 0.03, 8, stone);
  const foliage = mat("#586e4b");
  for (let i = 0; i < 7; i++) {
    const x = -w / 2 - 2.3,
      z = -depth / 2 + i * 1.35;
    box(x, 0.18, z, 1.4, 0.36, 1.2, mat("#737e61"));
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), foliage);
    bush.position.set(x, 0.65, z);
    bush.scale.set(1.25, 0.8, 1);
    bush.castShadow = true;
    houseGroup.add(bush);
  }
  [-1, 1].forEach((side, i) => {
    const x = side * (w / 2 + 5),
      z = -depth / 2 - 3;
    box(x, 1.7, z, 0.22, 3.4, 0.22, mat("#776b57"));
    for (let j = 0; j < 3; j++) {
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(1.5 - j * 0.2, 12, 10),
        mat(j % 2 ? "#6d8258" : "#59724f"),
      );
      crown.position.set(x, 3.4 + j * 0.6, z);
      crown.castShadow = true;
      houseGroup.add(crown);
    }
  });
  exteriorTarget.y = height / 2 + 0.8;
  distance = Math.max(14, Math.min(45, distance));
  exteriorCanvas.setAttribute(
    "aria-label",
    `Дом ${design.area} м², ${design.floors} этажей. ${f.roof === "gable" ? "Скатная" : "Плоская"} крыша. Стрелки поворачивают модель, плюс и минус меняют масштаб.`,
  );
  paintExterior();
}
let drag = null;
exteriorCanvas.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY };
  exteriorCanvas.setPointerCapture(e.pointerId);
});
exteriorCanvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  azimuth -= (e.clientX - drag.x) * 0.009;
  elevation = Math.max(
    0.12,
    Math.min(1.15, elevation + (e.clientY - drag.y) * 0.006),
  );
  drag = { x: e.clientX, y: e.clientY };
  paintExterior();
});
["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
  exteriorCanvas.addEventListener(name, () => (drag = null)),
);
exteriorCanvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    distance = Math.max(14, Math.min(45, distance + e.deltaY * 0.015));
    paintExterior();
  },
  { passive: false },
);
exteriorCanvas.addEventListener("keydown", (e) => {
  if (
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "+",
      "-",
      "=",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  if (e.key === "ArrowLeft") azimuth -= 0.15;
  if (e.key === "ArrowRight") azimuth += 0.15;
  if (e.key === "ArrowUp") elevation = Math.min(1.15, elevation + 0.1);
  if (e.key === "ArrowDown") elevation = Math.max(0.12, elevation - 0.1);
  if (["+", "="].includes(e.key)) distance = Math.max(14, distance - 2);
  if (e.key === "-") distance = Math.min(45, distance + 2);
  paintExterior();
});
new ResizeObserver(paintExterior).observe(exteriorCanvas);
