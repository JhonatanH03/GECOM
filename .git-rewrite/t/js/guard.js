const rol = localStorage.getItem("rol");

if (!rol) {
  window.location.href = "index.html";
}