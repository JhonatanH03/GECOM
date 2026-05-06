import app from "./firebase.js";
import { debounce, escapeHtml } from "./constants.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const uid = localStorage.getItem("uid");
const rol = localStorage.getItem("rol");

const LIMITE = 15;
let paginaActual = 1;
// iniciosDePagina[i] = cursor para cargar la página (i+1); null = desde el principio
const iniciosDePagina = [null];
let hayPaginaSiguiente = false;
let filtroDenunciaId = "";
let filtroDenunciaTitulo = "";

function validarSesion() {
  if (!uid || rol !== "junta") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}


function convertirAFecha(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate();
  if (ts.seconds) return new Date(ts.seconds * 1000);
  return null;
}

function resetPaginacion() {
  paginaActual = 1;
  iniciosDePagina.length = 1;
  iniciosDePagina[0] = null;
  hayPaginaSiguiente = false;
}

function actualizarUIFiltroDenuncia() {
  const wrap = document.getElementById("filtroDenunciaActivo");
  const texto = document.getElementById("filtroDenunciaTexto");
  const filtroEstado = document.getElementById("filtroEstado");
  if (!wrap || !texto) return;

  if (!filtroDenunciaId) {
    wrap.classList.add("d-none");
    texto.textContent = "";
    if (filtroEstado) filtroEstado.disabled = false;
    return;
  }

  const titulo = filtroDenunciaTitulo || filtroDenunciaId;
  texto.textContent = `Mostrando TODO el historial de: ${titulo}`;
  wrap.classList.remove("d-none");
  if (filtroEstado) {
    filtroEstado.value = "Todos";
    filtroEstado.disabled = true;
  }
}

function aplicarFiltroDenuncia(denunciaId, denunciaTitulo = "") {
  filtroDenunciaId = String(denunciaId || "").trim();
  filtroDenunciaTitulo = String(denunciaTitulo || "").trim();
  resetPaginacion();
  actualizarUIFiltroDenuncia();
  cargarPagina();
}

function limpiarFiltroDenuncia() {
  filtroDenunciaId = "";
  filtroDenunciaTitulo = "";
  resetPaginacion();
  actualizarUIFiltroDenuncia();
  cargarPagina();
}

function construirQuery() {
  const filtro = document.getElementById("filtroEstado")?.value || "Todos";
  const col = collection(db, "JuntasDeVecinos", uid, "historial");

  if (filtroDenunciaId) {
    return query(col, where("denunciaId", "==", filtroDenunciaId));
  }

  const partes = [];

  if (filtro !== "Todos") {
    partes.push(where("estado", "==", filtro));
  }

  partes.push(orderBy("createdAt", "desc"));
  const cursor = iniciosDePagina[paginaActual - 1];
  if (cursor) partes.push(startAfter(cursor));
  partes.push(limit(LIMITE));
  return query(col, ...partes);
}

async function cargarPagina() {
  const tabla = document.getElementById("tablaHistorial");
  const mostrandoDetalle = Boolean(filtroDenunciaId);
  const skRow6 = `<tr class="skeleton-row">
    <td><span class="skeleton-cell skeleton-narrow"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-pill"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
  </tr>`;
  tabla.innerHTML = skRow6.repeat(5);
  try {
    const snap = await getDocs(construirQuery());
    let docs = snap.docs;

    if (mostrandoDetalle) {
      docs = [...docs].sort((a, b) => {
        const ta = convertirAFecha(a.data()?.createdAt)?.getTime() || 0;
        const tb = convertirAFecha(b.data()?.createdAt)?.getTime() || 0;
        return tb - ta;
      });
    }

    hayPaginaSiguiente = !mostrandoDetalle && docs.length === LIMITE;

    // Guardar cursor de inicio para la página siguiente si no lo tenemos aún
    if (!mostrandoDetalle && hayPaginaSiguiente && iniciosDePagina[paginaActual] === undefined) {
      iniciosDePagina[paginaActual] = docs[docs.length - 1];
    }

    let entries = docs.map((d) => ({ id: d.id, data: d.data() }));

    if (!filtroDenunciaId) {
      const porDenuncia = new Map();
      entries.forEach((entry) => {
        const data = entry.data || {};
        const key = String(data.denunciaId || entry.id);
        if (!key) return;

        const existente = porDenuncia.get(key);
        if (!existente) {
          porDenuncia.set(key, { ...entry, _numCambios: 1 });
          return;
        }

        existente._numCambios += 1;

        const fechaExistente = convertirAFecha(existente.data?.createdAt)?.getTime() || 0;
        const fechaNueva = convertirAFecha(data.createdAt)?.getTime() || 0;
        if (fechaNueva > fechaExistente) {
          existente.id = entry.id;
          existente.data = data;
        }
      });

      entries = Array.from(porDenuncia.values()).sort((a, b) => {
        const ta = convertirAFecha(a.data?.createdAt)?.getTime() || 0;
        const tb = convertirAFecha(b.data?.createdAt)?.getTime() || 0;
        return tb - ta;
      });
    }

    renderizarTabla(entries);
    renderizarPaginacion();
  } catch (error) {
    console.error("Error cargando historial:", error);
    tabla.innerHTML = `
      <tr class="table-feedback-row">
        <td colspan="6"><div class="empty-state text-danger">Error al cargar el historial.</div></td>
      </tr>
    `;
  }
}

function renderizarTabla(entries) {
  const tabla = document.getElementById("tablaHistorial");
  const mostrandoDetalle = Boolean(filtroDenunciaId);
  tabla.innerHTML = "";

  if (entries.length === 0) {
    tabla.innerHTML = `
      <tr class="table-feedback-row">
        <td colspan="6"><div class="empty-state">No hay entradas para mostrar.</div></td>
      </tr>
    `;
    return;
  }

  entries.forEach((entry) => {
    const data = entry.data || {};
    const fecha = convertirAFecha(data.createdAt);
    const fechaTexto = fecha ? fecha.toLocaleString() : "Sin fecha";
    const estadoClass = {
      Pendiente: "status-pendiente",
      "En proceso": "status-proceso",
      Resuelta: "status-resuelta",
      Rechazada: "status-rechazada"
    }[data.estado] || "status-pendiente";

    const chipIcon = {
      Pendiente: "bi-hourglass-split",
      "En proceso": "bi-arrow-repeat",
      Resuelta: "bi-check-circle-fill",
      Rechazada: "bi-x-circle-fill"
    }[data.estado] || "bi-hourglass-split";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="small text-nowrap" data-label="Fecha">${escapeHtml(fechaTexto)}</td>
      <td data-label="Denuncia">
        ${data.denunciaId
         ? `<button type="button" class="btn btn-link p-0 align-baseline historial-denuncia-link" data-denuncia-id="${escapeHtml(data.denunciaId)}" data-denuncia-titulo="${escapeHtml(data.tituloDenuncia || data.denunciaId)}" ${mostrandoDetalle ? "disabled" : ""}>${escapeHtml(data.tituloDenuncia || data.denunciaId)}</button>
           ${mostrandoDetalle ? `<a href="ver.html?denuncia=${encodeURIComponent(data.denunciaId)}" class="ms-2 small" title="Ver detalle">ver</a>` : ""}
           ${!mostrandoDetalle && entry._numCambios ? `<span class="badge bg-secondary ms-2">${entry._numCambios} cambio(s)</span>` : ""}`
          : escapeHtml(data.tituloDenuncia || "—")}
      </td>
      <td data-label="Estado"><span class="status-chip ${estadoClass}"><i class="bi ${chipIcon} chip-icon"></i>${escapeHtml(data.estado || "—")}</span></td>
      <td data-label="Plazo estimado">${escapeHtml(data.plazo_estimado || "—")}</td>
      <td data-label="Presupuesto">${escapeHtml(data.presupuesto_estimado || "—")}</td>
      <td class="small" data-label="Respuesta del Ayuntamiento">${escapeHtml(data.respuesta || "—")}</td>
    `;
    tabla.appendChild(fila);
  });

  if (!mostrandoDetalle) {
    tabla.querySelectorAll(".historial-denuncia-link").forEach((btn) => {
      btn.addEventListener("click", () => {
        const denunciaId = btn.dataset.denunciaId || "";
        const denunciaTitulo = btn.dataset.denunciaTitulo || "";
        if (!denunciaId) return;
        aplicarFiltroDenuncia(denunciaId, denunciaTitulo);
      });
    });
  }
}

function renderizarPaginacion() {
  const nav = document.getElementById("paginacionWrap");
  const ul = document.getElementById("paginacion");

  if (filtroDenunciaId) {
    nav.style.display = "none";
    return;
  }

  if (paginaActual === 1 && !hayPaginaSiguiente) {
    nav.style.display = "none";
    return;
  }

  nav.style.display = "";
  ul.innerHTML = "";

  const prev = document.createElement("li");
  prev.className = `page-item ${paginaActual === 1 ? "disabled" : ""}`;
  prev.innerHTML = `<button class="page-link">Anterior</button>`;
  prev.addEventListener("click", () => {
    if (paginaActual > 1) { paginaActual--; cargarPagina(); }
  });
  ul.appendChild(prev);

  const info = document.createElement("li");
  info.className = "page-item disabled";
  info.innerHTML = `<span class="page-link">Página ${paginaActual}</span>`;
  ul.appendChild(info);

  const next = document.createElement("li");
  next.className = `page-item ${!hayPaginaSiguiente ? "disabled" : ""}`;
  next.innerHTML = `<button class="page-link">Siguiente</button>`;
  next.addEventListener("click", () => {
    if (hayPaginaSiguiente) { paginaActual++; cargarPagina(); }
  });
  ul.appendChild(next);
}

window.addEventListener("DOMContentLoaded", () => {
  if (!validarSesion()) return;

  const params = new URLSearchParams(window.location.search);
  const denunciaParam = String(params.get("denuncia") || "").trim();
  if (denunciaParam) {
    filtroDenunciaId = denunciaParam;
  }
  actualizarUIFiltroDenuncia();

  document.getElementById("btnLimpiarFiltroDenuncia")?.addEventListener("click", () => {
    limpiarFiltroDenuncia();
  });

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      cargarPagina();
      document.getElementById("filtroEstado").addEventListener("change", debounce(() => {
        resetPaginacion();
        cargarPagina();
      }, 300));
    } else {
      window.location.href = "index.html";
    }
  });
});

