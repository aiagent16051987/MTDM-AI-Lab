/* Accessible delegated navigation for all workspace tabs. */
(() => {
  function init() {
    const nav = document.querySelector(".tabs");
    if (!nav) return;
    const tabs = [...nav.querySelectorAll("[data-tab]")];
    const panels = [...document.querySelectorAll("main .workspace[id]")];
    const activate = (id, moveFocus = false) => {
      const panel = document.getElementById(id);
      if (!panel || !panels.includes(panel)) return false;
      for (const tab of tabs) {
        const selected = tab.dataset.tab === id;
        tab.classList.toggle("active", selected);
        tab.setAttribute("aria-selected", String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const item of panels) {
        const selected = item === panel;
        item.classList.toggle("active", selected);
        item.hidden = !selected;
        item.style.display = selected ? "block" : "none";
      }
      if (moveFocus) tabs.find(tab => tab.dataset.tab === id)?.focus();
      return true;
    };
    nav.addEventListener("click", event => {
      const tab = event.target.closest("[data-tab]");
      if (tab && nav.contains(tab)) activate(tab.dataset.tab);
    });
    nav.addEventListener("keydown", event => {
      const current = event.target.closest("[data-tab]");
      if (!current) return;
      const index = tabs.indexOf(current);
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(tabs[next].dataset.tab, true);
    });
    const first = nav.querySelector('[data-tab][aria-selected="true"]') || nav.querySelector("[data-tab].active") || tabs[0];
    if (first) activate(first.dataset.tab);
    window.mtdmShowTab = activate;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
