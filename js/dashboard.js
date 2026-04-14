import app from "./firebase.js";

import {
  getFirestore,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

const ctx = document.getElementById("graficoEstados");

let chart = null; // importante para actualizar sin duplicar

onSnapshot(collection(db, "denuncias"), (snapshot) => {

  let pendientes = 0;
  let proceso = 0;
  let resueltas = 0;
  let rechazadas = 0;

  snapshot.forEach((doc) => {
    const estado = doc.data().estado;

    if (estado === "Pendiente") pendientes++;
    else if (estado === "En proceso") proceso++;
    else if (estado === "Resuelta") resueltas++;
    else if (estado === "Rechazada") rechazadas++;
  });

  const data = [pendientes, proceso, resueltas, rechazadas];

  // 🔥 Si el gráfico ya existe, solo actualiza
  if (chart) {
    chart.data.datasets[0].data = data;
    chart.update();
    return;
  }

  // 🔥 Si no existe, créalo
  chart = new Chart(ctx, {
    type: "pie", // puedes cambiar a "bar" si quieres
    data: {
      labels: ["Pendiente", "En proceso", "Resuelta", "Rechazada"],
      datasets: [{
        label: "Denuncias",
        data: data
      }]
    }
  });

});