import app from "./firebase.js";
import {
  getAuth,
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const alertContainer = document.getElementById("alertContainer");
const usuariosBody = document.getElementById("usuariosBody");
const form = document.getElementById("formCrearUsuario");
const modalElement = document.getElementById("modalCrearUsuario");
const modal = new bootstrap.Modal(modalElement);

window.addEventListener("DOMContentLoaded", async () => {
  if (!uid || !rolLocal) {
    window.location.href = "index.html";
    return;
  }

  try {
    const usuarioDoc = await getDoc(doc(db, "usuarios", uid));

    if (!usuarioDoc.exists() || usuarioDoc.data().rol !== "ayuntamiento") {
      window.location.href = "dashboard.html";
      return;
    }

    await cargarUsuarios();
  } catch (error) {
    console.error("Error al validar acceso:", error);
    window.location.href = "index.html";
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearAlert();

  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const cedula = document.getElementById("cedula").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const provincia = document.getElementById("provincia").value;
  const municipio = document.getElementById("municipio").value;
  const distrito_municipal = document.getElementById("distrito_municipal").value;
  const sector = document.getElementById("sector").value.trim();
  const institucion = document.getElementById("institucion").value.trim();
  const contrasena = document.getElementById("contrasena").value;

  if (
    !nombre ||
    !correo ||
    !cedula ||
    !telefono ||
    !provincia ||
    !municipio ||
    !distrito_municipal ||
    !sector ||
    !institucion ||
    !contrasena
  ) {
    showAlert("Todos los campos son obligatorios.", "danger");
    return;
  }

  const cedulaValida = /^\d{3}-\d{7}-\d{1}$/;
  if (!cedulaValida.test(cedula)) {
    showAlert("La cédula debe tener el formato 000-0000000-0.", "danger");
    return;
  }

  if (contrasena.length < 6) {
    showAlert("La contraseña debe tener al menos 6 caracteres.", "danger");
    return;
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, correo, contrasena);
    const nuevoUid = credential.user.uid;

    const usuarioData = {
      nombre,
      correo,
      rol: "junta",
      cedula,
      telefono,
      provincia,
      municipio,
      distrito_municipal,
      sector,
      institucion,
      estado: true,
      fecha_creacion: serverTimestamp()
    };

    await setDoc(doc(db, "usuarios", nuevoUid), usuarioData);
    showAlert("Usuario creado correctamente.", "success");
    form.reset();
    modal.hide();
    await cargarUsuarios();
  } catch (error) {
    console.error("Error al crear usuario:", error);
    if (error.code === "auth/email-already-in-use") {
      showAlert("El correo ya está en uso.", "danger");
    } else {
      showAlert(error.message || "Ocurrió un error al crear el usuario.", "danger");
    }
  }
});

async function cargarUsuarios() {
  usuariosBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">Cargando usuarios...</td></tr>`;

  try {
    const usuariosQuery = query(collection(db, "usuarios"), where("rol", "==", "junta"));
    const snapshot = await getDocs(usuariosQuery);

    if (snapshot.empty) {
      usuariosBody.innerHTML = `<tr><td colspan="7" class="text-center py-5">No hay usuarios registrados.</td></tr>`;
      return;
    }

    const usuarios = [];
    snapshot.forEach((docSnap) => {
      usuarios.push(docSnap.data());
    });

    usuarios.sort((a, b) => {
      const nombreA = (a.nombre || "").toLowerCase();
      const nombreB = (b.nombre || "").toLowerCase();
      return nombreA.localeCompare(nombreB);
    });

    usuariosBody.innerHTML = "";

    usuarios.forEach((data) => {
      const estadoLabel = data.estado ? "Activo" : "Inactivo";
      const ubicacion = `${data.provincia} / ${data.municipio} / ${data.distrito_municipal}`;

      usuariosBody.innerHTML += `
        <tr>
          <td>${escapeHtml(data.nombre)}</td>
          <td>${escapeHtml(data.correo)}</td>
          <td>${escapeHtml(data.cedula)}</td>
          <td>${escapeHtml(data.telefono)}</td>
          <td>${escapeHtml(ubicacion)}</td>
          <td>${escapeHtml(data.institucion)}</td>
          <td>${escapeHtml(estadoLabel)}</td>
        </tr>
      `;
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    usuariosBody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-danger">No se pudo cargar la lista.</td></tr>`;
  }
}

function showAlert(message, type = "success") {
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function clearAlert() {
  alertContainer.innerHTML = "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Actualizar municipios y distritos simples según provincia
const provincias = {
  "Santo Domingo": ["Santo Domingo Este", "Santo Domingo Norte", "Santo Domingo Oeste", "Boca Chica"],
  "Santiago": ["Santiago", "Licey al Medio", "Bonao"],
  "La Vega": ["La Vega", "Constanza"],
  "Puerto Plata": ["Puerto Plata", "Sosúa"],
  "San Cristóbal": ["San Cristóbal", "Baní"],
  "San Pedro de Macorís": ["San Pedro de Macorís", "Consuelo"],
  "La Romana": ["La Romana", "Villa Hermosa"],
  "Bonao": ["Bonao"],
  "Higüey": ["Higüey"],
  "Barahona": ["Barahona"]
};

const municipiosSelect = document.getElementById("municipio");
const distritoSelect = document.getElementById("distrito_municipal");
const provinciaSelect = document.getElementById("provincia");

provinciaSelect.addEventListener("change", () => {
  const provincia = provinciaSelect.value;
  const municipios = provincias[provincia] || [];
  municipiosSelect.innerHTML = `<option value="" selected>Seleccionar municipio</option>`;
  distritoSelect.innerHTML = `<option value="" selected>Seleccionar distrito</option>`;

  municipios.forEach((nombre) => {
    const option = document.createElement("option");
    option.value = nombre;
    option.textContent = nombre;
    municipiosSelect.appendChild(option);
  });
});

municipiosSelect.addEventListener("change", () => {
  const municipio = municipiosSelect.value;
  distritoSelect.innerHTML = `<option value="" selected>Seleccionar distrito</option>`;

  if (municipio) {
    const option = document.createElement("option");
    option.value = municipio;
    option.textContent = `${municipio} Distrito`; 
    distritoSelect.appendChild(option);
  }
});
