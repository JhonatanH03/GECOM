import app from "./firebase.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

// 🔐 USUARIO (AJUSTA ESTO A AUTH REAL DESPUÉS)
const usuarioId = localStorage.getItem("uid");

let listaDenuncias;
let selectFiltroEstado;
let btnNuevaDenuncia;

// ===============================
// 📥 CARGAR DENUNCIAS
// ===============================
function cargarDenuncias() {
  if (!usuarioId) {
    listaDenuncias.innerHTML = `
      <div class="text-center text-warning mt-4">
        Debes iniciar sesión para ver tus denuncias.
      </div>
    `;
    return;
  }

  const ref = collection(db, "denuncias");
  const q = query(ref, where("uid", "==", usuarioId));

  onSnapshot(q, (snapshot) => {
    console.log("Denuncias encontradas:", snapshot.size);

    listaDenuncias.innerHTML = "";

    if (snapshot.empty) {
      listaDenuncias.innerHTML = `
        <div class="text-center text-muted mt-4">
          No tienes denuncias registradas.
        </div>
      `;
      return;
    }

    const docs = [];
    snapshot.forEach((docSnap) => docs.push({ id: docSnap.id, ...docSnap.data() }));

    docs.sort((a, b) => {
      const fechaA = a.fecha?.toDate ? a.fecha.toDate().getTime() : 0;
      const fechaB = b.fecha?.toDate ? b.fecha.toDate().getTime() : 0;
      return fechaB - fechaA;
    });

    docs.forEach((d) => {
      const fecha = d.fecha?.toDate
        ? d.fecha.toDate().toLocaleDateString()
        : "Sin fecha";

      const estado = (d.estado || "Pendiente").trim();
      const estadoClass =
        estado === "Pendiente" ? "estado-pendiente" :
        estado === "En proceso" ? "estado-proceso" :
        estado === "Resuelta" ? "estado-resuelta" :
        "estado-rechazada";

      const card = document.createElement("div");
      card.className = "denuncia-card";
      card.setAttribute("data-id", d.id);
      card.setAttribute("data-estado", estado);

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <div class="titulo-denuncia">${d.titulo || "Sin título"}</div>
            <div class="fecha-denuncia">${fecha}</div>
            <div class="descripcion-denuncia">${d.descripcion || ""}</div>
          </div>
          <span class="estado-badge ${estadoClass}">${estado}</span>
        </div>
      `;

      card.addEventListener("click", () => {
        window.location.href = `detalle_denuncia.html?id=${d.id}`;
      });

      listaDenuncias.appendChild(card);
    });

    aplicarFiltroEstado();

  }, (error) => {
    console.error("Error en Firestore:", error);
    listaDenuncias.innerHTML = `
      <div class="text-danger text-center mt-4">
        Error cargando denuncias: ${error.message}
      </div>
    `;
  });
}

// ===============================
// ➕ CREAR DENUNCIA
// ===============================
window.nuevaDenuncia = async function () {
  const titulo = prompt("Título de la denuncia:");
  if (!titulo) return;

  const descripcion = prompt("Descripción:");
  if (!descripcion) return;

  try {
    await addDoc(collection(db, "denuncias"), {
      titulo,
      descripcion,
      estado: "Pendiente",
      uid: usuarioId,
      fecha: serverTimestamp()
    });
    alert("Denuncia creada correctamente");
  } catch (error) {
    console.error("Error creando denuncia:", error);
    alert("Error al crear denuncia");
  }
};

// ===============================
// 🔍 FILTRO POR ESTADO
// ===============================
function aplicarFiltroEstado() {
  const filtro = selectFiltroEstado.value.toLowerCase();
  const cards = document.querySelectorAll(".denuncia-card");

  cards.forEach(card => {
    const estado = card.querySelector(".estado-badge").textContent.toLowerCase();
    card.style.display = !filtro || estado === filtro ? "block" : "none";
  });
}

// ===============================
// 🚀 INIT
// ===============================
document.addEventListener("DOMContentLoaded", () => {
  listaDenuncias = document.getElementById("listaDenuncias");
  selectFiltroEstado = document.getElementById("filtroEstado");
  btnNuevaDenuncia = document.getElementById("btnNuevaDenuncia");

  if (selectFiltroEstado) {
    selectFiltroEstado.addEventListener("change", aplicarFiltroEstado);
  }
  if (btnNuevaDenuncia) {
    btnNuevaDenuncia.addEventListener("click", window.nuevaDenuncia);
  }

  cargarDenuncias();
});