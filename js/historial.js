import app from "./firebase.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const uid = localStorage.getItem("uid");
const rol = localStorage.getItem("rol");

const ITEMS_POR_PAGINA = 20;
let todosLosEntries = [];
let paginaActual = 1;

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

function obtenerFiltro() {
  return document.getElementById("filtroEstado")?.value || "Todos";
}

function obtenerEntriesFiltrados() {
  const filtro = obtenerFiltro();
  if (filtro === "Todos") return todosLosEntries;
  return todosLosEntries.filter((e) => e.estado === filtro);
}

function renderizarPagina() {
  const tabla = document.getElementById("tablaHistorial");
  const filtrados = obtenerEntriesFiltrados();
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITEMS_POR_PAGINA));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const pagina = filtrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

  tabla.innerHTML = "";

  if (pagina.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay entradas para mostrar.</td></tr>`;
  } else {
    pagina.forEach(({ data, id }) => {
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

  renderizarPaginacion(totalPaginas);
}

function renderizarPaginacion(totalPaginas) {
  const nav = document.getElementById("paginacionWrap");
  const ul = document.getElementById("paginacion");

  if (totalPaginas <= 1) {
    nav.style.display = "none";
    return;
  }

  nav.style.display = "";
  ul.innerHTML = "";

  const prev = document.createElement("li");
  prev.className = `page-item ${paginaActual === 1 ? "disabled" : ""}`;
  prev.innerHTML = `<button class="page-link">Anterior</button>`;
  prev.addEventListener("click", () => {
    if (paginaActual > 1) { paginaActual--; renderizarPagina(); }
  });
  ul.appendChild(prev);

  for (let i = 1; i <= totalPaginas; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === paginaActual ? "active" : ""}`;
    li.innerHTML = `<button class="page-link">${i}</button>`;
    li.addEventListener("click", () => { paginaActual = i; renderizarPagina(); });
    ul.appendChild(li);
  }

  const next = document.createElement("li");
  next.className = `page-item ${paginaActual === totalPaginas ? "disabled" : ""}`;
  next.innerHTML = `<button class="page-link">Siguiente</button>`;
  next.addEventListener("click", () => {
    if (paginaActual < totalPaginas) { paginaActual++; renderizarPagina(); }
  });
  ul.appendChild(next);
}

async function cargarHistorial() {
  try {
    const q = query(
      collection(db, "JuntasDeVecinos", uid, "historial"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    todosLosEntries = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    paginaActual = 1;
    renderizarPagina();
  } catch (error) {
    console.error("Error cargando historial:", error);
    document.getElementById("tablaHistorial").innerHTML =
      `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar el historial.</td></tr>`;
  }
}

window.addEventListener("DOMContentLoaded", () => {
  if (!validarSesion()) return;

  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      cargarHistorial();
      document.getElementById("filtroEstado").addEventListener("change", () => {
        paginaActual = 1;
        renderizarPagina();
      });
    } else {
      window.location.href = "index.html";
    }
  });
});
