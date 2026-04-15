import app from "./firebase.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

// 🔥 CREAR DENUNCIA
window.crearDenuncia = async function () {
  try {
    const titulo = document.getElementById("titulo").value;
    const descripcion = document.getElementById("descripcion").value;

    const uid = localStorage.getItem("uid");

    // 🔒 VALIDAR SESIÓN
    if (!uid) {
      alert("Debes iniciar sesión");
      window.location.href = "index.html";
      return;
    }

    // � Obtener datos del usuario (incluyendo comunidad)
    const usuarioDoc = await getDoc(doc(db, "usuarios", uid));
    const usuarioData = usuarioDoc.data();
    const comunidad = usuarioData?.comunidad || "Sin comunidad";

    // 🔥 GUARDAR EN FIRESTORE
    await addDoc(collection(db, "denuncias"), {
      titulo: titulo,
      descripcion: descripcion,
      estado: "Pendiente",
      fecha: new Date(),
      uid: uid,
      comunidad: comunidad
    });

    alert("Denuncia creada correctamente");

    // 🧹 LIMPIAR CAMPOS
    document.getElementById("titulo").value = "";
    document.getElementById("descripcion").value = "";

  } catch (error) {
    console.error("ERROR:", error.message);
    alert(error.message);
  }
};