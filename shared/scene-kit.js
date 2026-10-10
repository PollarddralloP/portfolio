/* Local, demand-rendered scene helpers. Three.js MIT notice is retained in three.min.js. */
const SceneKit = (() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const color = (v) => new THREE.Color(v).convertSRGBToLinear();
  function material(v, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color: color(v),
      roughness: 0.72,
      ...extra,
    });
  }
  function mesh(
    group,
    geometry,
    mat,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
  ) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(...position);
    m.rotation.set(...rotation);
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }
  const box = (g, size, mat, pos, rot) =>
    mesh(g, new THREE.BoxGeometry(...size), mat, pos, rot);
  const sphere = (g, r, mat, pos, scale) => {
    const m = mesh(g, new THREE.SphereGeometry(r, 28, 18), mat, pos);
    if (scale) m.scale.set(...scale);
    return m;
  };
  const cylinder = (g, r1, r2, h, mat, pos, rot) =>
    mesh(g, new THREE.CylinderGeometry(r1, r2, h, 40), mat, pos, rot);
  function texture(draw, w = 512, h = 512) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }
  function create(
    canvas,
    {
      background = "#e8e6dd",
      position = [8, 6, 10],
      target = [0, 1, 0],
      fov = 38,
      shadows = true,
    } = {},
  ) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: background === "transparent",
        preserveDrawingBuffer: true,
      });
    } catch {
      canvas.hidden = true;
      const fallback = canvas.parentElement.querySelector(".renderer-fallback");
      if (fallback) fallback.hidden = false;
      return null;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2),
    );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene();
    scene.background = background === "transparent" ? null : color(background);
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 180);
    camera.position.set(...position);
    let look = new THREE.Vector3(...target),
      frame = 0,
      tweenFrame = 0,
      visible = true,
      available = true;
    const render = () => {
      frame = 0;
      if (!visible || !available) return;
      const r = canvas.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      camera.lookAt(look);
      renderer.render(scene, camera);
    };
    const invalidate = () => {
      if (!frame && available) frame = requestAnimationFrame(render);
    };
    new ResizeObserver(invalidate).observe(canvas);
    new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) invalidate();
        else (cancelAnimationFrame(frame), (frame = 0));
      },
      { rootMargin: "150px" },
    ).observe(canvas);
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      available = false;
      const f = canvas.parentElement.querySelector(".renderer-fallback");
      if (f) f.hidden = false;
    });
    canvas.addEventListener("webglcontextrestored", () => {
      available = true;
      const f = canvas.parentElement.querySelector(".renderer-fallback");
      if (f) f.hidden = true;
      invalidate();
    });
    function view(pos, tgt, duration = 700) {
      cancelAnimationFrame(tweenFrame);
      const from = camera.position.clone(),
        to = new THREE.Vector3(...pos),
        old = look.clone(),
        next = new THREE.Vector3(...tgt);
      if (reduced || !duration) {
        camera.position.copy(to);
        look.copy(next);
        invalidate();
        return;
      }
      const begin = performance.now();
      function tick(now) {
        const t = Math.min(1, (now - begin) / duration),
          ease = 1 - Math.pow(1 - t, 3);
        camera.position.lerpVectors(from, to, ease);
        look.lerpVectors(old, next, ease);
        invalidate();
        if (t < 1) tweenFrame = requestAnimationFrame(tick);
      }
      tweenFrame = requestAnimationFrame(tick);
    }
    function lights({
      sun = "#fff1da",
      power = 2,
      ambient = 0.8,
      pos = [-5, 12, 7],
    } = {}) {
      const hemi = new THREE.HemisphereLight("#ffffff", "#6d7164", ambient);
      scene.add(hemi);
      const key = new THREE.DirectionalLight(sun, power);
      key.position.set(...pos);
      key.castShadow = shadows;
      key.shadow.mapSize.set(1024, 1024);
      Object.assign(key.shadow.camera, {
        left: -12,
        right: 12,
        top: 12,
        bottom: -12,
        near: 0.5,
        far: 40,
      });
      key.shadow.bias = -0.0004;
      key.shadow.normalBias = 0.025;
      scene.add(key);
      return { hemi, key };
    }
    let drag = null,
      orbit = null;
    function enableOrbit({
      radius = 12,
      azimuth = 0.7,
      elevation = 0.5,
      target = [0, 1, 0],
      min = 7,
      max = 20,
    } = {}) {
      orbit = { radius, azimuth, elevation, target, min, max };
      function update() {
        const o = orbit;
        view(
          [
            o.target[0] +
              Math.sin(o.azimuth) * Math.cos(o.elevation) * o.radius,
            o.target[1] + Math.sin(o.elevation) * o.radius,
            o.target[2] +
              Math.cos(o.azimuth) * Math.cos(o.elevation) * o.radius,
          ],
          o.target,
          0,
        );
      }
      canvas.addEventListener("pointerdown", (e) => {
        const delta = camera.position.clone().sub(look);
        orbit.target = look.toArray();
        orbit.radius = delta.length();
        orbit.azimuth = Math.atan2(delta.x, delta.z);
        orbit.elevation = Math.asin(delta.y / orbit.radius);
        drag = { x: e.clientX, y: e.clientY };
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!drag) return;
        orbit.azimuth -= (e.clientX - drag.x) * 0.009;
        orbit.elevation = Math.min(
          1.3,
          Math.max(0.08, orbit.elevation + (e.clientY - drag.y) * 0.006),
        );
        drag = { x: e.clientX, y: e.clientY };
        update();
      });
      ["pointerup", "pointercancel", "lostpointercapture"].forEach((name) =>
        canvas.addEventListener(name, () => (drag = null)),
      );
      canvas.addEventListener("keydown", (e) => {
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
        if (e.key === "ArrowLeft") orbit.azimuth -= 0.12;
        if (e.key === "ArrowRight") orbit.azimuth += 0.12;
        if (e.key === "ArrowUp")
          orbit.elevation = Math.min(1.3, orbit.elevation + 0.1);
        if (e.key === "ArrowDown")
          orbit.elevation = Math.max(0.08, orbit.elevation - 0.1);
        if (["+", "="].includes(e.key))
          orbit.radius = Math.max(min, orbit.radius - 1);
        if (e.key === "-") orbit.radius = Math.min(max, orbit.radius + 1);
        update();
      });
      return {
        reset: () => {
          Object.assign(orbit, { radius, azimuth, elevation, target });
          update();
        },
        step: (dir) => {
          const delta = camera.position.clone().sub(look);
          orbit.target = look.toArray();
          orbit.radius = delta.length();
          orbit.azimuth = Math.atan2(delta.x, delta.z);
          orbit.elevation = Math.asin(delta.y / orbit.radius);
          if (dir === "left") orbit.azimuth -= 0.2;
          if (dir === "right") orbit.azimuth += 0.2;
          if (dir === "in") orbit.radius = Math.max(min, orbit.radius - 1);
          if (dir === "out") orbit.radius = Math.min(max, orbit.radius + 1);
          update();
        },
      };
    }
    return {
      renderer,
      scene,
      camera,
      get target() {
        return look;
      },
      invalidate,
      view,
      lights,
      enableOrbit,
    };
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function downloadCanvas(canvas, name) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  }
  function reveal() {
    if (!("IntersectionObserver" in window)) return;
    document.documentElement.classList.add("motion-ready");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
  }
  return {
    reduced,
    color,
    material,
    mesh,
    box,
    sphere,
    cylinder,
    texture,
    create,
    download,
    downloadCanvas,
    reveal,
  };
})();
SceneKit.reveal();
