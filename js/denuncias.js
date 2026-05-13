import app from "./firebase.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET
} from "./cloudinary.js";

const db = getFirestore(app);
const auth = getAuth(app);
const rol = localStorage.getItem("rol");
const provinciasMap = {};
let perfilUsuario = null;
let evidenciasSeleccionadas = [];
let evidenciaSecuencia = 0;

const MAX_EVIDENCIA_BYTES = 12 * 1024 * 1024;
const UMBRAL_COMPRESION_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION_EVIDENCIA = 1920;
const CALIDAD_COMPRESION = 0.82;

function formatearBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const unidades = ["B", "KB", "MB", "GB"];
  const indice = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unidades.length - 1);
  const valor = bytes / (1024 ** indice);
  return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`;
}

function validarArchivoEvidencia(archivo) {
  if (!archivo) return;

  if (!archivo.type || !archivo.type.startsWith("image/")) {
    throw new Error("El archivo de evidencia debe ser una imagen valida (JPG, PNG, WEBP o similar).");
  }

  if (archivo.size > MAX_EVIDENCIA_BYTES) {
    throw new Error(
      `La evidencia excede el tamano maximo permitido (${formatearBytes(MAX_EVIDENCIA_BYTES)}).`
    );
  }
}

function cargarImagenDesdeArchivo(archivo) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(archivo);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo procesar la imagen seleccionada."));
    };

    img.src = objectUrl;
  });
}

function canvasToBlob(canvas, mimeType, calidad) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, calidad);
  });
}

async function comprimirImagenSiAplica(archivo) {
  if (!archivo || archivo.size <= UMBRAL_COMPRESION_BYTES) {
    return archivo;
  }

  // Mantener GIF sin procesar para evitar perder animacion.
  if (archivo.type === "image/gif") {
    return archivo;
  }

  const img = await cargarImagenDesdeArchivo(archivo);
  const factorEscala = Math.min(
    1,
    MAX_DIMENSION_EVIDENCIA / Math.max(img.width, img.height)
  );

  const ancho = Math.max(1, Math.round(img.width * factorEscala));
  const alto = Math.max(1, Math.round(img.height * factorEscala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const ctx = canvas.getContext("2d");
  if (!ctx) return archivo;

  ctx.drawImage(img, 0, 0, ancho, alto);
  const blobComprimido = await canvasToBlob(canvas, "image/jpeg", CALIDAD_COMPRESION);

  if (!blobComprimido || blobComprimido.size >= archivo.size) {
    return archivo;
  }

  const nombreBase = (archivo.name || "evidencia").replace(/\.[^.]+$/, "");
  return new File([blobComprimido], `${nombreBase}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now()
  });
}

async function subirEvidenciaACloudinary(archivo, uid, textoProgreso = "Subiendo imagen...") {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary no esta configurado. Define CLOUDINARY_CLOUD_NAME y CLOUDINARY_UPLOAD_PRESET en js/cloudinary.js"
    );
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `evidencias/${uid}`);

  mostrarProgresoSubida(0, textoProgreso);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        mostrarProgresoSubida(Math.round((e.loaded / e.total) * 100), textoProgreso);
      }
    });

    xhr.addEventListener("load", () => {
      ocultarProgresoSubida();
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300 || !data.secure_url) {
          const mensaje = data?.error?.message || "No se pudo subir la evidencia a Cloudinary.";
          reject(new Error(mensaje));
        } else {
          resolve(data.secure_url);
        }
      } catch {
        reject(new Error("Respuesta inesperada del servidor de imágenes."));
      }
    });

    xhr.addEventListener("error", () => {
      ocultarProgresoSubida();
      reject(new Error("Error de red al subir la imagen."));
    });

    xhr.addEventListener("abort", () => {
      ocultarProgresoSubida();
      reject(new Error("Subida cancelada."));
    });

    xhr.send(formData);
  });
}

function mostrarProgresoSubida(porcentaje, textoBase = "Subiendo imagen...") {
  let barra = document.getElementById("uploadProgressContainer");
  if (!barra) {
    barra = document.createElement("div");
    barra.id = "uploadProgressContainer";
    barra.className = "mt-2";
    barra.innerHTML = `
      <small class="text-muted" id="uploadProgressLabel">${textoBase}</small>
      <div class="progress" style="height:6px">
        <div id="uploadProgressBar" class="progress-bar progress-bar-striped progress-bar-animated"
             role="progressbar" style="width:0%"></div>
      </div>`;
    const evidenciaInput = document.getElementById("evidencia");
    evidenciaInput?.parentNode?.insertBefore(barra, evidenciaInput.nextSibling);
  }
  const bar = document.getElementById("uploadProgressBar");
  const label = document.getElementById("uploadProgressLabel");
  if (bar) bar.style.width = porcentaje + "%";
  if (label) label.textContent = porcentaje < 100 ? `${textoBase} ${porcentaje}%` : "Imagen subida correctamente.";
  barra.style.display = "";
}

function ocultarProgresoSubida() {
  const barra = document.getElementById("uploadProgressContainer");
  if (barra) barra.style.display = "none";
}

function mostrarMensajeFormulario(mensaje, tipo = "danger") {
  const msg = document.getElementById("msg");
  if (!msg) return;

  msg.className = `alert alert-${tipo} mt-3`;
  msg.textContent = mensaje;
}

function limpiarMensajeFormulario() {
  const msg = document.getElementById("msg");
  if (!msg) return;

  msg.className = "mt-3";
  msg.textContent = "";
}

async function mostrarAvisoUI({
  title = "Aviso",
  message = "",
  type = "info",
  confirmText = "Aceptar",
  cancelText = "Cerrar"
} = {}) {
  if (typeof window.gecomConfirm === "function") {
    await window.gecomConfirm({
      title,
      message,
      confirmText,
      cancelText,
      type
    });
    return;
  }

  const mapTipoAlerta = {
    info: "info",
    warning: "warning",
    danger: "danger"
  };
  mostrarMensajeFormulario(message || title, mapTipoAlerta[type] || "info");
}

function habilitarEnvioFormulario(estaHabilitado) {
  const submitBtn = document.querySelector("#formDenuncia button[type='submit']");
  if (!submitBtn) return;
  submitBtn.disabled = !estaHabilitado;
}

function claveArchivo(archivo) {
  return `${archivo.name}__${archivo.size}__${archivo.lastModified}`;
}

function renderizarPreviewEvidencia() {
  const previewWrap = document.getElementById("evidenciaPreviewWrap");
  const previewList = document.getElementById("evidenciaPreviewList");
  if (!previewWrap || !previewList) return;

  previewList.innerHTML = "";

  if (!evidenciasSeleccionadas.length) {
    previewWrap.classList.add("d-none");
    return;
  }

  evidenciasSeleccionadas.forEach((item, index) => {
    const card = document.createElement("div");
    card.style.width = "180px";
    card.style.border = "1px solid var(--gecom-stroke)";
    card.style.borderRadius = "8px";
    card.style.padding = "0.4rem";
    card.style.background = "var(--gecom-surface)";
    card.innerHTML = `
      <img
        src="${item.previewUrl}"
        alt="Vista previa de evidencia ${index + 1}"
        class="img-fluid"
        style="height:120px; width:100%; border-radius:6px; object-fit:cover;"
      >
      <button
        type="button"
        class="btn btn-sm btn-outline-danger w-100 mt-2 btn-quitar-evidencia-item"
        data-evidencia-id="${item.id}">
        <i class="bi bi-trash"></i> Quitar
      </button>
    `;
    previewList.appendChild(card);
  });

  previewWrap.classList.remove("d-none");
}

function limpiarPreviewEvidencia() {
  if (evidenciasSeleccionadas.length) {
    evidenciasSeleccionadas.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    evidenciasSeleccionadas = [];
  }

  const previewWrap = document.getElementById("evidenciaPreviewWrap");
  const previewList = document.getElementById("evidenciaPreviewList");
  if (!previewWrap || !previewList) return;

  previewList.innerHTML = "";
  previewWrap.classList.add("d-none");
}

function agregarEvidencias(archivos) {
  if (!archivos || !archivos.length) return { agregadas: 0, duplicadas: 0 };

  let agregadas = 0;
  let duplicadas = 0;
  const clavesExistentes = new Set(evidenciasSeleccionadas.map((item) => item.clave));

  archivos.forEach((archivo) => {
    validarArchivoEvidencia(archivo);
    const clave = claveArchivo(archivo);
    if (clavesExistentes.has(clave)) {
      duplicadas += 1;
      return;
    }

    const previewUrl = URL.createObjectURL(archivo);
    evidenciasSeleccionadas.push({
      id: ++evidenciaSecuencia,
      clave,
      archivo,
      previewUrl
    });
    clavesExistentes.add(clave);
    agregadas += 1;
  });

  renderizarPreviewEvidencia();
  return { agregadas, duplicadas };
}

function quitarEvidenciaPorId(id) {
  const indice = evidenciasSeleccionadas.findIndex((item) => String(item.id) === String(id));
  if (indice === -1) return false;

  const [eliminada] = evidenciasSeleccionadas.splice(indice, 1);
  if (eliminada?.previewUrl) URL.revokeObjectURL(eliminada.previewUrl);
  renderizarPreviewEvidencia();
  return true;
}

async function obtenerPerfilUsuario(uid) {
  const coleccionesPorRol = {
    junta: ["JuntasDeVecinos"],
    ayuntamiento: ["Ayuntamientos"],
    admin: ["Administradores"]
  };

  const colecciones = coleccionesPorRol[rol] || ["JuntasDeVecinos", "Ayuntamientos", "Administradores"];

  for (const nombreColeccion of colecciones) {
    const perfilSnap = await getDoc(doc(db, nombreColeccion, uid));
    if (perfilSnap.exists()) {
      return perfilSnap.data();
    }
  }

  return null;
}

function setSelectValue(selectId, value, placeholder) {
  const select = document.getElementById(selectId);
  if (!select) return;

  select.textContent = "";
  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = placeholder;
  select.appendChild(defaultOpt);

  if (value) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    opt.selected = true;
    select.appendChild(opt);
    select.disabled = true;
  }
}

async function cargarUbicacionDesdePerfil() {
  const uid = localStorage.getItem("uid");
  const rolLocal = localStorage.getItem("rol");

  if (!uid) {
    habilitarEnvioFormulario(false);
    mostrarMensajeFormulario("No hay una sesión activa. Inicia sesión para registrar denuncias.");
    return;
  }

  try {
    perfilUsuario = await obtenerPerfilUsuario(uid);

    if (!perfilUsuario) {
      habilitarEnvioFormulario(false);
      mostrarMensajeFormulario("No se encontró tu perfil en la base de datos. Contacta al administrador.");
      return;
    }

    const provinciaPerfil = (perfilUsuario.provincia || "").trim();
    const municipioPerfil = (perfilUsuario.municipio || "").trim();
    const comunidadPerfil = (perfilUsuario.comunidad || "").trim();

    setSelectValue("provincia", provinciaPerfil, "Seleccionar provincia");
    setSelectValue("municipio", municipioPerfil, "Seleccionar municipio");

    const sectorInput = document.getElementById("sector");
    if (sectorInput) {
      sectorInput.value = comunidadPerfil;
      sectorInput.readOnly = true;
    }

    if (!provinciaPerfil || !municipioPerfil) {
      habilitarEnvioFormulario(false);
      mostrarMensajeFormulario(
        "Tu perfil no tiene provincia o municipio configurado. Actualiza tus datos antes de crear una denuncia."
      );
      return;
    }

    habilitarEnvioFormulario(true);
    limpiarMensajeFormulario();
  } catch (error) {
    console.error("Error al cargar ubicación del usuario:", error);
    habilitarEnvioFormulario(false);
    mostrarMensajeFormulario("No se pudo cargar la ubicación de tu perfil. Intenta nuevamente.");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  cargarUbicaciones();

  const formDenuncia = document.getElementById("formDenuncia");
  if (formDenuncia) {
    formDenuncia.addEventListener("submit", (event) => {
      event.preventDefault();
      window.crearDenuncia();
    });
  }

  const provinciaSelect = document.getElementById("provincia");
  if (provinciaSelect) {
    provinciaSelect.addEventListener("change", actualizarMunicipios);
  }

  const municipioSelect = document.getElementById("municipio");
  if (municipioSelect) {
    municipioSelect.addEventListener("change", actualizarDistritos);
  }

  const evidenciaInput = document.getElementById("evidencia");
  if (evidenciaInput) {
    evidenciaInput.addEventListener("change", () => {
      const archivos = Array.from(evidenciaInput.files || []);
      if (!archivos.length) {
        return;
      }

      try {
        const { agregadas, duplicadas } = agregarEvidencias(archivos);
        limpiarMensajeFormulario();
        if (duplicadas > 0) {
          mostrarMensajeFormulario(`Se omitieron ${duplicadas} imagen(es) duplicada(s).`, "warning");
        } else if (agregadas > 0) {
          mostrarMensajeFormulario(`Se agregaron ${agregadas} imagen(es).`, "info");
        }
      } catch (error) {
        mostrarMensajeFormulario(error.message, "danger");
      } finally {
        evidenciaInput.value = "";
      }
    });
  }

  const evidenciaPreviewList = document.getElementById("evidenciaPreviewList");
  if (evidenciaPreviewList) {
    evidenciaPreviewList.addEventListener("click", (event) => {
      const btn = event.target.closest(".btn-quitar-evidencia-item");
      if (!btn) return;
      const ok = quitarEvidenciaPorId(btn.dataset.evidenciaId);
      if (ok) {
        mostrarMensajeFormulario("Imagen eliminada del formulario.", "info");
      }
    });
  }

  const btnQuitarEvidencia = document.getElementById("btnQuitarEvidencia");
  if (btnQuitarEvidencia) {
    btnQuitarEvidencia.addEventListener("click", () => {
      const input = document.getElementById("evidencia");
      if (input) {
        input.value = "";
      }
      limpiarPreviewEvidencia();
      mostrarMensajeFormulario("Imagenes eliminadas del formulario.", "info");
    });
  }

  auth.onAuthStateChanged((user) => {
    if (user && user.uid === localStorage.getItem("uid")) {
      cargarUbicacionDesdePerfil();
    } else {
      habilitarEnvioFormulario(false);
      mostrarMensajeFormulario("No hay una sesión activa. Inicia sesión para registrar denuncias.");
    }
  });
});

// CREAR DENUNCIA
window.crearDenuncia = async function () {
  const submitBtn = document.querySelector("#formDenuncia button[type='submit']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn._textoOriginal = submitBtn.textContent;
    submitBtn.textContent = "Enviando...";
  }

  try {
    const titulo = document.getElementById("titulo").value.trim();
    const tipoSelect = document.getElementById("tipo").value;
    const tipoOtro = document.getElementById("tipo_otro")?.value.trim();
    const tipo = tipoSelect === "Otro" ? tipoOtro : tipoSelect;
    const descripcion = document.getElementById("descripcion").value.trim();
    const provincia = document.getElementById("provincia").value;
    const municipio = document.getElementById("municipio").value;
    const sector = document.getElementById("sector").value.trim();
    const fecha_incidente = document.getElementById("fecha_incidente").value;
    const evidenciaFiles = evidenciasSeleccionadas.map((item) => item.archivo);

    // Validar campos obligatorios
    if (!titulo || !tipo || !descripcion || !provincia || !municipio || !sector) {
      await mostrarAvisoUI({
        title: "Campos incompletos",
        message: "Todos los campos son obligatorios.",
        type: "warning"
      });
      return;
    }

    if (document.getElementById("tipo").value === "Otro" && !tipo) {
      await mostrarAvisoUI({
        title: "Falta información",
        message: "Por favor especifica el tipo de denuncia.",
        type: "warning"
      });
      return;
    }

    const uid = localStorage.getItem("uid");

    // VALIDAR SESIÓN
    if (!uid || !auth.currentUser) {
      await mostrarAvisoUI({
        title: "Sesión requerida",
        message: "Debes iniciar sesión.",
        type: "warning",
        confirmText: "Ir al inicio"
      });
      window.location.href = "index.html";
      return;
    }

    // Verificar que el UID coincida
    if (auth.currentUser.uid !== uid) {
      await mostrarAvisoUI({
        title: "Sesión inválida",
        message: "Error de autenticación. Por favor inicia sesión nuevamente.",
        type: "warning",
        confirmText: "Ir al inicio"
      });
      window.location.href = "index.html";
      return;
    }

    // Solo las juntas pueden registrar denuncias
    if (rol !== "junta") {
      await mostrarAvisoUI({
        title: "Sin permisos",
        message: "Solo las juntas de vecinos pueden registrar denuncias.",
        type: "danger"
      });
      window.location.href = "index.html";
      return;
    }

    // Obtener datos del usuario
    if (!perfilUsuario) {
      perfilUsuario = await obtenerPerfilUsuario(uid);
    }

    if (!perfilUsuario?.provincia || !perfilUsuario?.municipio) {
      mostrarMensajeFormulario(
        "No puedes guardar denuncias porque tu perfil no tiene provincia o municipio configurado."
      );
      habilitarEnvioFormulario(false);
      return;
    }

    const comunidad = perfilUsuario?.comunidad || perfilUsuario?.sector || perfilUsuario?.institucion || perfilUsuario?.nombreJunta || sector || "Sin comunidad";

    const evidenciasURL = [];
    if (evidenciaFiles.length) {
      try {
        for (let i = 0; i < evidenciaFiles.length; i += 1) {
          const evidenciaFile = evidenciaFiles[i];
          validarArchivoEvidencia(evidenciaFile);
          const evidenciaProcesada = await comprimirImagenSiAplica(evidenciaFile);
          const textoProgreso = evidenciaFiles.length > 1
            ? `Subiendo imagen ${i + 1} de ${evidenciaFiles.length}...`
            : "Subiendo imagen...";
          const evidenciaURL = await subirEvidenciaACloudinary(evidenciaProcesada, uid, textoProgreso);
          evidenciasURL.push(evidenciaURL);
        }
      } catch (uploadError) {
        console.error("Error en carga de archivo:", uploadError);
        const continuarSinEvidencia = await window.gecomConfirm({
          title: "Error al subir imagenes",
          message: "No se pudieron subir todas las imagenes. ¿Deseas guardar la denuncia sin evidencia?",
          confirmText: "Guardar sin imagenes",
          cancelText: "Cancelar",
          type: "warning",
        });
        if (!continuarSinEvidencia) {
          mostrarMensajeFormulario("Error al cargar la evidencia: " + uploadError.message, "danger");
          return;
        }
        evidenciasURL.length = 0;
      }
    }

    const evidenciaURL = evidenciasURL[0] || "";

    // GUARDAR EN FIRESTORE
    await addDoc(collection(db, "denuncias"), {
      titulo,
      tipo,
      descripcion,
      provincia,
      municipio,
      sector,
      fecha_incidente: fecha_incidente ? new Date(fecha_incidente) : null,
      evidencia: evidenciaURL,
      evidencias: evidenciasURL,
      estado: "Pendiente",
      fecha: new Date(),
      uid,
      rol_creador: "junta",
      junta_id: uid,
      comunidad
    });

    await mostrarAvisoUI({
      title: "Denuncia creada",
      message: "La denuncia fue registrada correctamente.",
      type: "info",
      confirmText: "Entendido",
      cancelText: "Cerrar"
    });
    mostrarMensajeFormulario("Denuncia creada correctamente.", "success");
    document.getElementById("formDenuncia").reset();
    limpiarPreviewEvidencia();
    ocultarProgresoSubida();
    const campoTipoOtro = document.getElementById("tipo_otro");
    if (campoTipoOtro) {
      campoTipoOtro.classList.add("d-none");
      campoTipoOtro.required = false;
    }
    await cargarUbicacionDesdePerfil();
  } catch (error) {
    console.error("ERROR:", error.message);
    await mostrarAvisoUI({
      title: "Error al crear denuncia",
      message: error.message || "No se pudo crear la denuncia.",
      type: "danger"
    });
    mostrarMensajeFormulario("Error al crear denuncia: " + error.message, "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = submitBtn._textoOriginal || "Enviar denuncia";
    }
  }
};

async function cargarUbicaciones() {
  const response = await fetch("js/provincias.json");
  const provincias = await response.json();
  const provinciaSelect = document.getElementById("provincia");
  provinciaSelect.innerHTML = '<option value="" selected>Seleccionar provincia</option>';

  provincias.forEach((item) => {
    provinciasMap[item.nombre] = item.municipios || [];
    const option = document.createElement("option");
    option.value = item.nombre;
    option.textContent = item.nombre;
    provinciaSelect.appendChild(option);
  });
}

function actualizarMunicipios() {
  const provincia = document.getElementById("provincia").value;
  const municipioSelect = document.getElementById("municipio");
  municipioSelect.innerHTML = '<option value="" selected>Seleccionar municipio</option>';

  (provinciasMap[provincia] || []).forEach((municipio) => {
    const option = document.createElement("option");
    option.value = municipio;
    option.textContent = municipio;
    municipioSelect.appendChild(option);
  });

  actualizarDistritos();
}

function actualizarDistritos() {
  const municipio = document.getElementById("municipio").value;
  const distritoSelect = document.getElementById("distrito_municipal");
  if (!distritoSelect) {
    return;
  }

  distritoSelect.innerHTML = '<option value="" selected>Seleccionar distrito</option>';
  if (!municipio) {
    return;
  }

  const option = document.createElement("option");
  option.value = municipio;
  option.textContent = municipio;
  distritoSelect.appendChild(option);
}