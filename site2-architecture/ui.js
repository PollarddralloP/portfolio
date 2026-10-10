const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reducedMotion && "IntersectionObserver" in window) {
  document.documentElement.classList.add("js-motion");
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.08 },
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
}
const menuButton = document.querySelector(".menu-toggle"),
  menu = document.querySelector(".nav-links");
menuButton?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.textContent = open ? "Закрыть −" : "Меню +";
});
menu?.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    menu.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
    if (menuButton) menuButton.textContent = "Меню +";
  }),
);
let lastFocus, toastTimer;
function showToast(message) {
  const el = document.querySelector(".toast");
  el.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.textContent = ""), 5000);
}
function showDialog(id) {
  const modal = document.getElementById(id);
  lastFocus = document.activeElement;
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document
    .querySelectorAll("body>header,body>main,body>footer")
    .forEach((el) => (el.inert = true));
  modal.querySelector("button")?.focus();
}
function hideDialog(id) {
  const modal = document.getElementById(id);
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document
    .querySelectorAll("body>header,body>main,body>footer")
    .forEach((el) => (el.inert = false));
  lastFocus?.focus();
}
document.querySelectorAll(".modal-overlay").forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hideDialog(modal.id);
  });
  modal.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hideDialog(modal.id);
    if (e.key === "Tab") {
      const controls = [
        ...modal.querySelectorAll('button,a[href],input,select,[tabindex="0"]'),
      ].filter((el) => !el.disabled);
      const first = controls[0],
        last = controls.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
});

menu?.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.textContent = "Меню +";
    menuButton.focus();
  }
});
