(function () {
  function aplicarTema(html, body, menuTema) {
    if (!html || !body) return;

    const tema = localStorage.getItem("tema") || "sistema";
    let temaFinal = tema;

    if (tema === "sistema") {
      temaFinal = window.matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
    }

    if (temaFinal === "oscuro") {
      html.setAttribute("data-bs-theme", "dark");
      body.classList.remove("bg-light");
      body.classList.add("bg-dark");
    } else {
      html.setAttribute("data-bs-theme", "light");
      body.classList.remove("bg-dark");
      body.classList.add("bg-light");
    }

    if (menuTema) {
      menuTema.querySelectorAll("a[data-tema]").forEach((a) => {
        a.classList.remove("active");
        if (a.dataset.tema === tema) a.classList.add("active");
      });
    }
  }

  window.initThemeSelector = function initThemeSelector(options) {
    const settings = options || {};
    const html = document.getElementById(settings.htmlId || "htmlRoot");
    const body = document.getElementById(settings.bodyId || "bodyRoot");
    const menuTema = document.getElementById(settings.menuId || "menuTema");

    aplicarTema(html, body, menuTema);

    if (menuTema) {
      menuTema.querySelectorAll("a[data-tema]").forEach((a) => {
        a.addEventListener("click", function (e) {
          e.preventDefault();
          localStorage.setItem("tema", a.dataset.tema);
          aplicarTema(html, body, menuTema);
        });
      });
    }

    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
      if ((localStorage.getItem("tema") || "sistema") === "sistema") {
        aplicarTema(html, body, menuTema);
      }
    });
  };
})();
