import app from "./firebase.js";

import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

const rol = localStorage.getItem("rol");
const uid = localStorage.getItem("uid");

console.log("VER.JS CARGADO");

// 🔥 CARGAR DENUNCIAS
async function cargarDenuncias() {

  const filtro = document.getElementById("filtroEstado").value;

  let q;

  if (rol === "admin") {
    q = collection(db, "denuncias");
  } else {
    q = query(collection(db, "denuncias"), where("uid", "==", uid));
  }

  const querySnapshot = await getDocs(q);
  console.log("Cantidad de denuncias:", querySnapshot.size);

  const tabla = document.getElementById("tablaDenuncias");
  tabla.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();

    // 🔥 FILTRO POR ESTADO
    if (filtro !== "Todos" && data.estado !== filtro) return;

    const fila = document.createElement("tr");

    fila.innerHTML = `
      <td>${data.titulo || "Sin título"}</td>
      <td>${data.descripcion || "Sin descripción"}</td>

      <td>
        ${
          rol === "admin"
            ? `<select class="form-select" data-id="${docSnap.id}">
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

// 🔄 CARGA INICIAL
cargarDenuncias();

// 🔥 FILTRO DINÁMICO
document.getElementById("filtroEstado").addEventListener("change", () => {
  cargarDenuncias();
});

// ACTUALIZAR ESTADO (SOLO ADMIN)
document.addEventListener("change", async (e) => {
  if (
    e.target.tagName === "SELECT" &&
    e.target.hasAttribute("data-id") &&
    rol === "admin"
  ) {
    const id = e.target.getAttribute("data-id");
    const nuevoEstado = e.target.value;

    const ref = doc(db, "denuncias", id);

    await updateDoc(ref, {
      estado: nuevoEstado
    });

    console.log("Estado actualizado");
  }
});