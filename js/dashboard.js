import app from "./firebase.js";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");
const db = getFirestore(app);
const auth = getAuth(app);

window.ir = function (ruta) {
  window.location.href = ruta;
};

window.logout = function () {
  localStorage.clear();
  window.location.href = "index.html";
};

function convertirAFecha(valorFecha) {
  if (!valorFecha) return null;
  if (typeof valorFecha.toDate === "function") return valorFecha.toDate();
  if (typeof valorFecha.seconds === "number") return new Date(valorFecha.seconds * 1000);

  const fecha = new Date(valorFecha);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function renderizarNotificaciones(items) {
  const wrap = document.getElementById("notificacionesWrap");
  const badge = document.getElementById("badgeNotificaciones");
  const lista = document.getElementById("listaNotificaciones");
  if (!wrap || !badge || !lista) return;

  wrap.style.display = "block";

  const sinLeer = items.filter((item) => !item.leida).length;
  badge.textContent = String(sinLeer);
  badge.style.display = sinLeer > 0 ? "inline-block" : "none";

  if (!items.length) {
    lista.innerHTML = '<li class="dropdown-item-text text-muted">No tienes notificaciones.</li>';
    return;
  }

  lista.innerHTML = "";
  items.forEach((item) => {
    const li = document.createElement("li");
    const fecha = convertirAFecha(item.createdAt);
    const fechaTexto = fecha ? fecha.toLocaleString() : "Sin fecha";
    li.innerHTML = `
      <div class="d-flex align-items-start px-3 py-2 gap-2">
        <button class="dropdown-item p-0 flex-grow-1 text-start ${item.leida ? "" : "fw-semibold"}" data-id="${item.id}" type="button">
          <div class="small text-muted">${fechaTexto}</div>
          <div>${item.mensaje || "Tienes una nueva notificación."}</div>
        </button>
        <button class="btn btn-link text-danger p-0 flex-shrink-0 small notif-delete" data-id="${item.id}" title="Eliminar" type="button">✕</button>
      </div>
    `;
    lista.appendChild(li);
  });

  lista.querySelectorAll("button[data-id]:not(.notif-delete)").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const item = items.find((n) => n.id === id);
      if (!item) return;

      if (!item.leida) {
        try {
          await updateDoc(doc(db, "notificaciones", id), {
            leida: true,
            leidaAt: serverTimestamp()
          });
        } catch (error) {
          console.error("No se pudo marcar la notificación como leída:", error);
        }
      }

      if (item.denunciaId) {
        window.location.href = `ver.html?denuncia=${encodeURIComponent(item.denunciaId)}`;
      }
    });
  });

  lista.querySelectorAll("button.notif-delete").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("modalEliminarNotif"));
      const confirmar = document.getElementById("btnConfirmarEliminarNotif");

      // Reemplazar listener previo para evitar acumulación
      const nuevoConfirmar = confirmar.cloneNode(true);
      confirmar.parentNode.replaceChild(nuevoConfirmar, confirmar);

      nuevoConfirmar.addEventListener("click", async () => {
        modal.hide();
        try {
          await deleteDoc(doc(db, "notificaciones", id));
        } catch (error) {
          console.error("No se pudo eliminar la notificación:", error);
        }
      });

      modal.show();
    });
  });
}

function iniciarSuscripcionNotificaciones() {
  if (!uid || rolLocal !== "junta") return;

  const q = query(collection(db, "notificaciones"), where("receptorUid", "==", uid));
  onSnapshot(q, (snap) => {
    const items = snap.docs
      .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() || {}) }))
      .sort((a, b) => {
        const fa = convertirAFecha(a.createdAt)?.getTime() || 0;
        const fb = convertirAFecha(b.createdAt)?.getTime() || 0;
        return fb - fa;
      })
      .slice(0, 20);

    renderizarNotificaciones(items);
  }, (error) => {
    console.error("Error cargando notificaciones:", error);
  });
}

if (!uid || !rolLocal) {
  window.location.href = "index.html";
} else {
  document.getElementById("cardVerDenuncias").style.display = "block";

  if (rolLocal === "admin") {
    document.getElementById("cardAdmin").style.display = "block";
    document.getElementById("cardAdminAyunt").style.display = "block";
    document.getElementById("cardAdminUsuarios").style.display = "block";
  }

  if (rolLocal === "junta") {
    document.getElementById("cardCrearDenuncia").style.display = "block";
    document.getElementById("cardHistorial").style.display = "block";
  }

  if (rolLocal === "ayuntamiento") {
    document.getElementById("cardAyunt").style.display = "block";
  }

  // Esperar a que Firebase Auth restaure la sesión antes de iniciar el listener
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === uid) {
      iniciarSuscripcionNotificaciones();
    }
  });
}