import app from "./firebase.js";
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
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const db = getFirestore(app);
const auth = getAuth(app);
let ultimoConteoSinLeer = 0;

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

window.logout = function () {
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

  const q = query(collection(db, "notificaciones"), where("receptorUid", "==", uid));
  onSnapshot(q, (snap) => {
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
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }

  function formatearRol(rol) {
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
      <span class="dashboard-role-badge ${badgeClass}">
        <i class="bi ${icono}"></i>${rol}
      </span>${saludo}, <strong>${escapeHtmlDash(usuario)}</strong>
    `;
  }

  function escapeHtmlDash(v) {
    return String(v || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function actualizarKpiVisual(resumen) {
    const asignaciones = {
      kpiPendiente: resumen.Pendiente || 0,
      kpiProceso: resumen["En proceso"] || 0,
      kpiResuelta: resumen.Resuelta || 0,
      kpiRechazada: resumen.Rechazada || 0
    };

    Object.entries(asignaciones).forEach(([id, valor]) => {
      const nodo = document.getElementById(id);
      if (nodo) nodo.textContent = String(valor);
    });
  }

  function contarEstadosDesdeDocs(docs) {
    const resumen = {
      Pendiente: 0,
      "En proceso": 0,
      Resuelta: 0,
      Rechazada: 0
    };

    docs.forEach((docSnap) => {
      const estado = String(docSnap.data()?.estado || "Pendiente").trim();
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
          return;
        }
        snap = await getDocs(query(collection(db, "denuncias"), where("municipio", "==", municipio)));
      } else {
        snap = await getDocs(collection(db, "denuncias"));
      }

      actualizarKpiVisual(contarEstadosDesdeDocs(snap.docs));
    } catch (error) {
      console.error("Error cargando resumen de KPIs:", error);
    }
  }

if (!uid || !rolLocal) {
  window.location.href = "index.html";
} else {
  inicializarSelectorTemaDashboard();
    pintarLineaUsuario();
    cargarResumenKpi();

  const footerFecha = document.getElementById("dashboardFooterFecha");
  if (footerFecha) {
    footerFecha.textContent = new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  }

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