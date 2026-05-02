import app from "./firebase.js";
import { ESTADOS, ESTADO_DEFAULT } from "./constants.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);
const JUNTA_ID = localStorage.getItem("uid");

let listaDenunciasEl;
let filtroEstadoEl;
let filtroSectorEl;
let formNuevaDenunciaEl;
let tituloInputEl;
let descripcionInputEl;
let sectorInputEl;
let feedbackEl;
let btnToggleFormEl;
let btnEnviarDenunciaEl;
let btnCancelarDenunciaEl;

const denuncias = [];

function crearElemento(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

function obtenerClaseEstado(estado) {
  switch (estado) {
    case ESTADOS.PENDIENTE:  return "estado-pendiente";
    case ESTADOS.EN_PROCESO: return "estado-proceso";
    case ESTADOS.RESUELTA:   return "estado-resuelta";
    case ESTADOS.RECHAZADA:  return "estado-rechazada";
    default: return "estado-pendiente";
  }
}

function formatearFecha(timestamp) {
  if (!timestamp) return "Sin fecha";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString();
}

function crearCardDenuncia(denuncia) {
  const card = document.createElement("article");
  card.className = "denuncia-card";
  card.dataset.id = denuncia.id;
  card.dataset.estado = denuncia.estado;
  card.dataset.sector = denuncia.sector;

  const row = crearElemento("div", "d-flex justify-content-between align-items-start");
  const left = crearElemento("div", "flex-grow-1");

  left.appendChild(crearElemento("div", "titulo-denuncia", denuncia.titulo));
  left.appendChild(crearElemento("div", "meta-denuncia", `${denuncia.sector} · ${denuncia.fecha}`));
  left.appendChild(crearElemento("div", "descripcion-denuncia", denuncia.descripcion));

  const badge = crearElemento("span", `estado-badge ${obtenerClaseEstado(denuncia.estado)}`, denuncia.estado);

  row.appendChild(left);
  row.appendChild(badge);
  card.appendChild(row);

  card.addEventListener("click", () => {
    window.location.href = `detalle_denuncia.html?id=${encodeURIComponent(denuncia.id)}`;
  });

  return card;
}

function actualizarFiltros() {
  const estadoFiltro = filtroEstadoEl.value;
  const sectorFiltro = filtroSectorEl.value;

  const cards = listaDenunciasEl.querySelectorAll(".denuncia-card");
  cards.forEach((card) => {
    const estado = card.dataset.estado;
    const sector = card.dataset.sector;
    const coincideEstado = !estadoFiltro || estado === estadoFiltro;
    const coincideSector = !sectorFiltro || sector === sectorFiltro;
    card.style.display = coincideEstado && coincideSector ? "block" : "none";
  });
}

function actualizarOpcionesSector() {
  const sectores = Array.from(new Set(denuncias.map((item) => item.sector).filter(Boolean))).sort();

  filtroSectorEl.innerHTML = "";
  const optionTodos = crearElemento("option", "", "Todos");
  optionTodos.value = "";
  filtroSectorEl.appendChild(optionTodos);

  sectores.forEach((sector) => {
    const option = crearElemento("option", "", sector);
    option.value = sector;
    filtroSectorEl.appendChild(option);
  });
}

function mostrarMensaje(mensaje, tipo = "info") {
  feedbackEl.textContent = mensaje;
  feedbackEl.style.color = tipo === "error" ? "#dc3545" : "#1f2937";
}

function limpiarFormulario() {
  tituloInputEl.value = "";
  descripcionInputEl.value = "";
  sectorInputEl.value = "";
  mostrarMensaje("", "info");
}

function toggleFormulario() {
  formNuevaDenunciaEl.classList.toggle("d-none");
  if (!formNuevaDenunciaEl.classList.contains("d-none")) {
    tituloInputEl.focus();
  }
}

function renderizarLista() {
  listaDenunciasEl.innerHTML = "";

  if (denuncias.length === 0) {
    listaDenunciasEl.appendChild(crearElemento("div", "text-center text-muted mt-4", "No hay denuncias registradas por esta junta."));
    return;
  }

  denuncias
    .slice()
    .sort((a, b) => b.fechaValor - a.fechaValor)
    .forEach((denuncia) => {
      listaDenunciasEl.appendChild(crearCardDenuncia(denuncia));
    });

  actualizarFiltros();
}

function cargarDenuncias() {
  const ref = collection(db, "denuncias");
  const q = query(ref, where("creadoPor", "==", JUNTA_ID));

  onSnapshot(q, (snapshot) => {
    denuncias.length = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      denuncias.push({
        id: doc.id,
        titulo: data.titulo || "Sin título",
        descripcion: data.descripcion || "",
        estado: data.estado || ESTADO_DEFAULT,
        sector: data.sector || "Sin sector",
        fecha: formatearFecha(data.fecha),
        fechaValor: data.fecha?.toDate ? data.fecha.toDate().getTime() : 0
      });
    });

    actualizarOpcionesSector();
    renderizarLista();
  }, (error) => {
    console.error("Error en Firestore:", error);
    listaDenunciasEl.innerHTML = "";
    const errorEl = crearElemento("div", "text-danger text-center mt-4", `Error cargando denuncias: ${error.message}`);
    listaDenunciasEl.appendChild(errorEl);
  });
}

async function enviarNuevaDenuncia(event) {
  event.preventDefault();

  const titulo = tituloInputEl.value.trim();
  const descripcion = descripcionInputEl.value.trim();
  const sector = sectorInputEl.value.trim();

  if (!titulo || !descripcion || !sector) {
    mostrarMensaje("Completa todos los campos antes de enviar.", "error");
    return;
  }

  try {
    await addDoc(collection(db, "denuncias"), {
      titulo,
      descripcion,
      estado: ESTADO_DEFAULT,
      sector,
      creadoPor: JUNTA_ID,
      fuente: "ciudadano",
      fecha: serverTimestamp()
    });

    mostrarMensaje("Denuncia registrada correctamente.", "info");
    limpiarFormulario();
    toggleFormulario();
  } catch (error) {
    console.error("Error creando denuncia:", error);
    mostrarMensaje("No se pudo registrar la denuncia. Intenta nuevamente.", "error");
  }
}

function cancelarRegistro() {
  limpiarFormulario();
  if (!formNuevaDenunciaEl.classList.contains("d-none")) {
    toggleFormulario();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  listaDenunciasEl = document.getElementById("listaDenuncias");
  filtroEstadoEl = document.getElementById("filtroEstado");
  filtroSectorEl = document.getElementById("filtroSector");
  formNuevaDenunciaEl = document.getElementById("formNuevaDenuncia");
  tituloInputEl = document.getElementById("tituloDenuncia");
  descripcionInputEl = document.getElementById("descripcionDenuncia");
  sectorInputEl = document.getElementById("sectorDenuncia");
  feedbackEl = document.getElementById("formFeedback");
  btnToggleFormEl = document.getElementById("btnToggleForm");
  btnEnviarDenunciaEl = document.getElementById("btnEnviarDenuncia");
  btnCancelarDenunciaEl = document.getElementById("btnCancelarDenuncia");

  if (filtroEstadoEl) filtroEstadoEl.addEventListener("change", actualizarFiltros);
  if (filtroSectorEl) filtroSectorEl.addEventListener("change", actualizarFiltros);
  if (btnToggleFormEl) btnToggleFormEl.addEventListener("click", toggleFormulario);
  if (btnEnviarDenunciaEl) btnEnviarDenunciaEl.addEventListener("click", enviarNuevaDenuncia);
  if (btnCancelarDenunciaEl) btnCancelarDenunciaEl.addEventListener("click", cancelarRegistro);

  cargarDenuncias();
});