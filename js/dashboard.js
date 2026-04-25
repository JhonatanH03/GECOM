const uid = localStorage.getItem("uid");
const rolLocal = localStorage.getItem("rol");

window.ir = function (ruta) {
  window.location.href = ruta;
};

window.logout = function () {
  localStorage.clear();
  window.location.href = "index.html";
};

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
  }

  if (rolLocal === "ayuntamiento") {
    document.getElementById("cardAyunt").style.display = "block";
  }
}