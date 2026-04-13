import app from "./firebase.js";

import {
getAuth,
signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const auth = getAuth(app);

window.login = async function () {
const email = document.getElementById("email").value;
const password = document.getElementById("password").value;

try {
await signInWithEmailAndPassword(auth, email, password);
window.location.href = "dashboard.html";
} catch (error) {
document.getElementById("error").innerText = error.message;
}
};
