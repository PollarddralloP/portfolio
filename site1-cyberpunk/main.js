const missions = {
  ddos: {
    title: "Магазин не отвечает",
    preview:
      "Шлюз завален запросами. Покупатели не могут открыть магазин. Как вернуть доступ, не выключая всё остальное?",
    clue: "Запросов слишком много, но внутренние данные не изменены. Узкое место — внешний шлюз.",
    signal: "СИГНАЛ / ВНЕШНИЙ ТРАФИК ПЕРЕГРУЖАЕТ ШЛЮЗ",
    threat: { gateway: "threatened", store: "offline", orders: "offline" },
    lesson:
      "В этом сценарии нужно ограничить вредный трафик на входе. Перезапуск не убирает его источник.",
    choices: [
      {
        id: "filter",
        title: "Отфильтровать запросы",
        description: "Ограничить подозрительный трафик на шлюзе.",
        good: true,
        states: {},
        heading: "Магазин снова доступен.",
        explanation:
          "Поток подозрительных запросов ограничен на входе. Витрина и заказы снова отвечают, внутренние сервисы продолжили работу.",
      },
      {
        id: "restart",
        title: "Перезапустить шлюз",
        description: "Попробовать вернуть сервис перезапуском.",
        states: { gateway: "threatened", store: "offline", orders: "offline" },
        heading: "Трафик вернулся вместе со шлюзом.",
        explanation:
          "Перезапуск дал короткую паузу, но новые запросы снова перегрузили шлюз. Витрина и заказы по-прежнему недоступны.",
      },
      {
        id: "shutdown",
        title: "Отключить всю сеть",
        description: "Остановить все сервисы до выяснения причины.",
        states: {
          gateway: "offline",
          store: "offline",
          orders: "offline",
          database: "offline",
          payments: "offline",
          warehouse: "offline",
        },
        heading: "Атака остановилась. Магазин тоже.",
        explanation:
          "Отключение остановило трафик вместе со всей работой. В этом сценарии можно было сохранить внутренние сервисы и восстановить вход.",
      },
    ],
  },
  ransomware: {
    title: "На складе шифруются файлы",
    preview:
      "На складе найден процесс, который меняет файлы. Сервис ещё связан с заказами. Как не дать заражению распространиться?",
    clue: "Первый заражённый узел — склад. Заказы и база данных пока работают. Главная задача — ограничить распространение.",
    signal: "СИГНАЛ / НЕОЖИДАННОЕ ИЗМЕНЕНИЕ ФАЙЛОВ НА СКЛАДЕ",
    threat: { warehouse: "threatened" },
    lesson:
      "Сначала ограничь связи заражённого узла. Восстановление на всё ещё заражённой машине не решает проблему.",
    choices: [
      {
        id: "restore",
        title: "Сразу восстановить файлы",
        description: "Вернуть копию на тот же подключённый склад.",
        states: {
          warehouse: "threatened",
          orders: "offline",
          database: "threatened",
        },
        heading: "Копия не остановила процесс.",
        explanation:
          "Заражённый процесс остался активным и связанным с сетью. В учебной модели он добрался до базы, а сервис заказов пришлось остановить.",
      },
      {
        id: "isolate",
        title: "Изолировать склад",
        description: "Разорвать его связи, сохранив остальные узлы.",
        good: true,
        states: { warehouse: "isolated" },
        heading: "Распространение остановлено.",
        explanation:
          "Склад изолирован. Пять других узлов остаются активными; отправка заказов временно на паузе. Теперь можно разбирать заражение и восстанавливать склад отдельно.",
      },
      {
        id: "shutdown",
        title: "Отключить всю сеть",
        description: "Остановить магазин, оплату и все внутренние узлы.",
        states: {
          gateway: "offline",
          store: "offline",
          orders: "offline",
          database: "offline",
          payments: "offline",
          warehouse: "offline",
        },
        heading: "Потерян весь магазин.",
        explanation:
          "Отключение ограничило распространение, но остановило и незаражённые узлы. Точечная изоляция сохранила бы большую часть сети.",
      },
    ],
  },
  zeroday: {
    title: "Сервис заказов ведёт себя странно",
    preview:
      "Сервис заказов выполняет неизвестные команды. Обычная проверка ещё не знает эту угрозу. Что защитит соседние узлы?",
    clue: "Необычное поведение важнее отсутствия известной сигнатуры. Источник — сервис заказов, связанный с базой и оплатой.",
    signal: "СИГНАЛ / НЕИЗВЕСТНЫЕ КОМАНДЫ В СЕРВИСЕ ЗАКАЗОВ",
    threat: { orders: "threatened" },
    lesson:
      "Неизвестную угрозу сначала сдерживают. Отсутствие известного имени не означает, что поведение безопасно.",
    choices: [
      {
        id: "ignore",
        title: "Продолжить наблюдение",
        description: "Ничего не менять до появления известного сигнала.",
        states: {
          orders: "threatened",
          database: "threatened",
          payments: "offline",
        },
        heading: "Ожидание расширило инцидент.",
        explanation:
          "В этой модели неизвестные команды распространились по связям. База оказалась под угрозой, а оплату пришлось остановить.",
      },
      {
        id: "restart",
        title: "Перезапустить заказы",
        description: "Очистить процесс, сохранив прежние связи.",
        states: { orders: "threatened", database: "threatened" },
        heading: "Симптом исчез лишь на время.",
        explanation:
          "Причина и связи не изменились. После перезапуска неизвестная активность вернулась и затронула базу данных.",
      },
      {
        id: "contain",
        title: "Изолировать сервис заказов",
        description: "Ограничить связи и оставить узел для разбора.",
        good: true,
        states: { orders: "isolated" },
        heading: "Ты выиграл время для разбора.",
        explanation:
          "Заказы временно изолированы, соседние узлы сохранены. Витрина открывается, но новые заказы на паузе до безопасного восстановления.",
      },
    ],
  },
};
Object.assign(missions, additionalMissions);
Object.values(missions).forEach((m) => (m.category ||= "Базовые ситуации"));
let selectedMission = "ddos",
  missionActive = false,
  completed = new Set();
function addEvent(text) {
  const item = document.createElement("li");
  item.textContent = text;
  document.getElementById("event-log").append(item);
}
function selectMission(id) {
  selectedMission = id;
  missionActive = false;
  document.querySelectorAll("[data-scenario]").forEach((b) => {
    const active = b.dataset.scenario === id;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  document.getElementById("case-preview").textContent = missions[id].preview;
  document.getElementById("response").hidden = true;
  document.getElementById("start-mission").innerHTML =
    "Начать инцидент <span>→</span>";
  setNetwork();
}
function startMission() {
  const m = missions[selectedMission];
  missionActive = true;
  setNetwork(m.threat, "Инцидент активен");
  document.getElementById("response").hidden = false;
  document.getElementById("outcome").hidden = true;
  document.getElementById("incident-title").textContent = m.title;
  document.getElementById("incident-clue").textContent =
    document.getElementById("self-check").checked
      ? "Выбери первое обоснованное действие. Разбор появится после ответа."
      : m.clue;
  document.getElementById("incident-signal").textContent = m.signal;
  document.getElementById("response-actions").innerHTML = m.choices
    .map(
      (c, i) =>
        `<button class="response-btn" data-choice="${c.id}"><span class="choice-number">0${i + 1}</span><strong>${c.title}</strong><span>${c.description}</span><span class="choice-arrow">↗</span></button>`,
    )
    .join("");
  document
    .querySelectorAll("[data-choice]")
    .forEach((b) =>
      b.addEventListener("click", () => resolveMission(b.dataset.choice)),
    );
  document.getElementById("event-log").replaceChildren();
  addEvent(`Обнаружен инцидент: ${m.title}.`);
  addEvent(m.clue);
  document.getElementById("start-mission").textContent = "Начать заново ↺";
  document.querySelector("[data-choice]").focus({ preventScroll: true });
  document.getElementById("response").scrollIntoView({
    behavior: reducedMotion ? "instant" : "smooth",
    block: "start",
  });
}
function resolveMission(id) {
  if (!missionActive) return;
  missionActive = false;
  const m = missions[selectedMission],
    choice = m.choices.find((c) => c.id === id);
  setNetwork(
    choice.states,
    choice.good ? "Угроза ограничена" : "Нужен другой ответ",
  );
  document.querySelectorAll("[data-choice]").forEach((b) => {
    b.disabled = true;
    b.classList.toggle("chosen", b.dataset.choice === id);
  });
  if (choice.good) completed.add(selectedMission);
  attempts.push({ id: selectedMission, good: !!choice.good });
  try {
    localStorage.setItem(
      "aether-training-v2",
      JSON.stringify({
        completed: [...completed],
        attempts: attempts.slice(-2000),
      }),
    );
  } catch {
    trainingStorageAvailable = false;
  }
  updateTraining();
  document.getElementById("course-progress").textContent =
    `Пройдено ${completed.size} / ${Object.keys(missions).length}`;
  const available = Object.values(serviceStates).filter(
    (s) => s === "healthy",
  ).length;
  const outcome = document.getElementById("outcome");
  outcome.hidden = false;
  outcome.classList.toggle("successful", !!choice.good);
  document.getElementById("outcome-symbol").textContent = choice.good
    ? "✓"
    : "!";
  document.getElementById("outcome-label").textContent = choice.good
    ? "Точное решение"
    : "Попробуй иначе";
  document.getElementById("outcome-title").textContent = choice.heading;
  document.getElementById("available-count").textContent =
    `${available} / 6 узлов активны`;
  document.getElementById("outcome-explanation").textContent =
    choice.explanation;
  document.getElementById("outcome-lesson").textContent = m.lesson;
  document.getElementById("outcome-services").innerHTML = networkServices
    .map(
      (s) =>
        `<span class="${serviceStates[s.id]}">${s.name}<small>${stateNames[serviceStates[s.id]]}</small></span>`,
    )
    .join("");
  document.getElementById("next-mission").textContent =
    completed.size === Object.keys(missions).length
      ? "Все пройдены · ещё круг ↺"
      : "Следующий инцидент →";
  addEvent(`Твоё решение: ${choice.title}.`);
  addEvent(`${choice.heading} ${available} из 6 узлов активны.`);
  outcome.scrollIntoView({
    behavior: reducedMotion ? "instant" : "smooth",
    block: "nearest",
  });
}
document
  .querySelectorAll("[data-scenario]")
  .forEach((b) =>
    b.addEventListener("click", () => selectMission(b.dataset.scenario)),
  );
document
  .getElementById("start-mission")
  .addEventListener("click", startMission);
document
  .getElementById("retry-mission")
  .addEventListener("click", startMission);
document.getElementById("next-mission").addEventListener("click", () => {
  const ids = Object.keys(missions);
  selectMission(ids[(ids.indexOf(selectedMission) + 1) % ids.length]);
  startMission();
});

const attempts = [];
let trainingStorageAvailable = true;
try {
  const saved = JSON.parse(
    localStorage.getItem("aether-training-v2") || "null",
  );
  if (saved && Array.isArray(saved.completed))
    saved.completed
      .filter((id) => Object.hasOwn(missions, id))
      .forEach((id) => completed.add(id));
  if (saved && Array.isArray(saved.attempts))
    attempts.push(
      ...saved.attempts
        .filter(
          (a) =>
            a && Object.hasOwn(missions, a.id) && typeof a.good === "boolean",
        )
        .slice(-2000),
    );
} catch {
  trainingStorageAvailable = false;
}
function updateTraining() {
  document.getElementById("course-progress").textContent =
    `Пройдено ${completed.size} / ${Object.keys(missions).length}`;
  const correct = attempts.filter((a) => a.good).length;
  document.getElementById("training-stats").textContent = attempts.length
    ? `${attempts.length} ответов · ${Math.round((correct / attempts.length) * 100)}% верных`
    : "103 ситуации · 10 новых тем";
  if (!trainingStorageAvailable)
    document.getElementById("training-stats").textContent +=
      " · сохранение недоступно, прогресс только в этой вкладке";
  renderCatalog();
}
function renderCatalog() {
  const query = document
    .getElementById("incident-search")
    .value.toLocaleLowerCase("ru");
  const category = document.getElementById("incident-category").value;
  const errors = document.getElementById("errors-only").checked;
  const wrong = new Set(attempts.filter((a) => !a.good).map((a) => a.id));
  const entries = Object.entries(missions).filter(
    ([id, m]) =>
      (!category || m.category === category) &&
      (!errors || wrong.has(id)) &&
      `${m.title} ${m.preview}`.toLocaleLowerCase("ru").includes(query),
  );
  document.getElementById("catalog-count").textContent =
    `Найдено: ${entries.length}`;
  const list = document.querySelector(".scenario-list");
  list.replaceChildren();
  entries.forEach(([id, m]) => {
    const b = document.createElement("button");
    b.className = "scenario";
    b.dataset.scenario = id;
    b.setAttribute("aria-pressed", String(id === selectedMission));
    b.classList.toggle("active", id === selectedMission);
    const title = document.createElement("strong");
    title.textContent = m.title;
    const sub = document.createElement("small");
    sub.textContent = `${m.category}${completed.has(id) ? " · ✓ пройдено" : ""}`;
    b.append(title, sub);
    b.addEventListener("click", () => selectMission(id));
    list.append(b);
  });
  if (!entries.length) {
    const p = document.createElement("p");
    p.textContent = "Нет ситуаций по этим условиям. Измени поиск или фильтр.";
    list.append(p);
  }
}
[...new Set(Object.values(missions).map((m) => m.category))].forEach((c) => {
  const o = document.createElement("option");
  o.value = c;
  o.textContent = c;
  document.getElementById("incident-category").append(o);
});
["incident-search", "incident-category", "errors-only"].forEach((id) =>
  document.getElementById(id).addEventListener("input", renderCatalog),
);
document.getElementById("random-incident").addEventListener("click", () => {
  const pool = Object.keys(missions).filter((id) => id !== selectedMission);
  selectMission(pool[Math.floor(Math.random() * pool.length)]);
  startMission();
});
updateTraining();
selectMission("ddos");
