import app from "./firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 REGISTRO
window.registrar = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;
    const comunidad = document.getElementById("comunidad").value;

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // 🔥 Guardar usuario en Firestore
    const userData = {
      email: email,
      rol: rol
    };

    // Agregar comunidad si es junta de vecinos
    if (rol === "junta") {
      userData.comunidad = comunidad;
    }

    await setDoc(doc(db, "usuarios", uid), userData);

    alert("Usuario registrado correctamente");

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";
    document.getElementById("comunidad").value = "";

  } catch (error) {
    console.error("ERROR:", error.message);
    alert(error.message);
  }
};

// 🔐 LOGIN
window.login = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const uid = userCredential.user.uid;

    // 🔍 Obtener rol desde Firestore
    const docSnap = await getDoc(doc(db, "usuarios", uid));

    if (!docSnap.exists()) {
      alert("Usuario sin rol asignado");
      return;
    }

    const rol = docSnap.data().rol;

    // 💾 Guardar sesión
    localStorage.setItem("uid", uid);
    localStorage.setItem("rol", rol);

    // limpiar campos
    document.getElementById("email").value = "";
    document.getElementById("password").value = "";

    // 🔁 Redirigir
    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("ERROR:", error.message);
    alert(error.message);
  }
};