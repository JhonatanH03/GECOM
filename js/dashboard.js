import app from "./firebase.js";
import { ESTADOS, ESTADO_DEFAULT } from "./constants.js";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  updatePassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const db = getFirestore(app);
const auth = getAuth(app);
let ultimoConteoSinLeer = 0;
let _unsubscribeNotificaciones = null;

function getIdiomaUI() {
  return (localStorage.getItem("idioma") || "es") === "en" ? "en" : "es";
}

function renderizarFechaFooter() {
  const footerFecha = document.getElementById("dashboardFooterFecha");
  if (!footerFecha) return;

  const lang = getIdiomaUI();
  const locale = lang === "en" ? "en-US" : "es-DO";
  footerFecha.textContent = new Date().toLocaleDateString(locale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function aplicarTemaDashboard() {
  const html = document.getElementById("htmlRoot");
  const body = document.getElementById("bodyRoot");
  const menuTema = document.getElementById("menuTema");
  if (!html || !body || !menuTema) return;

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

  menuTema.querySelectorAll("a[data-tema]").forEach((a) => {
    a.classList.remove("active");
    if (a.dataset.tema === tema) a.classList.add("active");
  });
}

function inicializarSelectorTemaDashboard() {
  const menuTema = document.getElementById("menuTema");
  if (!menuTema) return;

  aplicarTemaDashboard();

  menuTema.querySelectorAll("a[data-tema]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      localStorage.setItem("tema", a.dataset.tema);
      aplicarTemaDashboard();
    });
  });

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem("tema") || "sistema") === "sistema") {
      aplicarTemaDashboard();
    }
  });
}

window.ir = function (ruta) {
  window.location.href = ruta;
};

window.logout = async function () {
  const ok = await window.gecomConfirm({
    title: "Cerrar sesión",
    message: "¿Estás seguro de que deseas cerrar la sesión actual?",
    confirmText: "Cerrar sesión",
    cancelText: "Cancelar",
    type: "warning",
  });
  if (!ok) return;
  try {
    await signOut(auth);
  } catch (_) { /* ignorar: limpiar sesión local de todas formas */ }
  localStorage.clear();
  window.location.href = "index.html";
};

function convertirAFecha(valorFecha) {
  if (!valorFecha) return null;
  if (typeof valorFecha.toDate === "function") return valorFecha.toDate();
  if (typeof valorFecha.seconds === "number") return new Date(valorFecha.seconds * 1000);

  const fecha = new Date(valorFecha);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function renderizarNotificaciones(items) {
  const wrap = document.getElementById("notificacionesWrap");
  const badge = document.getElementById("badgeNotificaciones");
  const lista = document.getElementById("listaNotificaciones");
  const btnNotificaciones = document.getElementById("btnNotificaciones");
  if (!wrap || !badge || !lista) return;

  wrap.style.display = "block";

  const sinLeer = items.filter((item) => !item.leida).length;
  badge.textContent = String(sinLeer);
  badge.style.display = sinLeer > 0 ? "inline-block" : "none";

  if (btnNotificaciones) {
    btnNotificaciones.classList.toggle("tiene-no-leidas", sinLeer > 0);
    btnNotificaciones.setAttribute("aria-label", sinLeer > 0
      ? `Notificaciones (${sinLeer} sin leer)`
      : "Notificaciones");

    if (sinLeer > ultimoConteoSinLeer) {
      btnNotificaciones.classList.remove("animar-campana");
      // Reiniciar animación para nuevas llegadas.
      void btnNotificaciones.offsetWidth;
      btnNotificaciones.classList.add("animar-campana");
    }
  }

  ultimoConteoSinLeer = sinLeer;

  if (!items.length) {
    lista.innerHTML = '<li class="dropdown-item-text text-muted">No tienes notificaciones.</li>';
    return;
  }

  lista.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    const fecha = convertirAFecha(item.createdAt);
    const fechaTexto = fecha ? fecha.toLocaleString() : "Sin fecha";
    li.innerHTML = `
      <div class="d-flex align-items-start px-3 py-2 gap-2 notif-item">
        <button class="dropdown-item p-0 flex-grow-1 text-start ${item.leida ? "" : "fw-semibold"}" data-id="${item.id}" type="button">
          <div class="small text-muted">${fechaTexto}</div>
          <div>${item.mensaje || "Tienes una nueva notificación."}</div>
        </button>
        <button class="btn btn-link text-danger p-0 flex-shrink-0 small notif-delete" data-id="${item.id}" title="Eliminar" type="button">✕</button>
      </div>
    `;
    lista.appendChild(li);
  });

  lista.querySelectorAll("button[data-id]:not(.notif-delete)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = items.find((n) => n.id === id);
      if (!item) return;

      if (!item.leida) {
        try {
          await updateDoc(doc(db, "notificaciones", id), {
            leida: true,
            leidaAt: serverTimestamp()
          });
        } catch (error) {
          console.error("No se pudo marcar la notificación como leída:", error);
        }
      }

      if (item.denunciaId) {
        window.location.href = `ver.html?denuncia=${encodeURIComponent(item.denunciaId)}`;
      }
    });
  });

  lista.querySelectorAll("button.notif-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEliminarNotif"));
      const confirmar = document.getElementById("btnConfirmarEliminarNotif");

      // Reemplazar listener previo para evitar acumulación
      const nuevoConfirmar = confirmar.cloneNode(true);
      confirmar.parentNode.replaceChild(nuevoConfirmar, confirmar);

      nuevoConfirmar.addEventListener("click", async () => {
        modal.hide();
        try {
          await deleteDoc(doc(db, "notificaciones", id));
        } catch (error) {
          console.error("No se pudo eliminar la notificación:", error);
        }
      });

      modal.show();
    });
  });
}

function iniciarSuscripcionNotificaciones() {
  if (!uid || rolLocal !== "junta") return;

  // Limpiar listener anterior para evitar duplicados y memory leaks
  if (_unsubscribeNotificaciones) {
    _unsubscribeNotificaciones();
    _unsubscribeNotificaciones = null;
  }

  const q = query(collection(db, "notificaciones"), where("receptorUid", "==", uid));
  _unsubscribeNotificaciones = onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .sort((a, b) => {
        const fa = convertirAFecha(a.createdAt)?.getTime() || 0;
        const fb = convertirAFecha(b.createdAt)?.getTime() || 0;
        return fb - fa;
      })
      .slice(0, 20);

    renderizarNotificaciones(items);
  }, (error) => {
    console.error("Error cargando notificaciones:", error);
  });
}
  function rolIcono(rol) {
    if (rol === "admin") return "bi-shield-fill";
    if (rol === "ayuntamiento") return "bi-building";
    if (rol === "junta") return "bi-people-fill";
    return "bi-person-fill";
  }

  function rolBadgeClass(rol) {
    if (rol === "admin") return "role-admin";
    if (rol === "ayuntamiento") return "role-ayuntamiento";
    if (rol === "junta") return "role-junta";
    return "role-junta";
  }

  function saludoHora() {
    const lang = getIdiomaUI();
    const h = new Date().getHours();
    if (lang === "en") {
      if (h < 12) return "Good morning";
      if (h < 19) return "Good afternoon";
      return "Good evening";
    }

    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }

  function formatearRol(rol) {
    const lang = getIdiomaUI();
    if (lang === "en") {
      if (rol === "admin") return "Administrator";
      if (rol === "ayuntamiento") return "City Hall";
      if (rol === "junta") return "Neighborhood Board";
      return "User";
    }

    if (rol === "admin") return "Administrador";
    if (rol === "ayuntamiento") return "Ayuntamiento";
    if (rol === "junta") return "Junta de Vecinos";
    return "Usuario";
  }

  function pintarLineaUsuario() {
    const userLine = document.getElementById("dashboardUserLine");
    if (!userLine) return;

    const usuario = localStorage.getItem("usuario") || "usuario";
    const saludo = saludoHora();
    const badgeClass = rolBadgeClass(rolLocal);
    const icono = rolIcono(rolLocal);
    const rol = formatearRol(rolLocal);

    userLine.innerHTML = `
      <h4>${saludo} <strong>${escapeHtmlDash(usuario)}</strong>
      <span class="dashboard-role-badge ${badgeClass}">
        <i class="bi ${icono}"></i>${rol}
      </span></h4>

    `;
  }

  function escapeHtmlDash(v) {
    return String(v || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function actualizarKpiVisual(resumen) {
    const asignaciones = {
      kpiPendiente: resumen[ESTADOS.PENDIENTE] || 0,
      kpiProceso: resumen[ESTADOS.EN_PROCESO] || 0,
      kpiResuelta: resumen[ESTADOS.RESUELTA] || 0,
      kpiRechazada: resumen[ESTADOS.RECHAZADA] || 0
    };

    Object.entries(asignaciones).forEach(([id, valor]) => {
      const nodo = document.getElementById(id);
      if (nodo) nodo.textContent = String(valor);
    });
  }

  function claseEstadoLateral(estado) {
    if (estado === ESTADOS.PENDIENTE) return "estado-pendiente";
    if (estado === ESTADOS.EN_PROCESO) return "estado-proceso";
    if (estado === ESTADOS.RESUELTA) return "estado-resuelta";
    if (estado === ESTADOS.RECHAZADA) return "estado-rechazada";
    return "estado-pendiente";
  }

  function etiquetaEstadoLateral(estado) {
    if (estado === ESTADOS.EN_PROCESO) return "En proceso";
    if (estado === ESTADOS.RESUELTA) return "Resuelta";
    if (estado === ESTADOS.RECHAZADA) return "Rechazada";
    return "Pendiente";
  }

  function formatFechaRelativa(fecha) {
    if (!fecha) return "Sin fecha";

    const ahora = Date.now();
    const diffMs = ahora - fecha.getTime();
    const minutos = Math.floor(diffMs / 60000);

    if (minutos < 1) return "Hace unos segundos";
    if (minutos < 60) return `Hace ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `Hace ${horas} h`;

    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias} d`;

    return fecha.toLocaleDateString(getIdiomaUI() === "en" ? "en-US" : "es-DO", {
      day: "2-digit",
      month: "short"
    });
  }

  function renderActividadReciente(docs) {
    const lista = document.getElementById("dashboardActividadList");
    if (!lista) return;

    const items = (docs || [])
      .map((docSnap) => {
        const data = docSnap.data() || {};
        const fecha = convertirAFecha(data.updatedAt || data.createdAt || data.fecha || data.timestamp);
        const estado = String(data.estado || ESTADO_DEFAULT).trim();
        const titulo = String(data.titulo || data.asunto || "Denuncia").trim();

        return {
          id: docSnap.id,
          titulo,
          estado,
          fecha
        };
      })
      .sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0))
      .slice(0, 4);

    if (!items.length) {
      lista.innerHTML = '<li class="dashboard-activity-empty">Aun no hay actividad reciente para mostrar.</li>';
      return;
    }

    lista.innerHTML = items.map((item) => {
      const tituloSeguro = escapeHtmlDash(item.titulo || "Denuncia");
      const claseEstado = claseEstadoLateral(item.estado);
      const textoEstado = etiquetaEstadoLateral(item.estado);
      const tiempo = formatFechaRelativa(item.fecha);

      return `
        <li class="dashboard-activity-item">
          <a class="dashboard-activity-link" href="ver.html?denuncia=${encodeURIComponent(item.id)}">
            <div class="dashboard-activity-top">
              <p class="dashboard-activity-title">${tituloSeguro}</p>
              <span class="dashboard-activity-state ${claseEstado}">${textoEstado}</span>
            </div>
            <p class="dashboard-activity-time">${tiempo}</p>
          </a>
        </li>
      `;
    }).join("");
  }


  function enlacesDatasetVisibleParaRol(enlace) {
    const roles = String(enlace.dataset.roles || "")
      .split(",")
      .map((rol) => rol.trim())
      .filter(Boolean);
    return roles.length === 0 || roles.includes(rolLocal);
  }

  export default function aplicarEnlacesFooterPorRol() {
    const root = document.getElementById("dashboardFooterLinks");
    if (!root) return;

    root.querySelectorAll(".dashboard-footer-li").forEach((li) => {
      const enlaceRoles = li.querySelector("a[data-roles]");
      if (!enlaceRoles) {
        li.style.display = "";
        return;
      }
      li.style.display = enlacesDatasetVisibleParaRol(enlaceRoles) ? "" : "none";
    });

    root.querySelectorAll(".dashboard-footer-nav").forEach((nav) => {
      const visibleItems = [...nav.querySelectorAll(".dashboard-footer-li")].filter(
        (li) => li.style.display !== "none"
      );
      nav.hidden = visibleItems.length === 0;
    });
  }


  function renderAlertasOperativas(resumen) {
    const lista = document.getElementById("dashboardAlertasList");
    if (!lista) return;

    const pendientes = Number(resumen?.[ESTADOS.PENDIENTE] || 0);
    const enProceso = Number(resumen?.[ESTADOS.EN_PROCESO] || 0);
    const acumuladas = pendientes + enProceso;

    let clase = "dashboard-alert-item--info";
    if (acumuladas >= 15) clase = "dashboard-alert-item--danger";
    else if (acumuladas >= 8) clase = "dashboard-alert-item--warning";

    const mensajePrincipal = acumuladas > 0
      ? `${acumuladas} casos requieren atencion (${pendientes} pendientes y ${enProceso} en proceso).`
      : "No hay casos activos pendientes de seguimiento.";

    const mensajeSecundario = rolLocal === "admin"
      ? "Vista global del sistema actualizada."
      : (rolLocal === "ayuntamiento"
        ? "Prioriza casos con impacto municipal esta semana."
        : "Recuerda responder los reportes para evitar atrasos.");

    lista.innerHTML = `
      <li class="dashboard-alert-item ${clase}">${mensajePrincipal}</li>
      <li class="dashboard-alert-item dashboard-alert-item--info">${mensajeSecundario}</li>
    `;
  }

  function contarEstadosDesdeDocs(docs) {
    const resumen = {
      [ESTADOS.PENDIENTE]: 0,
      [ESTADOS.EN_PROCESO]: 0,
      [ESTADOS.RESUELTA]: 0,
      [ESTADOS.RECHAZADA]: 0
    };

    docs.forEach((docSnap) => {
      const estado = String(docSnap.data()?.estado || ESTADO_DEFAULT).trim();
      if (resumen[estado] !== undefined) resumen[estado] += 1;
    });

    return resumen;
  }

  async function cargarResumenKpi() {
    try {
      let snap;

      if (rolLocal === "junta") {
        snap = await getDocs(query(collection(db, "denuncias"), where("uid", "==", uid)));
      } else if (rolLocal === "ayuntamiento") {
        const ayuntamientoDoc = await getDoc(doc(db, "Ayuntamientos", uid));
        const ayuntamientoData = ayuntamientoDoc.exists() ? (ayuntamientoDoc.data() || {}) : {};
        const municipio = String(ayuntamientoData.municipio || "").trim();
        if (!municipio) {
          actualizarKpiVisual({});
          renderActividadReciente([]);
          renderAlertasOperativas({});
          return;
        }
        snap = await getDocs(query(collection(db, "denuncias"), where("municipio", "==", municipio)));
      } else {
        snap = await getDocs(collection(db, "denuncias"));
      }

      const resumen = contarEstadosDesdeDocs(snap.docs);
      actualizarKpiVisual(resumen);
      renderActividadReciente(snap.docs);
      renderAlertasOperativas(resumen);
    } catch (error) {
      console.error("Error cargando resumen de KPIs:", error);
      renderActividadReciente([]);
      renderAlertasOperativas({});
    }
  }

function inicializarModalPrimerLogin() {
  const primerLogin = localStorage.getItem("primerLogin") === "true";
  if (!primerLogin) return;

  const modalEl = document.getElementById("modalCambioContrasena");
  if (!modalEl) return;

  const modal = new bootstrap.Modal(modalEl);
  modal.show();

  // Inicializar tooltips en los botones de ver/ocultar
  modalEl.querySelectorAll("[data-bs-toggle='tooltip']").forEach(el => {
    new bootstrap.Tooltip(el, { trigger: "hover" });
  });

  // Toggle ver/ocultar contraseña
  function setupToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (!btn || !input || !icon) return;
    btn.addEventListener("click", () => {
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      icon.className = showing ? "bi bi-eye" : "bi bi-eye-slash";
      const tip = bootstrap.Tooltip.getInstance(btn);
      if (tip) {
        btn.setAttribute("data-bs-original-title", showing ? "Mostrar contraseña" : "Ocultar contraseña");
        tip.hide();
      }
    });
  }
  setupToggle("ccToggleNew", "ccNewPassword", "ccToggleNewIcon");
  setupToggle("ccToggleConfirm", "ccConfirmPassword", "ccToggleConfirmIcon");

  const ccNew = document.getElementById("ccNewPassword");
  if (ccNew) {
    ccNew.addEventListener("input", () => {
      const pwd = ccNew.value;
      const reqs = [
        [document.getElementById("ccReqLength"), pwd.length >= 6, "Al menos 6 caracteres"],
        [document.getElementById("ccReqUpper"), /[A-Z]/.test(pwd), "Una letra may\u00fascula"],
        [document.getElementById("ccReqLower"), /[a-z]/.test(pwd), "Una letra min\u00fascula"],
        [document.getElementById("ccReqNumber"), /\d/.test(pwd), "Un n\u00famero"],
      ];
      reqs.forEach(([el, ok, label]) => {
        if (!el) return;
        el.textContent = (ok ? "\u2713 " : "\u2717 ") + label;
        el.className = ok ? "text-success" : "text-danger";
      });
    });
  }

  document.getElementById("btnGuardarNuevaContrasena")?.addEventListener("click", async () => {
    const btn = document.getElementById("btnGuardarNuevaContrasena");
    const alertEl = document.getElementById("alertCambioContrasena");
    const newPwd = document.getElementById("ccNewPassword").value;
    const confirmPwd = document.getElementById("ccConfirmPassword").value;

    function showCCError(msg) {
      alertEl.innerHTML = `<div class="alert alert-danger py-2 small">${msg}</div>`;
    }

    if (!newPwd || !confirmPwd) return showCCError("Completa todos los campos.");
    if (newPwd !== confirmPwd) return showCCError("Las contrase\u00f1as no coinciden.");
    if (newPwd.length < 6) return showCCError("La contrase\u00f1a debe tener al menos 6 caracteres.");
    if (!/[A-Z]/.test(newPwd)) return showCCError("La contrase\u00f1a debe tener al menos una may\u00fascula.");
    if (!/[a-z]/.test(newPwd)) return showCCError("La contrase\u00f1a debe tener al menos una min\u00fascula.");
    if (!/\d/.test(newPwd)) return showCCError("La contrase\u00f1a debe tener al menos un n\u00famero.");

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
    alertEl.innerHTML = "";

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Sesi\u00f3n no disponible.");

      await updatePassword(user, newPwd);

      const coleccionPorRol = { admin: "Administradores", ayuntamiento: "Ayuntamientos", junta: "JuntasDeVecinos" };
      const coleccion = coleccionPorRol[rolLocal];
      if (coleccion) {
        await updateDoc(doc(db, coleccion, uid), { primerLogin: false });
      }

      localStorage.setItem("primerLogin", "false");
      modal.hide();
      if (typeof window.gecomToast === "function") {
        window.gecomToast("Contrase\u00f1a actualizada correctamente.", "success");
      }
    } catch (error) {
      let msg = "No se pudo cambiar la contrase\u00f1a.";
      if (error.code === "auth/weak-password") {
        msg = "La contrase\u00f1a es muy d\u00e9bil.";
      } else if (error.code === "auth/requires-recent-login") {
        msg = "La sesi\u00f3n expir\u00f3. Cierra sesi\u00f3n e inicia de nuevo para cambiar la contrase\u00f1a.";
      }
      showCCError(msg);
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle me-1"></i> Guardar contrase\u00f1a';
    }
  });
}

if (!uid || !rolLocal) {
  window.location.href = "index.html";
} else {
  inicializarSelectorTemaDashboard();
    aplicarEnlacesFooterPorRol();
    pintarLineaUsuario();
    cargarResumenKpi();
  inicializarModalPrimerLogin();

  renderizarFechaFooter();

  window.addEventListener("gecom:language-changed", () => {
    pintarLineaUsuario();
    renderizarFechaFooter();
  });

  document.getElementById("cardVerDenuncias").style.display = "block";

  if (rolLocal === "admin") {
    document.getElementById("cardAdmin").style.display = "block";
    document.getElementById("cardAdminAyunt").style.display = "block";
    document.getElementById("cardAdminUsuarios").style.display = "block";
  }

  if (rolLocal === "junta") {
    document.getElementById("cardCrearDenuncia").style.display = "block";
    document.getElementById("cardHistorial").style.display = "block";
  }

  if (rolLocal === "ayuntamiento") {
    document.getElementById("cardAyunt").style.display = "block";
    document.getElementById("cardCrearDenunciaAyunt").style.display = "block";
  }

  // Esperar a que Firebase Auth restaure la sesión antes de iniciar el listener
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      iniciarSuscripcionNotificaciones();
    }
  });
}