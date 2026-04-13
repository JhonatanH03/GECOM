import app from "./firebase.js";

import {
getFirestore,
collection,
addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

window.crearDenuncia = async function () {
const titulo = document.getElementById("titulo").value;
const descripcion = document.getElementById("descripcion").value;

if (!titulo || !descripcion) {
document.getElementById("msg").innerText = "Todos los campos son obligatorios";
return;
}

try {
const docRef = await addDoc(collection(db, "denuncias"), {
titulo: titulo,
descripcion: descripcion,
estado: "Pendiente",
fecha: new Date()
});


document.getElementById("msg").innerText = "Denuncia guardada correctamente";

// Limpia el formulario (esto evita errores raros)
document.getElementById("titulo").value = "";
document.getElementById("descripcion").value = "";


} catch (error) {
console.error(error);
document.getElementById("msg").innerText = error.message;
}
};
