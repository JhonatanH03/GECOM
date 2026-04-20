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
    const email = document.getElementById("reg_email").value.trim();
    const password = document.getElementById("reg_password").value;
    const rol = document.getElementById("reg_rol").value;

    let userData = { email, rol };
    let collectionName = "";
    let camposFaltantes = [];

    if (rol === "junta") {
      // JuntasDeVecinos
      collectionName = "JuntasDeVecinos";
      userData.nombreJunta = document.getElementById("reg_nombreJunta")?.value.trim() || "";
      userData.emailJunta = email;
      userData.direccion = document.getElementById("reg_direccionJunta")?.value.trim() || "";
      userData.sector = document.getElementById("reg_sectorJunta")?.value.trim() || "";
      userData.municipio = document.getElementById("reg_municipioJunta")?.value.trim() || "";
      userData.provincia = document.getElementById("reg_provinciaJunta")?.value.trim() || "";
      userData.nombreEncargado = document.getElementById("reg_nombreEncargado")?.value.trim() || "";
      userData.telefonoEncargado = document.getElementById("reg_telefonoEncargado")?.value.trim() || "";
      userData.creadoEn = new Date();
      // Validar campos obligatorios
      [
        [userData.nombreJunta, "Nombre de la Junta"],
        [userData.emailJunta, "Correo"],
        [userData.direccion, "Dirección"],
        [userData.sector, "Sector"],
        [userData.municipio, "Municipio"],
        [userData.provincia, "Provincia"],
        [userData.nombreEncargado, "Nombre del encargado"],
        [userData.telefonoEncargado, "Teléfono"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    } else if (rol === "ayuntamiento") {
      // Ayuntamientos
      collectionName = "Ayuntamientos";
      userData.nombre = document.getElementById("reg_nombreAyuntamiento")?.value.trim() || "";
      userData.email = email;
      userData.telefono = document.getElementById("reg_telefonoAyuntamiento")?.value.trim() || "";
      userData.direccion = document.getElementById("reg_direccionAyuntamiento")?.value.trim() || "";
      userData.municipio = document.getElementById("reg_municipioAyuntamiento")?.value.trim() || "";
      userData.provincia = document.getElementById("reg_provinciaAyuntamiento")?.value.trim() || "";
      userData.creadoEn = new Date();
      [
        [userData.nombre, "Nombre del Ayuntamiento"],
        [userData.email, "Correo"],
        [userData.telefono, "Teléfono"],
        [userData.direccion, "Dirección"],
        [userData.municipio, "Municipio"],
        [userData.provincia, "Provincia"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    } else if (rol === "admin") {
      // Administradores
      collectionName = "Administradores";
      userData.nombre = document.getElementById("reg_nombreAdmin")?.value.trim() || "";
      userData.email = email;
      userData.telefono = document.getElementById("reg_telefonoAdmin")?.value.trim() || "";
      userData.creadoEn = new Date();
      [
        [userData.nombre, "Nombre"],
        [userData.email, "Correo"],
        [userData.telefono, "Teléfono"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    }

    if (!email || !password || !rol) {
      mostrarError("Correo, contraseña y rol son obligatorios.");
      return;
    }
    if (camposFaltantes.length > 0) {
      mostrarError("Faltan campos obligatorios: " + camposFaltantes.join(", "));

      return;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;
    if (collectionName) {
      await setDoc(doc(db, collectionName, uid), userData);
    } else {
      throw new Error("Rol no válido");
    }

    mostrarExito("Usuario registrado correctamente");

    // limpiar campos
    [
      "reg_email","reg_password",
      "reg_nombreJunta","reg_direccionJunta","reg_sectorJunta","reg_municipioJunta","reg_provinciaJunta","reg_nombreEncargado","reg_telefonoEncargado",
      "reg_nombreAyuntamiento","reg_telefonoAyuntamiento","reg_direccionAyuntamiento","reg_municipioAyuntamiento","reg_provinciaAyuntamiento",
      "reg_nombreAdmin","reg_telefonoAdmin"
    ].forEach(id => {
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

    // Buscar el usuario en las tres colecciones
    const colecciones = [
      { nombre: "Administradores", rol: "admin" },
      { nombre: "Ayuntamientos", rol: "ayuntamiento" },
      { nombre: "JuntasDeVecinos", rol: "junta" }
    ];
    let userDoc = null;
    let rol = null;
    for (const col of colecciones) {
      const docSnap = await getDoc(doc(db, col.nombre, uid));
      if (docSnap.exists()) {
        userDoc = docSnap.data();
        rol = userDoc.rol || col.rol;
        break;
      }
    }
    if (!userDoc) {
      mostrarError("Tu usuario no tiene rol asignado. Contacta al administrador.");
      return;
    }

    // Guardar sesión
    localStorage.setItem("uid", uid);
    localStorage.setItem("rol", rol);

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    mostrarExito("Inicio de sesión exitoso. Redirigiendo...");
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 800);
  } catch (error) {
    console.error("ERROR LOGIN:", error);
    let mensaje = "Error al iniciar sesión";
    if (error.code === "auth/user-not-found") {
      mensaje = "Usuario no encontrado";
    } else if (error.code === "auth/wrong-password") {
      mensaje = "Contraseña incorrecta";
    } else if (error.code === "auth/invalid-email") {
      mensaje = "Correo inválido";
    } else if (error.code === "auth/user-disabled") {
      mensaje = "Usuario deshabilitado";
    } else if (error.code === "auth/too-many-requests") {
      mensaje = "Demasiados intentos. Intenta más tarde.";
    }
    mostrarError(mensaje);
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
  if (container) {
    container.prepend(successAlert);
  } else {
    document.body.prepend(successAlert);
  }
  // Auto cerrar después de 3 segundos
  setTimeout(() => {
    successAlert.remove();
  }, 3000);
}
