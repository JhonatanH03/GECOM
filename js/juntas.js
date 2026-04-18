import app from "./firebase.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);
const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const alertContainer = document.getElementById("alertContainer");
const modalAlertContainer = document.getElementById("modalAlertContainer");
const juntasBody = document.getElementById("juntasBody");
const form = document.getElementById("formCrearJunta");
const modalElement = document.getElementById("modalCrearJunta");
const modal = new bootstrap.Modal(modalElement);
const modalTitle = document.getElementById("modalCrearJuntaLabel");
const submitBtn = document.getElementById("submitBtn");
const juntaIdInput = document.getElementById("juntaId");
const passwordField = document.getElementById("passwordField");

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
    await cargarJuntas();
  } catch (error) {
    console.error("Error al validar acceso:", error);
    window.location.href = "index.html";
  }
  
  modalElement.addEventListener("hide.bs.modal", () => {
    form.reset();
    juntaIdInput.value = "";
    modalTitle.textContent = "Crear Junta de Vecinos";
    submitBtn.textContent = "Guardar";
    passwordField.style.display = "block";
    clearModalAlert();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearModalAlert();
  
  const juntaId = juntaIdInput.value;
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const comunidad = document.getElementById("comunidad").value.trim();
  const provincia = document.getElementById("provincia").value;
  const municipio = document.getElementById("municipio").value;
  const cedula = document.getElementById("cedula").value.trim();
  const contrasena = document.getElementById("contrasena").value;
  
  if (!nombre || !correo || !telefono || !comunidad || !provincia || !municipio || (!juntaId && !contrasena)) {
    showModalAlert("Todos los campos son obligatorios.", "danger");
    return;
  }
  
  const telefonoValido = /^1-\d{3}-\d{3}-\d{4}$/;
  if (!telefonoValido.test(telefono)) {
    showModalAlert("El teléfono debe tener el formato 1-000-000-0000.", "danger");
    return;
  }
  
  if (!juntaId && contrasena.length < 6) {
    showModalAlert("La contraseña debe tener al menos 6 caracteres.", "danger");
    return;
  }
  
  try {
    if (juntaId) {
      // Editar junta existente
      const juntaData = {
        nombre,
        correo,
        telefono,
        comunidad,
        provincia,
        municipio,
        cedula
      };
      await setDoc(doc(db, "usuarios", juntaId), juntaData, { merge: true });
      showAlert("Junta actualizada correctamente.", "success");
    } else {
      // Crear nueva junta
      const credential = await createUserWithEmailAndPassword(auth, correo, contrasena);
      const nuevoUid = credential.user.uid;
      
      const juntaData = {
        nombre,
        correo,
        rol: "junta",
        telefono,
        comunidad,
        provincia,
        municipio,
        cedula,
        estado: true,
        fecha_creacion: serverTimestamp(),
        creada_por: uid
      };
      
      await setDoc(doc(db, "usuarios", nuevoUid), juntaData);
      showAlert("Junta creada correctamente.", "success");
    }
    
    form.reset();
    juntaIdInput.value = "";
    modal.hide();
    await cargarJuntas();
  } catch (error) {
    console.error("ERROR:", error);
    if (error.code === "auth/email-already-in-use") {
      showModalAlert("El correo ya está en uso.", "danger");
    } else {
      showModalAlert(error.message || "Ocurrió un error.", "danger");
    }
  }
});

async function cargarJuntas() {
  juntasBody.innerHTML = "";
  try {
    const q = query(collection(db, "usuarios"), where("rol", "==", "junta"), where("creada_por", "==", uid));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      juntasBody.innerHTML = "<tr><td colspan=\"7\" class=\"text-center\">No hay juntas</td></tr>";
      return;
    }
    
    const juntas = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      juntas.push(data);
    });
    
    juntas.sort((a, b) => (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase()));
    
    juntas.forEach((data) => {
      const label = data.estado ? "Activa" : "Inactiva";
      juntasBody.innerHTML += `<tr>
        <td>${escapeHtml(data.nombre)}</td>
        <td>${escapeHtml(data.correo)}</td>
        <td>${escapeHtml(data.telefono || "")}</td>
        <td>${escapeHtml((data.provincia || "") + " / " + (data.municipio || ""))}</td>
        <td>${escapeHtml(data.comunidad || "")}</td>
        <td>${escapeHtml(label)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-warning me-1 px-2" onclick="editarJunta('${data.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger px-2" onclick="eliminarJunta('${data.id}', '${escapeHtml(data.nombre)}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar juntas:", error);
    juntasBody.innerHTML = "<tr><td colspan=\"7\" class=\"text-center text-danger\">Error al cargar juntas</td></tr>";
  }
}

function showAlert(msg, type = "success") {
  alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show"><strong>${escapeHtml(msg)}</strong><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
}

function showModalAlert(msg, type = "danger") {
  modalAlertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show"><strong>${escapeHtml(msg)}</strong><button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`;
}

function clearModalAlert() {
  modalAlertContainer.innerHTML = "";
}

window.editarJunta = async function(id) {
  try {
    const docSnap = await getDoc(doc(db, "usuarios", id));
    if (!docSnap.exists()) {
      showAlert("Junta no encontrada.", "danger");
      return;
    }
    
    const data = docSnap.data();
    juntaIdInput.value = id;
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("correo").value = data.correo || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("comunidad").value = data.comunidad || "";
    document.getElementById("cedula").value = data.cedula || "";
    document.getElementById("provincia").value = data.provincia || "";
    document.getElementById("provincia").dispatchEvent(new Event("change"));
    
    setTimeout(() => {
      document.getElementById("municipio").value = data.municipio || "";
    }, 100);
    
    modalTitle.textContent = "Editar Junta de Vecinos";
    submitBtn.textContent = "Actualizar";
    passwordField.style.display = "none";
    modal.show();
  } catch (error) {
    console.error("Error:", error);
    showAlert("Error al cargar junta.", "danger");
  }
};

window.eliminarJunta = async function(id, nombre) {
  if (confirm("¿Eliminar a " + nombre + "?")) {
    try {
      await deleteDoc(doc(db, "usuarios", id));
      showAlert("Junta eliminada.", "success");
      await cargarJuntas();
    } catch (error) {
      console.error("Error:", error);
      showAlert("Error al eliminar.", "danger");
    }
  }
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const contrasenaInput = document.getElementById("contrasena");
if (contrasenaInput) {
  contrasenaInput.addEventListener("input", (e) => {
    const pwd = e.target.value;
    const req = [
      document.getElementById("reqLength"),
      document.getElementById("reqUpper"),
      document.getElementById("reqLower"),
      document.getElementById("reqNumber")
    ];
    
    if (req[0]) req[0].innerHTML = pwd.length >= 6 ? "✓ Al menos 6 caracteres" : "✗ Al menos 6 caracteres";
    if (req[1]) req[1].innerHTML = /[A-Z]/.test(pwd) ? "✓ Una letra mayúscula" : "✗ Una letra mayúscula";
    if (req[2]) req[2].innerHTML = /[a-z]/.test(pwd) ? "✓ Una letra minúscula" : "✗ Una letra minúscula";
    if (req[3]) req[3].innerHTML = /\d/.test(pwd) ? "✓ Un número" : "✗ Un número";
  });
}

const telefonoInput = document.getElementById("telefono");
if (telefonoInput) {
  telefonoInput.addEventListener("input", (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 13) v = v.slice(0, 13);
    if (v.length > 1) v = v[0] + "-" + v.slice(1);
    if (v.length > 5) v = v.slice(0, 5) + "-" + v.slice(5);
    if (v.length > 9) v = v.slice(0, 9) + "-" + v.slice(9);
    e.target.value = v;
  });
}

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
const provinciaSelect = document.getElementById("provincia");

if (provinciaSelect) {
  provinciaSelect.addEventListener("change", () => {
    const prov = provinciaSelect.value;
    const munis = provincias[prov] || [];
    
    if (municipiosSelect) {
      municipiosSelect.innerHTML = "";
      munis.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.textContent = m;
        municipiosSelect.appendChild(opt);
      });
    }
  });
}
