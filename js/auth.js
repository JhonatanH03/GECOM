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

    let userData = { email };
    let collectionName = "";
    if (rol === "junta") {
      // JuntasDeVecinos
      collectionName = "JuntasDeVecinos";
      userData.nombreJunta = document.getElementById("reg_nombreJunta")?.value || "";
      userData.emailJunta = email;
      userData.direccion = document.getElementById("reg_direccionJunta")?.value || "";
      userData.sector = document.getElementById("reg_sectorJunta")?.value || "";
      userData.municipio = document.getElementById("reg_municipioJunta")?.value || "";
      userData.provincia = document.getElementById("reg_provinciaJunta")?.value || "";
      userData.nombreEncargado = document.getElementById("reg_nombreEncargado")?.value || "";
      userData.telefonoEncargado = document.getElementById("reg_telefonoEncargado")?.value || "";
      userData.creadoEn = new Date();
    } else if (rol === "ayuntamiento") {
      // Ayuntamientos
      collectionName = "Ayuntamientos";
      userData.nombre = document.getElementById("reg_nombreAyuntamiento")?.value || "";
      userData.email = email;
      userData.telefono = document.getElementById("reg_telefonoAyuntamiento")?.value || "";
      userData.direccion = document.getElementById("reg_direccionAyuntamiento")?.value || "";
      userData.municipio = document.getElementById("reg_municipioAyuntamiento")?.value || "";
      userData.provincia = document.getElementById("reg_provinciaAyuntamiento")?.value || "";
      userData.creadoEn = new Date();
    } else if (rol === "admin") {
      // Administradores
      collectionName = "Administradores";
      userData.nombre = document.getElementById("reg_nombreAdmin")?.value || "";
      userData.email = email;
      userData.telefono = document.getElementById("reg_telefonoAdmin")?.value || "";
      userData.rol = "admin";
      userData.creadoEn = new Date();
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
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

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
      mostrarError("Usuario sin rol asignado");
      return;
    }

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
};

// Función para mostrar errores
function mostrarError(mensaje) {
  const errorAlert = document.getElementById("errorAlert");
  const errorMessage = document.getElementById("errorMessage");
  errorMessage.textContent = mensaje;
  errorAlert.style.display = "block";
  
  // Auto cerrar después de 5 segundos
  setTimeout(() => {
    errorAlert.style.display = "none";
  }, 5000);
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