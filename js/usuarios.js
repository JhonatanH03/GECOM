import app from "./firebase.js";
import { escapeHtml } from "./constants.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, limit } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
const modalTitle = document.getElementById("modalCrearUsuarioLabel");
const submitBtn = document.getElementById("submitBtn");
const usuarioIdInput = document.getElementById("usuarioId");
const passwordField = document.getElementById("passwordField");
const usuarioInput = document.getElementById("usuario");
const JUNTA_USUARIO_PREFIX = "jvl_";
const provinciaSelect = document.getElementById("provincia");
const municipioSelect = document.getElementById("municipio");
const provincias = {};

function asegurarPrefijoUsuario(usuario, prefijo) {
  const normalizado = String(usuario || "").trim().toLowerCase();
  if (!normalizado) return prefijo;
  return normalizado.startsWith(prefijo) ? normalizado : `${prefijo}${normalizado}`;
}

function inicializarUsuarioConPrefijo() {
  if (!usuarioInput || usuarioIdInput.value) return;
  usuarioInput.value = asegurarPrefijoUsuario(usuarioInput.value, JUNTA_USUARIO_PREFIX);
}

function protegerPrefijoUsuario() {
  if (!usuarioInput) return;

  usuarioInput.addEventListener("input", () => {
    if (usuarioIdInput.value) return;
    const valorActual = usuarioInput.value;
    const valorConPrefijo = asegurarPrefijoUsuario(valorActual, JUNTA_USUARIO_PREFIX);
    if (valorActual !== valorConPrefijo) {
      const cursor = usuarioInput.selectionStart || valorConPrefijo.length;
      usuarioInput.value = valorConPrefijo;
      const nuevaPosicion = Math.max(JUNTA_USUARIO_PREFIX.length, cursor);
      usuarioInput.setSelectionRange(nuevaPosicion, nuevaPosicion);
    }
  });

  usuarioInput.addEventListener("keydown", (event) => {
    if (usuarioIdInput.value) return;
    const cursor = usuarioInput.selectionStart || 0;
    const seleccion = (usuarioInput.selectionEnd || 0) - cursor;
    const quiereBorrarPrefijo =
      (event.key === "Backspace" && cursor <= JUNTA_USUARIO_PREFIX.length && seleccion === 0) ||
      (event.key === "Delete" && cursor < JUNTA_USUARIO_PREFIX.length);
    if (quiereBorrarPrefijo) {
      event.preventDefault();
    }
  });

  usuarioInput.addEventListener("focus", () => {
    if (usuarioIdInput.value) return;
    inicializarUsuarioConPrefijo();
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  if (!uid || !rolLocal) {
    window.location.href = "index.html";
    return;
  }

  if (rolLocal !== "admin") {
    window.location.href = "dashboard.html";
    return;
  }

  try {
    await cargarProvincias();
    await cargarUsuarios();
  } catch (error) {
    console.error("Error al validar acceso:", error);
    window.location.href = "index.html";
    return;
  }

  modalElement.addEventListener("hide.bs.modal", () => {
    form.reset();
    usuarioIdInput.value = "";
    modalTitle.textContent = "Registrar Junta de Vecinos";
    submitBtn.textContent = "Guardar";
    passwordField.style.display = "block";
    inicializarUsuarioConPrefijo();
    provinciaSelect.value = "";
    municipioSelect.innerHTML = '<option value="" selected>Seleccionar municipio</option>';
    clearModalAlert();
  });

  modalElement.addEventListener("show.bs.modal", () => {
    inicializarUsuarioConPrefijo();
  });

  protegerPrefijoUsuario();

  document.getElementById("contrasena").addEventListener("input", actualizarIndicadoresPassword);
  document.getElementById("telefono").addEventListener("input", formatearTelefono);
  document.getElementById("cedula").addEventListener("input", formatearCedula);
  provinciaSelect.addEventListener("change", actualizarMunicipios);

  document.getElementById('modalResetContrasenaUsuario').addEventListener('hidden.bs.modal', () => {
    document.getElementById('resetUsuarioCallerPassword').value = '';
    document.getElementById('resetUsuarioModalAlert').innerHTML = '';
    document.getElementById('btnConfirmarResetUsuario').disabled = false;
    document.getElementById('btnConfirmarResetUsuario').textContent = 'Restablecer';
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearModalAlert();

  const usuarioId = usuarioIdInput.value;
  const nombre = document.getElementById("nombre").value.trim();
  const usuarioIngresado = document.getElementById("usuario").value.trim();
  const usuario = usuarioId
    ? usuarioIngresado
    : asegurarPrefijoUsuario(usuarioIngresado, JUNTA_USUARIO_PREFIX);
  const telefono = document.getElementById("telefono").value.trim();
  const nombreEncargado = document.getElementById("nombreEncargado").value.trim();
  const cedula = document.getElementById("cedula").value.trim();
  const provincia = provinciaSelect.value;
  const municipio = municipioSelect.value;
  const sector = document.getElementById("sector").value.trim();

  if (!nombre || !usuario || !telefono || !nombreEncargado || !cedula || !provincia || !municipio || !sector) {
    showModalAlert("Todos los campos son obligatorios.", "danger");
    return;
  }

  if (!/^1-\d{3}-\d{3}-\d{4}$/.test(telefono)) {
    showModalAlert("El teléfono debe tener el formato 1-000-000-0000.", "danger");
    return;
  }

  if (!/^\d{3}-\d{7}-\d$/.test(cedula)) {
    showModalAlert("La cédula debe tener el formato 000-0000000-0.", "danger");
    return;
  }

  const usuarioNormalizado = usuario.toLowerCase();

  const usuarioData = {
    nombre,
    usuario,
    rol: "junta",
    telefono,
    nombreEncargado,
    cedula,
    provincia,
    municipio,
    comunidad: sector,
    sector,
    estado: true
  };

  try {
    if (usuarioId) {
      await setDoc(doc(db, "JuntasDeVecinos", usuarioId), usuarioData, { merge: true });
      showAlert("Junta actualizada correctamente.", "success");
    } else {
      const tieneAyuntamientoTerritorial = await existeAyuntamientoTerritorial(provincia, municipio);
      if (!tieneAyuntamientoTerritorial) {
        showModalAlert("No existe un ayuntamiento registrado para la provincia y municipio seleccionados.", "danger");
        return;
      }

      const duplicadoSnap = await getDocs(
        query(collection(db, "JuntasDeVecinos"), where("usuario", "==", usuarioNormalizado), limit(1))
      );
      if (!duplicadoSnap.empty) {
        showModalAlert("Ya existe un usuario con ese nombre y ese rol.", "danger");
        return;
      }

      // Crear nueva junta via backend (Admin SDK, sin cambiar la sesión activa).
      if (!auth.currentUser) {
        throw new Error("Sesión no válida.");
      }
      const token = await auth.currentUser.getIdToken();
      const response = await fetch(window.gecomBuildBackendUrl("/api/juntas/crear"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          nombre,
          usuario: usuarioNormalizado,
          telefono,
          comunidad: sector,
          provincia,
          municipio,
          cedula
        })
      });

      const responseData = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (responseData.error?.code === "already-exists") {
          showModalAlert("Ya existe un usuario con ese nombre y ese rol.", "danger");
          return;
        }
        throw new Error(responseData.error?.message || "Error al crear la junta.");
      }

      const { contrasenaTemporal } = responseData;
      showAlert(`Junta creada correctamente. Usuario: ${usuario}, Contraseña temporal: ${contrasenaTemporal}`, "success");
    }

    modal.hide();
    await cargarUsuarios();
  } catch (error) {
    console.error("Error al guardar usuario:", error);
    if (error.code === "auth/email-already-in-use") {
      showModalAlert("No se puede crear: el usuario ya existe.", "danger");
      return;
    }
    showModalAlert(error.message || "No se pudo guardar la junta.", "danger");
  }
});

async function cargarProvincias() {
  const response = await fetch("js/provincias.json");
  const data = await response.json();
  provinciaSelect.innerHTML = '<option value="" selected>Seleccionar provincia</option>';

  Object.keys(provincias).forEach((key) => delete provincias[key]);
  data.forEach((item) => {
    provincias[item.nombre] = item.municipios || [];
    const option = document.createElement("option");
    option.value = item.nombre;
    option.textContent = item.nombre;
    provinciaSelect.appendChild(option);
  });
}

function actualizarMunicipios() {
  const provincia = provinciaSelect.value;
  const municipios = provincias[provincia] || [];
  municipioSelect.innerHTML = '<option value="" selected>Seleccionar municipio</option>';

  municipios.forEach((municipio) => {
    const option = document.createElement("option");
    option.value = municipio;
    option.textContent = municipio;
    municipioSelect.appendChild(option);
  });
}

async function existeAyuntamientoTerritorial(provincia, municipio) {
  const snap = await getDocs(query(collection(db, "Ayuntamientos"), where("provincia", "==", provincia)));
  if (snap.empty) return false;

  return snap.docs.some((docSnap) => {
    const data = docSnap.data() || {};
    return (data.municipio || "") === municipio;
  });
}

async function cargarUsuarios() {
  const _skRow9 = `<tr class="skeleton-row">
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-wide"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-narrow"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-medium"></span></td>
    <td><span class="skeleton-cell skeleton-pill"></span></td>
  </tr>`;
  usuariosBody.innerHTML = _skRow9.repeat(5);

  try {
    const snapshot = await getDocs(collection(db, "JuntasDeVecinos"));
    if (snapshot.empty) {
      usuariosBody.innerHTML = '<tr class="table-feedback-row"><td colspan="9"><div class="empty-state">No hay juntas registradas.</div></td></tr>';
      return;
    }

    const usuarios = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" }));

    usuariosBody.innerHTML = "";

    usuarios.forEach((data) => {
      const estadoLabel = data.estado ? "Activo" : "Inactivo";
      const estadoClass = data.estado ? "status-resuelta" : "status-pendiente";
      const chipIcon = data.estado ? "bi-check-circle-fill" : "bi-x-circle-fill";
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td data-label="Nombre de la Junta">${escapeHtml(data.nombre)}</td>
        <td data-label="Usuario">${escapeHtml(data.usuario || "")}</td>
        <td data-label="Cédula">${escapeHtml(data.cedula)}</td>
        <td data-label="Teléfono">${escapeHtml(data.telefono)}</td>
        <td data-label="Provincia">${escapeHtml(data.provincia)}</td>
        <td data-label="Municipio">${escapeHtml(data.municipio)}</td>
        <td data-label="Sector">${escapeHtml(data.sector || data.comunidad)}</td>
        <td data-label="Estado"><span class="status-chip ${estadoClass}"><i class="bi ${chipIcon} chip-icon"></i>${escapeHtml(estadoLabel)}</span></td>
        <td class="text-center" data-label="Acciones">
          <div class="dropdown">
            <button class="btn btn-sm gecom-action-menu-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end gecom-action-menu">
              <li>
                <button class="dropdown-item" type="button" onclick="editarUsuario('${data.id}')">
                  <i class="bi bi-pencil-fill gecom-action-icon gecom-action-icon--edit"></i>Editar
                </button>
              </li>
              <li>
                <button class="dropdown-item" type="button" onclick="abrirModalResetUsuario('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-key-fill gecom-action-icon gecom-action-icon--key"></i>Restablecer contraseña
                </button>
              </li>
              <li><hr class="dropdown-divider"></li>
              <li>
                <button class="dropdown-item gecom-action-item--danger" type="button" onclick="eliminarUsuario('${data.id}', '${escapeHtml(data.nombre)}')">
                  <i class="bi bi-trash-fill gecom-action-icon"></i>Eliminar
                </button>
              </li>
            </ul>
          </div>
        </td>
      `;
      usuariosBody.appendChild(fila);
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    usuariosBody.innerHTML = '<tr class="table-feedback-row"><td colspan="9"><div class="empty-state text-danger">No se pudo cargar la lista.</div></td></tr>';
  }
}

window.editarUsuario = async function editarUsuario(id) {
  try {
    const docSnap = await getDoc(doc(db, "JuntasDeVecinos", id));
    if (!docSnap.exists()) {
      showAlert("Usuario no encontrado.", "danger");
      return;
    }

    const data = docSnap.data();
    usuarioIdInput.value = id;
    document.getElementById("nombre").value = data.nombre || "";
    document.getElementById("usuario").value = data.usuario || "";
    document.getElementById("telefono").value = data.telefono || "";
    document.getElementById("nombreEncargado").value = data.nombreEncargado || "";
    document.getElementById("cedula").value = data.cedula || "";
    document.getElementById("sector").value = data.sector || data.comunidad || "";
    provinciaSelect.value = data.provincia || "";
    actualizarMunicipios();
    municipioSelect.value = data.municipio || "";

    modalTitle.textContent = "Editar Junta de Vecinos";
    submitBtn.textContent = "Actualizar";
    passwordField.style.display = "none";
    modal.show();
  } catch (error) {
    console.error("Error al cargar usuario:", error);
    showAlert("Error al cargar usuario.", "danger");
  }
};

window.abrirModalResetUsuario = function(id, nombre) {
  document.getElementById('resetUsuarioTargetUid').value = id;
  document.getElementById('resetUsuarioTargetNombre').textContent = nombre;
  const resetModal = new bootstrap.Modal(document.getElementById('modalResetContrasenaUsuario'));
  resetModal.show();
};

window.confirmarResetContrasenaUsuario = async function() {
  const targetUid = document.getElementById('resetUsuarioTargetUid').value;
  const callerPassword = document.getElementById('resetUsuarioCallerPassword').value;
  const alertEl = document.getElementById('resetUsuarioModalAlert');
  const btn = document.getElementById('btnConfirmarResetUsuario');

  function showResetError(msg) {
    alertEl.innerHTML = `<div class="alert alert-danger py-2">${msg}</div>`;
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
    bootstrap.Modal.getInstance(document.getElementById('modalResetContrasenaUsuario')).hide();
    showAlert(`Contraseña restablecida correctamente. Contraseña temporal: ${result.temporaryPassword}`, 'success');
  } catch (error) {
    let msg = 'Error al restablecer la contraseña.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = 'Tu contraseña actual es incorrecta.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Demasiados intentos fallidos. Intenta más tarde.';
    } else if (error.name === 'TypeError' || error.code === 'request-failed') {
      msg = 'No se pudo conectar con el backend. Verifica que esté ejecutándose.';
    } else if (error.message) {
      msg = error.message;
    }
    showResetError(msg);
    btn.disabled = false;
    btn.textContent = 'Restablecer';
  }
};

window.eliminarUsuario = async function eliminarUsuario(id, nombre) {
  const ok = await window.gecomConfirm({
    title: "Eliminar usuario",
    message: `¿Estás seguro de que deseas eliminar "${nombre}"? Esta acción no se puede deshacer.`,
    confirmText: "Sí, eliminar",
    cancelText: "Cancelar",
    type: "danger",
  });
  if (!ok) return;

  try {
    await window.gecomDeleteManagedUserAccount({
      auth,
      targetUid: id,
      targetRole: "junta"
    });
    showAlert("Junta eliminada correctamente.", "success");
    await cargarUsuarios();
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    if (error.code === "permission-denied") {
      showAlert("No tienes permisos para eliminar esta junta.", "danger");
      return;
    }
    if (error.name === "TypeError" || error.code === "request-failed") {
      showAlert("No se pudo conectar con el backend de eliminación.", "danger");
      return;
    }
    showAlert(error.message || "Error al eliminar usuario.", "danger");
  }
};

function passwordValida(password) {
  return password.length >= 6 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

function actualizarIndicadoresPassword(event) {
  const password = event.target.value;
  actualizarIndicador("reqLength", password.length >= 6, "Al menos 6 caracteres");
  actualizarIndicador("reqUpper", /[A-Z]/.test(password), "Una letra mayúscula");
  actualizarIndicador("reqLower", /[a-z]/.test(password), "Una letra minúscula");
  actualizarIndicador("reqNumber", /\d/.test(password), "Un número");
}

function actualizarIndicador(id, cumple, texto) {
  const element = document.getElementById(id);
  element.className = cumple ? "text-success" : "text-danger";
  element.textContent = `${cumple ? "✓" : "✗"} ${texto}`;
}

function formatearCedula(event) {
  let digits = event.target.value.replace(/\D/g, "").slice(0, 11);
  let formatted = "";
  if (digits.length > 0) formatted += digits.slice(0, 3);
  if (digits.length > 3) formatted += `-${digits.slice(3, 10)}`;
  if (digits.length > 10) formatted += `-${digits.slice(10)}`;
  event.target.value = formatted;
}

function formatearTelefono(event) {
  const digits = event.target.value.replace(/\D/g, "").slice(0, 11);
  let formatted = digits;
  if (digits.length > 1) formatted = `${digits.slice(0, 1)}-${digits.slice(1)}`;
  if (digits.length > 4) formatted = `${formatted.slice(0, 5)}-${formatted.slice(5)}`;
  if (digits.length > 7) formatted = `${formatted.slice(0, 9)}-${formatted.slice(9)}`;
  event.target.value = formatted;
}

function showAlert(message, type = "success") {
  const credenciales = type === "success" ? extraerCredencialesTemporales(message) : null;

  if (!credenciales) {
    alertContainer.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${escapeHtml(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
      </div>
    `;
    return;
  }

  const idCopiar = `btnCopiarPwd_${Date.now()}`;
  const idCopiarTodo = `btnCopiarTodo_${Date.now()}`;
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      <div class="fw-semibold mb-2">${escapeHtml(message)}</div>
      <div class="d-flex gap-2 flex-wrap">
        <button type="button" id="${idCopiar}" class="btn btn-sm btn-outline-light">Copiar</button>
        <button type="button" id="${idCopiarTodo}" class="btn btn-sm btn-light">Copiar todo</button>
      </div>
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;

  const btnCopiar = document.getElementById(idCopiar);
  const btnCopiarTodo = document.getElementById(idCopiarTodo);

  btnCopiar?.addEventListener("click", async () => {
    const ok = await copiarTextoPortapapeles(credenciales.contrasena);
    btnCopiar.textContent = ok ? "Copiado" : "No se pudo copiar";
  });

  btnCopiarTodo?.addEventListener("click", async () => {
    const textoCompleto = credenciales.usuario
      ? `Usuario: ${credenciales.usuario}\nContraseña temporal: ${credenciales.contrasena}`
      : `Contraseña temporal: ${credenciales.contrasena}`;
    const ok = await copiarTextoPortapapeles(textoCompleto);
    btnCopiarTodo.textContent = ok ? "Copiado" : "No se pudo copiar";
  });
}

function extraerCredencialesTemporales(message) {
  const texto = String(message || "");
  const passMatch = texto.match(/Contrase(?:n|ñ)a temporal:\s*([^,\s]+)/i);
  if (!passMatch) return null;

  const userMatch = texto.match(/Usuario:\s*([^,]+),/i);
  return {
    usuario: userMatch ? userMatch[1].trim() : "",
    contrasena: passMatch[1].trim()
  };
}

async function copiarTextoPortapapeles(texto) {
  const contenido = String(texto || "");
  if (!contenido) return false;

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(contenido);
      return true;
    }
  } catch (_error) {
    // fallback below
  }

  try {
    const temp = document.createElement("textarea");
    temp.value = contenido;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(temp);
    return copied;
  } catch (_error) {
    return false;
  }
}

function showModalAlert(message, type = "danger") {
  modalAlertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
    </div>
  `;
}

function clearModalAlert() {
  modalAlertContainer.innerHTML = "";
}

