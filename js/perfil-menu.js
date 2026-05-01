(function () {
  // Roles legibles por idioma
  const ROLES = {
    es: { admin: "Administrador", ayuntamiento: "Ayuntamiento", junta: "Junta de Vecinos" },
    en: { admin: "Administrator", ayuntamiento: "City Hall", junta: "Neighborhood Board" },
  };

  // Traducciones básicas ES/EN
  const I18N = {
    es: {
      perfil: "Perfil",
      diseno: "Diseño",
      idioma: "Idioma",
      cerrarSesion: "Cerrar Sesión",
      claro: "Claro",
      oscuro: "Oscuro",
      sistema: "Sistema",
      cambiarContrasena: "Cambiar contraseña",
    },
    en: {
      perfil: "Profile",
      diseno: "Theme",
      idioma: "Language",
      cerrarSesion: "Sign Out",
      claro: "Light",
      oscuro: "Dark",
      sistema: "System",
      cambiarContrasena: "Change password",
    },
  };

  function getLang() {
    return localStorage.getItem("idioma") || "es";
  }

  function t(key) {
    return (I18N[getLang()] || I18N["es"])[key] || key;
  }

  function getRolLabel(rol, lang) {
    const byLang = ROLES[lang] || ROLES.es;
    return byLang[rol] || rol || "—";
  }

  function getInitial(usuario) {
    return (usuario || "U").charAt(0).toUpperCase();
  }

  function aplicarTema(tema) {
    const html = document.getElementById("htmlRoot");
    const body = document.getElementById("bodyRoot");
    if (!html || !body) return;

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
    localStorage.setItem("tema", tema);

    // Actualizar botones de tema en el menú
    const btns = document.querySelectorAll(".pm-tema-btn");
    btns.forEach(function (b) {
      b.classList.toggle("pm-tema-btn--active", b.dataset.tema === tema);
    });
  }

  function doLogout() {
    if (typeof window.logout === "function") {
      window.logout();
    } else {
      localStorage.removeItem("uid");
      localStorage.removeItem("rol");
      localStorage.removeItem("usuario");
      localStorage.removeItem("primerLogin");
      window.location.href = "index.html";
    }
  }

  function buildMenu() {
    const usuario = localStorage.getItem("usuario") || "Usuario";
    const rol = localStorage.getItem("rol") || "";
    const tema = localStorage.getItem("tema") || "sistema";
    const lang = getLang();
    const initial = getInitial(usuario);
    const rolLabel = getRolLabel(rol, lang);

    const wrap = document.createElement("div");
    wrap.id = "perfilMenuWrap";
    wrap.innerHTML = `
      <button id="perfilAvatarBtn" class="pm-avatar-btn" aria-label="Menú de usuario" title="${usuario}">
        <span class="pm-avatar-initial">${initial}</span>
      </button>
      <div id="perfilDropdown" class="pm-dropdown" style="display:none">
        <div class="pm-dropdown-header">
          <div class="pm-avatar-lg"><span>${initial}</span></div>
          <div class="pm-user-info">
            <div class="pm-username">${usuario}</div>
            <div class="pm-rol">${rolLabel}</div>
          </div>
        </div>
        <div class="pm-divider"></div>

        <a class="pm-item" href="cambiar-contrasena.html" id="pmItemPerfil">
          <i class="bi bi-person-circle"></i>
          <span>${t("perfil")}</span>
        </a>

        <div class="pm-item-sub" id="pmTemaWrap">
          <div class="pm-item-sub-trigger">
            <i class="bi bi-circle-half"></i>
            <span>${t("diseno")}</span>
            <i class="bi bi-chevron-right pm-chevron"></i>
          </div>
          <div class="pm-submenu" id="pmTemaSubmenu">
            <button class="pm-sub-opt${tema === "claro" ? " pm-sub-opt--active" : ""}" data-tema="claro">
              <i class="bi bi-sun"></i> ${t("claro")}
            </button>
            <button class="pm-sub-opt${tema === "sistema" ? " pm-sub-opt--active" : ""}" data-tema="sistema">
              <i class="bi bi-display"></i> ${t("sistema")}
            </button>
            <button class="pm-sub-opt${tema === "oscuro" ? " pm-sub-opt--active" : ""}" data-tema="oscuro">
              <i class="bi bi-moon"></i> ${t("oscuro")}
            </button>
          </div>
        </div>

        <div class="pm-item-sub" id="pmLangWrap">
          <div class="pm-item-sub-trigger">
            <i class="bi bi-translate"></i>
            <span>${t("idioma")}</span>
            <i class="bi bi-chevron-right pm-chevron"></i>
          </div>
          <div class="pm-submenu" id="pmLangSubmenu">
            <button class="pm-sub-opt${lang === "es" ? " pm-sub-opt--active" : ""}" data-lang="es">
              <i class="bi bi-chat-text"></i> Español
            </button>
            <button class="pm-sub-opt${lang === "en" ? " pm-sub-opt--active" : ""}" data-lang="en">
              <i class="bi bi-chat-text"></i> English
            </button>
          </div>
        </div>

        <div class="pm-divider"></div>
        <a class="pm-item pm-item-logout" href="#" id="pmItemLogout">
          <i class="bi bi-box-arrow-right"></i>
          <span>${t("cerrarSesion")}</span>
        </a>
      </div>
    `;
    document.body.appendChild(wrap);

    const avatarBtn = wrap.querySelector("#perfilAvatarBtn");
    const dropdown = wrap.querySelector("#perfilDropdown");

    // Toggle dropdown
    avatarBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      const visible = dropdown.style.display !== "none";
      dropdown.style.display = visible ? "none" : "block";
    });

    // Cerrar al hacer click fuera
    document.addEventListener("click", function (e) {
      if (!wrap.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });

    // Botones de tema (submenú flotante)
    wrap.querySelectorAll(".pm-sub-opt[data-tema]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        aplicarTema(btn.dataset.tema);
        wrap.querySelectorAll(".pm-sub-opt[data-tema]").forEach(function (b) {
          b.classList.toggle("pm-sub-opt--active", b.dataset.tema === btn.dataset.tema);
        });
      });
    });

    // Botones de idioma (submenú flotante)
    wrap.querySelectorAll(".pm-sub-opt[data-lang]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        localStorage.setItem("idioma", btn.dataset.lang);
        if (typeof window.applyI18n === "function") window.applyI18n(btn.dataset.lang);
        window.dispatchEvent(new CustomEvent("gecom:language-changed", { detail: { lang: btn.dataset.lang } }));
        // Actualizar activo visualmente
        wrap.querySelectorAll(".pm-sub-opt[data-lang]").forEach(function (b) {
          b.classList.toggle("pm-sub-opt--active", b.dataset.lang === btn.dataset.lang);
        });
        // Reconstruir etiquetas del menú con nuevo idioma
        var pmItemLabel = wrap.querySelectorAll(".pm-item-sub-trigger span");
        var keys = ["diseno", "idioma"];
        pmItemLabel.forEach(function(el, i){ el.textContent = t(keys[i]); });
        wrap.querySelector("#pmItemPerfil span").textContent = t("perfil");
        wrap.querySelector("#pmItemLogout span").textContent = t("cerrarSesion");
        var currentLang = getLang();
        var nextRolLabel = getRolLabel(rol, currentLang);
        wrap.querySelector(".pm-rol").textContent = nextRolLabel;
        wrap.querySelectorAll(".pm-sub-opt[data-tema]").forEach(function(b){
          var temaKey = b.dataset.tema;
          b.childNodes[b.childNodes.length - 1].textContent = " " + t(temaKey);
        });
      });
    });

    // Cerrar sesión
    wrap.querySelector("#pmItemLogout").addEventListener("click", function (e) {
      e.preventDefault();
      dropdown.style.display = "none";
      doLogout();
    });
  }

  function init() {
    // Aplicar tema guardado al arrancar
    aplicarTema(localStorage.getItem("tema") || "sistema");

    // Ocultar controles viejos de tema si existen en la página
    var viejoBtnTema = document.getElementById("btnPaletaTema");
    if (viejoBtnTema) {
      var wrapViejo = viejoBtnTema.closest(".dropdown");
      if (wrapViejo) wrapViejo.style.display = "none";
    }

    buildMenu();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
