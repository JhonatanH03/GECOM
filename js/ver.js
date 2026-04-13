import app from "./firebase.js";

import {
getFirestore,
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

async function cargarDenuncias() {
const querySnapshot = await getDocs(collection(db, "denuncias"));
const tabla = document.getElementById("tablaDenuncias");

tabla.innerHTML = "";

querySnapshot.forEach((doc) => {
const data = doc.data();


const fila = document.createElement("tr");

fila.innerHTML = `
  <td>${data.titulo || "Sin título"}</td>
  <td>${data.descripcion || "Sin descripción"}</td>
  <td>${data.estado || "Sin estado"}</td>
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
