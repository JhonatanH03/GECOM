// Funciones para mostrar mensajes de éxito y error en el login
function mostrarExito(mensaje) {
  let alert = document.createElement('div');
  alert.className = 'alert alert-success alert-dismissible fade show';
  alert.role = 'alert';
  alert.innerHTML = `<strong>${mensaje}</strong><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const container = document.querySelector('.card') || document.body;
  container.prepend(alert);
  setTimeout(() => { alert.remove(); }, 3000);
}

function mostrarError(mensaje) {
  let alert = document.createElement('div');
  alert.className = 'alert alert-danger alert-dismissible fade show';
  alert.role = 'alert';
  alert.innerHTML = `<strong>${mensaje}</strong><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const container = document.querySelector('.card') || document.body;
  container.prepend(alert);
  setTimeout(() => { alert.remove(); }, 4000);
}
// Limpieza de colecciones antiguas (solo admin)
import {
  collection,
  getDocs,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

window.limpiarFirebase = async function () {
  if (!confirm("¿Seguro que deseas borrar todas las colecciones antiguas y usuarios? Esta acción no se puede deshacer.")) return;
  const colecciones = ["provincias", "municipios", "sectores", "ayuntamientos", "juntas", "usuarios"];
  let total = 0;
  for (const col of colecciones) {
    const snapshot = await getDocs(collection(db, col));
    for (const docu of snapshot.docs) {
      await deleteDoc(docu.ref);
      total++;
    }
  }
  mostrarExito(`Limpieza completada. Documentos eliminados: ${total}`);
};
import app from "./firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// Permitir login con ENTER desde el campo de contraseña
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        login();
      }
    });
  }
});


// El registro normal queda deshabilitado en el login

// Registro desde el panel de admin
window.registrarDesdeAdmin = async function () {
  try {
    const email = document.getElementById("reg_email").value;
    const password = document.getElementById("reg_password").value;
    const rol = document.getElementById("reg_rol").value;

    let userData = { email, rol };
    if (rol === "junta") {
      userData.nombre = document.getElementById("reg_nombreJunta").value;
      userData.comunidad = document.getElementById("reg_comunidad").value;
      userData.telefono = document.getElementById("reg_telefonoJunta").value;
    } else if (rol === "ayuntamiento") {
      userData.nombre = document.getElementById("reg_nombreAyuntamiento").value;
      userData.municipio = document.getElementById("reg_municipio").value;
      userData.departamento = document.getElementById("reg_departamento").value;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;
    await setDoc(doc(db, "usuarios", uid), userData);

    mostrarExito("Usuario registrado correctamente");

    // limpiar campos
    ["reg_email","reg_password","reg_nombreJunta","reg_comunidad","reg_telefonoJunta","reg_nombreAyuntamiento","reg_municipio","reg_departamento"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistro'));
    modal.hide();

  } catch (error) {
    console.error("ERROR:", error.message);
    let mensajeError = "Error en el registro";
    if (error.code === "auth/email-already-in-use") {
      mensajeError = "Este correo ya está registrado";
    } else if (error.code === "auth/weak-password") {
      mensajeError = "La contraseña es muy débil";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "Correo inválido";
    }
    mostrarError(mensajeError);
  }
};

// LOGIN
window.login = async function () {
  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      mostrarError("Debes ingresar correo y contraseña.");
      return;
    }

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // Obtener rol desde Firestore
    const docSnap = await getDoc(doc(db, "usuarios", uid));

    if (!docSnap.exists()) {
      mostrarError("Usuario sin rol asignado");
      return;
    }

    const rol = docSnap.data().rol;

    // Guardar sesión
    localStorage.setItem("uid", uid);
    localStorage.setItem("rol", rol);

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    // Redirigir
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("ERROR:", error.message);
    
    // Mapear mensajes de error de Firebase
    let mensajeError = "Error de autenticación";
    if (error.code === "auth/user-not-found") {
      mensajeError = "Usuario no encontrado";
    } else if (error.code === "auth/wrong-password") {
      mensajeError = "Contraseña incorrecta";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "Correo inválido";
    } else if (error.code === "auth/user-disabled") {
      mensajeError = "Usuario deshabilitado";
    } else if (error.code === "auth/too-many-requests") {
      mensajeError = "Demasiados intentos. Intente más tarde";
    }
    mostrarError(mensajeError);
  }
}

// Función para mostrar éxito
function mostrarExito(mensaje) {
  // Crear un alert temporal de éxito
  const successAlert = document.createElement("div");
  successAlert.className = "alert alert-success alert-dismissible fade show";
  successAlert.setAttribute("role", "alert");
  successAlert.innerHTML = `
    <strong>${mensaje}</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  const container = document.querySelector(".card");
  container.insertBefore(successAlert, container.querySelector("button"));
  // Auto cerrar después de 3 segundos
  setTimeout(() => {
    successAlert.remove();
  }, 3000);
}
