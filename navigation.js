/* Robust delegated navigation fallback for all workspace tabs. */
(() => {
  function init() {
    const nav = document.querySelector(".tabs");
    if (!nav) return;
    const activate = (id) => {
      const tabs = [...nav.querySelectorAll("[data-tab]")];
      const panels = [...document.querySelectorAll("main .workspace[id]")];
      const panel = document.getElementById(id);
      if (!panel || !panels.includes(panel)) return;
      for (const tab of tabs) {
        const selected = tab.dataset.tab === id;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
      }
      for (const item of panels) {
        const selected = item === panel;
        item.classList.toggle("active", selected);
        item.hidden = !selected;
        item.style.display = selected ? "block" : "none";
      }
    };
    nav.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (tab && nav.contains(tab)) activate(tab.dataset.tab);
    }, true);
    const first = nav.querySelector("[data-tab].active") || nav.querySelector("[data-tab]");
    if (first) activate(first.dataset.tab);
    window.mtdmShowTab = activate;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
