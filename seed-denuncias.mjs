import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCoJ_1CWWVkPQsTTYby8nsUKAQrK1bY26I",
  authDomain: "gecom-a721e.firebaseapp.com",
  projectId: "gecom-a721e",
  storageBucket: "gecom-a721e.firebasestorage.app",
  messagingSenderId: "1058349745158",
  appId: "1:1058349745158:web:924e4b88bcc538598e2f87"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tipos = ["Infraestructura", "Salud", "Seguridad", "Medio Ambiente", "Servicios Públicos"];
const estados = ["Pendiente", "En proceso", "Resuelta", "Rechazada"];
const comunidades = ["Comunidad Norte", "Comunidad Sur", "Barrio Central", "Residencial Este", "Sector Oeste"];

const uid = "hdv4bdgSIeggCi1Zr6IR3Lpv5cp1"; // UID del ayuntamiento usado en pruebas

for (let i = 1; i <= 25; i++) {
  const diasAtras = Math.floor(Math.random() * 90);
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - diasAtras);

  const denuncia = {
    titulo: `Denuncia de prueba #${i}`,
    tipo: tipos[i % tipos.length],
    descripcion: `Esta es la descripción de la denuncia de prueba número ${i}. Fue generada para verificar la paginación del sistema GECOM.`,
    provincia: "Santiago",
    municipio: "Tamboril",
    sector: comunidades[i % comunidades.length],
    comunidad: comunidades[i % comunidades.length],
    estado: estados[i % estados.length],
    fecha: Timestamp.fromDate(fecha),
    fecha_incidente: Timestamp.fromDate(fecha),
    evidencia: "",
    uid,
    rol_creador: "junta",
    junta_id: uid,
  };

  await addDoc(collection(db, "denuncias"), denuncia);
  console.log(`✓ Denuncia #${i} creada`);
}

console.log("\n✅ 25 denuncias de prueba creadas correctamente.");
process.exit(0);
