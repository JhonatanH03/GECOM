import app from "./firebase.js";

import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

let unsubscribe = null; // para controlar el listener

function cargarDenuncias() {
  const tabla = document.getElementById("tablaDenuncias");
  const filtro = document.getElementById("filtroEstado").value;

  tabla.innerHTML = "";

  //Construir query correctamente
  let q;

  if (filtro === "Todos") {
    q = query(collection(db, "denuncias"));
  } else {
    q = query(
      collection(db, "denuncias"),
      where("estado", "==", filtro)
    );
  }

  //Cancelar listener anterior (importante)
  if (unsubscribe) {
    unsubscribe();
  }

  //Escuchar en tiempo real
  unsubscribe = onSnapshot(q, (querySnapshot) => {
    tabla.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      const fila = document.createElement("tr");

      fila.innerHTML = `
        <td>${data.titulo || "Sin título"}</td>
        <td>${data.descripcion || "Sin descripción"}</td>

        <td>
          <select class="form-select" data-id="${docSnap.id}">
            <option ${data.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
            <option ${data.estado === "En proceso" ? "selected" : ""}>En proceso</option>
            <option ${data.estado === "Resuelta" ? "selected" : ""}>Resuelta</option>
            <option ${data.estado === "Rechazada" ? "selected" : ""}>Rechazada</option>
          </select>
        </td>

        <td>${
          data.fecha && data.fecha.seconds
            ? new Date(data.fecha.seconds * 1000).toLocaleString()
            : "Sin fecha"
        }</td>
      `;

      tabla.appendChild(fila);
    });
  });
}

//Cargar al inicio
cargarDenuncias();

//Cambiar estado (solo selects con data-id)
document.addEventListener("change", async (e) => {
  if (e.target.matches("select[data-id]")) {
    const id = e.target.getAttribute("data-id");
    const nuevoEstado = e.target.value;

    try {
      const ref = doc(db, "denuncias", id);

      await updateDoc(ref, {
        estado: nuevoEstado
      });

      console.log("Estado actualizado");
    } catch (error) {
      console.error("Error al actualizar:", error);
    }
  }
});

//Filtro
document.getElementById("filtroEstado").addEventListener("change", () => {
  cargarDenuncias();
});

import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Usuario autenticado:", user.uid);
    cargarDenuncias(); // 🔥 SOLO carga si hay sesión
  } else {
    console.log("No hay usuario autenticado");
    // opcional: redirigir al login
    window.location.href = "login.html";
  }
});