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
let evidenciaPreviewUrl = null;

const MAX_EVIDENCIA_BYTES = 8 * 1024 * 1024;
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

async function subirEvidenciaACloudinary(archivo, uid) {
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

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData
  });

  const data = await response.json();
  if (!response.ok || !data.secure_url) {
    const mensaje = data?.error?.message || "No se pudo subir la evidencia a Cloudinary.";
    throw new Error(mensaje);
  }

  return data.secure_url;
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

function habilitarEnvioFormulario(estaHabilitado) {
  const submitBtn = document.querySelector("#formDenuncia button[type='submit']");
  if (!submitBtn) return;
  submitBtn.disabled = !estaHabilitado;
}

function limpiarPreviewEvidencia() {
  if (evidenciaPreviewUrl) {
    URL.revokeObjectURL(evidenciaPreviewUrl);
    evidenciaPreviewUrl = null;
  }

  const previewWrap = document.getElementById("evidenciaPreviewWrap");
  const previewImg = document.getElementById("evidenciaPreviewImg");
  if (!previewWrap || !previewImg) return;

  previewImg.src = "";
  previewWrap.classList.add("d-none");
}

function actualizarPreviewEvidencia(archivo) {
  const previewWrap = document.getElementById("evidenciaPreviewWrap");
  const previewImg = document.getElementById("evidenciaPreviewImg");
  if (!previewWrap || !previewImg) return;

  limpiarPreviewEvidencia();
  if (!archivo) return;

  evidenciaPreviewUrl = URL.createObjectURL(archivo);
  previewImg.src = evidenciaPreviewUrl;
  previewWrap.classList.remove("d-none");
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

  select.innerHTML = `<option value="">${placeholder}</option>`;

  if (value) {
    select.innerHTML = `<option value="${value}" selected>${value}</option>`;
    select.disabled = true;
  }
}

async function cargarUbicacionDesdePerfil() {
  const uid = localStorage.getItem("uid");
  const rolLocal = localStorage.getItem("rol");

  console.log("[GECOM] uid:", uid, "| rol:", rolLocal);

  if (!uid) {
    habilitarEnvioFormulario(false);
    mostrarMensajeFormulario("No hay una sesión activa. Inicia sesión para registrar denuncias.");
    return;
  }

  try {
    perfilUsuario = await obtenerPerfilUsuario(uid);

    console.log("[GECOM] perfilUsuario:", perfilUsuario);

    if (!perfilUsuario) {
      habilitarEnvioFormulario(false);
      mostrarMensajeFormulario("No se encontró tu perfil en la base de datos. Contacta al administrador.");
      return;
    }

    const provinciaPerfil = (perfilUsuario.provincia || "").trim();
    const municipioPerfil = (perfilUsuario.municipio || "").trim();
    const comunidadPerfil = (perfilUsuario.comunidad || "").trim();

    console.log("[GECOM] provincia:", provinciaPerfil, "| municipio:", municipioPerfil, "| comunidad:", comunidadPerfil);

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
      const archivo = evidenciaInput.files?.[0];
      if (!archivo) {
        limpiarPreviewEvidencia();
        return;
      }

      try {
        validarArchivoEvidencia(archivo);
        actualizarPreviewEvidencia(archivo);
        limpiarMensajeFormulario();
      } catch (error) {
        evidenciaInput.value = "";
        limpiarPreviewEvidencia();
        mostrarMensajeFormulario(error.message, "danger");
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
      mostrarMensajeFormulario("Imagen eliminada del formulario.", "info");
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
    const evidenciaFile = document.getElementById("evidencia").files[0];

    // Validar campos obligatorios
    if (!titulo || !tipo || !descripcion || !provincia || !municipio || !sector) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    if (document.getElementById("tipo").value === "Otro" && !tipo) {
      alert("Por favor especifica el tipo de denuncia.");
      return;
    }

    const uid = localStorage.getItem("uid");

    // VALIDAR SESIÓN
    if (!uid || !auth.currentUser) {
      alert("Debes iniciar sesión");
      window.location.href = "index.html";
      return;
    }

    // Verificar que el UID coincida
    if (auth.currentUser.uid !== uid) {
      alert("Error de autenticación. Por favor inicia sesión nuevamente");
      window.location.href = "index.html";
      return;
    }

    // Solo las juntas pueden registrar denuncias
    if (rol !== "junta") {
      alert("Solo las juntas de vecinos pueden registrar denuncias.");
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

    let evidenciaURL = "";
    if (evidenciaFile) {
      try {
        validarArchivoEvidencia(evidenciaFile);
        const evidenciaProcesada = await comprimirImagenSiAplica(evidenciaFile);
        evidenciaURL = await subirEvidenciaACloudinary(evidenciaProcesada, uid);
      } catch (uploadError) {
        console.error("Error en carga de archivo:", uploadError);
        const continuarSinEvidencia = window.confirm(
          "No se pudo subir la imagen a Cloudinary. ¿Deseas guardar la denuncia sin evidencia?"
        );
        if (!continuarSinEvidencia) {
          alert("Error al cargar la evidencia: " + uploadError.message);
          return;
        }
      }
    }

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
      estado: "Pendiente",
      fecha: new Date(),
      uid,
      rol_creador: "junta",
      junta_id: uid,
      comunidad
    });

    alert("Denuncia creada correctamente");
    document.getElementById("formDenuncia").reset();
    limpiarPreviewEvidencia();
    const campoTipoOtro = document.getElementById("tipo_otro");
    if (campoTipoOtro) {
      campoTipoOtro.classList.add("d-none");
      campoTipoOtro.required = false;
    }
    await cargarUbicacionDesdePerfil();
  } catch (error) {
    console.error("ERROR:", error.message);
    alert("Error al crear denuncia: " + error.message);
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