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

async function sincronizarLoginIndex({ uid, usuario, email, rol }) {
  const usuarioNormalizado = String(usuario || "").trim().toLowerCase();
  const correo = String(email || "").trim();
  if (!uid || !usuarioNormalizado || !correo || !rol) return;

  await db.collection("loginIndex").doc(usuarioNormalizado).set({
    uid,
    email: correo,
    rol,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
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
        usuario: data.usuario || ((data.email || data.correo || "").split("@")[0] || ""),
        userDoc: data,
        collectionMatched: col.nombre
      };
    }
  }

  return null;
}

async function buscarUsuarioPorIdentificador(usuarioNormalizado) {
  const docSnap = await db.collection("loginIndex").doc(usuarioNormalizado).get();
  if (!docSnap.exists) {
    return null;
  }

  const data = docSnap.data() || {};
  if (!data.email) return null;

  return {
    uid: data.uid,
    rol: data.rol,
    userEmail: data.email,
    collectionMatched: null
  };
}

// Limpieza de colecciones antiguas (solo admin)
window.limpiarFirebase = async function () {
  if (!confirm("¿Seguro que deseas borrar todas las colecciones antiguas y usuarios? Esta acción no se puede deshacer.")) return;
  const colecciones = ["provincias", "municipios", "sectores", "ayuntamientos", "juntas", "usuarios"];
  let total = 0;
  for (const col of colecciones) {
    const snapshot = await db.collection(col).get();
    for (const docu of snapshot.docs) {
      await docu.ref.delete();
      total++;
    }
  }
  mostrarExito(`Limpieza completada. Documentos eliminados: ${total}`);
};

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
    const email = document.getElementById("reg_email").value.trim();
    const password = document.getElementById("reg_password").value;
    const rol = document.getElementById("reg_rol").value;

    let userData = { usuario, email, rol };
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
        [userData.email, "Correo"],
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
        [userData.email, "Correo"],
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
        [userData.email, "Correo"],
        [userData.telefono, "Teléfono"]
      ].forEach(([val, label]) => { if (!val) camposFaltantes.push(label); });
    }

    if (!usuario || !email || !password || !rol) {
      mostrarError("Usuario, correo, contraseña y rol son obligatorios.");
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
      email,
      password
    );

    const uid = userCredential.user.uid;
    if (collectionName) {
      await db.collection(collectionName).doc(uid).set(userData);
      await sincronizarLoginIndex({ uid, usuario, email, rol });
    } else {
      throw new Error("Rol no válido");
    }

    mostrarExito("Usuario registrado correctamente");

    // limpiar campos
    [
      "reg_usuario","reg_email","reg_password",
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
      mensajeError = "Este correo ya está registrado";
    } else if (error.code === "auth/weak-password") {
      mensajeError = "La contraseña es muy débil";
    } else if (error.code === "auth/invalid-email") {
      mensajeError = "Correo inválido";
    }
    mostrarError(mensajeError);
  }
};

// LOGIN
window.login = async function () {
  try {
    const usuario = document.getElementById("usuario").value.trim();
    const usuarioNormalizado = usuario.toLowerCase();
    const password = document.getElementById("password").value;
    const pareceCorreo = usuario.includes("@");

    if (!usuario || !password) {
      mostrarError("Debes ingresar usuario y contraseña.");
      return;
    }

    // Autenticarse con el email encontrado
    try {
      let userCredential = null;
      let perfil = null;

      if (pareceCorreo) {
        userCredential = await auth.signInWithEmailAndPassword(usuario, password);
        perfil = await obtenerPerfilPorUid(userCredential.user.uid);
      } else {
        const resultadoBusqueda = await buscarUsuarioPorIdentificador(usuarioNormalizado);
        if (!resultadoBusqueda || !resultadoBusqueda.userEmail) {
          mostrarError("No se pudo resolver el usuario. Intenta iniciar con tu correo electrónico.");
          return;
        }

        userCredential = await auth.signInWithEmailAndPassword(resultadoBusqueda.userEmail, password);
        perfil = await obtenerPerfilPorUid(userCredential.user.uid);
      }

      if (!perfil) {
        await auth.signOut();
        mostrarError("Tu cuenta no tiene un perfil válido. Contacta al administrador.");
        return;
      }

      let { uid, rol, userDoc, collectionMatched } = perfil;
      const usuarioMigrado = perfil.usuario || (userCredential.user.email && userCredential.user.email.includes("@")
        ? userCredential.user.email.split("@")[0]
        : usuarioNormalizado);

      // Migración automática: si el documento no tenía usuario, se crea al iniciar sesión.
      if (collectionMatched && uid && !userDoc.usuario) {
        await db.collection(collectionMatched).doc(uid).set({ usuario: usuarioMigrado }, { merge: true });
        userDoc.usuario = usuarioMigrado;
      }

      await sincronizarLoginIndex({
        uid,
        usuario: userDoc.usuario || usuarioMigrado,
        email: userCredential.user.email || userDoc.email || userDoc.correo,
        rol
      });

      // Guardar sesión
      localStorage.setItem("uid", uid);
      localStorage.setItem("rol", rol);
      localStorage.setItem("usuario", userDoc.usuario || usuarioMigrado);
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
      } else if (authError.code === "auth/user-disabled") {
        mensaje = "Usuario deshabilitado";
      } else if (authError.code === "auth/too-many-requests") {
        mensaje = "Demasiados intentos. Intenta más tarde.";
      } else if (authError.code === "permission-denied" || authError.code === "failed-precondition") {
        mensaje = "El inicio de sesión por usuario está restringido. Usa tu correo electrónico.";
      } else if (authError.code === "not-found") {
        mensaje = "Usuario o correo no encontrado.";
      }
      mostrarError(mensaje);
    }
  } catch (error) {
    console.error("ERROR LOGIN:", error);
    mostrarError("Error al iniciar sesión. Por favor intenta de nuevo.");
  }
}
