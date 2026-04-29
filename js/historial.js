import app from "./firebase.js";
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

const LIMITE = 20;
let paginaActual = 1;
// iniciosDePagina[i] = cursor para cargar la página (i+1); null = desde el principio
const iniciosDePagina = [null];
let hayPaginaSiguiente = false;

function validarSesion() {
  if (!uid || rol !== "junta") {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function construirQuery() {
  const filtro = document.getElementById("filtroEstado")?.value || "Todos";
  const col = collection(db, "JuntasDeVecinos", uid, "historial");
  const partes = [];
  if (filtro !== "Todos") partes.push(where("estado", "==", filtro));
  partes.push(orderBy("createdAt", "desc"));
  const cursor = iniciosDePagina[paginaActual - 1];
  if (cursor) partes.push(startAfter(cursor));
  partes.push(limit(LIMITE));
  return query(col, ...partes);
}

async function cargarPagina() {
  const tabla = document.getElementById("tablaHistorial");
  tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Cargando...</td></tr>`;
  try {
    const snap = await getDocs(construirQuery());
    const docs = snap.docs;

    hayPaginaSiguiente = docs.length === LIMITE;

    // Guardar cursor de inicio para la página siguiente si no lo tenemos aún
    if (hayPaginaSiguiente && iniciosDePagina[paginaActual] === undefined) {
      iniciosDePagina[paginaActual] = docs[docs.length - 1];
    }

    renderizarTabla(docs.map((d) => ({ id: d.id, data: d.data() })));
    renderizarPaginacion();
  } catch (error) {
    console.error("Error cargando historial:", error);
    tabla.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar el historial.</td></tr>`;
  }
}

function renderizarTabla(entries) {
  const tabla = document.getElementById("tablaHistorial");
  tabla.innerHTML = "";

  if (entries.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay entradas para mostrar.</td></tr>`;
    return;
  }

  entries.forEach(({ data }) => {
    const fecha = convertirAFecha(data.createdAt);
    const fechaTexto = fecha ? fecha.toLocaleString() : "Sin fecha";
    const estadoBadge = {
      Pendiente: "secondary",
      "En proceso": "warning",
      Resuelta: "success",
      Rechazada: "danger"
    }[data.estado] || "secondary";

    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td class="small text-nowrap">${escapeHtml(fechaTexto)}</td>
      <td>
        ${data.denunciaId
          ? `<a href="ver.html?denuncia=${encodeURIComponent(data.denunciaId)}">${escapeHtml(data.tituloDenuncia || data.denunciaId)}</a>`
          : escapeHtml(data.tituloDenuncia || "—")}
      </td>
      <td><span class="badge bg-${estadoBadge}">${escapeHtml(data.estado || "—")}</span></td>
      <td>${escapeHtml(data.plazo_estimado || "—")}</td>
      <td>${escapeHtml(data.presupuesto_estimado || "—")}</td>
      <td class="small">${escapeHtml(data.respuesta || "—")}</td>
    `;
    tabla.appendChild(fila);
  });
}

function renderizarPaginacion() {
  const nav = document.getElementById("paginacionWrap");
  const ul = document.getElementById("paginacion");

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

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      cargarPagina();
      document.getElementById("filtroEstado").addEventListener("change", () => {
        resetPaginacion();
        cargarPagina();
      });
    } else {
      window.location.href = "index.html";
    }
  });
});

