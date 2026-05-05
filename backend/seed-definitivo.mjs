/**
 * GECOM – Seed de datos definitivos para presentación de tesis
 *
 * Modo simulación (solo muestra lo que haría):
 *   node seed-definitivo.mjs
 *
 * Modo aplicar (ejecuta todos los cambios):
 *   node seed-definitivo.mjs --aplicar
 *
 * ADVERTENCIA: Con --aplicar se eliminan TODOS los datos existentes
 * de Ayuntamientos, JuntasDeVecinos, denuncias y Administradores,
 * y se reemplazan con los datos definitivos definidos en este script.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const SA_PATH    = path.join(__dirname, "serviceAccountKey.json");
const APLICAR    = process.argv.includes("--aplicar");
const PASS_TEMP  = "Gecom2026";    // contraseña temporal para todas las cuentas nuevas
const CLOUDINARY_CLOUD_NAME  = "dsdmryjnv";
const CLOUDINARY_UPLOAD_PRESET = "evidencias";

// Sube una imagen (URL pública) a Cloudinary y devuelve la secure_url
async function subirACloudinary(imageUrl) {
  const formData = new FormData();
  formData.append("file", imageUrl);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${txt}`);
  }

  const json = await res.json();
  return json.secure_url;
}
// ─────────────────────────────────────────────────────────────────────────────
//  Utilidades
// ─────────────────────────────────────────────────────────────────────────────
function emailInterno(usuario) {
  return usuario.toLowerCase().replace(/[^a-z0-9_]/g, "") + "@gecom.internal";
}

function log(msg)  { console.log(msg); }
function info(msg) { console.log("  →", msg); }
function ok(msg)   { console.log("  ✓", msg); }
function warn(msg) { console.log("  ⚠", msg); }

function initAdmin() {
  if (admin.apps.length) return;
  const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

// Borra todos los docs de una colección + sus cuentas Auth (si aplica)
async function limpiarColeccion(db, auth, coleccion, borrarAuth = true) {
  const snap = await db.collection(coleccion).get();
  if (snap.empty) { info(`${coleccion}: vacía, nada que borrar.`); return; }

  for (const d of snap.docs) {
    if (APLICAR) {
      if (borrarAuth) {
        try { await auth.deleteUser(d.id); } catch (_) { /* puede que ya no exista */ }
      }
      await d.ref.delete();
    }
    ok(`Eliminado ${coleccion}/${d.id} ${borrarAuth ? "(+ Auth)" : ""}`);
  }
}

// Borra todos los docs de denuncias
async function limpiarDenuncias(db) {
  const snap = await db.collection("denuncias").get();
  if (snap.empty) { info("denuncias: vacía, nada que borrar."); return; }
  const BATCH = 400;
  for (let i = 0; i < snap.docs.length; i += BATCH) {
    const batch = db.batch();
    snap.docs.slice(i, i + BATCH).forEach(d => batch.delete(d.ref));
    if (APLICAR) await batch.commit();
    ok(`Eliminadas ${Math.min(i + BATCH, snap.docs.length)} denuncias...`);
  }
}

// Crea un usuario Auth + doc Firestore; devuelve el UID
async function crearUsuario(auth, db, coleccion, datos) {
  const em = emailInterno(datos.usuario);
  if (!APLICAR) {
    info(`[SIMULACIÓN] Crearía ${coleccion}: ${datos.nombre} (${em})`);
    return `uid_simulado_${datos.usuario}`;
  }
  const authUser = await auth.createUser({ email: em, password: PASS_TEMP, displayName: datos.nombre });
  const uid = authUser.uid;
  await db.collection(coleccion).doc(uid).set({ ...datos, uid });
  ok(`Creado ${coleccion}: ${datos.nombre} | usuario: ${datos.usuario} | uid: ${uid}`);
  return uid;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Datos definitivos
// ─────────────────────────────────────────────────────────────────────────────

const ADMINS = [
  { nombre: "Jhonatan TI", usuario: "jhonatan_admin", rol: "admin", estado: true },
  { nombre: "Joshua TI",   usuario: "joshua_admin",   rol: "admin", estado: true },
];

const AYUNTAMIENTOS = [
  {
    nombre:    "Ayuntamiento Municipal de Santiago",
    usuario:   "ayto_santiago",
    telefono:  "1-809-582-1000",
    direccion: "Av. Las Carreras esq. Calle del Sol, Santiago de los Caballeros",
    provincia: "Santiago",
    municipio: "Santiago de los Caballeros",
    rol:       "ayuntamiento",
    estado:    true,
  },
  {
    nombre:    "Ayuntamiento Municipal de La Vega",
    usuario:   "ayto_lavega",
    telefono:  "1-809-573-2200",
    direccion: "Calle Restauración No. 12, Concepción de La Vega",
    provincia: "La Vega",
    municipio: "Concepción de La Vega",
    rol:       "ayuntamiento",
    estado:    true,
  },
];

const JUNTAS = [
  // ── Santiago · Santiago de los Caballeros ──────────────────────────────────
  {
    nombre:          "Junta de Vecinos Los Jardines del Norte",
    usuario:         "jvl_jardines",
    nombreEncargado: "José Alberto Pérez",
    cedula:          "031-0145678-9",
    telefono:        "1-809-583-4412",
    provincia:       "Santiago",
    municipio:       "Santiago de los Caballeros",
    sector:          "Los Jardines del Norte",
    comunidad:       "Los Jardines del Norte",
    rol:             "junta",
    estado:          true,
  },
  {
    nombre:          "Junta de Vecinos Villa Olímpica",
    usuario:         "jvl_olimpica",
    nombreEncargado: "Luisa Fernanda Torres",
    cedula:          "031-0287654-3",
    telefono:        "1-809-971-8823",
    provincia:       "Santiago",
    municipio:       "Santiago de los Caballeros",
    sector:          "Villa Olímpica",
    comunidad:       "Villa Olímpica",
    rol:             "junta",
    estado:          true,
  },
  // ── Santiago · Tamboril ───────────────────────────────────────────────────
  {
    nombre:          "Junta de Vecinos Centro de Tamboril",
    usuario:         "jvl_tamboril",
    nombreEncargado: "Ramón Emilio Díaz",
    cedula:          "031-0312456-7",
    telefono:        "1-809-580-1100",
    provincia:       "Santiago",
    municipio:       "Tamboril",
    sector:          "Centro Urbano",
    comunidad:       "Centro Urbano",
    rol:             "junta",
    estado:          true,
  },
  {
    nombre:          "Junta de Vecinos Los Almendros",
    usuario:         "jvl_almendros",
    nombreEncargado: "Yolanda Marte Castillo",
    cedula:          "031-0423187-5",
    telefono:        "1-809-580-2247",
    provincia:       "Santiago",
    municipio:       "Tamboril",
    sector:          "Los Almendros",
    comunidad:       "Los Almendros",
    rol:             "junta",
    estado:          true,
  },
  // ── La Vega · Concepción de La Vega ───────────────────────────────────────
  {
    nombre:          "Junta de Vecinos La Primavera",
    usuario:         "jvl_primavera",
    nombreEncargado: "Andrés Núñez Familia",
    cedula:          "047-0198234-6",
    telefono:        "1-809-573-5510",
    provincia:       "La Vega",
    municipio:       "Concepción de La Vega",
    sector:          "La Primavera",
    comunidad:       "La Primavera",
    rol:             "junta",
    estado:          true,
  },
  {
    nombre:          "Junta de Vecinos Urbanización Fernández",
    usuario:         "jvl_fernandez",
    nombreEncargado: "Esperanza Reyes de la Cruz",
    cedula:          "047-0265891-2",
    telefono:        "1-809-573-8890",
    provincia:       "La Vega",
    municipio:       "Concepción de La Vega",
    sector:          "Urb. Fernández",
    comunidad:       "Urb. Fernández",
    rol:             "junta",
    estado:          true,
  },
  // ── La Vega · Jarabacoa ───────────────────────────────────────────────────
  {
    nombre:          "Junta de Vecinos La Confluencia",
    usuario:         "jvl_confluencia",
    nombreEncargado: "Manuel de Jesús Cabral",
    cedula:          "047-0334521-8",
    telefono:        "1-829-574-3301",
    provincia:       "La Vega",
    municipio:       "Jarabacoa",
    sector:          "La Confluencia",
    comunidad:       "La Confluencia",
    rol:             "junta",
    estado:          true,
  },
  {
    nombre:          "Junta de Vecinos El Pinar",
    usuario:         "jvl_pinar",
    nombreEncargado: "Rosa Elena Mejía Suárez",
    cedula:          "047-0401235-4",
    telefono:        "1-849-574-6778",
    provincia:       "La Vega",
    municipio:       "Jarabacoa",
    sector:          "El Pinar",
    comunidad:       "El Pinar",
    rol:             "junta",
    estado:          true,
  },
];

// Plantillas de denuncias realistas — se asignan rotativamente a cada junta
const PLANTILLAS_DENUNCIAS = [
  {
    titulo:      "Baches en calle principal del sector",
    tipo:        "Infraestructura",
    descripcion: "La calle principal presenta múltiples baches de gran tamaño que dificultan el tránsito vehicular y representan un riesgo para los motociclistas, especialmente en horas nocturnas.",
    estado:      "Pendiente",
    evidencia:   "https://plus.unsplash.com/premium_photo-1675662137552-ebbb9b589660?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Acumulación de basura en esquina comunitaria",
    tipo:        "Medio Ambiente",
    descripcion: "Se reporta acumulación irregular de residuos sólidos en la esquina de la comunidad. El camión de recogida de basura no ha pasado en más de dos semanas generando malos olores y proliferación de mosquitos.",
    estado:      "En proceso",
    evidencia:   "https://plus.unsplash.com/premium_photo-1661663674755-690655d38912?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Postes de alumbrado público sin funcionar",
    tipo:        "Servicios Públicos",
    descripcion: "Varios postes del alumbrado público llevan más de un mes sin funcionar, generando inseguridad en horas nocturnas para los residentes que transitan a pie por la zona.",
    estado:      "Resuelta",
    evidencia:   "https://images.unsplash.com/photo-1623359875771-9039ae885ac1?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Tubería rota con derrame de agua potable",
    tipo:        "Infraestructura",
    descripcion: "Una tubería principal de agua potable se encuentra rota desde hace varios días, causando desperdicio de agua y acumulación de charcos que obstruyen el paso peatonal.",
    estado:      "En proceso",
    evidencia:   "https://plus.unsplash.com/premium_photo-1760584208073-53bd66b2897b?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Solicitud de fumigación contra mosquitos",
    tipo:        "Salud",
    descripcion: "Se ha registrado un aumento inusual de mosquitos en el sector, posiblemente asociado a aguas estancadas. La comunidad solicita fumigación preventiva antes de que escale a un brote de dengue.",
    estado:      "Pendiente",
    evidencia:   "https://plus.unsplash.com/premium_photo-1661825521051-94a8ad2ad079?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Quema ilegal de residuos en terreno baldío",
    tipo:        "Medio Ambiente",
    descripcion: "Personas desconocidas están realizando quemas ilegales de basura y neumáticos en un terreno baldío dentro del sector, produciendo humo tóxico que afecta la salud de los vecinos.",
    estado:      "Rechazada",
    evidencia:   "https://images.unsplash.com/photo-1642641387928-6f490d438bb4?q=80&w=800&auto=format&fit=crop",
    respuesta_ayuntamiento: "Luego de inspección realizada por el equipo técnico municipal, no se encontró evidencia suficiente que respalde la denuncia en el área señalada. Se recomienda presentar evidencia fotográfica o video para reabrir el caso.",
  },
  {
    titulo:      "Robo frecuente en el sector durante la noche",
    tipo:        "Seguridad",
    descripcion: "Durante las últimas semanas se han registrado múltiples robos a residentes en horas nocturnas. Se solicita incrementar la presencia policial y mejorar el alumbrado para disuadir este tipo de delitos.",
    estado:      "Pendiente",
    evidencia:   "https://plus.unsplash.com/premium_photo-1750891150677-8416533ba125?q=80&w=800&auto=format&fit=crop",
  },
  {
    titulo:      "Cañada contaminada con aguas residuales",
    tipo:        "Medio Ambiente",
    descripcion: "La cañada que atraviesa el sector está recibiendo descargas de aguas residuales domésticas, generando contaminación y malos olores que afectan la calidad de vida de los vecinos cercanos.",
    estado:      "En proceso",
    evidencia:   "https://plus.unsplash.com/premium_photo-1734607189492-844ce566985f?q=80&w=800&auto=format&fit=crop",
  },
];

// Genera 3 denuncias por junta con fechas escalonadas, subiendo imágenes a Cloudinary
async function generarDenuncias(juntaUid, junta, indice) {
  const hoy = new Date();
  const resultado = [];

  for (let i = 0; i < 3; i++) {
    const plantilla = PLANTILLAS_DENUNCIAS[(indice * 3 + i) % PLANTILLAS_DENUNCIAS.length];
    const diasAtras = (i + 1) * 7 + indice * 3;
    const fecha = new Date(hoy);
    fecha.setDate(fecha.getDate() - diasAtras);

    let evidenciaUrl = "";
    if (APLICAR && plantilla.evidencia) {
      try {
        evidenciaUrl = await subirACloudinary(plantilla.evidencia);
        info(`Imagen subida a Cloudinary: ${evidenciaUrl}`);
      } catch (e) {
        warn(`No se pudo subir imagen: ${e.message}. Se usará URL vacía.`);
      }
    }

    resultado.push({
      titulo:          plantilla.titulo,
      tipo:            plantilla.tipo,
      descripcion:     plantilla.descripcion,
      provincia:       junta.provincia,
      municipio:       junta.municipio,
      sector:          junta.sector,
      comunidad:       junta.comunidad,
      estado:          plantilla.estado,
      fecha:           admin.firestore.Timestamp.fromDate(fecha),
      fecha_incidente: admin.firestore.Timestamp.fromDate(fecha),
      evidencia:       evidenciaUrl,
      respuesta_ayuntamiento: plantilla.respuesta_ayuntamiento || "",
      uid:             juntaUid,
      rol_creador:     "junta",
      junta_id:        juntaUid,
    });
  }
  return resultado;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  initAdmin();
  const db   = admin.firestore();
  const auth = admin.auth();

  log("\n════════════════════════════════════════════════════════");
  log(APLICAR
    ? "  GECOM · Seed definitivo  [MODO APLICAR]"
    : "  GECOM · Seed definitivo  [SIMULACIÓN — usa --aplicar para ejecutar]");
  log("════════════════════════════════════════════════════════\n");

  // ── 1. Limpieza ─────────────────────────────────────────────────────────────
  log("▶ Paso 1: Limpiando datos existentes...\n");

  await limpiarDenuncias(db);
  await limpiarColeccion(db, auth, "JuntasDeVecinos", true);
  await limpiarColeccion(db, auth, "Ayuntamientos",   true);
  await limpiarColeccion(db, auth, "Administradores", true);

  // ── 2. Crear Administradores ─────────────────────────────────────────────────
  log("\n▶ Paso 2: Creando Administradores...\n");
  for (const admin_data of ADMINS) {
    await crearUsuario(auth, db, "Administradores", admin_data);
  }

  // ── 3. Crear Ayuntamientos ───────────────────────────────────────────────────
  log("\n▶ Paso 3: Creando Ayuntamientos...\n");
  for (const ayt of AYUNTAMIENTOS) {
    await crearUsuario(auth, db, "Ayuntamientos", ayt);
  }

  // ── 4. Crear Juntas de Vecinos + Denuncias ────────────────────────────────────
  log("\n▶ Paso 4: Creando Juntas de Vecinos y denuncias...\n");
  for (let i = 0; i < JUNTAS.length; i++) {
    const junta = JUNTAS[i];
    const uid   = await crearUsuario(auth, db, "JuntasDeVecinos", junta);

    const denuncias = await generarDenuncias(uid, junta, i);
    for (const denuncia of denuncias) {
      if (APLICAR) {
        await db.collection("denuncias").add(denuncia);
      }
      info(`[denuncia] "${denuncia.titulo}" — ${denuncia.estado}`);
    }
  }

  // ── Resumen ──────────────────────────────────────────────────────────────────
  log("\n════════════════════════════════════════════════════════");
  log(APLICAR ? "  ✅ Seed completado exitosamente." : "  ✅ Simulación completada. Ejecuta con --aplicar para aplicar.");
  log("════════════════════════════════════════════════════════\n");

  if (APLICAR) {
    log("  CREDENCIALES PARA LA PRESENTACIÓN");
    log("  (Contraseña temporal de todas las cuentas: Gecom2025*)\n");

    log("  ADMINISTRADORES:");
    ADMINS.forEach(a => log(`    • ${a.nombre.padEnd(22)} usuario: ${a.usuario}`));

    log("\n  AYUNTAMIENTOS:");
    AYUNTAMIENTOS.forEach(a => log(`    • ${a.nombre.padEnd(44)} usuario: ${a.usuario}`));

    log("\n  JUNTAS DE VECINOS:");
    JUNTAS.forEach(j => log(`    • ${j.nombre.padEnd(44)} usuario: ${j.usuario}`));

    log("\n  Nota: cada cuenta debe cambiar su contraseña en el primer inicio de sesión.\n");
  }

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
