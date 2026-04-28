(function() {
  // Ocultar el contenido inmediatamente
  document.documentElement.style.display = 'none';
  
  const rol = localStorage.getItem("rol");
  const uid = localStorage.getItem("uid");
  const usuario = localStorage.getItem("usuario");

  function obtenerEtiquetaRol(valorRol) {
    if (valorRol === "admin") return "Administrador";
    if (valorRol === "ayuntamiento") return "Ayuntamiento";
    if (valorRol === "junta") return "Junta de Vecinos";
    return "Usuario";
  }

  function insertarBannerSesion() {
    if (!document.body || document.getElementById("sessionUserBanner")) return;

    const rolLabel = obtenerEtiquetaRol(rol);
    const usuarioLabel = usuario || uid;

    const banner = document.createElement("div");
    banner.id = "sessionUserBanner";
    banner.className = "alert alert-info py-2 px-3 mb-0 rounded-0 border-0";
    banner.style.position = "sticky";
    banner.style.top = "0";
    banner.style.zIndex = "1040";
    banner.innerHTML = `<strong>Sesión activa:</strong> ${rolLabel} - ${usuarioLabel}`;

    document.body.prepend(banner);
  }
  
  // Si hay autenticación válida, mostrar la página
  if (rol && uid) {
    document.documentElement.style.display = 'block';
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", insertarBannerSesion);
    } else {
      insertarBannerSesion();
    }
  } else {
    // Si no hay autenticación, redirigir a login
    window.location.replace("index.html");
  }
})();