const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const storageKey = "kairos-house-variants-v1";
let savedVariants = [],
  storageAvailable = true,
  briefURL;
const millions = (value) =>
  `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value / 1000000)} млн ₽`;
function validDesign(d) {
  return (
    d &&
    validEditor(d) &&
    Object.hasOwn(housePresets, d.preset) &&
    Object.hasOwn(houseMaterials, d.material) &&
    Number.isInteger(d.area) &&
    d.area >= 70 &&
    d.area <= 240 &&
    [1, 2].includes(d.floors) &&
    Number.isInteger(d.budget) &&
    d.budget >= 8 &&
    d.budget <= 50
  );
}
try {
  const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
  if (Array.isArray(stored))
    savedVariants = stored.filter(validDesign).slice(0, 3);
} catch {
  storageAvailable = false;
}
function persistVariants() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(savedVariants));
  } catch {
    storageAvailable = false;
  }
}
function syncDesign() {
  document.getElementById("lifestyle-select").value = design.preset;
  document.getElementById("area-range").value = design.area;
  document
    .getElementById("area-range")
    .setAttribute("aria-valuetext", `${design.area} квадратных метров`);
  document.getElementById("area-value").textContent = `${design.area} м²`;
  document.getElementById("budget-range").value = design.budget;
  document
    .getElementById("budget-range")
    .setAttribute("aria-valuetext", `${design.budget} миллионов рублей`);
  document.getElementById("budget-value").textContent =
    `${design.budget} млн ₽`;
  document.querySelectorAll("[data-floors]").forEach((b) => {
    const active = Number(b.dataset.floors) === design.floors;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-mat]").forEach((b) => {
    const active = b.dataset.mat === design.material;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-view]").forEach((b) => {
    const active = b.dataset.view === drawingView;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  if (design.floors === 1) planFloor = 1;
  document.getElementById("drawing-title").textContent =
    `${housePresets[design.preset].name.toUpperCase()} / ${design.area} М²`;
  document.getElementById("drawing-caption").textContent =
    `${design.floors === 1 ? "Один этаж" : "Два этажа"} · ${design.area} м²`;
  let floorButton = document.getElementById("floor-view");
  if (!floorButton) {
    floorButton = document.createElement("button");
    floorButton.id = "floor-view";
    floorButton.className = "floor-view";
    floorButton.addEventListener("click", () => {
      planFloor = planFloor === 1 ? 2 : 1;
      syncDesign();
    });
    document.querySelector(".drawing-footer").append(floorButton);
  }
  floorButton.hidden = design.floors !== 2 || drawingView !== "plan";
  floorButton.textContent = `Показан этаж ${planFloor} · переключить ↗`;
  const cost = estimateCost(),
    delta = design.budget * 1000000 - cost;
  document.getElementById("calc-cost").textContent = millions(cost);
  document.getElementById("budget-status").textContent =
    delta >= 0
      ? `В пределах ориентира: запас ${millions(delta)}.`
      : `Выше бюджета на ${millions(-delta)}. Попробуй меньшую площадь или другой фасад.`;
  document
    .getElementById("budget-status")
    .classList.toggle("over-budget", delta < 0);
  const preset = housePresets[design.preset];
  let advice = preset.reason;
  if (design.floors !== preset.floors)
    advice =
      design.floors === 2
        ? "Общая зона находится внизу, спальни — наверху. Лестница входит в площадь дома; два уровня уменьшают пятно на участке."
        : "Все помещения на одном уровне. Лестница не нужна, но дом занимает больше места на участке.";
  const bedrooms = roomProgram().filter((r) => r.type === "bedroom");
  if (bedrooms.some((r) => r.area < 10))
    advice += " Есть спальня меньше 10 м²: проверь мебель и проходы.";
  document.getElementById("design-advice").textContent = advice;
  document.getElementById("room-program").innerHTML = roomProgram()
    .map(
      (r) =>
        `<span><strong>${escapeHTML(r.name)}</strong>${r.area.toFixed(1)} м²</span>`,
    )
    .join("");
  syncEditor();
  drawPavilion();
}
function applyPreset(id, scroll = false) {
  const p = housePresets[id];
  design = {
    preset: id,
    area: p.area,
    floors: p.floors,
    material: p.material,
    budget: p.budget,
  };
  planFloor = 1;
  syncDesign();
  if (scroll)
    document
      .getElementById("cad-studio")
      .scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" });
}
document
  .querySelectorAll("[data-preset]")
  .forEach((b) =>
    b.addEventListener("click", () => applyPreset(b.dataset.preset, true)),
  );
document
  .getElementById("lifestyle-select")
  .addEventListener("change", (e) => applyPreset(e.target.value));
document.getElementById("area-range").addEventListener("input", (e) => {
  design.area = Number(e.target.value);
  syncDesign();
});
document.getElementById("budget-range").addEventListener("input", (e) => {
  design.budget = Number(e.target.value);
  syncDesign();
});
document.querySelectorAll("[data-floors]").forEach((b) =>
  b.addEventListener("click", () => {
    design.floors = Number(b.dataset.floors);
    syncDesign();
  }),
);
document.querySelectorAll("[data-mat]").forEach((b) =>
  b.addEventListener("click", () => {
    design.material = b.dataset.mat;
    syncDesign();
  }),
);
document.querySelectorAll("[data-view]").forEach((b) =>
  b.addEventListener("click", () => {
    drawingView = b.dataset.view;
    syncDesign();
  }),
);
function renderComparison() {
  const has = savedVariants.length > 0;
  document.getElementById("compare-empty").hidden = has;
  document.getElementById("comparison").hidden = !has;
  if (!has) return;
  const rows = [
    ["Сценарий", (d) => housePresets[d.preset].name],
    ["Площадь", (d) => `${d.area} м²`],
    ["Этажи", (d) => String(d.floors)],
    ["Крыша", (d) => (d.facade?.roof === "gable" ? "Скатная" : "Плоская")],
    ["Терраса", (d) => (d.facade?.terrace ? "Да" : "Нет")],
    [
      "Спальни",
      (d) => String(roomProgram(d).filter((r) => r.type === "bedroom").length),
    ],
    ["Фасад", (d) => houseMaterials[d.material].name],
    ["Ориентир модели", (d) => millions(estimateCost(d))],
    ["Твой бюджет", (d) => `${d.budget} млн ₽`],
    [
      "Разница с бюджетом",
      (d) => {
        const delta = d.budget * 1000000 - estimateCost(d);
        return delta >= 0
          ? `Запас ${millions(delta)}`
          : `Выше на ${millions(-delta)}`;
      },
    ],
  ];
  const table = document.getElementById("comparison-table");
  table.innerHTML = `<caption class="sr-only">Сохранённые варианты загородного дома</caption><thead><tr><th scope="col">Параметр</th>${savedVariants.map((d, i) => `<th scope="col">Вариант 0${i + 1}</th>`).join("")}</tr></thead><tbody>${rows.map(([label, fn]) => `<tr><th scope="row">${label}</th>${savedVariants.map((d) => `<td>${fn(d)}</td>`).join("")}</tr>`).join("")}<tr><th scope="row">Действия</th>${savedVariants.map((d, i) => `<td><button class="compare-action" data-load="${i}">Открыть ↗</button><button class="compare-action remove" data-remove="${i}" aria-label="Удалить вариант ${i + 1}">Удалить ×</button></td>`).join("")}</tr></tbody>`;
  table.querySelectorAll("[data-load]").forEach((b) =>
    b.addEventListener("click", () => {
      design = structuredClone(savedVariants[Number(b.dataset.load)]);
      planFloor = 1;
      syncDesign();
      document
        .getElementById("cad-studio")
        .scrollIntoView({ behavior: reducedMotion ? "instant" : "smooth" });
    }),
  );
  table.querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      savedVariants.splice(Number(b.dataset.remove), 1);
      persistVariants();
      renderComparison();
      document.getElementById("saved-status").textContent =
        "Вариант удалён. Можно сохранить новый.";
      const target =
        document.querySelector("[data-remove]") ||
        document.querySelector("#compare-empty .text-link");
      target.focus({ preventScroll: true });
    }),
  );
}
document.getElementById("save-variant").addEventListener("click", () => {
  const status = document.getElementById("saved-status");
  if (savedVariants.some((d) => JSON.stringify(d) === JSON.stringify(design))) {
    status.textContent =
      "Этот вариант уже сохранён. Измени параметры для сравнения.";
    return;
  }
  if (savedVariants.length >= 3) {
    status.textContent =
      "Уже сохранены три варианта. Удали один в сравнении, чтобы добавить новый.";
    return;
  }
  savedVariants.push(structuredClone(design));
  persistVariants();
  renderComparison();
  status.textContent = storageAvailable
    ? `Вариант 0${savedVariants.length} сохранён в этом браузере. Сравнение — ниже.`
    : "Вариант сохранён на время этой страницы: браузер не разрешил постоянное хранение.";
});
document.getElementById("download-brief").addEventListener("click", () => {
  if (!savedVariants.length) return;
  const text =
    "KAIROS — задание для обсуждения с архитектором\n\n" +
    savedVariants
      .map(
        (d, i) =>
          `ВАРИАНТ ${i + 1}: ${housePresets[d.preset].name}\nПлощадь: ${d.area} м²\nЭтажей: ${d.floors}\nФасад: ${houseMaterials[d.material].name}\nБюджет: ${d.budget} млн ₽\nОриентир модели: ${millions(estimateCost(d))}\nКрыша: ${d.facade?.roof === "gable" ? "Скатная" : "Плоская"}\nТон фасада: ${d.facade?.color || "по умолчанию"}\nКровля: ${d.facade?.roofColor || "по умолчанию"}\nОстекление: ${d.facade?.windows === "wide" ? "Панорамное" : "Сдержанное"}\nТерраса: ${d.facade?.terrace ? "Да" : "Нет"}\nОтделка сторон: ${["front", "side", "rear", "left"].map((k, j) => ["Главная", "Правая", "Задняя", "Левая"][j] + ": " + houseMaterials[d.facade?.[k] || d.material].name).join("; ")}\nПомещения: ${roomProgram(
            d,
          )
            .map((r) => `${r.name} ${r.area.toFixed(1)} м²`)
            .join("; ")}\n`,
      )
      .join("\n") +
    "\nВопросы для следующего шага:\n1. Как разместить дом на моём участке и ориентировать его по солнцу?\n2. Какие ограничения участка и региона нужно учесть?\n3. Какая конструкция подходит к плану?\n4. Что включено в реальную смету, а что оплачивается отдельно?\n\nЭскиз и ставки модели условные. Это не строительный чертёж и не коммерческая смета. Стоимость участка, мебели и инженерии не включена.\n";
  if (briefURL) URL.revokeObjectURL(briefURL);
  briefURL = URL.createObjectURL(
    new Blob([text], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = briefURL;
  link.download = "kairos-house-brief.txt";
  link.click();
  showToast("Задание собрано. Скачивание началось.");
});
syncDesign();
renderComparison();
