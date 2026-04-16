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
const modalAlertContainer = document.getElementById("modalAlertContainer");
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
  clearModalAlert();

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
    showModalAlert("Todos los campos son obligatorios.", "danger");
    return;
  }

  const cedulaValida = /^\d{3}-\d{7}-\d{1}$/;
  if (!cedulaValida.test(cedula)) {
    showModalAlert("La cédula debe tener el formato 000-0000000-0.", "danger");
    return;
  }

  const telefonoValido = /^1-\d{3}-\d{3}-\d{4}$/;
  if (!telefonoValido.test(telefono)) {
    showModalAlert("El teléfono debe tener el formato 1-000-000-0000.", "danger");
    return;
  }

  if (contrasena.length < 6) {
    showModalAlert("La contraseña debe tener al menos 6 caracteres.", "danger");
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
      showModalAlert("El correo ya está en uso.", "danger");
    } else {
      showModalAlert(error.message || "Ocurrió un error al crear el usuario.", "danger");
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

function showModalAlert(message, type = "danger") {
  modalAlertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function clearAlert() {
  alertContainer.innerHTML = "";
}

function clearModalAlert() {
  modalAlertContainer.innerHTML = "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Validación en tiempo real de contraseña
document.getElementById("contrasena").addEventListener("input", function(e) {
  const password = e.target.value;
  const reqLength = document.getElementById("reqLength");
  const reqUpper = document.getElementById("reqUpper");
  const reqLower = document.getElementById("reqLower");
  const reqNumber = document.getElementById("reqNumber");

  // Al menos 6 caracteres
  if (password.length >= 6) {
    reqLength.className = "text-success";
    reqLength.innerHTML = "✓ Al menos 6 caracteres";
  } else {
    reqLength.className = "text-danger";
    reqLength.innerHTML = "✗ Al menos 6 caracteres";
  }

  // Al menos una mayúscula
  if (/[A-Z]/.test(password)) {
    reqUpper.className = "text-success";
    reqUpper.innerHTML = "✓ Una letra mayúscula";
  } else {
    reqUpper.className = "text-danger";
    reqUpper.innerHTML = "✗ Una letra mayúscula";
  }

  // Al menos una minúscula
  if (/[a-z]/.test(password)) {
    reqLower.className = "text-success";
    reqLower.innerHTML = "✓ Una letra minúscula";
  } else {
    reqLower.className = "text-danger";
    reqLower.innerHTML = "✗ Una letra minúscula";
  }

  // Al menos un número
  if (/\d/.test(password)) {
    reqNumber.className = "text-success";
    reqNumber.innerHTML = "✓ Un número";
  } else {
    reqNumber.className = "text-danger";
    reqNumber.innerHTML = "✗ Un número";
  }
});

// Formato automático para cédula
document.getElementById("cedula").addEventListener("input", function(e) {
  let digits = e.target.value.replace(/\D/g, ''); // Solo dígitos
  if (digits.length > 11) digits = digits.slice(0, 11);
  let formatted = '';
  if (digits.length > 0) formatted += digits.slice(0, 3);
  if (digits.length > 3) formatted += '-' + digits.slice(3, 10);
  if (digits.length > 10) formatted += '-' + digits.slice(10);
  e.target.value = formatted;
});

// Formato automático para teléfono
document.getElementById("telefono").addEventListener("input", function(e) {
  let value = e.target.value.replace(/\D/g, ''); // Solo dígitos
  if (value.length > 13) value = value.slice(0, 13);
  if (value.length > 1) value = value.slice(0, 1) + '-' + value.slice(1);
  if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
  if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
  e.target.value = value;
});

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
