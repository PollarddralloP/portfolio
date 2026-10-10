// A schematic floor program and its massing, driven by the same design state.
const housePresets = {
  weekend: {
    name: "Дом для двоих",
    area: 90,
    floors: 1,
    material: "timber",
    budget: 18,
    bedrooms: 1,
    reason:
      "Один уровень убирает лестницу. Открытая гостиная занимает почти половину площади, а спальня отделена от общей зоны.",
  },
  family: {
    name: "Дом для семьи",
    area: 160,
    floors: 2,
    material: "timber",
    budget: 28,
    bedrooms: 3,
    reason:
      "Общая жизнь — внизу, три спальни — наверху. Два уровня разделяют шумную и тихую части и уменьшают пятно дома.",
  },
  friends: {
    name: "Дом для встреч",
    area: 200,
    floors: 1,
    material: "brick",
    budget: 32,
    bedrooms: 3,
    reason:
      "Большая общая зона собирает гостей вместе. Три отдельные спальни позволяют остаться на выходные, не мешая друг другу.",
  },
};
const houseMaterials = {
  timber: {
    name: "Дерево",
    rate: 130000,
    colors: ["#bf9973", "#9d7754", "#dbc5a6"],
  },
  concrete: {
    name: "Минеральный",
    rate: 120000,
    colors: ["#bcbdb2", "#989f96", "#dcddd3"],
  },
  brick: {
    name: "Кирпич",
    rate: 145000,
    colors: ["#b8755c", "#90543f", "#d59d7f"],
  },
};
let design = {
  preset: "weekend",
  area: 90,
  floors: 1,
  material: "timber",
  budget: 18,
};
let drawingView = "volume",
  planFloor = 1;
const pavilion = document.getElementById("architecture-canvas"),
  pen = pavilion.getContext("2d");
let pavilionW = 0,
  pavilionH = 0;
function estimateCost(d = design) {
  return Math.round(
    d.area * houseMaterials[d.material].rate * (d.floors === 2 ? 1.08 : 1),
  );
}
function sizePavilion() {
  const r = pavilion.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio, 2);
  pavilionW = r.width;
  pavilionH = r.height;
  pavilion.width = r.width * dpr;
  pavilion.height = r.height * dpr;
  pen.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPavilion();
}
function drawPlan() {
  const c = pen,
    w = pavilionW,
    h = pavilionH;
  const bw = Math.min(w - 76, 480),
    bh = Math.min(h - 135, bw * 0.75),
    x = (w - bw) / 2,
    y = (h - bh) / 2 - 10,
    area = design.area / design.floors;
  c.strokeStyle = "#ded8cb";
  c.lineWidth = 0.5;
  for (let i = 0; i < w; i += 24) {
    c.beginPath();
    c.moveTo(i, 0);
    c.lineTo(i, h);
    c.stroke();
  }
  for (let i = 0; i < h; i += 24) {
    c.beginPath();
    c.moveTo(0, i);
    c.lineTo(w, i);
    c.stroke();
  }
  for (const room of floorRooms()) {
    const rx = x + room.x * bw,
      ry = y + room.y * bh,
      rw = room.w * bw,
      rh = room.h * bh;
    c.fillStyle = room.color;
    c.fillRect(rx, ry, rw, rh);
    c.strokeStyle = room.id === selectedRoom ? "#385b45" : "#777261";
    c.lineWidth = room.id === selectedRoom ? 4 : 2;
    c.strokeRect(rx, ry, rw, rh);
    c.fillStyle = "#403e35";
    c.textAlign = "center";
    const compact = rw < 90;
    c.font = `${compact ? 9 : 12}px Manrope,sans-serif`;
    c.fillText(room.name, rx + rw / 2, ry + rh / 2 - 5, Math.max(10, rw - 8));
    c.font = "10px Manrope,sans-serif";
    c.fillStyle = "#626353";
    c.fillText(
      `${(room.w * room.h * area).toFixed(1)} м²`,
      rx + rw / 2,
      ry + rh / 2 + 13,
    );
  }
  c.strokeStyle = "#494d40";
  c.lineWidth = 4;
  c.strokeRect(x, y, bw, bh);
  // Window openings, and a furniture scale cue in the living zone.
  c.strokeStyle = "#7f9d9a";
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(x + 18, y);
  c.lineTo(x + bw * 0.56, y);
  c.stroke();
  c.fillStyle = "#fff9";
  if (!(design.floors === 2 && planFloor === 2)) {
    c.fillRect(x + 14, y + bh * 0.1, bw * 0.21, bh * 0.16);
    c.strokeStyle = "#a69785";
    c.lineWidth = 1;
    c.strokeRect(x + 14, y + bh * 0.1, bw * 0.21, bh * 0.16);
    c.fillStyle = "#ffffff70";
    c.fillRect(x + bw * 0.27, y + bh * 0.12, bw * 0.09, bh * 0.12);
  }
  const dimension = Math.sqrt(area / 0.75);
  c.fillStyle = "#626353";
  c.textAlign = "center";
  c.font = "10px Manrope,sans-serif";
  c.fillText(`≈ ${dimension.toFixed(1)} м`, w / 2, y + bh + 27);
  c.save();
  c.translate(x - 20, y + bh / 2);
  c.rotate(-Math.PI / 2);
  c.fillText(`≈ ${(dimension * 0.75).toFixed(1)} м`, 0, 0);
  c.restore();
  c.fillText(`ЭТАЖ ${planFloor} / ${area.toFixed(0)} М²`, w / 2, h - 19);
  pavilion.setAttribute(
    "aria-label",
    `Эскиз, этаж ${planFloor}. ` +
      floorRooms()
        .map(
          (r) =>
            `${r.name}: ${(r.w * r.h * area).toFixed(1)} квадратных метров`,
        )
        .join(". "),
  );
}
function drawVolume() {
  const c = pen,
    w = pavilionW,
    h = pavilionH,
    cx = w / 2,
    cy = h * 0.65;
  const colors = houseMaterials[design.material].colors;
  const footprint = Math.sqrt(design.area / design.floors / 90),
    bw = 220 * footprint,
    bd = 165 * footprint;
  const scale = Math.min(
    (w - 80) / ((bw + bd + 70) * 0.866),
    (h - 100) / ((bw + bd + 70) * 0.5 + design.floors * 58),
  );
  function p(x, y, z) {
    return {
      x: cx + (x - z) * 0.866 * scale,
      y: cy + ((x + z) * 0.5 - y) * scale,
    };
  }
  function poly(points, color) {
    c.beginPath();
    points.forEach((v, i) => (i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)));
    c.closePath();
    c.fillStyle = color;
    c.fill();
    c.strokeStyle = "#595648";
    c.lineWidth = 0.7;
    c.stroke();
  }
  function box(y, height, width, depth, palette) {
    const bottom = [
        p(-width / 2, y, -depth / 2),
        p(width / 2, y, -depth / 2),
        p(width / 2, y, depth / 2),
        p(-width / 2, y, depth / 2),
      ],
      top = [
        p(-width / 2, y + height, -depth / 2),
        p(width / 2, y + height, -depth / 2),
        p(width / 2, y + height, depth / 2),
        p(-width / 2, y + height, depth / 2),
      ];
    poly([bottom[1], bottom[2], top[2], top[1]], palette[0]);
    poly([bottom[2], bottom[3], top[3], top[2]], palette[1]);
    poly(top, palette[2]);
  }
  box(-10, 10, bw + 40, bd + 35, ["#b9beaa", "#9fa48e", "#d9dcca"]);
  for (let f = 0; f < design.floors; f++) {
    box(f * 58, 55, bw, bd, colors);
    poly(
      [
        p(-bw * 0.38, f * 58 + 12, bd / 2 + 0.1),
        p(bw * 0.35, f * 58 + 12, bd / 2 + 0.1),
        p(bw * 0.35, f * 58 + 42, bd / 2 + 0.1),
        p(-bw * 0.38, f * 58 + 42, bd / 2 + 0.1),
      ],
      "#bdd0c7",
    );
    box(f * 58 + 55, 5, bw + 4, bd + 4, ["#75766a", "#626358", "#aeb1a1"]);
  }
  box(design.floors * 58, 8, bw + 14, bd + 14, [
    "#686d61",
    "#4c5449",
    "#8e9683",
  ]);
  c.fillStyle = "#626353";
  c.font = "11px Manrope,sans-serif";
  c.textAlign = "center";
  c.fillText(`${design.area / design.floors} м² / пятно дома`, w / 2, h - 28);
  pavilion.setAttribute(
    "aria-label",
    `Объём дома: ${design.floors} этажей, материал ${houseMaterials[design.material].name}, пятно ${design.area / design.floors} квадратных метров.`,
  );
}
function drawPavilion() {
  if (!pavilionW || typeof floorRooms !== "function") return;
  pen.clearRect(0, 0, pavilionW, pavilionH);
  pen.fillStyle = "#f4f1e8";
  pen.fillRect(0, 0, pavilionW, pavilionH);
  drawingView === "plan" ? drawPlan() : drawVolume();
}
new ResizeObserver(sizePavilion).observe(pavilion);
