(function () {
  // Diccionario Español -> Ingles (texto exacto visible en el DOM)
  var DICT_EN = {
    // Navegación común
    "Volver": "Back",
    "Volver al Dashboard": "Back to Dashboard",
    "← Volver al Dashboard": "← Back to Dashboard",
    "Cerrar": "Close",
    "Menú de usuario": "User menu",
    "Guardar": "Save",
    "Cancelar": "Cancel",
    "Registrar": "Register",
    "Actualizar": "Update",
    "Eliminar": "Delete",
    "Editar": "Edit",
    "Crear": "Create",
    "Acciones": "Actions",

    // Dashboard
    "Panel Principal": "Main Dashboard",
    "Centro de operaciones de GECOM": "GECOM Operations Center",
    "Sesión activa:": "Active session:",
    "Buenos días,": "Good morning,",
    "Buenas tardes,": "Good afternoon,",
    "Buenas noches,": "Good evening,",
    "Cargando perfil...": "Loading profile...",
    "Pendientes": "Pending",
    "En proceso": "In Progress",
    "Resueltas": "Resolved",
    "Rechazadas": "Rejected",
    "Registrar Denuncia": "Register Complaint",
    "Ver Denuncias": "View Complaints",
    "Panel Junta": "Board Panel",
    "Nueva denuncia": "New Complaint",
    "Ver casos": "View Cases",
    "Gestionar junta": "Manage Board",
    "Gestión de Juntas": "Board Management",
    "Ver juntas": "View boards",
    "Ver Historial": "View History",
    "Ver Estadísticas": "View Statistics",
    "Gestionar usuarios": "Manage Users",
    "Gestionar juntas": "Manage Boards",
    "Gestionar ayuntamientos": "Manage Municipalities",
    "Crea una nueva incidencia para iniciar su seguimiento oficial.": "Create a new complaint to start its official tracking.",
    "Consulta estado, respuestas y detalle completo de cada caso.": "Check status, responses and full details of each case.",
    "Supervisa juntas y coordina su operación dentro del territorio.": "Supervise boards and coordinate their operation across the territory.",
    "Registra reportes directamente para activar la gestión municipal.": "File reports directly to activate municipal management.",
    "Administra el perfil operativo y datos clave de tu junta.": "Manage the operational profile and key data of your board.",
    "Historial de cambios de estado de tus denuncias.": "Status change history of your complaints.",
    "Gráficos y métricas de las denuncias registradas.": "Charts and metrics of registered complaints.",
    "Gestiona todas las Juntas registradas en tu municipio.": "Manage all Boards registered in your municipality.",
    "Administra los ayuntamientos del sistema.": "Manage the municipalities in the system.",
    "Gestiona todos los usuarios registrados.": "Manage all registered users.",

    // Campos comunes
    "Nombre": "Name",
    "Usuario": "Username",
    "Contraseña": "Password",
    "Contraseña Temporal": "Temporary Password",
    "Teléfono": "Phone",
    "Provincia": "Province",
    "Municipio": "Municipality",
    "Sector": "Sector",
    "Comunidad": "Community",
    "Cédula": "ID Card",
    "Ubicación": "Location",
    "Dirección": "Address",
    "Estado": "Status",
    "Correo": "Email",
    "Correo institucional": "Institutional Email",
    "Activo": "Active",
    "Inactivo": "Inactive",
    "Activa": "Active",
    "Inactiva": "Inactive",
    "Seleccionar provincia": "Select province",
    "Seleccionar municipio": "Select municipality",

    // Juntas
    "Gestión de Juntas de Vecinos": "Neighborhood Board Management",
    "Crear juntas de vecinos en su territorio.": "Create neighborhood boards in your territory.",
    "Juntas registradas": "Registered Boards",
    "Crear Junta": "Create Board",
    "Crear Junta de Vecinos": "Create Neighborhood Board",
    "Editar Junta de Vecinos": "Edit Neighborhood Board",
    "Nombre de la Junta": "Board Name",
    "Cédula del Encargado": "Manager ID Card",
    "Nombre del encargado": "Manager Name",
    "Teléfono encargado": "Manager Phone",
    "Requisitos de contraseña:": "Password requirements:",
    "Al menos 6 caracteres": "At least 6 characters",
    "Una letra mayúscula": "One uppercase letter",
    "Una letra minúscula": "One lowercase letter",
    "Un número": "One number",

    // Ayuntamientos
    "Gestión de Ayuntamientos": "Municipality Management",
    "Los Administradores pueden crear Ayuntamientos.": "Administrators can create Municipalities.",
    "Ayuntamientos registrados": "Registered Municipalities",
    "Crear Ayuntamiento": "Create Municipality",
    "Nombre del Ayuntamiento": "Municipality Name",
    "Esta contraseña es de un solo uso. El ayuntamiento debe cambiarla al iniciar sesión por primera vez.": "This is a one-time password. The municipality must change it on first login.",

    // Usuarios
    "Gestión de Usuarios": "User Management",
    "Los Administradores pueden crear, editar o eliminar todas las Juntas de Vecinos.": "Administrators can create, edit, or delete all Neighborhood Boards.",
    "Usuarios registrados": "Registered Users",
    "Crear Usuario": "Create User",
    "Registrar Junta de Vecinos": "Register Neighborhood Board",
    "Nombre de la Junta": "Board Name",

    // Historial
    "Historial de Cambios": "Change History",
    "Filtrar por estado:": "Filter by status:",
    "Todos": "All",
    "Pendiente": "Pending",
    "Resuelta": "Resolved",
    "Rechazada": "Rejected",
    "Sin respuesta": "No response",

    // Estadísticas
    "Estadísticas de Denuncias": "Complaint Statistics",
    "Fecha desde:": "From date:",
    "Fecha hasta:": "To date:",
    "Aplicar Filtros": "Apply Filters",
    "Usuario:": "User:",

    // Crear denuncia
    "Registrar Denuncia": "Register Complaint",
    "Título": "Title",
    "Descripción": "Description",
    "Enviar denuncia": "Submit Complaint",
    "Adjuntar imagen": "Attach image",
    "Arrastra una imagen aquí o haz clic para subir": "Drag an image here or click to upload",

    // Ver denuncias
    "Filtrar por estado:": "Filter by status:",

    // Cambiar contraseña
    "Cambiar Contraseña": "Change Password",
    "Cambiar contraseña": "Change Password",
    "Contraseña actual": "Current Password",
    "Nueva contraseña": "New Password",
    "Confirmar contraseña": "Confirm Password",
    "Cerrar Sesión": "Sign Out",
    "Cerrar sesión": "Sign Out",
    "Gestión Comunitaria": "Community Management",
    "— Gestión Comunitaria": "— Community Management",
    "Administrador": "Administrator",
    "Ayuntamiento": "City Hall",
    "Junta de Vecinos": "Neighborhood Board",
    "Sin fecha": "No date",

    // Tabla columnas
    "Nombre de la Junta": "Board Name",
    "Teléfono encargado": "Manager Phone",
  };

  // Mapa inverso Ingles -> Espanol para poder volver a ES sin recargar.
  var DICT_ES = {};
  Object.keys(DICT_EN).forEach(function (esKey) {
    var enValue = DICT_EN[esKey];
    if (DICT_ES[enValue] === undefined) {
      DICT_ES[enValue] = esKey;
    }
  });

  // Nodos a ignorar
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1 };
  var ATTRS = ["placeholder", "title", "aria-label"];
  var ORIGINAL_TEXT = new WeakMap();
  var observer = null;
  var isApplying = false;
  var currentLang = "es";

  function normalizeSpaces(text) {
    return text.replace(/\s+/g, " ").trim();
  }

  function preserveSpacingReplace(fullText, sourceTrimmed, replacement) {
    if (!sourceTrimmed) return fullText;
    return fullText.replace(sourceTrimmed, replacement);
  }

  function translateFromSource(sourceText, lang) {
    var dict = null;
    if (lang === "en") dict = DICT_EN;
    if (lang === "es") dict = DICT_ES;
    if (!dict) return sourceText;

    var trimmed = sourceText.trim();
    if (!trimmed) return sourceText;

    var direct = dict[trimmed];
    if (direct !== undefined) {
      return preserveSpacingReplace(sourceText, trimmed, direct);
    }

    var normalized = normalizeSpaces(trimmed);
    var normalizedMatch = dict[normalized];
    if (normalizedMatch !== undefined) {
      return preserveSpacingReplace(sourceText, trimmed, normalizedMatch);
    }

    return sourceText;
  }

  function applyToTextNode(node, lang) {
    if (!ORIGINAL_TEXT.has(node)) {
      ORIGINAL_TEXT.set(node, node.textContent);
    }
    var source = ORIGINAL_TEXT.get(node);
    var next = translateFromSource(source, lang);
    if (node.textContent !== next) node.textContent = next;
  }

  function applyToAttributes(el, lang) {
    ATTRS.forEach(function (attr) {
      if (!el.hasAttribute(attr)) return;

      var marker = "data-i18n-orig-" + attr;
      if (!el.hasAttribute(marker)) {
        el.setAttribute(marker, el.getAttribute(attr));
      }

      var source = el.getAttribute(marker) || "";
      var next = translateFromSource(source, lang);
      if (el.getAttribute(attr) !== next) {
        el.setAttribute(attr, next);
      }
    });
  }

  function walk(node, lang) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      applyToTextNode(node, lang);
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (SKIP_TAGS[node.tagName]) return;

    applyToAttributes(node, lang);

    node.childNodes.forEach(function (child) {
      walk(child, lang);
    });
  }

  function translateRoot(root, lang) {
    isApplying = true;
    try {
      walk(root, lang);
    } finally {
      isApplying = false;
    }
  }

  function ensureObserver() {
    if (observer || !document.body) return;

    observer = new MutationObserver(function (mutations) {
      if (isApplying) return;

      mutations.forEach(function (m) {
        if (m.type === "childList") {
          m.addedNodes.forEach(function (added) {
            translateRoot(added, currentLang);
          });
        }

        if (m.type === "characterData" && m.target) {
          var textNode = m.target;
          ORIGINAL_TEXT.set(textNode, textNode.textContent);
          translateRoot(textNode, currentLang);
        }

        if (m.type === "attributes" && m.target && m.attributeName) {
          var el = m.target;
          var attr = m.attributeName;
          if (ATTRS.indexOf(attr) >= 0) {
            var marker = "data-i18n-orig-" + attr;
            el.setAttribute(marker, el.getAttribute(attr) || "");
            translateRoot(el, currentLang);
          }
        }
      });
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });
  }

  function applyI18n(lang) {
    currentLang = lang === "en" ? "en" : "es";
    if (document.body) translateRoot(document.body, currentLang);
    document.documentElement.lang = currentLang;
  }

  // Exponer globalmente (perfil-menu.js la llama al cambiar idioma)
  window.applyI18n = applyI18n;

  // Aplicar automaticamente al cargar la pagina
  function init() {
    ensureObserver();
    var lang = localStorage.getItem("idioma") || "es";
    applyI18n(lang);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
