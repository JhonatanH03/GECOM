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
const provinciasMap = {};

window.addEventListener("DOMContentLoaded", async () => {
  await cargarUbicaciones();
  document.getElementById("formDenuncia").addEventListener("submit", (event) => {
    event.preventDefault();
    crearDenuncia();
  });
  document.getElementById("provincia").addEventListener("change", actualizarMunicipios);
  document.getElementById("municipio").addEventListener("change", actualizarDistritos);
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
    const usuarioDoc = await getDoc(doc(db, "JuntasDeVecinos", uid));
    const usuarioData = usuarioDoc.data();
    const comunidad = usuarioData?.comunidad || usuarioData?.sector || sector;

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
  distritoSelect.innerHTML = '<option value="" selected>Seleccionar distrito</option>';
  if (!municipio) {
    return;
  }

  const option = document.createElement("option");
  option.value = municipio;
  option.textContent = municipio;
  distritoSelect.appendChild(option);
}