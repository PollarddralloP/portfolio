// The topology has named services and visible states, rather than decorative geometry.
const networkServices = [
  {
    id: "gateway",
    name: "Шлюз",
    role: "Принимает внешние запросы и передаёт их магазину.",
    x: 110,
    y: 205,
  },
  {
    id: "store",
    name: "Витрина",
    role: "Показывает каталог и страницы магазина покупателям.",
    x: 300,
    y: 80,
  },
  {
    id: "orders",
    name: "Заказы",
    role: "Создаёт заказы и связывает оплату со складом.",
    x: 310,
    y: 205,
  },
  {
    id: "database",
    name: "База данных",
    role: "Хранит данные каталога и заказов. К ней обращаются внутренние сервисы.",
    x: 515,
    y: 80,
  },
  {
    id: "payments",
    name: "Оплата",
    role: "Обрабатывает платёжную часть заказа.",
    x: 515,
    y: 205,
  },
  {
    id: "warehouse",
    name: "Склад",
    role: "Хранит файлы для сборки и отправки заказов.",
    x: 425,
    y: 335,
  },
];
const networkLinks = [
  ["gateway", "store"],
  ["gateway", "orders"],
  ["store", "database"],
  ["orders", "database"],
  ["orders", "payments"],
  ["orders", "warehouse"],
];
let serviceStates = Object.fromEntries(
  networkServices.map((s) => [s.id, "healthy"]),
);
const stateNames = {
  healthy: "Работает",
  threatened: "Под угрозой",
  isolated: "Изолирован",
  offline: "Отключён",
};
function inspectService(id) {
  const service = networkServices.find((s) => s.id === id);
  document.getElementById("node-inspector").textContent =
    `${service.name}: ${service.role} Сейчас: ${stateNames[serviceStates[id]]}.`;
  document
    .querySelectorAll("[data-service]")
    .forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.service === id)),
    );
}
function renderNetwork() {
  const svg = document.getElementById("network-map");
  const lines = networkLinks
    .map(([a, b]) => {
      const from = networkServices.find((s) => s.id === a),
        to = networkServices.find((s) => s.id === b);
      const state =
        [serviceStates[a], serviceStates[b]].find((s) => s !== "healthy") ||
        "healthy";
      return `<path class="network-link ${state}" d="M${from.x} ${from.y} L${to.x} ${to.y}"/>`;
    })
    .join("");
  const nodes = networkServices
    .map(
      (s) =>
        `<g class="network-node ${serviceStates[s.id]}" data-node="${s.id}" transform="translate(${s.x},${s.y})"><circle class="node-halo" r="39"/><circle class="node-body" r="27"/><path class="node-glyph" d="M-9 -7H9V7H-9Z M-5 -2H5 M-5 2H2"/><circle class="node-indicator" cx="22" cy="-20" r="5"/><text y="55" class="node-name">${s.name}</text><text y="72" class="node-state">${stateNames[serviceStates[s.id]]}</text></g>`,
    )
    .join("");
  svg.innerHTML = `<defs><pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#344652"/></pattern></defs><rect width="660" height="410" fill="url(#grid)"/><text x="22" y="26" class="map-label">ТОПОЛОГИЯ / 06 УЗЛОВ</text>${lines}${nodes}`;
  svg.setAttribute(
    "aria-label",
    networkServices
      .map((s) => `${s.name}: ${stateNames[serviceStates[s.id]]}`)
      .join(". "),
  );
  svg
    .querySelectorAll("[data-node]")
    .forEach((g) =>
      g.addEventListener("click", () => inspectService(g.dataset.node)),
    );
  document.getElementById("service-buttons").innerHTML = networkServices
    .map(
      (s) =>
        `<button data-service="${s.id}" aria-pressed="false" class="service-btn ${serviceStates[s.id]}">${s.name}<span>${stateNames[serviceStates[s.id]]}</span></button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-service]")
    .forEach((b) =>
      b.addEventListener("click", () => inspectService(b.dataset.service)),
    );
}
function setNetwork(states = {}, label = "Штатный режим") {
  serviceStates = Object.fromEntries(
    networkServices.map((s) => [s.id, states[s.id] || "healthy"]),
  );
  document.getElementById("network-status").textContent = label;
  document.getElementById("node-inspector").textContent =
    "Нажми на сервис, чтобы узнать его роль.";
  renderNetwork();
}
setNetwork();
