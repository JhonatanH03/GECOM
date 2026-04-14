import app from "./firebase.js";
import {
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  query,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

async function cargarDenuncias() {
  const tabla = document.getElementById("tablaDenuncias");
  const filtro = document.getElementById("filtroEstado").value;
  const rol = localStorage.getItem("rol");
  tabla.innerHTML = "";

  let q;

  if (filtro === "Todos") {
    q = collection(db, "denuncias");
  } else {
    q = query(collection(db, "denuncias"), where("estado", "==", filtro));
  }

  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${data.titulo || "Sin título"}</td>
      <td>${data.descripcion || "Sin descripción"}</td>

<td>
  ${
    rol === "admin"
      ? `<select data-id="${doc.id}">
          <option ${data.estado === "Pendiente" ? "selected" : ""}>Pendiente</option>
          <option ${data.estado === "En proceso" ? "selected" : ""}>En proceso</option>
          <option ${data.estado === "Resuelta" ? "selected" : ""}>Resuelta</option>
          <option ${data.estado === "Rechazada" ? "selected" : ""}>Rechazada</option>
        </select>`
      : `<span>${data.estado}</span>`
  }
</td>

      <td>${
        data.fecha
          ? new Date(data.fecha.seconds * 1000).toLocaleString()
          : "Sin fecha"
      }</td>
    `;

    tabla.appendChild(fila);
  });
}

cargarDenuncias();

document.addEventListener("change", async (e) => {
  if (e.target.tagName === "SELECT") {
    const id = e.target.getAttribute("data-id");
    const nuevoEstado = e.target.value;

    const ref = doc(db, "denuncias", id);

    await updateDoc(ref, {
      estado: nuevoEstado,
    });

    console.log("Estado actualizado");
  }
});

document.getElementById("filtroEstado").addEventListener("change", () => {
  cargarDenuncias();
});
