/* Independent workspace navigation: must not depend on simulator modules. */
(() => {
  const tabs = Array.from(document.querySelectorAll(".tab[data-tab]"));
  const panels = Array.from(document.querySelectorAll(".workspace[id]"));
  if (!tabs.length || !panels.length) return;

  const activate = (id) => {
    const panel = document.getElementById(id);
    const tab = tabs.find((item) => item.dataset.tab === id);
    if (!panel || !tab || !panels.includes(panel)) return;

    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("active", selected);
      item.setAttribute("aria-selected", String(selected));
      item.setAttribute("tabindex", selected ? "0" : "-1");
    });
    panels.forEach((item) => {
      const selected = item === panel;
      item.classList.toggle("active", selected);
      item.hidden = !selected;
    });
  };

  tabs.forEach((tab) => {
    tab.setAttribute("role", "tab");
    tab.addEventListener("click", () => activate(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const index = tabs.indexOf(tab);
      const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      activate(tabs[next].dataset.tab);
    });
  });

  const initial = tabs.find((tab) => tab.classList.contains("active"))?.dataset.tab || tabs[0].dataset.tab;
  activate(initial);
})();
