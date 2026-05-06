import app from "./firebase.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

let chartBarras;
let chartPastel;

function crearGraficos(datos) {
  const ctxBarras = document.getElementById("graficoBarras").getContext("2d");
  const ctxPastel = document.getElementById("graficoPastel").getContext("2d");

  chartBarras = new Chart(ctxBarras, {
    type: "bar",
    data: {
      labels: ["Pendiente", "En proceso", "Resuelta", "Rechazada"],
      datasets: [{
        label: "Denuncias",
        data: datos
      }]
    }
  });

  chartPastel = new Chart(ctxPastel, {
    type: "pie",
    data: {
      labels: ["Pendiente", "En proceso", "Resuelta", "Rechazada"],
      datasets: [{
        data: datos
      }]
    }
  });
}

// 🔥 TIEMPO REAL
onSnapshot(collection(db, "denuncias"), (snapshot) => {

  let pendiente = 0;
  let proceso = 0;
  let resuelta = 0;
  let rechazada = 0;

  snapshot.forEach(doc => {
    const estado = doc.data().estado;

    if (estado === "Pendiente") pendiente++;
    else if (estado === "En proceso") proceso++;
    else if (estado === "Resuelta") resuelta++;
    else if (estado === "Rechazada") rechazada++;
  });

  // 🔢 KPIs
  document.getElementById("pendiente").innerText = pendiente;
  document.getElementById("proceso").innerText = proceso;
  document.getElementById("resuelta").innerText = resuelta;
  document.getElementById("rechazada").innerText = rechazada;

  const datos = [pendiente, proceso, resuelta, rechazada];

  // 🔄 actualizar o crear gráficos
  if (chartBarras && chartPastel) {
    chartBarras.data.datasets[0].data = datos;
    chartBarras.update();

    chartPastel.data.datasets[0].data = datos;
    chartPastel.update();
  } else {
    crearGraficos(datos);
  }

});