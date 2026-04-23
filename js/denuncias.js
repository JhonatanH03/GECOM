import app from "./firebase.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const rol = localStorage.getItem("rol");
let perfilUsuario = null;

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

async function obtenerPerfilUsuario(uid) {
  const coleccionesPorRol = {
    junta: ["JuntasDeVecinos", "usuarios"],
    ayuntamiento: ["Ayuntamientos", "usuarios"],
    admin: ["Administradores", "usuarios"]
  };

  const colecciones = coleccionesPorRol[rol] || ["usuarios", "JuntasDeVecinos", "Ayuntamientos", "Administradores"];

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
    const distritoPerfil = (perfilUsuario.distrito_municipal || municipioPerfil || "").trim();

    setSelectValue("provincia", provinciaPerfil, "Seleccionar provincia");
    setSelectValue("municipio", municipioPerfil, "Seleccionar municipio");
    setSelectValue(
      "distrito_municipal",
      distritoPerfil,
      "Seleccionar distrito"
    );

    const sectorInput = document.getElementById("sector");
    if (sectorInput && !sectorInput.value && perfilUsuario.sector) {
      sectorInput.value = perfilUsuario.sector;
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
  const formDenuncia = document.getElementById("formDenuncia");
  if (formDenuncia) {
    formDenuncia.addEventListener("submit", (event) => {
      event.preventDefault();
      window.crearDenuncia();
    });
  }

  cargarUbicacionDesdePerfil();
});

// CREAR DENUNCIA
window.crearDenuncia = async function () {
  try {
    const titulo = document.getElementById("titulo").value.trim();
    const tipo = document.getElementById("tipo").value;
    const descripcion = document.getElementById("descripcion").value.trim();
    const provincia = document.getElementById("provincia").value;
    const municipio = document.getElementById("municipio").value;
    const distrito_municipal = document.getElementById("distrito_municipal").value;
    const sector = document.getElementById("sector").value.trim();
    const fecha_incidente = document.getElementById("fecha_incidente").value;
    const evidenciaFile = document.getElementById("evidencia").files[0];

    // Validar campos obligatorios
    if (!titulo || !tipo || !descripcion || !provincia || !municipio || !distrito_municipal || !sector) {
      alert("Todos los campos son obligatorios.");
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

    const comunidad = perfilUsuario?.comunidad || perfilUsuario?.institucion || perfilUsuario?.nombreJunta || "Sin comunidad";

    let evidenciaURL = "";
    if (evidenciaFile) {
      try {
        const storageRef = ref(storage, `evidencias/${uid}/${Date.now()}_${evidenciaFile.name}`);
        await uploadBytes(storageRef, evidenciaFile);
        evidenciaURL = await getDownloadURL(storageRef);
      } catch (uploadError) {
        console.error("Error en carga de archivo:", uploadError);
        alert("Error al cargar la evidencia: " + uploadError.message + "\nAsegúrate de estar autenticado");
        return;
      }
    }

    // GUARDAR EN FIRESTORE
    await addDoc(collection(db, "denuncias"), {
      titulo,
      tipo,
      descripcion,
      provincia,
      municipio,
      distrito_municipal,
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
    await cargarUbicacionDesdePerfil();
  } catch (error) {
    console.error("ERROR:", error.message);
    alert("Error al crear denuncia: " + error.message);
  }
};