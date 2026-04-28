// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCoJ_1CWWVkPQsTTYby8nsUKAQrK1bY26I",
  authDomain: "gecom-a721e.firebaseapp.com",
  projectId: "gecom-a721e",
  storageBucket: "gecom-a721e.firebasestorage.app",
  messagingSenderId: "1058349745158",
  appId: "1:1058349745158:web:924e4b88bcc538598e2f87"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db = firebase.firestore(app);
const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const alertContainer = document.getElementById("alertContainer");
const modalAlertContainer = document.getElementById("modalAlertContainer");
const ayuntamientosBody = document.getElementById("ayuntamientosBody");
const form = document.getElementById("formCrearAyuntamiento");
const modalElement = document.getElementById("modalCrearAyuntamiento");
const modal = new bootstrap.Modal(modalElement);
const modalTitle = document.getElementById("modalCrearAyuntamientoLabel");
const submitBtn = document.getElementById("submitBtn");
const ayuntamientoIdInput = document.getElementById("ayuntamientoId");
const passwordField = document.getElementById("passwordField");

async function sincronizarLoginIndex({ uid, usuario, correo, rol }) {
  const usuarioNormalizado = String(usuario || "").trim().toLowerCase();
  const email = String(correo || "").trim();
  if (!uid || !usuarioNormalizado || !email || !rol) return;

  await db.collection("loginIndex").doc(usuarioNormalizado).set({
    uid,
    email,
    rol,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
}

async function eliminarLoginIndex(usuario) {
  const usuarioNormalizado = String(usuario || "").trim().toLowerCase();
  if (!usuarioNormalizado) return;
  await db.collection("loginIndex").doc(usuarioNormalizado).delete();
}

function generarContrasenaTemporal(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const cryptoApi = window.crypto || window.msCrypto;
  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const values = new Uint32Array(length);
    cryptoApi.getRandomValues(values);
    return Array.from(values, (v) => chars[v % chars.length]).join("");
  }
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!uid || !rolLocal) {
    window.location.href = "index.html";
    return;
  }
  try {
    if (rolLocal !== "admin") {
      window.location.href = "dashboard.html";
      return;
    }
    await cargarAyuntamientos();
  } catch (error) {
    console.error("Error al validar acceso:", error);
    window.location.href = "index.html";
  }
  
  modalElement.addEventListener("hide.bs.modal", () => {
    form.reset();
    ayuntamientoIdInput.value = "";
    modalTitle.textContent = "Crear Ayuntamiento";
    submitBtn.textContent = "Guardar";
    passwordField.style.display = "block";
    clearModalAlert();
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearModalAlert();
  
  const ayuntamientoId = ayuntamientoIdInput.value;
  const nombre = document.getElementById("nombre").value.trim();
  const usuario = document.getElementById("usuario").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const telefono = document.getElementById("telefono").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const provincia = document.getElementById("provincia").value;
  const municipio = document.getElementById("municipio").value;
  
  if (!nombre || !usuario || !correo || !telefono || !direccion || !provincia || !municipio) {
    showModalAlert("Todos los campos son obligatorios.", "danger");
    return;
  }
  
  const telefonoValido = /^1-\d{3}-\d{3}-\d{4}$/;
  if (!telefonoValido.test(telefono)) {
    showModalAlert("El teléfono debe tener el formato 1-000-000-0000.", "danger");
    return;
  }

  const usuarioNormalizado = usuario.toLowerCase();
  
  try {
    if (ayuntamientoId) {
      const previoDoc = await db.collection("Ayuntamientos").doc(ayuntamientoId).get();
      const previoData = previoDoc.exists ? (previoDoc.data() || {}) : {};
      // Editar ayuntamiento existente
      const ayuntamientoData = {
        nombre,
        usuario,
        correo,
        telefono,
        direccion,
        provincia,
        municipio
      };
      await db.collection("Ayuntamientos").doc(ayuntamientoId).set(ayuntamientoData, { merge: true });
      await sincronizarLoginIndex({ uid: ayuntamientoId, usuario, correo, rol: "ayuntamiento" });
      if (previoData.usuario && previoData.usuario.toLowerCase() !== usuarioNormalizado) {
        await eliminarLoginIndex(previoData.usuario);
      }
      showAlert("Ayuntamiento actualizado correctamente.", "success");
    } else {
      const existingSnap = await db.collection("Ayuntamientos").get();
      const usuarioDuplicado = existingSnap.docs.some((docSnap) => {
        const data = docSnap.data() || {};
        const rolDoc = (data.rol || "ayuntamiento").toLowerCase();
        const usuarioDoc = (data.usuario || "").toLowerCase();
        return rolDoc === "ayuntamiento" && usuarioDoc === usuarioNormalizado;
      });
      if (usuarioDuplicado) {
        showModalAlert("Ya existe un usuario con ese nombre y ese rol.", "danger");
        return;
      }

      // Crear nuevo ayuntamiento con contraseña temporal aleatoria de primer uso.
      const contrasenaTemporal = generarContrasenaTemporal();
      const credential = await auth.createUserWithEmailAndPassword(correo, contrasenaTemporal);
      const nuevoUid = credential.user.uid;
      
      const ayuntamientoData = {
        nombre,
        usuario,
        correo,
        rol: "ayuntamiento",
        telefono,
        direccion,
        provincia,
        municipio,
        estado: true,
        fecha_creacion: firebase.firestore.FieldValue.serverTimestamp(),
        creada_por: uid,
        primerLogin: true
      };
      
      await db.collection("Ayuntamientos").doc(nuevoUid).set(ayuntamientoData);
      await sincronizarLoginIndex({ uid: nuevoUid, usuario, correo, rol: "ayuntamiento" });
      showAlert(`Ayuntamiento creado correctamente. Usuario: ${usuario}, Contraseña temporal: ${contrasenaTemporal}`, "success");
    }
    
    form.reset();
    ayuntamientoIdInput.value = "";
    modal.hide();
    await cargarAyuntamientos();
  } catch (error) {
    console.error("ERROR:", error);
    if (error.code === "auth/email-already-in-use") {
      showModalAlert("El correo ya está en uso.", "danger");
    } else {
      showModalAlert(error.message || "Ocurrió un error.", "danger");
    }
  }
});

async function cargarAyuntamientos() {
  ayuntamientosBody.innerHTML = "";
  try {
    const snapshot = await db.collection("Ayuntamientos").get();
    
    if (snapshot.empty) {
      ayuntamientosBody.innerHTML = "<tr><td colspan=\"9\" class=\"text-center\">No hay ayuntamientos</td></tr>";
      return;
    }
    
    const ayuntamientos = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      ayuntamientos.push(data);
    });
    
    ayuntamientos.sort((a, b) => (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase()));
    
    ayuntamientos.forEach((data) => {
      const label = data.estado ? "Activo" : "Inactivo";
      ayuntamientosBody.innerHTML += `<tr>
        <td>${escapeHtml(data.nombre)}</td>
        <td>${escapeHtml(data.usuario || "")}</td>
        <td>${escapeHtml(data.correo)}</td>
        <td>${escapeHtml(data.telefono || "")}</td>
        <td>${escapeHtml(data.direccion || "")}</td>
        <td>${escapeHtml(data.provincia || "")}</td>
        <td>${escapeHtml(data.municipio || "")}</td>
        <td>${escapeHtml(label)}</td>
        <td class="text-center">
          <button class="btn btn-sm btn-warning me-1 px-2" onclick="editarAyuntamiento('${data.id}')"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-info me-1 px-2" onclick="reestablecerContrasenaAyuntamiento('${data.id}', '${escapeHtml(data.nombre)}')" title="Restablecer contraseña"><i class="bi bi-key"></i></button>
          <button class="btn btn-sm btn-danger px-2" onclick="eliminarAyuntamiento('${data.id}', '${escapeHtml(data.nombre)}')"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar ayuntamientos:", error);
    ayuntamientosBody.innerHTML = "<tr><td colspan=\"9\" class=\"text-center text-danger\">Error al cargar ayuntamientos</td></tr>";
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

window.editarAyuntamiento = async function(id) {
  try {
    const docSnap = await db.collection("Ayuntamientos").doc(id).get();
    if (!docSnap.exists) {
      showAlert("Ayuntamiento no encontrado.", "danger");
      return;
    }
    
    const data = docSnap.data();
    ayuntamientoIdInput.value = id;
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("usuario").value = data.usuario || "";
    document.getElementById("correo").value = data.correo || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("direccion").value = data.direccion || "";
    document.getElementById("provincia").value = data.provincia || "";
    document.getElementById("provincia").dispatchEvent(new Event("change"));
    
    setTimeout(() => {
      document.getElementById("municipio").value = data.municipio || "";
    }, 100);
    
    modalTitle.textContent = "Editar Ayuntamiento";
    submitBtn.textContent = "Actualizar";
    passwordField.style.display = "none";
    modal.show();
  } catch (error) {
    console.error("Error:", error);
    showAlert("Error al cargar ayuntamiento.", "danger");
  }
};

window.eliminarAyuntamiento = async function(id, nombre) {
  if (confirm("¿Eliminar a " + nombre + "?")) {
    try {
      const docSnap = await db.collection("Ayuntamientos").doc(id).get();
      const data = docSnap.exists ? (docSnap.data() || {}) : {};
      await db.collection("Ayuntamientos").doc(id).delete();
      await eliminarLoginIndex(data.usuario);
      showAlert("Ayuntamiento eliminado.", "success");
      await cargarAyuntamientos();
    } catch (error) {
      console.error("Error:", error);
      showAlert("Error al eliminar.", "danger");
    }
  }
};

window.reestablecerContrasenaAyuntamiento = async function(id, nombre) {
  if (!confirm(`¿Enviar correo de restablecimiento de contraseña a ${nombre}?`)) {
    return;
  }

  try {
    const doc = await db.collection("Ayuntamientos").doc(id).get();
    if (!doc.exists) {
      showAlert("Ayuntamiento no encontrado.", "danger");
      return;
    }
    const correo = doc.data().correo;
    if (!correo) {
      showAlert("El ayuntamiento no tiene un correo registrado.", "danger");
      return;
    }

    await auth.sendPasswordResetEmail(correo);
    await db.collection("Ayuntamientos").doc(id).update({ primerLogin: true });

    showAlert(`Se ha enviado un correo de restablecimiento a ${correo}. El usuario deberá cambiar su contraseña al iniciar sesión.`, "success");
  } catch (error) {
    console.error("Error restableciendo contraseña:", error);
    showAlert("No se pudo enviar el correo de restablecimiento: " + error.message, "danger");
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