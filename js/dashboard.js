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
        localStorage.clear();
        window.location.href = "index.html";
        return;
      }

      const userData = docSnap.data();

      if (userData.rol === "admin") {
        document.getElementById("cardAdmin").style.display = "block";
      }

      if (userData.rol === "junta") {
        document.getElementById("cardCrearDenuncia").style.display = "block";
        document.getElementById("cardJunta").style.display = "block";
      }

      if (userData.rol === "ayuntamiento") {
        document.getElementById("cardAyunt").style.display = "block";
      }
    })
    .catch((error) => {
      console.error("Error al consultar rol:", error);
      localStorage.clear();
      window.location.href = "index.html";
    });
}