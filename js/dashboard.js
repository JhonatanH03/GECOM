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
  // Buscar el usuario en las tres colecciones
  const colecciones = [
    { nombre: "Administradores", rol: "admin" },
    { nombre: "Ayuntamientos", rol: "ayuntamiento" },
    { nombre: "JuntasDeVecinos", rol: "junta" }
  ];
  let encontrado = false;
  (async () => {
    for (const col of colecciones) {
      const userRef = doc(db, col.nombre, uid);
      try {
        const docSnap = await getDoc(userRef);
        if (docSnap.exists()) {
          encontrado = true;
          const userData = docSnap.data();
          const rol = userData.rol || col.rol;
          // Mostrar siempre la tarjeta de Ver Denuncias
          document.getElementById("cardVerDenuncias").style.display = "block";
          if (rol === "admin") {
            document.getElementById("cardAdmin").style.display = "block";
            document.getElementById("cardAdminAyunt").style.display = "block";
          }
          if (rol === "junta") {
            document.getElementById("cardCrearDenuncia").style.display = "block";
            document.getElementById("cardJunta").style.display = "block";
          }
          if (rol === "ayuntamiento") {
            document.getElementById("cardAyunt").style.display = "block";
          }
          break;
        }
      } catch (error) {
        console.error("Error al consultar rol:", error);
        localStorage.clear();
        window.location.href = "index.html";
        return;
      }
    }
    if (!encontrado) {
      localStorage.clear();
      window.location.href = "index.html";
    }
  })();
}