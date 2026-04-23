import app from "./firebase.js";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);
const rol = localStorage.getItem("rol");
const uid = localStorage.getItem("uid");
let ayuntamientoMunicipio = null;
let currentDenunciaId = null;
const detalleModal = new bootstrap.Modal(document.getElementById("detalleModal"));

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mostrarModalFeedback(message, type = "danger") {
  const feedback = document.getElementById("modalFeedback");
  feedback.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function limpiarModalFeedback() {
  document.getElementById("modalFeedback").innerHTML = "";
}

function mostrarDetalleDenuncia(data, id) {
  currentDenunciaId = id;
  document.getElementById("detalleId").value = id;
  document.getElementById("detalleTitulo").textContent = data.titulo || "Sin título";
  document.getElementById("detalleTipo").textContent = data.tipo || "No especificado";
  document.getElementById("detalleEstado").textContent = data.estado || "Pendiente";
  document.getElementById("detalleComunidad").textContent = data.comunidad || "Sin comunidad";
  document.getElementById("detalleUbicacion").textContent = `${escapeHtml(data.provincia || "")} / ${escapeHtml(data.municipio || "")} / ${escapeHtml(data.distrito_municipal || "")} / ${escapeHtml(data.sector || "")}`;
  document.getElementById("detalleFechaIncidente").textContent = data.fecha_incidente ? new Date(data.fecha_incidente.seconds * 1000).toLocaleDateString() : "No especificado";
  document.getElementById("detalleFechaRegistro").textContent = data.fecha ? new Date(data.fecha.seconds * 1000).toLocaleString() : "No especificado";
  document.getElementById("detalleDescripcion").textContent = data.descripcion || "Sin descripción";

  document.getElementById("detalleEstadoActual").textContent = data.estado || "Pendiente";
  document.getElementById("detallePlazo").textContent = data.plazo_estimado || "No asignado";
  document.getElementById("detallePresupuesto").textContent = data.presupuesto_estimado || "No asignado";
  document.getElementById("detalleRespuesta").textContent = data.respuesta_ayuntamiento || "Sin respuesta oficial aún";

  const evidenciaContainer = document.getElementById("detalleEvidencia");
  evidenciaContainer.innerHTML = "";

  if (data.evidencia) {
    evidenciaContainer.innerHTML = `
      <a href="${escapeHtml(data.evidencia)}" target="_blank" class="d-block mb-2">Ver evidencia</a>
      <img src="${escapeHtml(data.evidencia)}" alt="Evidencia" class="img-fluid rounded shadow-sm" />
    `;
  } else {
    evidenciaContainer.textContent = "No hay evidencia disponible.";
  }

  const responseSection = document.getElementById("ayuntamientoResponseSection");
  if (rol === "ayuntamiento") {
    responseSection.classList.remove("d-none");
    document.getElementById("respuestaEstado").value = data.estado || "Pendiente";
    document.getElementById("respuestaPlazo").value = data.plazo_estimado || "";
    document.getElementById("respuestaPresupuesto").value = data.presupuesto_estimado || "";
    document.getElementById("respuestaTexto").value = data.respuesta_ayuntamiento || "";
  } else {
    responseSection.classList.add("d-none");
  }

  detalleModal.show();
}

async function abrirDetalleDenuncia(id) {
  try {
    limpiarModalFeedback();
    const docSnap = await getDoc(doc(db, "denuncias", id));
    if (!docSnap.exists()) {
      mostrarModalFeedback("No se encontró la denuncia.", "danger");
      return;
    }
    mostrarDetalleDenuncia(docSnap.data(), id);
  } catch (error) {
    console.error("Error cargando detalle:", error);
    mostrarModalFeedback("Error al cargar el detalle de la denuncia.", "danger");
  }
}

async function cargarDenuncias() {
  try {
    const filtro = document.getElementById("filtroEstado").value;
    let q;

    if (rol === "admin") {
      q = collection(db, "denuncias");
    } else if (rol === "junta") {
      q = query(collection(db, "denuncias"), where("uid", "==", uid));
    } else if (rol === "ayuntamiento" && ayuntamientoMunicipio) {
      q = query(collection(db, "denuncias"), where("municipio", "==", ayuntamientoMunicipio));
    } else {
      q = collection(db, "denuncias");
    }

    const querySnapshot = await getDocs(q);
    const tabla = document.getElementById("tablaDenuncias");
    tabla.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (filtro !== "Todos" && data.estado !== filtro) return;

      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${escapeHtml(data.titulo || "Sin título")}</td>
        <td>${escapeHtml((data.descripcion || "Sin descripción").slice(0, 80))}${data.descripcion && data.descripcion.length > 80 ? "..." : ""}</td>
        <td>${escapeHtml(data.comunidad || "Sin comunidad")}</td>
        <td>${escapeHtml(data.estado || "Pendiente")}</td>
        <td>${data.fecha ? new Date(data.fecha.seconds * 1000).toLocaleDateString() : "Sin fecha"}</td>
        <td><button class="btn btn-sm btn-primary ver-btn" data-id="${docSnap.id}">Ver</button></td>
      `;
      tabla.appendChild(fila);
    });

    document.querySelectorAll(".ver-btn").forEach((button) => {
      button.addEventListener("click", () => abrirDetalleDenuncia(button.dataset.id));
    });
  } catch (error) {
    console.error("Error cargando denuncias:", error);
  }
}

async function obtenerMunicipioAyuntamiento() {
  if (rol !== "ayuntamiento") return;
  try {
    const userDoc = await getDoc(doc(db, "Ayuntamientos", uid));
    if (userDoc.exists()) {
      ayuntamientoMunicipio = userDoc.data().municipio || null;
    }
  } catch (error) {
    console.error("Error cargando datos del ayuntamiento:", error);
  }
}

async function responderDenuncia(event) {
  event.preventDefault();
  if (rol !== "ayuntamiento") return;
  if (!currentDenunciaId) {
    mostrarModalFeedback("Selecciona primero una denuncia.", "danger");
    return;
  }

  const estado = document.getElementById("respuestaEstado").value;
  const plazo = document.getElementById("respuestaPlazo").value.trim();
  const presupuesto = document.getElementById("respuestaPresupuesto").value.trim();
  const respuesta = document.getElementById("respuestaTexto").value.trim();

  if (!plazo || !presupuesto || !respuesta) {
    mostrarModalFeedback("Todos los campos de respuesta son obligatorios.", "danger");
    return;
  }

  try {
    await updateDoc(doc(db, "denuncias", currentDenunciaId), {
      estado,
      plazo_estimado: plazo,
      presupuesto_estimado: presupuesto,
      respuesta_ayuntamiento: respuesta,
      fecha_respuesta: new Date(),
      ayuntamiento_id: uid
    });
    mostrarModalFeedback("Respuesta guardada correctamente.", "success");
    await cargarDenuncias();
  } catch (error) {
    console.error("Error guardando respuesta:", error);
    mostrarModalFeedback("No se pudo guardar la respuesta. Intenta nuevamente.", "danger");
  }
}

function validarSesion() {
  if (!uid || !rol) {
    window.location.href = "index.html";
    return false;
  }
  return true;
}

async function init() {
  if (!validarSesion()) return;
  await obtenerMunicipioAyuntamiento();
  await cargarDenuncias();
  document.getElementById("filtroEstado").addEventListener("change", cargarDenuncias);
  document.getElementById("detalleForm").addEventListener("submit", responderDenuncia);
}

window.addEventListener("DOMContentLoaded", init);