import app from "./firebase.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const auth = getAuth(app);
const db = getFirestore(app);

// 🔐 REGISTRO (CORRECTO)
window.registrar = async function () {
  try {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rol = document.getElementById("rol").value;

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const uid = userCredential.user.uid;

    // 🔥 Guardar en Firestore
    await setDoc(doc(db, "usuarios", uid), {
      email: email,
      rol: rol,
    });

    alert("Usuario registrado correctamente");
  } catch (error) {
    console.error("ERROR:", error.message);
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
      password,
    );
    const uid = userCredential.user.uid;

    const docSnap = await getDoc(doc(db, "usuarios", uid));
    const rol = docSnap.data().rol;

    localStorage.setItem("rol", rol);
    localStorage.setItem("uid", uid);
    window.location.href = "dashboard.html";
  } catch (error) {
    console.error("ERROR:", error.message);
  }
};
