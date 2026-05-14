import app from "./firebase.js";
import { ESTADOS, ESTADOS_LISTA } from "./constants.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

let chartBarras;
let chartPastel;
let chartTendencias;

let denuncias = []; // almacenar todas las denuncias
let usuarios = {}; // uid -> email

// Cargar usuarios y provincias
async function cargarUsuariosYProvincias() {
  // Usuarios
  const snapshot = await getDocs(collection(db, "JuntasDeVecinos"));
  usuarios = {};
  snapshot.forEach(doc => {
    const data = doc.data();
    usuarios[doc.id] = {
      nombre: data.nombre || data.usuario || doc.id,
      municipio: data.municipio || "",
      provincia: data.provincia || ""
    };
  });
  // Llenar select de usuarios
  const select = document.getElementById("usuarioFiltro");
  select.innerHTML = '<option value="">Todos</option>';
  Object.keys(usuarios).forEach(uid => {
    const u = usuarios[uid];
    const option = document.createElement("option");
    option.value = uid;
    option.text = `${u.nombre}${u.municipio ? " (" + u.municipio + ")" : ""}`;
    select.appendChild(option);
  });

  // Provincias (de denuncias)
  const provinciasSet = new Set();
  denuncias.forEach(d => {
    if (d.provincia) provinciasSet.add(d.provincia);
  });
  const provinciaSelect = document.getElementById("provinciaFiltro");
  provinciaSelect.innerHTML = '<option value="">Todas</option>';
  Array.from(provinciasSet).sort().forEach(prov => {
    const option = document.createElement("option");
    option.value = prov;
    option.text = prov;
    provinciaSelect.appendChild(option);
  });
}

function obtenerColoresEstados() {
  return {
    pendiente: "#64748b",
    proceso: "#d97706",
    resuelta: "#059669",
    rechazada: "#e11d48"
  };
}

function crearOpcionesComunesGraficos() {
  return {
    responsive: true,
    maintainAspectRatio: true,
    animation: {
      duration: 320,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: {
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          boxWidth: 10,
          boxHeight: 10,
          padding: 14,
          font: {
            family: "Manrope",
            size: 12,
            weight: "600"
          }
        }
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(148, 163, 184, 0.35)",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        titleFont: {
          family: "Manrope",
          size: 12,
          weight: "700"
        },
        bodyFont: {
          family: "Manrope",
          size: 12,
          weight: "500"
        }
      }
    }
  };
}

function crearGraficos(datos) {
  const ctxBarras = document.getElementById("graficoBarras").getContext("2d");
  const ctxPastel = document.getElementById("graficoPastel").getContext("2d");
  const colores = obtenerColoresEstados();
  const coloresArray = [
    colores.pendiente,
    colores.proceso,
    colores.resuelta,
    colores.rechazada
  ];
  const coloresSuaves = [
    "rgba(100, 116, 139, 0.18)",
    "rgba(217, 119, 6, 0.18)",
    "rgba(5, 150, 105, 0.18)",
    "rgba(225, 29, 72, 0.18)"
  ];

  const opcionesBase = crearOpcionesComunesGraficos();

  chartBarras = new Chart(ctxBarras, {
    type: "bar",
    data: {
      labels: ESTADOS_LISTA,
      datasets: [{
        label: "Cantidad de denuncias",
        data: datos,
        backgroundColor: coloresSuaves,
        borderColor: coloresArray,
        borderWidth: 1.5,
        borderRadius: 12,
        borderSkipped: false,
        maxBarThickness: 44
      }]
    },
    options: {
      ...opcionesBase,
      plugins: {
        ...opcionesBase.plugins,
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              family: "Manrope",
              size: 12,
              weight: "600"
            }
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
            font: {
              family: "Manrope",
              size: 11
            }
          },
          grid: {
            color: "rgba(148, 163, 184, 0.2)",
            drawBorder: false
          }
        }
      }
    }
  });

  chartPastel = new Chart(ctxPastel, {
    type: "doughnut",
    data: {
      labels: ESTADOS_LISTA,
      datasets: [{
        data: datos,
        backgroundColor: coloresArray,
        borderColor: "#ffffff",
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      ...opcionesBase,
      aspectRatio: 2,
      cutout: "62%",
      plugins: {
        ...opcionesBase.plugins,
        legend: {
          ...opcionesBase.plugins.legend,
          position: "bottom"
        }
      }
    }
  });
}

// 🔥 TIEMPO REAL (se inicia solo tras autenticarse)
let unsubscribeDenuncias = null;

function iniciarEscucha() {
  if (unsubscribeDenuncias) return; // ya activo
  unsubscribeDenuncias = onSnapshot(collection(db, "denuncias"), (snapshot) => {
    denuncias = [];
    snapshot.forEach(doc => {
      denuncias.push({ id: doc.id, ...doc.data() });
    });
    cargarUsuariosYProvincias(); // recargar provincias y usuarios si cambian
    actualizarEstadisticas();
  });
}

// Función para aplicar filtros y actualizar estadísticas
let chartMunicipios = null;

function actualizarEstadisticas() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const usuarioFiltro = document.getElementById("usuarioFiltro").value;
  const estadoFiltro = document.getElementById("estadoFiltro").value;
  const provinciaFiltro = document.getElementById("provinciaFiltro").value;

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
    // Filtro estado
    if (estadoFiltro && d.estado !== estadoFiltro) incluir = false;
    // Filtro provincia
    if (provinciaFiltro && d.provincia !== provinciaFiltro) incluir = false;
    return incluir;
  });

  // Calcular KPIs
  let pendiente = 0;
  let proceso = 0;
  let resuelta = 0;
  let rechazada = 0;

  filtradas.forEach(d => {
    if (d.estado === ESTADOS.PENDIENTE) pendiente++;
    else if (d.estado === ESTADOS.EN_PROCESO) proceso++;
    else if (d.estado === ESTADOS.RESUELTA) resuelta++;
    else if (d.estado === ESTADOS.RECHAZADA) rechazada++;
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

  // Gráfico de denuncias por municipio
  const municipioConteo = {};
  filtradas.forEach(d => {
    if (d.municipio) municipioConteo[d.municipio] = (municipioConteo[d.municipio] || 0) + 1;
  });
  const municipios = Object.keys(municipioConteo);
  const valores = municipios.map(m => municipioConteo[m]);
  const ctxMunicipios = document.getElementById("graficoMunicipios")?.getContext("2d");
  if (ctxMunicipios) {
    if (chartMunicipios) {
      chartMunicipios.data.labels = municipios;
      chartMunicipios.data.datasets[0].data = valores;
      chartMunicipios.update();
    } else {
      chartMunicipios = new Chart(ctxMunicipios, {
        type: "bar",
        data: {
          labels: municipios,
          datasets: [{
            label: "",
            data: valores,
            backgroundColor: "#38bdf8",
            borderRadius: 10
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false },
            title: { display: false }
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 12 } } },
            y: { beginAtZero: true, ticks: { precision: 0, font: { size: 12 } } }
          }
        }
      });
    }
  }

  // Tendencias
  actualizarTendencias(filtradas);
}

// Función para actualizar gráfico de tendencias
function actualizarTendencias(filtradas) {
  // Agrupar por fecha (día)
  const agrupadas = {};
  filtradas.forEach((d) => {
    const fecha = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
    const dia = fecha.toISOString().split("T")[0];
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
    const dia = fecha.toISOString().split("T")[0];
    fechas.push(fecha.toLocaleDateString("es-DO", { day: "2-digit", month: "2-digit" }));
    datos.push(agrupadas[dia] || 0);
  }

  // Crear o actualizar gráfico
  const ctx = document.getElementById("graficoTendencias").getContext("2d");
  const gradiente = ctx.createLinearGradient(0, 0, 0, 280);
  gradiente.addColorStop(0, "rgba(14, 165, 233, 0.28)");
  gradiente.addColorStop(1, "rgba(14, 165, 233, 0.02)");

  const opcionesBase = crearOpcionesComunesGraficos();

  if (chartTendencias) {
    chartTendencias.data.labels = fechas;
    chartTendencias.data.datasets[0].data = datos;
    chartTendencias.data.datasets[0].backgroundColor = gradiente;
    chartTendencias.update();
  } else {
    chartTendencias = new Chart(ctx, {
      type: "line",
      data: {
        labels: fechas,
        datasets: [{
          label: "Denuncias por día",
          data: datos,
          borderColor: "#0284c7",
          backgroundColor: gradiente,
          pointBackgroundColor: "#0369a1",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.2,
          tension: 0.34,
          fill: true
        }]
      },
      options: {
        ...opcionesBase,
        plugins: {
          ...opcionesBase.plugins,
          legend: {
            ...opcionesBase.plugins.legend,
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxTicksLimit: 8,
              font: {
                family: "Manrope",
                size: 11
              }
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              font: {
                family: "Manrope",
                size: 11
              }
            },
            grid: {
              color: "rgba(148, 163, 184, 0.2)",
              drawBorder: false
            }
          }
        }
      }
    });
  }
}

// Exportar reporte PDF institucional
function exportarPDF() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const usuarioFiltro = document.getElementById("usuarioFiltro").value;

  let filtradas = denuncias.filter(d => {
    let incluir = true;
    if (fechaDesde) {
      const desde = new Date(fechaDesde);
      const fechaDenuncia = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia < desde) incluir = false;
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      const fechaDenuncia = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia > hasta) incluir = false;
    }
    if (usuarioFiltro && d.uid !== usuarioFiltro) incluir = false;
    return incluir;
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const fechaHoy = new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  // ── Cabecera ──
  doc.setFillColor(18, 48, 74);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("GECOM", 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Gestión Comunitaria — Reporte de Denuncias", 14, 20);
  doc.text(fechaHoy, pageW - 14, 20, { align: "right" });

  // ── KPIs resumen ──
  let pendiente = 0, proceso = 0, resuelta = 0, rechazada = 0;
  filtradas.forEach(d => {
    if (d.estado === "Pendiente") pendiente++;
    else if (d.estado === "En proceso") proceso++;
    else if (d.estado === "Resuelta") resuelta++;
    else if (d.estado === "Rechazada") rechazada++;
  });

  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Resumen", 14, 38);

  doc.autoTable({
    startY: 42,
    head: [["Total", "Pendientes", "En proceso", "Resueltas", "Rechazadas"]],
    body: [[filtradas.length, pendiente, proceso, resuelta, rechazada]],
    styles: { fontSize: 10, halign: "center" },
    headStyles: { fillColor: [18, 48, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      1: { textColor: [100, 116, 139] },
      2: { textColor: [180, 120, 0] },
      3: { textColor: [5, 150, 105] },
      4: { textColor: [220, 38, 38] }
    },
    margin: { left: 14, right: 14 }
  });

  // ── Filtros aplicados ──
  const filtroTexto = [
    fechaDesde ? `Desde: ${fechaDesde}` : null,
    fechaHasta ? `Hasta: ${fechaHasta}` : null,
    usuarioFiltro ? `Usuario: ${usuarios[usuarioFiltro] || usuarioFiltro}` : null
  ].filter(Boolean).join("   |   ") || "Sin filtros aplicados";

  const afterKpi = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Filtros: ${filtroTexto}`, 14, afterKpi);

  // ── Tabla de denuncias ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text("Detalle de denuncias", 14, afterKpi + 8);

  const rows = filtradas.map(d => {
    const fecha = d.fecha?.toDate ? d.fecha.toDate().toLocaleDateString("es-DO") : new Date(d.fecha).toLocaleDateString("es-DO");
    return [
      (d.titulo || "Sin título").slice(0, 40),
      d.provincia || "",
      d.municipio || "",
      d.estado || "Pendiente",
      fecha
    ];
  });

  doc.autoTable({
    startY: afterKpi + 12,
    head: [["Título", "Provincia", "Municipio", "Estado", "Fecha"]],
    body: rows,
    styles: { fontSize: 8.5, cellPadding: 2 },
    headStyles: { fillColor: [18, 48, 74], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: { 0: { cellWidth: 70 } },
    margin: { left: 14, right: 14 },
    didDrawPage(data) {
      // Pie de página
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`GECOM — Gestión Comunitaria`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    }
  });

  const nombreArchivo = `reporte_denuncias_${new Date().toISOString().split("T")[0]}.pdf`;

  // Vista previa
  const blobUrl = doc.output("bloburl");
  const iframe = document.getElementById("iframePreviaPDF");
  const btnDescargar = document.getElementById("btnConfirmarDescargaPDF");
  iframe.src = blobUrl;
  // Reemplazar listener para evitar duplicados
  const btnClone = btnDescargar.cloneNode(true);
  btnDescargar.parentNode.replaceChild(btnClone, btnDescargar);
  btnClone.addEventListener("click", () => { doc.save(nombreArchivo); });
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPreviaPDF")).show();
}

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  // Filtros en tiempo real
  document.querySelectorAll('.filtro-tiempo-real').forEach(el => {
    el.addEventListener('input', actualizarEstadisticas);
    el.addEventListener('change', actualizarEstadisticas);
  });
  document.getElementById("limpiarFiltros").addEventListener("click", () => {
    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";
    document.getElementById("usuarioFiltro").value = "";
    document.getElementById("estadoFiltro").value = "";
    document.getElementById("provinciaFiltro").value = "";
    actualizarEstadisticas();
  });
  document.getElementById("exportarPDF").addEventListener("click", exportarPDF);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await cargarUsuariosYProvincias();
      iniciarEscucha();
    }
  });

  // Mejorar visual de filtros y KPIs
  document.querySelectorAll('.app-main-content .card').forEach(card => {
    card.classList.add('border-0', 'shadow-sm', 'rounded-4');
  });
  document.querySelectorAll('.app-main-content .form-control').forEach(ctrl => {
    ctrl.classList.add('border-primary', 'rounded-pill', 'fw-semibold');
  });
  document.querySelectorAll('.app-main-content label').forEach(lbl => {
    lbl.classList.add('fw-bold', 'text-primary');
  });
});