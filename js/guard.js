(function() {
  // Ocultar el contenido inmediatamente
  document.documentElement.style.display = 'none';
  
  const rol = localStorage.getItem("rol");
  const uid = localStorage.getItem("uid");
  
  // Si hay autenticación válida, mostrar la página
  if (rol && uid) {
    document.documentElement.style.display = 'block';
  } else {
    // Si no hay autenticación, redirigir a login
    window.location.replace("index.html");
  }
})();