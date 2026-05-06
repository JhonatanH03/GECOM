const rol = localStorage.getItem("rol");

if (!rol) {
  window.location.href = "index.html";
}

if (rol === "admin") {
  document.getElementById("cardAdmin").style.display = "block";
}

// 🔁 Navegación
window.ir = function (ruta) {
  window.location.href = ruta;
};

window.logout = function () {
  localStorage.clear();
  window.location.href = "index.html";
};