import app from "./firebase.js";
import {
  getFirestore,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");

window.ir = function (ruta) {
  window.location.href = ruta;
};

window.logout = function () {
  localStorage.clear();
  window.location.href = "index.html";
};

if (!uid || !rolLocal) {
  window.location.href = "index.html";
} else {
  const db = getFirestore(app);
  const userRef = doc(db, "usuarios", uid);

  getDoc(userRef)
    .then((docSnap) => {
      if (!docSnap.exists()) {
        console.error("Documento del usuario no existe en Firestore");
        localStorage.clear();
        window.location.href = "index.html";
        return;
      }

      const userData = docSnap.data();
      console.log("Datos del usuario:", userData);
      
      // Normalizar rol (eliminar espacios en blanco)
      const rolNormalizado = userData.rol ? userData.rol.trim().toLowerCase() : "";

      if (rolNormalizado === "admin") {
        const cardAdmin = document.getElementById("cardAdmin");
        const cardAdminUsuarios = document.getElementById("cardAdminUsuarios");
        if (cardAdmin) {
          cardAdmin.style.display = "block";
        }
        if (cardAdminUsuarios) {
          cardAdminUsuarios.style.display = "block";
        }
      }

      if (rolNormalizado === "junta") {
        const cardCrearDenuncia = document.getElementById("cardCrearDenuncia");
        const cardJunta = document.getElementById("cardJunta");
        if (cardCrearDenuncia) cardCrearDenuncia.style.display = "block";
        if (cardJunta) cardJunta.style.display = "block";
      }

      if (rolNormalizado === "ayuntamiento") {
        const cardAyunt = document.getElementById("cardAyunt");
        const cardCrearDenunciaAyunt = document.getElementById("cardCrearDenunciaAyunt");
        if (cardAyunt) {
          cardAyunt.style.display = "block";
        } else {
          console.warn("Elemento cardAyunt no encontrado en el DOM");
        }
        if (cardCrearDenunciaAyunt) {
          cardCrearDenunciaAyunt.style.display = "block";
        }
      }
    })
    .catch((error) => {
      console.error("Error al consultar rol en Firestore:", error);
      console.error("UID:", uid);
      // No limpiar localStorage inmediatamente en caso de error de red
      // Mantener sesión activa
      console.warn("Error de conexión. La sesión se mantiene activa.");
    });
}