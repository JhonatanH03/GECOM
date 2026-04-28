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
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const rol = localStorage.getItem("rol");
const uid = localStorage.getItem("uid");
let ayuntamientoMunicipio = null;
let currentDenunciaId = null;
const detalleModal = new bootstrap.Modal(document.getElementById("detalleModal"));

const ITEMS_POR_PAGINA = 20;
let todasLasDenuncias = [];
let paginaActual = 1;

function poblarFiltrosZonaAdmin() {
  if (rol !== "admin") return;

  const wrap = document.getElementById("filtrosZonaAdmin");
  const filtroProvincia = document.getElementById("filtroProvincia");
  const filtroMunicipio = document.getElementById("filtroMunicipio");
  const filtroComunidad = document.getElementById("filtroComunidad");
  if (!wrap || !filtroProvincia || !filtroMunicipio || !filtroComunidad) return;

  const provinciaActual = filtroProvincia.value || "Todos";
  const municipioActual = filtroMunicipio.value || "Todos";
  const comunidadActual = filtroComunidad.value || "Todos";

  const provincias = Array.from(new Set(
    todasLasDenuncias
      .map(({ data }) => (data.provincia || "").trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  filtroProvincia.innerHTML = '<option value="Todos">Todos</option>';
  provincias.forEach((p) => {
    const option = document.createElement("option");
    option.value = p;
    option.textContent = p;
    filtroProvincia.appendChild(option);
  });
  filtroProvincia.value = provincias.includes(provinciaActual) ? provinciaActual : "Todos";

  const municipios = Array.from(new Set(
    todasLasDenuncias
      .filter(({ data }) => filtroProvincia.value === "Todos" || (data.provincia || "") === filtroProvincia.value)
      .map(({ data }) => (data.municipio || "").trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  filtroMunicipio.innerHTML = '<option value="Todos">Todos</option>';
  municipios.forEach((m) => {
    const option = document.createElement("option");
    option.value = m;
    option.textContent = m;
    filtroMunicipio.appendChild(option);
  });

  filtroMunicipio.value = municipios.includes(municipioActual) ? municipioActual : "Todos";

  const comunidades = Array.from(new Set(
    todasLasDenuncias
      .filter(({ data }) => {
        const matchProvincia = filtroProvincia.value === "Todos" || (data.provincia || "") === filtroProvincia.value;
        const matchMunicipio = filtroMunicipio.value === "Todos" || (data.municipio || "") === filtroMunicipio.value;
        return matchProvincia && matchMunicipio;
      })
      .map(({ data }) => (data.comunidad || "").trim())
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

  filtroComunidad.innerHTML = '<option value="Todos">Todos</option>';
  comunidades.forEach((c) => {
    const option = document.createElement("option");
    option.value = c;
    option.textContent = c;
    filtroComunidad.appendChild(option);
  });

  filtroComunidad.value = comunidades.includes(comunidadActual) ? comunidadActual : "Todos";
  wrap.classList.remove("d-none");
}

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
      <img
        src="${escapeHtml(data.evidencia)}"
        alt="Evidencia de la denuncia"
        class="img-fluid rounded shadow-sm mb-2"
        style="max-height:320px; object-fit:contain; cursor:pointer;"
        onclick="window.open('${escapeHtml(data.evidencia)}', '_blank')"
        title="Clic para ver en tamaño completo"
      />
      <div>
        <a href="${escapeHtml(data.evidencia)}" target="_blank" class="btn btn-sm btn-outline-primary mt-1">
          Ver imagen completa
        </a>
      </div>
    `;
  } else {
    evidenciaContainer.innerHTML = `<p class="text-muted">No hay evidencia disponible.</p>`;
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

function renderizarPagina() {
  const tabla = document.getElementById("tablaDenuncias");
  const filtro = document.getElementById("filtroEstado").value;
  const filtroProvincia = document.getElementById("filtroProvincia")?.value || "Todos";
  const filtroMunicipio = document.getElementById("filtroMunicipio")?.value || "Todos";
  const filtroComunidad = document.getElementById("filtroComunidad")?.value || "Todos";

  const filtradas = todasLasDenuncias.filter(({ data }) => {
    const cumpleEstado = filtro === "Todos" || data.estado === filtro;
    const cumpleProvincia = rol !== "admin" || filtroProvincia === "Todos" || (data.provincia || "") === filtroProvincia;
    const cumpleMunicipio = rol !== "admin" || filtroMunicipio === "Todos" || (data.municipio || "") === filtroMunicipio;
    const cumpleComunidad = rol !== "admin" || filtroComunidad === "Todos" || (data.comunidad || "") === filtroComunidad;
    return cumpleEstado && cumpleProvincia && cumpleMunicipio && cumpleComunidad;
  });

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / ITEMS_POR_PAGINA));
  if (paginaActual > totalPaginas) paginaActual = totalPaginas;

  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const pagina = filtradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

  tabla.innerHTML = "";

  if (pagina.length === 0) {
    tabla.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No hay denuncias para mostrar.</td></tr>`;
  } else {
    pagina.forEach(({ id, data }) => {
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${escapeHtml(data.titulo || "Sin título")}</td>
        <td>${escapeHtml((data.descripcion || "Sin descripción").slice(0, 80))}${data.descripcion && data.descripcion.length > 80 ? "..." : ""}</td>
        <td>${escapeHtml(data.comunidad || "Sin comunidad")}</td>
        <td>${escapeHtml(data.estado || "Pendiente")}</td>
        <td>${data.fecha ? new Date(data.fecha.seconds * 1000).toLocaleDateString() : "Sin fecha"}</td>
        <td><button class="btn btn-sm btn-primary ver-btn" data-id="${id}">Ver</button></td>
      `;
      tabla.appendChild(fila);
    });
  }

  document.querySelectorAll(".ver-btn").forEach((btn) => {
    btn.addEventListener("click", () => abrirDetalleDenuncia(btn.dataset.id));
  });

  // Paginación
  const container = document.getElementById("paginacionContainer");
  const info = document.getElementById("paginacionInfo");
  const controles = document.getElementById("paginacionControles");

  if (filtradas.length <= ITEMS_POR_PAGINA) {
    container.classList.add("d-none");
    return;
  }

  container.classList.remove("d-none");
  info.textContent = `Mostrando ${inicio + 1}–${Math.min(inicio + ITEMS_POR_PAGINA, filtradas.length)} de ${filtradas.length} denuncias`;

  controles.innerHTML = "";

  // Anterior
  const liPrev = document.createElement("li");
  liPrev.className = `page-item ${paginaActual === 1 ? "disabled" : ""}`;
  liPrev.innerHTML = `<a class="page-link" href="#">«</a>`;
  liPrev.addEventListener("click", (e) => { e.preventDefault(); if (paginaActual > 1) { paginaActual--; renderizarPagina(); } });
  controles.appendChild(liPrev);

  // Páginas numeradas (máximo 5 visibles)
  const rango = 2;
  const desde = Math.max(1, paginaActual - rango);
  const hasta = Math.min(totalPaginas, paginaActual + rango);

  for (let i = desde; i <= hasta; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === paginaActual ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    const pagNum = i;
    li.addEventListener("click", (e) => { e.preventDefault(); paginaActual = pagNum; renderizarPagina(); });
    controles.appendChild(li);
  }

  // Siguiente
  const liNext = document.createElement("li");
  liNext.className = `page-item ${paginaActual === totalPaginas ? "disabled" : ""}`;
  liNext.innerHTML = `<a class="page-link" href="#">»</a>`;
  liNext.addEventListener("click", (e) => { e.preventDefault(); if (paginaActual < totalPaginas) { paginaActual++; renderizarPagina(); } });
  controles.appendChild(liNext);
}

async function cargarDenuncias() {
  try {
    let q;

    console.log("[GECOM ver] rol:", rol, "| uid:", uid, "| municipio ayuntamiento:", ayuntamientoMunicipio);

    if (rol === "admin") {
      q = collection(db, "denuncias");
    } else if (rol === "junta") {
      q = query(collection(db, "denuncias"), where("uid", "==", uid));
    } else if (rol === "ayuntamiento") {
      q = ayuntamientoMunicipio
        ? query(collection(db, "denuncias"), where("municipio", "==", ayuntamientoMunicipio))
        : collection(db, "denuncias");
    } else {
      q = query(collection(db, "denuncias"), where("uid", "==", uid));
    }

    const querySnapshot = await getDocs(q);
    console.log("[GECOM ver] total denuncias obtenidas:", querySnapshot.size);

    todasLasDenuncias = [];
    querySnapshot.forEach((docSnap) => {
      todasLasDenuncias.push({ id: docSnap.id, data: docSnap.data() });
    });

    // Ordenar por fecha desc
    todasLasDenuncias.sort((a, b) => {
      const fa = a.data.fecha?.seconds || 0;
      const fb = b.data.fecha?.seconds || 0;
      return fb - fa;
    });

    poblarFiltrosZonaAdmin();

    paginaActual = 1;
    renderizarPagina();
  } catch (error) {
    console.error("Error cargando denuncias:", error);
    const tabla = document.getElementById("tablaDenuncias");
    tabla.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-3">Error al cargar denuncias: ${escapeHtml(error.message)}</td></tr>`;
  }
}

async function obtenerMunicipioAyuntamiento() {
  if (rol !== "ayuntamiento") return;
  try {
    const colecciones = ["Ayuntamientos", "usuarios"];
    for (const col of colecciones) {
      const userDoc = await getDoc(doc(db, col, uid));
      if (userDoc.exists()) {
        ayuntamientoMunicipio = userDoc.data().municipio || null;
        break;
      }
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
    detalleModal.hide();
    await cargarDenuncias();
    const paginaFeedback = document.getElementById("paginaFeedback");
    if (paginaFeedback) {
      paginaFeedback.innerHTML = `<div class="alert alert-success alert-dismissible fade show" role="alert">
        Respuesta guardada correctamente.
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>`;
      setTimeout(() => { paginaFeedback.innerHTML = ""; }, 4000);
    }
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
  document.getElementById("filtroEstado").addEventListener("change", () => {
    paginaActual = 1;
    renderizarPagina();
  });
  if (rol === "admin") {
    document.getElementById("filtroProvincia")?.addEventListener("change", () => {
      poblarFiltrosZonaAdmin();
      paginaActual = 1;
      renderizarPagina();
    });
    document.getElementById("filtroMunicipio")?.addEventListener("change", () => {
      poblarFiltrosZonaAdmin();
      paginaActual = 1;
      renderizarPagina();
    });
    document.getElementById("filtroComunidad")?.addEventListener("change", () => {
      paginaActual = 1;
      renderizarPagina();
    });
  }
  document.getElementById("detalleForm").addEventListener("submit", responderDenuncia);
}

window.addEventListener("DOMContentLoaded", () => {
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      init();
    } else {
      window.location.href = "index.html";
    }
  });
});