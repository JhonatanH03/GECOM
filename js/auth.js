// Funciones para mostrar mensajes de éxito y error en el login
function mostrarExito(mensaje) {
  let alert = document.createElement('div');
  alert.className = 'alert alert-success alert-dismissible fade show';
  alert.role = 'alert';
  alert.innerHTML = `<strong>${mensaje}</strong><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const container = document.querySelector('.card') || document.body;
  container.prepend(alert);
  setTimeout(() => { alert.remove(); }, 3000);
}

function mostrarError(mensaje) {
  let alert = document.createElement('div');
  alert.className = 'alert alert-danger alert-dismissible fade show';
  alert.role = 'alert';
  alert.innerHTML = `<strong>${mensaje}</strong><button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
  const container = document.querySelector('.card') || document.body;
  container.prepend(alert);
  setTimeout(() => { alert.remove(); }, 4000);
}

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCoJ_1CWWVkPQsTTYby8nsUKAQrK1bY26I",
  authDomain: "gecom-a721e.firebaseapp.com",
  projectId: "gecom-a721e",
  storageBucket: "gecom-a721e.firebasestorage.app",
  messagingSenderId: "1058349745158",
  appId: "1:1058349745158:web:924e4b88bcc538598e2f87"
};

const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(app);
const db = firebase.firestore(app);

function normalizarUsuario(usuario) {
  return String(usuario || "").trim().toLowerCase();
}

function usuarioAEmailInterno(usuario) {
  return normalizarUsuario(usuario).replace(/[^a-z0-9_]/g, '') + '@gecom.internal';
}

function usuarioInternoValido(usuario) {
  return normalizarUsuario(usuario).replace(/[^a-z0-9_]/g, '').length > 0;
}

async function obtenerPerfilPorUid(uid) {
  const colecciones = [
    { nombre: "Administradores", rol: "admin" },
    { nombre: "Ayuntamientos", rol: "ayuntamiento" },
    { nombre: "JuntasDeVecinos", rol: "junta" }
  ];

  for (const col of colecciones) {
    const docSnap = await db.collection(col.nombre).doc(uid).get();
    if (docSnap.exists) {
      const data = docSnap.data() || {};
      return {
        uid,
        rol: data.rol || col.rol,
        usuario: data.usuario || "",
        userDoc: data,
        collectionMatched: col.nombre
      };
    }
  }

  return null;
}

// Limpieza de colecciones antiguas (solo admin, acceso restringido)
async function limpiarFirebase() {
  if (!confirm("¿Seguro que deseas borrar todas las colecciones antiguas? Esta acción no se puede deshacer.")) return;
  const colecciones = ["provincias", "municipios", "sectores", "ayuntamientos", "juntas"];
  let total = 0;
  for (const col of colecciones) {
    const snapshot = await db.collection(col).get();
    for (const docu of snapshot.docs) {
      await docu.ref.delete();
      total++;
    }
  }
  mostrarExito(`Limpieza completada. Documentos eliminados: ${total}`);
}

// Permitir login con ENTER desde el campo de contraseña
document.addEventListener("DOMContentLoaded", function () {
  const passwordInput = document.getElementById("password");
  if (passwordInput) {
    passwordInput.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        login();
      }
    });
  }
});


// El registro normal queda deshabilitado en el login

// Registro desde el panel de admin
window.registrarDesdeAdmin = async function () {
  try {
    const usuario = document.getElementById("reg_usuario").value.trim();
    const emailInterno = usuarioAEmailInterno(usuario);
    const password = document.getElementById("reg_password").value;
    const rol = document.getElementById("reg_rol").value;

    let userData = { usuario, rol };
    let collectionName = "";
    let camposFaltantes = [];

    if (rol === "junta") {
      // JuntasDeVecinos
      collectionName = "JuntasDeVecinos";
      userData.nombre = document.getElementById("reg_nombreJunta")?.value.trim() || "";
      userData.comunidad = document.getElementById("reg_comunidad")?.value.trim() || "";
      userData.telefono = document.getElementById("reg_telefonoJunta")?.value.trim() || "";
      userData.creadoEn = new Date();
      // Validar campos obligatorios
      [
        [userData.usuario, "Usuario"],
        [userData.nombre, "Nombre de la Junta"],
        [userData.comunidad, "Comunidad"],
        [userData.telefono, "Teléfono"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    } else if (rol === "ayuntamiento") {
      // Ayuntamientos
      collectionName = "Ayuntamientos";
      userData.nombre = document.getElementById("reg_nombreAyuntamiento")?.value.trim() || "";
      userData.telefono = document.getElementById("reg_telefonoAyuntamiento")?.value.trim() || "";
      userData.direccion = document.getElementById("reg_direccionAyuntamiento")?.value.trim() || "";
      userData.municipio = document.getElementById("reg_municipioAyuntamiento")?.value.trim() || "";
      userData.provincia = document.getElementById("reg_provinciaAyuntamiento")?.value.trim() || "";
      userData.creadoEn = new Date();
      [
        [userData.usuario, "Usuario"],
        [userData.nombre, "Nombre del Ayuntamiento"],
        [userData.telefono, "Teléfono"],
        [userData.direccion, "Dirección"],
        [userData.municipio, "Municipio"],
        [userData.provincia, "Provincia"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    } else if (rol === "admin") {
      // Administradores
      collectionName = "Administradores";
      userData.nombre = document.getElementById("reg_nombreAdmin")?.value.trim() || "";
      userData.telefono = document.getElementById("reg_telefonoAdmin")?.value.trim() || "";
      userData.creadoEn = new Date();
      [
        [userData.usuario, "Usuario"],
        [userData.nombre, "Nombre"],
        [userData.telefono, "Teléfono"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    }

    if (!usuario || !password || !rol) {
      mostrarError("Usuario, contraseña y rol son obligatorios.");
      return;
    }
    if (!usuarioInternoValido(usuario)) {
      mostrarError("El usuario solo puede contener letras, números y guion bajo (_).");
      return;
    }
    if (camposFaltantes.length > 0) {
      mostrarError("Faltan campos obligatorios: " + camposFaltantes.join(", "));

      return;
    }

    const usuarioNormalizado = usuario.toLowerCase();
    const existentes = await db.collection(collectionName).get();
    const usuarioDuplicado = existentes.docs.some((docSnap) => {
      const data = docSnap.data() || {};
      const rolDoc = (data.rol || rol).toLowerCase();
      const usuarioDoc = (data.usuario || "").toLowerCase();
      return rolDoc === rol.toLowerCase() && usuarioDoc === usuarioNormalizado;
    });
    if (usuarioDuplicado) {
      mostrarError("Ya existe un usuario con ese nombre y ese rol.");
      return;
    }

    const userCredential = await auth.createUserWithEmailAndPassword(
      emailInterno,
      password
    );

    const uid = userCredential.user.uid;
    if (collectionName) {
      await db.collection(collectionName).doc(uid).set(userData);
      await db.collection("loginIndex").doc(usuarioNormalizado).set({
        uid,
        email,
        rol,
        updatedAt: new Date()
      });
    } else {
      throw new Error("Rol no válido");
    }

    mostrarExito("Usuario registrado correctamente");

    // limpiar campos
    [
      "reg_usuario","reg_password",
      "reg_nombreJunta","reg_comunidad","reg_telefonoJunta",
      "reg_nombreAyuntamiento","reg_telefonoAyuntamiento","reg_direccionAyuntamiento","reg_municipioAyuntamiento","reg_provinciaAyuntamiento",
      "reg_nombreAdmin","reg_telefonoAdmin"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalRegistro'));
    modal.hide();

  } catch (error) {
    console.error("ERROR:", error.message);
    let mensajeError = "Error en el registro";
    if (error.code === "auth/email-already-in-use") {
      mensajeError = "El usuario ya existe en el sistema";
    } else if (error.code === "auth/weak-password") {
      mensajeError = "La contraseña es muy débil";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "Usuario inválido";
    }
    mostrarError(mensajeError);
  }
};

// LOGIN
window.login = async function () {
  try {
    const usuario = document.getElementById("usuario").value.trim();
    const usuarioNormalizado = normalizarUsuario(usuario);
    const password = document.getElementById("password").value;

    if (!usuario || !password) {
      mostrarError("Debes ingresar usuario y contraseña.");
      return;
    }
    if (!usuarioInternoValido(usuario)) {
      mostrarError("Usuario no válido.");
      return;
    }

    // Buscar y probar emails candidatos en orden de probabilidad.
    // Esto evita fallos cuando loginIndex no existe o cuando el usuario escribe su correo directamente.
    try {
      const emailsCandidatos = [];
      const agregarEmail = (email) => {
        const normalizado = (email || "").trim().toLowerCase();
        if (!normalizado) return;
        if (!emailsCandidatos.includes(normalizado)) {
          emailsCandidatos.push(normalizado);
        }
      };

      // Si el usuario escribió un correo, usarlo como primera opción
      if (usuarioNormalizado.includes("@")) {
        agregarEmail(usuarioNormalizado);
      }

      // Si hay índice de login, priorizar ese correo
      const loginDoc = await db.collection("loginIndex").doc(usuarioNormalizado).get();
      if (loginDoc.exists) {
        agregarEmail(loginDoc.data().email || null);
      }

      // Fallback para usuarios legacy por nombre de usuario
      if (!usuarioNormalizado.includes("@")) {
        agregarEmail(usuarioNormalizado.replace(/[^a-z0-9_]/g, '') + '@gecom.internal');
      }

      let userCredential = null;
      let ultimoError = null;

      for (const email of emailsCandidatos) {
        try {
          userCredential = await auth.signInWithEmailAndPassword(email, password);
          break;
        } catch (err) {
          // Probar siguiente email solo cuando el error indica credenciales inválidas
          if (err?.code === "auth/invalid-credential" || err?.code === "auth/user-not-found" || err?.code === "auth/wrong-password") {
            ultimoError = err;
            continue;
          }
          throw err;
        }
      }

      if (!userCredential) {
        throw (ultimoError || new Error("No fue posible autenticar con los emails candidatos."));
      }

      const perfil = await obtenerPerfilPorUid(userCredential.user.uid);

      if (!perfil) {
        await auth.signOut();
        mostrarError("Tu cuenta no tiene un perfil válido. Contacta al administrador.");
        return;
      }

      const { uid, rol, userDoc } = perfil;

      // Guardar sesión
      localStorage.setItem("uid", uid);
      localStorage.setItem("rol", rol);
      localStorage.setItem("usuario", userDoc.usuario || usuarioNormalizado);
      localStorage.setItem("primerLogin", userDoc.primerLogin ? "true" : "false");

      // limpiar campos
      document.getElementById("usuario").value = "";
      document.getElementById("password").value = "";

      mostrarExito("Inicio de sesión exitoso. Redirigiendo...");
      
      // Si es primer login, redirigir a cambiar contraseña
      if (userDoc.primerLogin) {
        setTimeout(() => {
          window.location.href = "cambiar-contrasena.html?v=3";
        }, 800);
      } else {
        setTimeout(() => {
          window.location.href = "dashboard.html?v=3";
        }, 800);
      }
    } catch (authError) {
      console.error("Error de autenticación:", authError.code);
      let mensaje = "Contraseña incorrecta";
      if (authError.code === "auth/wrong-password") {
        mensaje = "Contraseña incorrecta";
      } else if (authError.code === "auth/user-not-found" || authError.code === "auth/invalid-email") {
        mensaje = "Usuario no encontrado.";
      } else if (authError.code === "auth/user-disabled") {
        mensaje = "Usuario deshabilitado";
      } else if (authError.code === "auth/too-many-requests") {
        mensaje = "Demasiados intentos. Intenta más tarde.";
      } else if (authError.code === "auth/user-not-found") {
        mensaje = "Usuario no encontrado.";
      } else if (authError.code === "auth/internal-error" || authError.code === "auth/invalid-credential") {
        mensaje = "Usuario o contraseña incorrectos.";
      }
      mostrarError(mensaje);
    }
  } catch (error) {
    console.error("ERROR LOGIN:", error);
    mostrarError("Error al iniciar sesión. Por favor intenta de nuevo.");
  }
}
