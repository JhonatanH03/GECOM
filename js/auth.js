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

// ⌨️ Permitir login con ENTER desde el campo de contraseña
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

// 🔐 REGISTRO
window.registrar = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // 🔥 Guardar usuario en Firestore
    const userData = {
      email: email,
      rol: rol
    };

    await setDoc(doc(db, "usuarios", uid), userData);

    mostrarExito("✅ Usuario registrado correctamente");

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

  } catch (error) {
    console.error("ERROR:", error.message);
    
    // Mapear mensajes de error de Firebase
    let mensajeError = "Error en el registro";
    
    if (error.code === "auth/email-already-in-use") {
      mensajeError = "❌ Este correo ya está registrado";
    } else if (error.code === "auth/weak-password") {
      mensajeError = "❌ La contraseña es muy débil";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "❌ Correo inválido";
    }
    
    mostrarError(mensajeError);
  }
};

// 🔐 LOGIN
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

    // 🔍 Obtener rol desde Firestore
    const docSnap = await getDoc(doc(db, "usuarios", uid));

    if (!docSnap.exists()) {
      mostrarError("Usuario sin rol asignado");
      return;
    }

    const rol = docSnap.data().rol;

    // 💾 Guardar sesión
    localStorage.setItem("uid", uid);
    localStorage.setItem("rol", rol);

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    // 🔁 Redirigir
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("ERROR:", error.message);
    
    // Mapear mensajes de error de Firebase
    let mensajeError = "Error de autenticación";
    
    if (error.code === "auth/user-not-found") {
      mensajeError = "❌ Usuario no encontrado";
    } else if (error.code === "auth/wrong-password") {
      mensajeError = "❌ Contraseña incorrecta";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "❌ Correo inválido";
    } else if (error.code === "auth/user-disabled") {
      mensajeError = "❌ Usuario deshabilitado";
    } else if (error.code === "auth/too-many-requests") {
      mensajeError = "❌ Demasiados intentos. Intente más tarde";
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
    <svg class="bi flex-shrink-0 me-2" width="24" height="24" viewBox="0 0 16 16" fill="currentColor" role="img" aria-label="Éxito:">
      <path d="M10.854 7.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 9.793l2.646-2.647a.5.5 0 0 1 .708 0z"/>
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
    </svg>
    <strong>${mensaje}</strong>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;
  
  const alertContainer = document.getElementById("alertContainer");
  if (alertContainer) {
    alertContainer.appendChild(successAlert);
  } else {
    const container = document.querySelector(".card");
    if (container) {
      container.insertAdjacentHTML("afterbegin", successAlert.outerHTML);
    }
  }
  
  // Auto cerrar después de 3 segundos
  setTimeout(() => {
    successAlert.remove();
  }, 3000);
}