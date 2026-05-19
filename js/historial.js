import app from "./firebase.js";
import { debounce, escapeHtml } from "./constants.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where
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
let totalResultados = 0;
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

function normalizarAdjuntosRespuesta(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item) return null;
      if (typeof item === "string") {
        return { nombre: "Adjunto PDF", url: item };
      }
      return {
        nombre: item.nombre || "Adjunto PDF",
        url: item.url || ""
      };
    })
    .filter((item) => item && item.url);
}

function renderizarAdjuntosHtml(raw) {
  const anexos = normalizarAdjuntosRespuesta(raw);
  if (!anexos.length) return "";

  const enlaces = anexos.map((anexo, idx) => {
    const nombre = escapeHtml(anexo.nombre || `PDF ${idx + 1}`);
    const url = escapeHtml(anexo.url);
    return `<a href="${url}" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary mt-1 me-1"><i class="bi bi-file-earmark-pdf-fill me-1"></i>${nombre}</a>`;
  }).join("");

  return `<div class="mt-2">${enlaces}</div>`;
}

function resetPaginacion() {
  paginaActual = 1;
  totalResultados = 0;
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
  void filtro;

  if (filtroDenunciaId) {
    return query(col, where("denunciaId", "==", filtroDenunciaId));
  }

  return query(col);
}

function obtenerTimestampHistorial(data = {}) {
  const candidata =
    convertirAFecha(data.createdAt) ||
    convertirAFecha(data.fecha_respuesta) ||
    convertirAFecha(data.fecha) ||
    null;

  return candidata ? candidata.getTime() : 0;
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
    let entries = snap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));

    if (!mostrandoDetalle) {
      const porDenuncia = new Map();
      entries.forEach((entry) => {
        const data = entry.data || {};
        const key = String(data.denunciaId || "").trim();
        if (!key) return;

        const existente = porDenuncia.get(key);
        if (!existente) {
          porDenuncia.set(key, {
            ...entry,
            _numCambios: 1
          });
          return;
        }

        existente._numCambios += 1;

        const fechaExistente = obtenerTimestampHistorial(existente.data);
        const fechaNueva = obtenerTimestampHistorial(data);
        if (fechaNueva > fechaExistente) {
          existente.id = entry.id;
          existente.data = data;
        }
      });

      entries = Array.from(porDenuncia.values());

      const filtroEstado = document.getElementById("filtroEstado")?.value || "Todos";
      if (filtroEstado !== "Todos") {
        entries = entries.filter((entry) => (entry.data?.estado || "") === filtroEstado);
      }
    }

    entries.sort((a, b) => obtenerTimestampHistorial(b.data) - obtenerTimestampHistorial(a.data));

    totalResultados = entries.length;
    const totalPaginas = Math.max(1, Math.ceil(totalResultados / LIMITE));
    if (paginaActual > totalPaginas) paginaActual = totalPaginas;

    const inicio = (paginaActual - 1) * LIMITE;
    const pagina = entries.slice(inicio, inicio + LIMITE);

    renderizarTabla(pagina);
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
    if (!mostrandoDetalle && data.denunciaId) {
      fila.classList.add("historial-row-clickable");
      fila.setAttribute("role", "button");
      fila.setAttribute("tabindex", "0");
      fila.setAttribute("aria-label", `Ver cambios de la denuncia ${data.tituloDenuncia || data.denunciaId}`);
      fila.addEventListener("click", () => {
        aplicarFiltroDenuncia(data.denunciaId, data.tituloDenuncia || data.denunciaId);
      });
      fila.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          aplicarFiltroDenuncia(data.denunciaId, data.tituloDenuncia || data.denunciaId);
        }
      });
    }

    const anexosHtml = renderizarAdjuntosHtml(data.anexos_respuesta_pdf);
    fila.innerHTML = `
      <td class="small text-nowrap" data-label="Fecha">${escapeHtml(fechaTexto)}</td>
      <td data-label="Denuncia">
        ${data.denunciaId
         ? `<button type="button" class="historial-denuncia-link" data-denuncia-id="${escapeHtml(data.denunciaId)}" data-denuncia-titulo="${escapeHtml(data.tituloDenuncia || data.denunciaId)}" ${mostrandoDetalle ? "disabled" : ""}>${escapeHtml(data.tituloDenuncia || data.denunciaId)}</button>
           ${mostrandoDetalle ? `<a href="ver.html?denuncia=${encodeURIComponent(data.denunciaId)}" class="ms-2 small" title="Ver detalle">ver</a>` : ""}
           ${!mostrandoDetalle && entry._numCambios ? `<span class="badge bg-secondary ms-2">${entry._numCambios} cambio(s)</span>` : ""}`
          : escapeHtml(data.tituloDenuncia || "—")}
      </td>
      <td data-label="Estado"><span class="status-chip ${estadoClass}"><i class="bi ${chipIcon} chip-icon"></i>${escapeHtml(data.estado || "—")}</span></td>
      <td data-label="Plazo estimado">${escapeHtml(data.plazo_estimado || "—")}</td>
      <td data-label="Presupuesto">${escapeHtml(data.presupuesto_estimado || "—")}</td>
      <td class="small" data-label="Respuesta del Ayuntamiento">${escapeHtml(data.respuesta || "—")}${anexosHtml}</td>
    `;
    tabla.appendChild(fila);
  });

  if (!mostrandoDetalle) {
    tabla.querySelectorAll(".historial-denuncia-link").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
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

  if (filtroDenunciaId || totalResultados <= LIMITE) {
    nav.style.display = "none";
    return;
  }

  nav.style.display = "";
  ul.innerHTML = "";

  const totalPaginas = Math.max(1, Math.ceil(totalResultados / LIMITE));

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
  next.className = `page-item ${paginaActual >= totalPaginas ? "disabled" : ""}`;
  next.innerHTML = `<button class="page-link">Siguiente</button>`;
  next.addEventListener("click", () => {
    if (paginaActual < totalPaginas) { paginaActual++; cargarPagina(); }
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

