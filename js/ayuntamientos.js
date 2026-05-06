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

function usuarioAEmailInterno(usuario) {
  return String(usuario || "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "") + "@gecom.internal";
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
  const emailInterno = usuarioAEmailInterno(usuario);
  const telefono = document.getElementById("telefono").value.trim();
  const direccion = document.getElementById("direccion").value.trim();
  const provincia = document.getElementById("provincia").value;
  const municipio = document.getElementById("municipio").value;
  
  if (!nombre || !usuario || !telefono || !direccion || !provincia || !municipio) {
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
        telefono,
        direccion,
        provincia,
        municipio
      };
      await db.collection("Ayuntamientos").doc(ayuntamientoId).set(ayuntamientoData, { merge: true });
      showAlert("Ayuntamiento actualizado correctamente.", "success");
    } else {
      const duplicadoSnap = await db.collection("Ayuntamientos")
        .where("usuario", "==", usuarioNormalizado)
        .limit(1)
        .get();
      if (!duplicadoSnap.empty) {
        showModalAlert("Ya existe un usuario con ese nombre y ese rol.", "danger");
        return;
      }

      // Crear nuevo ayuntamiento con contraseña temporal aleatoria de primer uso.
      const contrasenaTemporal = generarContrasenaTemporal();
      const credential = await auth.createUserWithEmailAndPassword(emailInterno, contrasenaTemporal);
      const nuevoUid = credential.user.uid;
      
      const ayuntamientoData = {
        nombre,
        usuario,
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
      await db.collection("loginIndex").doc(usuarioNormalizado).set({
        uid: nuevoUid,
        email: emailInterno,
        rol: "ayuntamiento",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showAlert(`Ayuntamiento creado correctamente. Usuario: ${usuario}, Contraseña temporal: ${contrasenaTemporal}`, "success");
    }
    
    form.reset();
    ayuntamientoIdInput.value = "";
    modal.hide();
    await cargarAyuntamientos();
  } catch (error) {
    console.error("ERROR:", error);
    if (error.code === "auth/email-already-in-use") {
      showModalAlert("No se puede crear: el usuario ya existe.", "danger");
    } else {
      showModalAlert(error.message || "Ocurrió un error.", "danger");
    }
  }
});

async function cargarAyuntamientos() {
  const _skRow8 = `<tr class="skeleton-row">
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-narrow"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-pill"></span></td>
  </tr>`;
  ayuntamientosBody.innerHTML = _skRow8.repeat(5);
  try {
    const snapshot = await db.collection("Ayuntamientos").get();
    
    if (snapshot.empty) {
      ayuntamientosBody.innerHTML = '<tr class="table-feedback-row"><td colspan="8"><div class="empty-state">No hay ayuntamientos registrados.</div></td></tr>';
      return;
    }
    
    const ayuntamientos = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      data.id = docSnap.id;
      ayuntamientos.push(data);
    });
    
    ayuntamientos.sort((a, b) => (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase()));

    ayuntamientosBody.innerHTML = "";
    ayuntamientos.forEach((data) => {
      const label = data.estado ? "Activo" : "Inactivo";
      const estadoClass = data.estado ? "status-resuelta" : "status-pendiente";
      const chipIcon = data.estado ? "bi-check-circle-fill" : "bi-x-circle-fill";
      ayuntamientosBody.innerHTML += `<tr>
        <td data-label="Nombre">${escapeHtml(data.nombre)}</td>
        <td data-label="Usuario">${escapeHtml(data.usuario || "")}</td>
        <td data-label="Teléfono">${escapeHtml(data.telefono || "")}</td>
        <td data-label="Dirección">${escapeHtml(data.direccion || "")}</td>
        <td data-label="Provincia">${escapeHtml(data.provincia || "")}</td>
        <td data-label="Municipio">${escapeHtml(data.municipio || "")}</td>
        <td data-label="Estado"><span class="status-chip ${estadoClass}"><i class="bi ${chipIcon} chip-icon"></i>${escapeHtml(label)}</span></td>
        <td class="text-center" data-label="Acciones">
          <div class="dropdown">
            <button class="btn btn-sm gecom-action-menu-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end gecom-action-menu">
              <li>
                <button class="dropdown-item" type="button" onclick="editarAyuntamiento('${data.id}')">
                  <i class="bi bi-pencil-fill gecom-action-icon gecom-action-icon--edit"></i>Editar
                </button>
              </li>
              <li>
                <button class="dropdown-item" type="button" onclick="abrirModalResetContrasenaAyuntamiento('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-key-fill gecom-action-icon gecom-action-icon--key"></i>Restablecer contraseña
                </button>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <button class="dropdown-item gecom-action-item--danger" type="button" onclick="eliminarAyuntamiento('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-trash-fill gecom-action-icon"></i>Eliminar
                </button>
              </li>
            </ul>
          </div>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar ayuntamientos:", error);
    ayuntamientosBody.innerHTML = '<tr class="table-feedback-row"><td colspan="8"><div class="empty-state text-danger">Error al cargar ayuntamientos.</div></td></tr>';
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
  const ok = await window.gecomConfirm({
    title: "Eliminar ayuntamiento",
    message: `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
    type: "danger",
  });
  if (!ok) return;
  try {
    await db.collection("Ayuntamientos").doc(id).delete();
    showAlert("Ayuntamiento eliminado.", "success");
    await cargarAyuntamientos();
  } catch (error) {
    console.error("Error:", error);
    showAlert("Error al eliminar.", "danger");
  }
};

window.reestablecerContrasenaAyuntamiento = async function(id, nombre) {
  // Legacy — reemplazado por abrirModalResetContrasenaAyuntamiento
  abrirModalResetContrasenaAyuntamiento(id, nombre);
};

// ---- Reset contraseña ayuntamiento (modal) ----
const resetModalAyunt = new bootstrap.Modal(document.getElementById('modalResetContrasenaAyuntamiento'));

document.getElementById('modalResetContrasenaAyuntamiento').addEventListener('hidden.bs.modal', () => {
  document.getElementById('resetAyuntCallerPassword').value = '';
  document.getElementById('resetAyuntModalAlert').innerHTML = '';
  document.getElementById('btnConfirmarResetAyunt').disabled = false;
  document.getElementById('btnConfirmarResetAyunt').textContent = 'Restablecer';
});

window.abrirModalResetContrasenaAyuntamiento = function(id, nombre) {
  document.getElementById('resetAyuntTargetUid').value = id;
  document.getElementById('resetAyuntTargetNombre').textContent = nombre;
  resetModalAyunt.show();
};

window.confirmarResetContrasenaAyuntamiento = async function() {
  const targetUid = document.getElementById('resetAyuntTargetUid').value;
  const callerPassword = document.getElementById('resetAyuntCallerPassword').value;
  const alertEl = document.getElementById('resetAyuntModalAlert');
  const btn = document.getElementById('btnConfirmarResetAyunt');

  function showResetError(msg) {
    alertEl.innerHTML = `<div class="alert alert-danger py-2">${escapeHtml(msg)}</div>`;
  }

  if (!callerPassword) return showResetError('Debes ingresar tu contraseña actual.');

  btn.disabled = true;
  btn.textContent = 'Restableciendo...';
  alertEl.innerHTML = '';

  try {
    const result = await window.gecomResetManagedUserPassword({
      auth,
      callerPassword,
      targetUid,
      targetRole: 'ayuntamiento'
    });

    resetModalAyunt.hide();
    showAlert(`Contraseña restablecida correctamente. Contraseña temporal: ${result.temporaryPassword}`, 'success');
  } catch (error) {
    let msg = 'Error al restablecer la contraseña.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = 'Tu contraseña actual es incorrecta.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos fallidos. Intenta más tarde.';
    } else if (error.name === 'TypeError' || error.code === 'request-failed') {
      msg = 'No se pudo conectar con el backend de restablecimiento. Verifica que esté ejecutándose en la URL configurada.';
    } else if (error.code === 'recent-login-required') {
      msg = 'Debes confirmar tu contraseña nuevamente antes de continuar.';
    } else if (error.code === 'permission-denied') {
      msg = 'No tienes permiso para restablecer esta contraseña.';
    } else if (error.message) {
      msg = error.message;
    }
    showResetError(msg);
    btn.disabled = false;
    btn.textContent = 'Restablecer';
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