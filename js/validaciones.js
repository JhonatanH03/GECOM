// validaciones.js - Funciones de validación y formato

// Validación en tiempo real de contraseña
export function initPasswordValidation() {
  document.getElementById("contrasena").addEventListener("input", function(e) {
    const password = e.target.value;
    const reqLength = document.getElementById("reqLength");
    const reqUpper = document.getElementById("reqUpper");
    const reqLower = document.getElementById("reqLower");
    const reqNumber = document.getElementById("reqNumber");

    // Al menos 6 caracteres
    if (password.length >= 6) {
      reqLength.className = "text-success";
      reqLength.innerHTML = "✓ Al menos 6 caracteres";
    } else {
      reqLength.className = "text-danger";
      reqLength.innerHTML = "✗ Al menos 6 caracteres";
    }

    // Al menos una mayúscula
    if (/[A-Z]/.test(password)) {
      reqUpper.className = "text-success";
      reqUpper.innerHTML = "✓ Una letra mayúscula";
    } else {
      reqUpper.className = "text-danger";
      reqUpper.innerHTML = "✗ Una letra mayúscula";
    }

    // Al menos una minúscula
    if (/[a-z]/.test(password)) {
      reqLower.className = "text-success";
      reqLower.innerHTML = "✓ Una letra minúscula";
    } else {
      reqLower.className = "text-danger";
      reqLower.innerHTML = "✗ Una letra minúscula";
    }

    // Al menos un número
    if (/\d/.test(password)) {
      reqNumber.className = "text-success";
      reqNumber.innerHTML = "✓ Un número";
    } else {
      reqNumber.className = "text-danger";
      reqNumber.innerHTML = "✗ Un número";
    }
  });
}

// Formato automático para cédula
export function initCedulaFormat() {
  document.getElementById("cedula").addEventListener("input", function(e) {
    let digits = e.target.value.replace(/\D/g, ''); // Solo dígitos
    if (digits.length > 11) digits = digits.slice(0, 11);
    let formatted = '';
    if (digits.length > 0) formatted += digits.slice(0, 3);
    if (digits.length > 3) formatted += '-' + digits.slice(3, 10);
    if (digits.length > 10) formatted += '-' + digits.slice(10);
    e.target.value = formatted;
  });
}

// Formato automático para teléfono
export function initTelefonoFormat() {
  document.getElementById("telefono").addEventListener("input", function(e) {
    let value = e.target.value.replace(/\D/g, ''); // Solo dígitos
    if (value.length > 13) value = value.slice(0, 13);
    if (value.length > 1) value = value.slice(0, 1) + '-' + value.slice(1);
    if (value.length > 5) value = value.slice(0, 5) + '-' + value.slice(5);
    if (value.length > 9) value = value.slice(0, 9) + '-' + value.slice(9);
    e.target.value = value;
  });
}

// Validar cédula
export function validarCedula(cedula) {
  const cedulaValida = /^\d{3}-\d{7}-\d{1}$/;
  return cedulaValida.test(cedula);
}

// Validar teléfono
export function validarTelefono(telefono) {
  const telefonoValido = /^1-\d{3}-\d{3}-\d{4}$/;
  return telefonoValido.test(telefono);
}