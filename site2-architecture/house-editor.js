// A binary partition keeps sectors contiguous and guarantees area conservation.
const roomColors = {
  living: "#e9ded0",
  kitchen: "#dadfcf",
  bedroom: "#e5d8c4",
  bath: "#d9e2d9",
  hall: "#e8e4db",
};
let selectedRoom = "",
  roomSequence = 0;
const leaf = (name, type) => ({
  id: `room-${crypto.randomUUID()}`,
  name,
  type,
});
const split = (axis, ratio, a, b) => ({ axis, ratio, a, b });
function initialLayout(d, floor) {
  const n = housePresets[d.preset].bedrooms;
  function bedrooms(count) {
    return count === 1
      ? leaf("Спальня", "bedroom")
      : split("y", 1 / count, leaf("Спальня", "bedroom"), bedrooms(count - 1));
  }
  if (floor === 2)
    return split(
      "x",
      0.76,
      bedrooms(n),
      split("y", 0.58, leaf("Санузел", "bath"), leaf("Холл", "hall")),
    );
  return split(
    "x",
    0.68,
    split("y", 0.7, leaf("Гостиная", "living"), leaf("Кухня", "kitchen")),
    d.floors === 2
      ? split("y", 0.6, leaf("Лестница", "hall"), leaf("Санузел", "bath"))
      : split("y", 0.7, bedrooms(n), leaf("Санузел", "bath")),
  );
}
function ensureLayout(d = design) {
  d.layouts ||= {};
  for (let f = 1; f <= d.floors; f++) d.layouts[f] ||= initialLayout(d, f);
  d.facade ||= {
    roof: "gable",
    color: "#c9b18d",
    roofColor: "#3e4746",
    windows: "wide",
    terrace: true,
    front: "timber",
    side: "timber",
    rear: "timber",
    left: "timber",
  };
}
function flattenRooms(node, x = 0, y = 0, w = 1, h = 1, parent = null) {
  if (!node.axis)
    return [
      {
        ...node,
        x,
        y,
        w,
        h,
        color: roomColors[node.type] || roomColors.hall,
        parent,
      },
    ];
  if (node.axis === "x")
    return [
      ...flattenRooms(node.a, x, y, w * node.ratio, h, node),
      ...flattenRooms(
        node.b,
        x + w * node.ratio,
        y,
        w * (1 - node.ratio),
        h,
        node,
      ),
    ];
  return [
    ...flattenRooms(node.a, x, y, w, h * node.ratio, node),
    ...flattenRooms(
      node.b,
      x,
      y + h * node.ratio,
      w,
      h * (1 - node.ratio),
      node,
    ),
  ];
}
function floorRooms() {
  ensureLayout();
  return flattenRooms(design.layouts[planFloor]);
}
function roomProgram(d = design) {
  ensureLayout(d);
  const result = [];
  for (let f = 1; f <= d.floors; f++)
    flattenRooms(d.layouts[f]).forEach((r) =>
      result.push({
        name: `${r.name} · ${f} эт.`,
        type: r.type,
        area: (r.w * r.h * d.area) / d.floors,
      }),
    );
  return result;
}
function findRoom(node, id) {
  if (!node.axis) return node.id === id ? node : null;
  return findRoom(node.a, id) || findRoom(node.b, id);
}
function validTree(node, depth = 0, ids = new Set()) {
  if (!node || depth > 12) return false;
  if (node.axis)
    return (
      ["x", "y"].includes(node.axis) &&
      Number.isFinite(node.ratio) &&
      node.ratio >= 0.15 &&
      node.ratio <= 0.85 &&
      validTree(node.a, depth + 1, ids) &&
      validTree(node.b, depth + 1, ids)
    );
  if (
    typeof node.id !== "string" ||
    ids.has(node.id) ||
    typeof node.name !== "string" ||
    node.name.length > 40 ||
    !Object.hasOwn(roomColors, node.type)
  )
    return false;
  ids.add(node.id);
  return true;
}
function validEditor(d) {
  if (
    d.layouts &&
    (!validTree(d.layouts[1]) || (d.floors === 2 && !validTree(d.layouts[2])))
  )
    return false;
  const f = d.facade;
  if (!f) return true;
  return (
    ["flat", "gable"].includes(f.roof) &&
    ["wide", "regular"].includes(f.windows) &&
    typeof f.terrace === "boolean" &&
    /^#[a-f\d]{6}$/i.test(f.color) &&
    /^#[a-f\d]{6}$/i.test(f.roofColor) &&
    ["front", "side", "rear", "left"].every((k) =>
      Object.hasOwn(houseMaterials, f[k]),
    )
  );
}
function syncEditor() {
  ensureLayout();
  const rooms = floorRooms();
  if (!rooms.some((r) => r.id === selectedRoom)) selectedRoom = rooms[0].id;
  const select = document.getElementById("room-select");
  select.replaceChildren();
  rooms.forEach((r) => {
    const o = document.createElement("option");
    o.value = r.id;
    o.textContent = `${r.name} · ${((r.w * r.h * design.area) / design.floors).toFixed(1)} м²`;
    select.append(o);
  });
  select.value = selectedRoom;
  const r = rooms.find((r) => r.id === selectedRoom);
  document.getElementById("room-name").value = r.name;
  document.getElementById("room-type").value = r.type;
  const ratio = document.getElementById("room-ratio");
  ratio.disabled = !r.parent;
  ratio.value = r.parent ? Math.round(r.parent.ratio * 100) : 50;
  document.getElementById("room-ratio-value").textContent = r.parent
    ? `${Math.round(r.parent.ratio * 100)} / ${100 - Math.round(r.parent.ratio * 100)}%`
    : "Единый сектор";
  document.getElementById("merge-room").disabled = !r.parent;
  document.getElementById("split-room").disabled = rooms.length >= 12;
  const f = design.facade;
  ["roof", "color", "roofColor", "windows", "terrace"].forEach((k) => {
    const el = document.getElementById(`facade-${k}`);
    if (k === "terrace") el.checked = f[k];
    else el.value = f[k];
  });
  document.getElementById("facade-material").value =
    f[document.getElementById("facade-side").value];
  pavilion.hidden = drawingView !== "plan";
  document.getElementById("exterior-canvas").hidden = drawingView !== "volume";
  document.getElementById("exterior-help").hidden = drawingView !== "volume";
  if (typeof renderExterior === "function") renderExterior();
}
document.getElementById("room-select").addEventListener("change", (e) => {
  selectedRoom = e.target.value;
  drawingView = "plan";
  syncDesign();
});
document.getElementById("room-name").addEventListener("input", (e) => {
  const start = e.target.selectionStart,
    end = e.target.selectionEnd;
  findRoom(design.layouts[planFloor], selectedRoom).name =
    e.target.value.slice(0, 40) || "Комната";
  syncDesign();
  e.target.focus();
  e.target.setSelectionRange(start, end);
});
document.getElementById("room-type").addEventListener("change", (e) => {
  findRoom(design.layouts[planFloor], selectedRoom).type = e.target.value;
  syncDesign();
});
document.getElementById("room-ratio").addEventListener("input", (e) => {
  const room = floorRooms().find((r) => r.id === selectedRoom);
  if (room.parent) room.parent.ratio = Number(e.target.value) / 100;
  syncDesign();
});
document.getElementById("split-room").addEventListener("click", () => {
  if (floorRooms().length >= 12) return;
  const n = findRoom(design.layouts[planFloor], selectedRoom),
    a = { ...n },
    b = leaf("Новая комната", "bedroom");
  Object.keys(n).forEach((k) => delete n[k]);
  Object.assign(
    n,
    split(document.getElementById("split-axis").value, 0.5, a, b),
  );
  selectedRoom = b.id;
  syncDesign();
});
document.getElementById("merge-room").addEventListener("click", () => {
  const r = floorRooms().find((r) => r.id === selectedRoom);
  if (!r.parent) return;
  const replacement = { id: r.id, name: r.name, type: r.type };
  Object.keys(r.parent).forEach((k) => delete r.parent[k]);
  Object.assign(r.parent, replacement);
  syncDesign();
});
["roof", "color", "roofColor", "windows", "terrace"].forEach((k) =>
  document.getElementById(`facade-${k}`).addEventListener("input", (e) => {
    design.facade[k] = k === "terrace" ? e.target.checked : e.target.value;
    syncDesign();
  }),
);
document.getElementById("facade-side").addEventListener("change", syncEditor);
document.getElementById("facade-material").addEventListener("change", (e) => {
  design.facade[document.getElementById("facade-side").value] = e.target.value;
  syncDesign();
});
const architecturalOptions = [
  {
    name: "Nordic / тёплое дерево",
    preset: "weekend",
    area: 110,
    floors: 1,
    material: "timber",
    budget: 20,
    roof: "gable",
    color: "#c9b18d",
    roofColor: "#3e4746",
    windows: "wide",
  },
  {
    name: "Monolith / светлый минимализм",
    preset: "weekend",
    area: 90,
    floors: 1,
    material: "concrete",
    budget: 18,
    roof: "flat",
    color: "#e6e1d6",
    roofColor: "#434b49",
    windows: "wide",
  },
  {
    name: "Family / два уровня",
    preset: "family",
    area: 180,
    floors: 2,
    material: "brick",
    budget: 32,
    roof: "gable",
    color: "#ac735b",
    roofColor: "#3b4140",
    windows: "regular",
  },
  {
    name: "Atelier / дом для встреч",
    preset: "friends",
    area: 210,
    floors: 1,
    material: "concrete",
    budget: 36,
    roof: "flat",
    color: "#b8bcb2",
    roofColor: "#49514a",
    windows: "wide",
  },
  {
    name: "Blackwood / лесной дом",
    preset: "weekend",
    area: 120,
    floors: 1,
    material: "timber",
    budget: 23,
    roof: "gable",
    color: "#444b45",
    roofColor: "#353b39",
    windows: "wide",
  },
  {
    name: "Dune / светлый семейный",
    preset: "family",
    area: 160,
    floors: 2,
    material: "concrete",
    budget: 28,
    roof: "flat",
    color: "#ded0b9",
    roofColor: "#676d61",
    windows: "regular",
  },
];
architecturalOptions.forEach((p, i) => {
  const b = document.createElement("button");
  b.className = "project-option";
  const title = document.createElement("strong");
  title.textContent = p.name;
  const desc = document.createElement("span");
  desc.textContent = `${p.area} м² · ${p.floors} эт. · ${p.roof === "gable" ? "Скатная" : "Плоская"} крыша`;
  b.append(title, desc);
  b.addEventListener("click", () => {
    design = {
      preset: p.preset,
      area: p.area,
      floors: p.floors,
      material: p.material,
      budget: p.budget,
    };
    ensureLayout();
    Object.assign(design.facade, {
      roof: p.roof,
      color: p.color,
      roofColor: p.roofColor,
      windows: p.windows,
      front: p.material,
      side: p.material,
      rear: p.material,
      left: p.material,
    });
    drawingView = "volume";
    planFloor = 1;
    syncDesign();
  });
  document.getElementById("ready-projects").append(b);
});
pavilion.addEventListener("pointerdown", (e) => {
  const rect = pavilion.getBoundingClientRect(),
    bw = Math.min(pavilionW - 76, 480),
    bh = Math.min(pavilionH - 135, bw * 0.75),
    x = (pavilionW - bw) / 2,
    y = (pavilionH - bh) / 2 - 10;
  const px = (e.clientX - rect.left - x) / bw,
    py = (e.clientY - rect.top - y) / bh;
  const r = floorRooms().find(
    (r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h,
  );
  if (r) {
    selectedRoom = r.id;
    syncDesign();
  }
});
