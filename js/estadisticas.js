import app from "./firebase.js";

import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

let chartBarras;
let chartPastel;
let chartTendencias;

let denuncias = []; // almacenar todas las denuncias
let usuarios = {}; // uid -> email

// Cargar usuarios
async function cargarUsuarios() {
  const snapshot = await getDocs(collection(db, "usuarios"));
  snapshot.forEach(doc => {
    usuarios[doc.id] = doc.data().email;
  });
  // Llenar select de usuarios
  const select = document.getElementById("usuarioFiltro");
  Object.keys(usuarios).forEach(uid => {
    const option = document.createElement("option");
    option.value = uid;
    option.text = usuarios[uid];
    select.appendChild(option);
  });
}

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
  denuncias = [];
  snapshot.forEach(doc => {
    denuncias.push({ id: doc.id, ...doc.data() });
  });
  actualizarEstadisticas();
});

// Función para aplicar filtros y actualizar estadísticas
function actualizarEstadisticas() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const usuarioFiltro = document.getElementById("usuarioFiltro").value;

  let filtradas = denuncias.filter(d => {
    let incluir = true;

    // Filtro fecha
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      const fechaDenuncia = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia < desde) incluir = false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      const fechaDenuncia = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia > hasta) incluir = false;
    }

    // Filtro usuario
    if (usuarioFiltro && d.uid !== usuarioFiltro) incluir = false;

    return incluir;
  });

  // Calcular KPIs
  let pendiente = 0;
  let proceso = 0;
  let resuelta = 0;
  let rechazada = 0;

  filtradas.forEach(d => {
    if (d.estado === "Pendiente") pendiente++;
    else if (d.estado === "En proceso") proceso++;
    else if (d.estado === "Resuelta") resuelta++;
    else if (d.estado === "Rechazada") rechazada++;
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

  // Tendencias
  actualizarTendencias(filtradas);
}

// Función para actualizar gráfico de tendencias
function actualizarTendencias(filtradas) {
  // Agrupar por fecha (día)
  const agrupadas = {};
  filtradas.forEach(d => {
    const fecha = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
    const dia = fecha.toISOString().split('T')[0]; // YYYY-MM-DD
    if (!agrupadas[dia]) agrupadas[dia] = 0;
    agrupadas[dia]++;
  });

  // Últimos 30 días
  const hoy = new Date();
  const fechas = [];
  const datos = [];
  for (let i = 29; i >= 0; i--) {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - i);
    const dia = fecha.toISOString().split('T')[0];
    fechas.push(dia);
    datos.push(agrupadas[dia] || 0);
  }

  // Crear o actualizar gráfico
  const ctx = document.getElementById("graficoTendencias").getContext("2d");
  if (chartTendencias) {
    chartTendencias.data.labels = fechas;
    chartTendencias.data.datasets[0].data = datos;
    chartTendencias.update();
  } else {
    chartTendencias = new Chart(ctx, {
      type: "line",
      data: {
        labels: fechas,
        datasets: [{
          label: "Denuncias por día",
          data: datos,
          borderColor: "rgba(75, 192, 192, 1)",
          backgroundColor: "rgba(75, 192, 192, 0.2)",
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Fecha'
            }
          },
          y: {
            display: true,
            title: {
              display: true,
              text: 'Número de Denuncias'
            },
            beginAtZero: true
          }
        }
      }
    });
  }
}

// Función para exportar a CSV
function exportarCSV() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const usuarioFiltro = document.getElementById("usuarioFiltro").value;

  let filtradas = denuncias.filter(d => {
    let incluir = true;

    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      const fechaDenuncia = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia < desde) incluir = false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      const fechaDenuncia = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia > hasta) incluir = false;
    }

    if (usuarioFiltro && d.uid !== usuarioFiltro) incluir = false;

    return incluir;
  });

  // Crear CSV
  let csv = "ID,Título,Descripción,Estado,Fecha,Usuario\n";
  filtradas.forEach(d => {
    const fecha = d.fecha.toDate ? d.fecha.toDate().toLocaleDateString() : new Date(d.fecha).toLocaleDateString();
    const usuario = usuarios[d.uid] || d.uid;
    csv += `"${d.id}","${d.titulo}","${d.descripcion}","${d.estado}","${fecha}","${usuario}"\n`;
  });

  // Descargar
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte_denuncias.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// Inicializar
document.addEventListener("DOMContentLoaded", async () => {
  await cargarUsuarios();
  document.getElementById("aplicarFiltros").addEventListener("click", actualizarEstadisticas);
  document.getElementById("exportarCSV").addEventListener("click", exportarCSV);
});