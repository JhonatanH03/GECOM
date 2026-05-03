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
const juntasBody = document.getElementById("juntasBody");
const form = document.getElementById("formCrearJunta");
const modalElement = document.getElementById("modalCrearJunta");
const modal = new bootstrap.Modal(modalElement);
const modalTitle = document.getElementById("modalCrearJuntaLabel");
const submitBtn = document.getElementById("submitBtn");
const juntaIdInput = document.getElementById("juntaId");
const passwordField = document.getElementById("passwordField");
let provinciaAyuntamiento = null;
let municipioAyuntamiento = null;
const municipiosSelect = document.getElementById("municipio");
const provinciaSelect = document.getElementById("provincia");

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

async function cargarMunicipiosDesdeFirestore(provincia, municipioSeleccionado = "") {
  if (!municipiosSelect) return;

  municipiosSelect.innerHTML = '<option value="" selected>Cargando municipios...</option>';

  if (!provincia) {
    municipiosSelect.innerHTML = '<option value="" selected>Seleccionar municipio</option>';
    return;
  }

  try {
    let municipios = [];

    const docSnap = await db.collection("provincias").doc(provincia).get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      if (Array.isArray(data.municipios)) {
        municipios = data.municipios;
      }
    }

    if (municipios.length === 0) {
      const querySnap = await db.collection("provincias").where("nombre", "==", provincia).limit(1).get();
      if (!querySnap.empty) {
        const data = querySnap.docs[0].data() || {};
        if (Array.isArray(data.municipios)) {
          municipios = data.municipios;
        }
      }
    }

    municipiosSelect.innerHTML = '<option value="" selected>Seleccionar municipio</option>';

    municipios.forEach((municipio) => {
      const opt = document.createElement("option");
      opt.value = municipio;
      opt.textContent = municipio;
      municipiosSelect.appendChild(opt);
    });

    if (municipioSeleccionado) {
      const existe = municipios.some((m) => m === municipioSeleccionado);
      if (!existe) {
        const opt = document.createElement("option");
        opt.value = municipioSeleccionado;
        opt.textContent = municipioSeleccionado;
        municipiosSelect.appendChild(opt);
      }
      municipiosSelect.value = municipioSeleccionado;
    }
  } catch (error) {
    console.error("Error al cargar municipios desde Firestore:", error);
    municipiosSelect.innerHTML = '<option value="" selected>Error al cargar municipios</option>';
  }
}

function esMismaUbicacion(data) {
  if (rolLocal !== "ayuntamiento") return true;
  return (
    (data.provincia || "") === (provinciaAyuntamiento || "") &&
    (data.municipio || "") === (municipioAyuntamiento || "")
  );
}

async function bloquearUbicacionAyuntamiento() {
  if (rolLocal !== "ayuntamiento" || !provinciaAyuntamiento || !municipioAyuntamiento) return;
  if (!provinciaSelect || !municipiosSelect) return;

  provinciaSelect.innerHTML = `<option value="${provinciaAyuntamiento}" selected>${provinciaAyuntamiento}</option>`;
  provinciaSelect.disabled = true;

  await cargarMunicipiosDesdeFirestore(provinciaAyuntamiento, municipioAyuntamiento);
  municipiosSelect.disabled = true;
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!uid || !rolLocal) {
    window.location.href = "index.html";
    return;
  }
  try {
    let collectionName = "";
    if (rolLocal === "ayuntamiento") {
      collectionName = "Ayuntamientos";
    } else if (rolLocal === "admin") {
      collectionName = "Administradores";
    } else {
      window.location.href = "dashboard.html";
      return;
    }
    const usuarioDoc = await db.collection(collectionName).doc(uid).get();
    if (!usuarioDoc.exists) {
      window.location.href = "dashboard.html";
      return;
    }
    if (rolLocal === "ayuntamiento") {
      const data = usuarioDoc.data() || {};
      provinciaAyuntamiento = data.provincia || null;
      municipioAyuntamiento = data.municipio || null;
      await bloquearUbicacionAyuntamiento();
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

  modalElement.addEventListener("show.bs.modal", async () => {
    if (rolLocal === "ayuntamiento") {
      await bloquearUbicacionAyuntamiento();
      return;
    }
    await cargarMunicipiosDesdeFirestore(provinciaSelect ? provinciaSelect.value : "");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearModalAlert();
  
  const juntaId = juntaIdInput.value;
  const nombre = document.getElementById("nombre").value.trim();
  const usuario = document.getElementById("usuario").value.trim();
  const emailInterno = usuarioAEmailInterno(usuario);
  const telefono = document.getElementById("telefono").value.trim();
  const comunidad = document.getElementById("comunidad").value.trim();
  const provincia = document.getElementById("provincia").value;
  const municipio = document.getElementById("municipio").value;
  const provinciaFinal = rolLocal === "ayuntamiento" ? (provinciaAyuntamiento || "") : provincia;
  const municipioFinal = rolLocal === "ayuntamiento" ? (municipioAyuntamiento || "") : municipio;
  const cedula = document.getElementById("cedula").value.trim();
  
  if (!nombre || !usuario || !telefono || !comunidad || !provinciaFinal || !municipioFinal) {
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
    if (juntaId) {
      const previoDoc = await db.collection("JuntasDeVecinos").doc(juntaId).get();
      const previoData = previoDoc.exists ? (previoDoc.data() || {}) : {};
      // Editar junta existente - no cambiar usuario
      const juntaData = {
        nombre,
        usuario,
        telefono,
        comunidad,
        provincia: provinciaFinal,
        municipio: municipioFinal,
        cedula
      };
      await db.collection("JuntasDeVecinos").doc(juntaId).set(juntaData, { merge: true });
      showAlert("Junta actualizada correctamente.", "success");
    } else {
      const existingSnap = await db.collection("JuntasDeVecinos").get();
      const usuarioDuplicado = existingSnap.docs.some((docSnap) => {
        const data = docSnap.data() || {};
        const rolDoc = (data.rol || "junta").toLowerCase();
        const usuarioDoc = (data.usuario || "").toLowerCase();
        return rolDoc === "junta" && usuarioDoc === usuarioNormalizado;
      });
      if (usuarioDuplicado) {
        showModalAlert("Ya existe un usuario con ese nombre y ese rol.", "danger");
        return;
      }

      // Crear nueva junta con usuario y contraseña temporal aleatoria.
      const contrasenaTemporal = generarContrasenaTemporal();
      
      // Crear usuario en Firebase Auth
      const credential = await auth.createUserWithEmailAndPassword(emailInterno, contrasenaTemporal);
      const nuevoUid = credential.user.uid;
      
      const juntaData = {
        nombre,
        usuario,
        rol: "junta",
        telefono,
        comunidad,
        provincia: provinciaFinal,
        municipio: municipioFinal,
        cedula,
        estado: true,
        fecha_creacion: firebase.firestore.FieldValue.serverTimestamp(),
        creada_por: uid,
        primerLogin: true // Indica que es el primer login
      };
      
      await db.collection("JuntasDeVecinos").doc(nuevoUid).set(juntaData);
      await db.collection("loginIndex").doc(usuarioNormalizado).set({
        uid: nuevoUid,
        email: correo,
        rol: "junta",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      showAlert(`Junta creada correctamente. Usuario: ${usuario}, Contraseña temporal: ${contrasenaTemporal}`, "success");
    }
    
    form.reset();
    juntaIdInput.value = "";
    modal.hide();
    await cargarJuntas();
  } catch (error) {
    console.error("ERROR:", error);
    if (error.code === "auth/email-already-in-use") {
      showModalAlert("No se puede crear: el usuario ya existe.", "danger");
    } else if (error.code === "auth/weak-password") {
      showModalAlert("Error con la contraseña temporal. Contacta al administrador.", "danger");
    } else {
      showModalAlert(error.message || "Ocurrió un error.", "danger");
    }
  }
});

async function cargarJuntas() {
  const _skRow7 = `<tr class="skeleton-row">
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-narrow"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-pill"></span></td>
  </tr>`;
  juntasBody.innerHTML = _skRow7.repeat(5);
  try {
    const snapshot = rolLocal === "admin"
      ? await db.collection("JuntasDeVecinos").get()
      : await db.collection("JuntasDeVecinos").where("creada_por", "==", uid).get();
    
    if (snapshot.empty) {
      juntasBody.innerHTML = '<tr class="table-feedback-row"><td colspan="7"><div class="empty-state">No hay juntas registradas en tu alcance.</div></td></tr>';
      return;
    }
    
    const juntas = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!esMismaUbicacion(data)) return;
      data.id = docSnap.id;
      juntas.push(data);
    });
    
    juntas.sort((a, b) => (a.nombre || "").toLowerCase().localeCompare((b.nombre || "").toLowerCase()));

    if (!juntas.length) {
      juntasBody.innerHTML = '<tr class="table-feedback-row"><td colspan="7"><div class="empty-state">No hay juntas en tu territorio.</div></td></tr>';
      return;
    }

    juntasBody.innerHTML = "";
    juntas.forEach((data) => {
      const label = data.estado ? "Activa" : "Inactiva";
      const estadoClass = data.estado ? "status-resuelta" : "status-pendiente";
      const chipIcon = data.estado ? "bi-check-circle-fill" : "bi-x-circle-fill";
      juntasBody.innerHTML += `<tr>
        <td data-label="Nombre">${escapeHtml(data.nombre)}</td>
        <td data-label="Usuario">${escapeHtml(data.usuario || "")}</td>
        <td data-label="Teléfono">${escapeHtml(data.telefono || "")}</td>
        <td data-label="Ubicación">${escapeHtml((data.provincia || "") + " / " + (data.municipio || ""))}</td>
        <td data-label="Comunidad">${escapeHtml(data.comunidad || "")}</td>
        <td data-label="Estado"><span class="status-chip ${estadoClass}"><i class="bi ${chipIcon} chip-icon"></i>${escapeHtml(label)}</span></td>
        <td class="text-center" data-label="Acciones">
          <div class="dropdown">
            <button class="btn btn-sm gecom-action-menu-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end gecom-action-menu">
              <li>
                <button class="dropdown-item" type="button" onclick="editarJunta('${data.id}')">
                  <i class="bi bi-pencil-fill gecom-action-icon gecom-action-icon--edit"></i>Editar
                </button>
              </li>
              <li>
                <button class="dropdown-item" type="button" onclick="abrirModalResetContrasenaJunta('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-key-fill gecom-action-icon gecom-action-icon--key"></i>Restablecer contraseña
                </button>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <button class="dropdown-item gecom-action-item--danger" type="button" onclick="eliminarJunta('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-trash-fill gecom-action-icon"></i>Eliminar
                </button>
              </li>
            </ul>
          </div>
        </td>
      </tr>`;
    });
  } catch (error) {
    console.error("Error al cargar juntas:", error);
    juntasBody.innerHTML = '<tr class="table-feedback-row"><td colspan="7"><div class="empty-state text-danger">Error al cargar juntas.</div></td></tr>';
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
    const docSnap = await db.collection("JuntasDeVecinos").doc(id).get();
    if (!docSnap.exists) {
      showAlert("Junta no encontrada.", "danger");
      return;
    }
    
    const data = docSnap.data();
    if (!esMismaUbicacion(data)) {
      showAlert("No puedes editar juntas fuera de tu municipio.", "danger");
      return;
    }
    juntaIdInput.value = id;
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("usuario").value = data.usuario || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("comunidad").value = data.comunidad || "";
    document.getElementById("cedula").value = data.cedula || "";
    if (provinciaSelect) {
      provinciaSelect.value = data.provincia || "";
      await cargarMunicipiosDesdeFirestore(data.provincia || "", data.municipio || "");
    }
    
    modalTitle.textContent = "Editar Junta de Vecinos";
    submitBtn.textContent = "Actualizar";
    passwordField.style.display = "none";
    modal.show();
  } catch (error) {
    console.error("Error:", error);
    showAlert("Error al cargar junta.", "danger");
  }
};

// ---- Reset contraseña junta ----
const resetModalJunta = new bootstrap.Modal(document.getElementById('modalResetContrasenaJunta'));

document.getElementById('modalResetContrasenaJunta').addEventListener('hidden.bs.modal', () => {
  document.getElementById('resetCallerPassword').value = '';
  document.getElementById('resetModalAlert').innerHTML = '';
  document.getElementById('btnConfirmarReset').disabled = false;
  document.getElementById('btnConfirmarReset').textContent = 'Restablecer';
});

window.abrirModalResetContrasenaJunta = function(id, nombre) {
  document.getElementById('resetTargetUid').value = id;
  document.getElementById('resetTargetNombre').textContent = nombre;
  resetModalJunta.show();
};

window.confirmarResetContrasenaJunta = async function() {
  const targetUid = document.getElementById('resetTargetUid').value;
  const callerPassword = document.getElementById('resetCallerPassword').value;
  const alertEl = document.getElementById('resetModalAlert');
  const btn = document.getElementById('btnConfirmarReset');

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
      targetRole: 'junta'
    });

    resetModalJunta.hide();
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

window.eliminarJunta = async function(id, nombre) {
  const ok = await window.gecomConfirm({
    title: "Eliminar junta",
    message: `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
    type: "danger",
  });
  if (!ok) return;
  try {
    const docSnap = await db.collection("JuntasDeVecinos").doc(id).get();
    if (!docSnap.exists) {
      showAlert("Junta no encontrada.", "danger");
      return;
    }
    if (!esMismaUbicacion(docSnap.data())) {
      showAlert("No puedes eliminar juntas fuera de tu municipio.", "danger");
      return;
    }
    await db.collection("JuntasDeVecinos").doc(id).delete();
    showAlert("Junta eliminada.", "success");
    await cargarJuntas();
  } catch (error) {
    console.error("Error:", error);
    showAlert("Error al eliminar.", "danger");
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

if (provinciaSelect) {
  provinciaSelect.addEventListener("change", async () => {
    if (rolLocal === "ayuntamiento") return;
    await cargarMunicipiosDesdeFirestore(provinciaSelect.value);
  });
}
