import app from "./firebase.js";
import { ESTADOS, ESTADOS_LISTA, debounce } from "./constants.js";
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

let denuncias = [];
let usuarios = {};
let filtroActual = {
  fechaDesde: "",
  fechaHasta: "",
  usuarioFiltro: "",
  estadoFiltro: "",
  provinciaFiltro: "",
  municipioFiltro: "",
  busquedaTexto: ""
};

// Cargar usuarios y provincias
async function cargarUsuariosYProvincias() {
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
  
  const select = document.getElementById("usuarioFiltro");
  select.innerHTML = '<option value="">Todos</option>';
  Object.keys(usuarios).forEach(uid => {
    const u = usuarios[uid];
    const option = document.createElement("option");
    option.value = uid;
    option.text = `${u.nombre}${u.municipio ? " (" + u.municipio + ")" : ""}`;
    select.appendChild(option);
  });

  // Cargar provincias y municipios
  const provinciasSet = new Set();
  const municipiosSet = new Set();
  denuncias.forEach(d => {
    if (d.provincia) provinciasSet.add(d.provincia);
    if (d.municipio) municipiosSet.add(d.municipio);
  });
  
  const provinciaSelect = document.getElementById("provinciaFiltro");
  provinciaSelect.innerHTML = '<option value="">Todas</option>';
  Array.from(provinciasSet).sort().forEach(prov => {
    const option = document.createElement("option");
    option.value = prov;
    option.text = prov;
    provinciaSelect.appendChild(option);
  });

  const municipioSelect = document.getElementById("municipioFiltro");
  municipioSelect.innerHTML = '<option value="">Todos</option>';
  Array.from(municipiosSet).sort().forEach(mun => {
    const option = document.createElement("option");
    option.value = mun;
    option.text = mun;
    municipioSelect.appendChild(option);
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

let unsubscribeDenuncias = null;

function iniciarEscucha() {
  if (unsubscribeDenuncias) return;
  unsubscribeDenuncias = onSnapshot(collection(db, "denuncias"), (snapshot) => {
    denuncias = [];
    snapshot.forEach(doc => {
      denuncias.push({ id: doc.id, ...doc.data() });
    });
    cargarUsuariosYProvincias();
    actualizarEstadisticas();
  });
}

let chartMunicipios = null;

function actualizarEstadisticas() {
  const fechaDesde = document.getElementById("fechaDesde").value;
  const fechaHasta = document.getElementById("fechaHasta").value;
  const usuarioFiltro = document.getElementById("usuarioFiltro").value;
  const estadoFiltro = document.getElementById("estadoFiltro").value;
  const provinciaFiltro = document.getElementById("provinciaFiltro").value;
  const municipioFiltro = document.getElementById("municipioFiltro").value;
  const busquedaTexto = document.getElementById("busquedaTexto").value.toLowerCase();

  filtroActual = {
    fechaDesde,
    fechaHasta,
    usuarioFiltro,
    estadoFiltro,
    provinciaFiltro,
    municipioFiltro,
    busquedaTexto
  };

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
    if (estadoFiltro && d.estado !== estadoFiltro) incluir = false;
    if (provinciaFiltro && d.provincia !== provinciaFiltro) incluir = false;
    if (municipioFiltro && d.municipio !== municipioFiltro) incluir = false;
    
    if (busquedaTexto) {
      const titulo = (d.titulo || "").toLowerCase();
      const descripcion = (d.descripcion || "").toLowerCase();
      if (!titulo.includes(busquedaTexto) && !descripcion.includes(busquedaTexto)) {
        incluir = false;
      }
    }
    
    return incluir;
  });

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

  document.getElementById("pendiente").innerText = pendiente;
  document.getElementById("proceso").innerText = proceso;
  document.getElementById("resuelta").innerText = resuelta;
  document.getElementById("rechazada").innerText = rechazada;

  const datos = [pendiente, proceso, resuelta, rechazada];

  if (chartBarras && chartPastel) {
    chartBarras.data.datasets[0].data = datos;
    chartBarras.update();

    chartPastel.data.datasets[0].data = datos;
    chartPastel.update();
  } else {
    crearGraficos(datos);
  }

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

  actualizarTendencias(filtradas);
  actualizarIndicadoresFiltros();
}

function actualizarIndicadoresFiltros() {
  const filtrosActivos = [];
  
  if (filtroActual.fechaDesde) filtrosActivos.push(`Desde: ${filtroActual.fechaDesde}`);
  if (filtroActual.fechaHasta) filtrosActivos.push(`Hasta: ${filtroActual.fechaHasta}`);
  if (filtroActual.provinciaFiltro) filtrosActivos.push(`Provincia: ${filtroActual.provinciaFiltro}`);
  if (filtroActual.municipioFiltro) filtrosActivos.push(`Municipio: ${filtroActual.municipioFiltro}`);
  if (filtroActual.estadoFiltro) filtrosActivos.push(`Estado: ${filtroActual.estadoFiltro}`);
  if (filtroActual.usuarioFiltro) {
    const usuario = usuarios[filtroActual.usuarioFiltro];
    filtrosActivos.push(`Usuario: ${usuario?.nombre || filtroActual.usuarioFiltro}`);
  }
  if (filtroActual.busquedaTexto) filtrosActivos.push(`Búsqueda: "${filtroActual.busquedaTexto}"`);

  const chipsContainer = document.getElementById("filtrosActivosChips");
  const badgeContainer = document.getElementById("filtrosActivos");
  const conteoElement = document.getElementById("conteoFiltros");

  if (filtrosActivos.length > 0) {
    badgeContainer.style.display = "inline-block";
    conteoElement.textContent = filtrosActivos.length;
    
    chipsContainer.innerHTML = filtrosActivos.map((filtro, idx) => {
      return `<span class="badge bg-primary me-2 mb-2">
        ${filtro} <button type="button" class="btn-close btn-close-white ms-2" onclick="limpiarFiltroIndividual('${idx}')" style="font-size: 0.75rem;"></button>
      </span>`;
    }).join("");
    chipsContainer.style.display = "block";
  } else {
    badgeContainer.style.display = "none";
    chipsContainer.style.display = "none";
  }
}

// Presets de fechas
document.querySelectorAll(".preset-btn").forEach(btn => {
  btn.addEventListener("click", (e) => {
    const preset = e.target.dataset.preset;
    const hoy = new Date();
    let desde, hasta;

    switch(preset) {
      case "hoy":
        desde = new Date(hoy);
        hasta = new Date(hoy);
        break;
      case "semana":
        desde = new Date(hoy);
        desde.setDate(hoy.getDate() - hoy.getDay());
        hasta = new Date(hoy);
        break;
      case "mes":
        desde = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        hasta = new Date(hoy);
        break;
      case "30dias":
        desde = new Date(hoy);
        desde.setDate(hoy.getDate() - 30);
        hasta = new Date(hoy);
        break;
    }

    document.getElementById("fechaDesde").value = desde.toISOString().split("T")[0];
    document.getElementById("fechaHasta").value = hasta.toISOString().split("T")[0];
    actualizarEstadisticas();
  });
});

function actualizarTendencias(filtradas) {
  const agrupadas = {};
  filtradas.forEach((d) => {
    const fecha = d.fecha.toDate ? d.fecha.toDate() : new Date(d.fecha);
    const dia = fecha.toISOString().split("T")[0];
    if (!agrupadas[dia]) agrupadas[dia] = 0;
    agrupadas[dia]++;
  });

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

function exportarPDF() {
  let filtradas = denuncias.filter(d => {
    let incluir = true;
    if (filtroActual.fechaDesde) {
      const desde = new Date(filtroActual.fechaDesde);
      const fechaDenuncia = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia < desde) incluir = false;
    }
    if (filtroActual.fechaHasta) {
      const hasta = new Date(filtroActual.fechaHasta);
      hasta.setHours(23, 59, 59, 999);
      const fechaDenuncia = d.fecha?.toDate ? d.fecha.toDate() : new Date(d.fecha);
      if (fechaDenuncia > hasta) incluir = false;
    }
    if (filtroActual.usuarioFiltro && d.uid !== filtroActual.usuarioFiltro) incluir = false;
    return incluir;
  });

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const fechaHoy = new Date().toLocaleDateString("es-DO", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

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

  const filtroTexto = [
    filtroActual.fechaDesde ? `Desde: ${filtroActual.fechaDesde}` : null,
    filtroActual.fechaHasta ? `Hasta: ${filtroActual.fechaHasta}` : null,
    filtroActual.usuarioFiltro ? `Usuario: ${usuarios[filtroActual.usuarioFiltro]?.nombre || filtroActual.usuarioFiltro}` : null
  ].filter(Boolean).join("   |   ") || "Sin filtros aplicados";

  const afterKpi = doc.lastAutoTable.finalY + 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 100, 100);
  doc.text(`Filtros: ${filtroTexto}`, 14, afterKpi);

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
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`GECOM — Gestión Comunitaria`, 14, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Página ${data.pageNumber} de ${pageCount}`, pageW - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
    }
  });

  const nombreArchivo = `reporte_denuncias_${new Date().toISOString().split("T")[0]}.pdf`;

  const blobUrl = doc.output("bloburl");
  const iframe = document.getElementById("iframePreviaPDF");
  const btnDescargar = document.getElementById("btnConfirmarDescargaPDF");
  iframe.src = blobUrl;
  const btnClone = btnDescargar.cloneNode(true);
  btnDescargar.parentNode.replaceChild(btnClone, btnDescargar);
  btnClone.addEventListener("click", () => { doc.save(nombreArchivo); });
  bootstrap.Modal.getOrCreateInstance(document.getElementById("modalPreviaPDF")).show();
}

window.limpiarFiltroIndividual = function(idx) {
  const filtrosActivos = [];
  if (filtroActual.fechaDesde) filtrosActivos.push('fecha-desde');
  if (filtroActual.fechaHasta) filtrosActivos.push('fecha-hasta');
  if (filtroActual.provinciaFiltro) filtrosActivos.push('provincia');
  if (filtroActual.municipioFiltro) filtrosActivos.push('municipio');
  if (filtroActual.estadoFiltro) filtrosActivos.push('estado');
  if (filtroActual.usuarioFiltro) filtrosActivos.push('usuario');
  if (filtroActual.busquedaTexto) filtrosActivos.push('busqueda');

  const tipoFiltro = filtrosActivos[idx];
  
  switch(tipoFiltro) {
    case 'fecha-desde':
      document.getElementById("fechaDesde").value = "";
      break;
    case 'fecha-hasta':
      document.getElementById("fechaHasta").value = "";
      break;
    case 'provincia':
      document.getElementById("provinciaFiltro").value = "";
      break;
    case 'municipio':
      document.getElementById("municipioFiltro").value = "";
      break;
    case 'estado':
      document.getElementById("estadoFiltro").value = "";
      break;
    case 'usuario':
      document.getElementById("usuarioFiltro").value = "";
      break;
    case 'busqueda':
      document.getElementById("busquedaTexto").value = "";
      break;
  }
  
  actualizarEstadisticas();
};

// Inicializar
document.addEventListener("DOMContentLoaded", () => {
  const debouncedActualizar = debounce(actualizarEstadisticas, 300);

  document.querySelectorAll('.filtro-tiempo-real').forEach(el => {
    el.addEventListener('input', debouncedActualizar);
    el.addEventListener('change', debouncedActualizar);
  });

  document.getElementById("limpiarFiltros").addEventListener("click", () => {
    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";
    document.getElementById("usuarioFiltro").value = "";
    document.getElementById("estadoFiltro").value = "";
    document.getElementById("provinciaFiltro").value = "";
    document.getElementById("municipioFiltro").value = "";
    document.getElementById("busquedaTexto").value = "";
    actualizarEstadisticas();
  });

  document.getElementById("limpiarFechas").addEventListener("click", () => {
    document.getElementById("fechaDesde").value = "";
    document.getElementById("fechaHasta").value = "";
    actualizarEstadisticas();
  });

  document.getElementById("limpiarBusqueda").addEventListener("click", () => {
    document.getElementById("busquedaTexto").value = "";
    actualizarEstadisticas();
  });

  document.getElementById("exportarPDF").addEventListener("click", exportarPDF);

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await cargarUsuariosYProvincias();
      iniciarEscucha();
    }
  });

  document.querySelectorAll('.app-main-content .card').forEach(card => {
    card.classList.add('border-0', 'shadow-sm', 'rounded-4');
  });
  document.querySelectorAll('.app-main-content .form-control').forEach(ctrl => {
    ctrl.classList.add('border-primary', 'rounded-pill', 'fw-semibold');
  });
  document.querySelectorAll('.app-main-content .form-select').forEach(ctrl => {
    ctrl.classList.add('border-primary', 'rounded-2', 'fw-semibold');
  });
  document.querySelectorAll('.app-main-content label').forEach(lbl => {
    lbl.classList.add('fw-bold', 'text-primary');
  });
});
