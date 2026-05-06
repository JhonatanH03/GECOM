(function() {
  // Ocultar el contenido inmediatamente
  document.documentElement.style.display = 'none';
  
  const rol = localStorage.getItem("rol");
  const uid = localStorage.getItem("uid");
  const usuario = localStorage.getItem("usuario");
  const showSessionBanner = localStorage.getItem("gecomDebugSessionBanner") === "true";

  function getIdiomaUI() {
    return (localStorage.getItem("idioma") || "es") === "en" ? "en" : "es";
  }

  function obtenerEtiquetaRol(valorRol, idioma) {
    if (idioma === "en") {
      if (valorRol === "admin") return "Administrator";
      if (valorRol === "ayuntamiento") return "City Hall";
      if (valorRol === "junta") return "Neighborhood Board";
      return "User";
    }

    if (valorRol === "admin") return "Administrador";
    if (valorRol === "ayuntamiento") return "Ayuntamiento";
    if (valorRol === "junta") return "Junta de Vecinos";
    return "Usuario";
  }

  function actualizarBannerSesion() {
    const banner = document.getElementById("sessionUserBanner");
    if (!banner) return;

    const idioma = getIdiomaUI();
    const rolLabel = obtenerEtiquetaRol(rol, idioma);
    const usuarioLabel = usuario || uid;
    const etiquetaSesion = idioma === "en" ? "Active session:" : "Sesión activa:";

    const labelNode = banner.querySelector("#sessionUserLabel");
    const roleNode = banner.querySelector("#sessionUserRole");
    const userNode = banner.querySelector("#sessionUserName");

    if (labelNode) labelNode.textContent = etiquetaSesion;
    if (roleNode) roleNode.textContent = rolLabel;
    if (userNode) userNode.textContent = usuarioLabel;
  }

  function insertarBannerSesion() {
    if (!document.body || document.getElementById("sessionUserBanner")) return;

    const banner = document.createElement("div");
    banner.id = "sessionUserBanner";
    banner.className = "alert alert-info py-2 px-3 mb-0 rounded-0 border-0";
    banner.style.position = "sticky";
    banner.style.top = "0";
    banner.style.zIndex = "1040";
    banner.innerHTML = `<strong id="sessionUserLabel"></strong> <span id="sessionUserRole"></span> - <span id="sessionUserName"></span>`;

    document.body.prepend(banner);
    actualizarBannerSesion();
  }
  
  // Si hay autenticación válida, mostrar la página
  if (rol && uid) {
    const esDashboard = window.location.pathname.toLowerCase().includes("dashboard.html");
    const fadeMs = esDashboard ? 90 : 160;
    document.documentElement.style.display = 'block';
    if (showSessionBanner) {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", insertarBannerSesion);
      } else {
        insertarBannerSesion();
      }

      window.addEventListener("gecom:language-changed", actualizarBannerSesion);
    }

    // ── Transiciones de página ──────────────────────────────────────
    // Fade-in al cargar
    document.documentElement.style.opacity = '0';
    document.documentElement.style.transition = `opacity ${fadeMs}ms ease`;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        requestAnimationFrame(() => { document.documentElement.style.opacity = '1'; });
      });
    } else {
      requestAnimationFrame(() => { document.documentElement.style.opacity = '1'; });
    }

    // Fade-out al navegar (links internos y window.location)
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto') || a.target === '_blank') return;
      e.preventDefault();
      document.documentElement.style.opacity = '0';
      setTimeout(() => { window.location.href = href; }, fadeMs);
    });

  } else {
    // Si no hay autenticación, redirigir a login
    window.location.replace("index.html");
  }
})();