import fs from "node:fs";
import path from "node:path";
import admin from "firebase-admin";

const APPLY = process.argv.includes("--apply");
const AUTO_FIX_INVALID = process.argv.includes("--auto-fix-invalid");
const PROJECT_ROOT = process.cwd();
const SERVICE_ACCOUNT_PATH = path.join(PROJECT_ROOT, "serviceAccountKey.json");

function normalizarUsuario(usuario) {
  return String(usuario || "").trim().toLowerCase();
}

function usuarioAEmailInterno(usuario) {
  return normalizarUsuario(usuario).replace(/[^a-z0-9_]/g, "") + "@gecom.internal";
}

function usuarioInternoValido(usuario) {
  return normalizarUsuario(usuario).replace(/[^a-z0-9_]/g, "").length > 0;
}

function initFirebaseAdmin() {
  if (admin.apps.length) return;

  if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return;
  }

  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

async function main() {
  initFirebaseAdmin();

  const db = admin.firestore();
  const auth = admin.auth();
  const fieldDelete = admin.firestore.FieldValue.delete();

  const colecciones = [
    "Administradores",
    "Ayuntamientos",
    "JuntasDeVecinos"
  ];

  const plan = [];
  const emailsMap = new Map();

  console.log(APPLY ? "\n[MODO APLICAR] Ejecutando migracion..." : "\n[MODO SIMULACION] Ejecuta con --apply para aplicar cambios.");

  for (const col of colecciones) {
    const snap = await db.collection(col).get();
    for (const docSnap of snap.docs) {
      const data = docSnap.data() || {};
      const usuarioOriginalRaw = String(data.usuario || "");
      const usuarioOriginal = usuarioOriginalRaw.trim();
      const usuarioSaneado = usuarioInternoValido(usuarioOriginal)
        ? usuarioOriginal
        : (AUTO_FIX_INVALID ? `user_${docSnap.id.slice(0, 8).toLowerCase()}` : usuarioOriginal);
      const usuarioNormalizado = normalizarUsuario(usuarioSaneado);
      const emailInterno = usuarioAEmailInterno(usuarioSaneado);

      const item = {
        col,
        uid: docSnap.id,
        usuarioOriginal,
        usuarioSaneado,
        usuarioNormalizado,
        emailInterno,
        valido: usuarioInternoValido(usuarioSaneado)
      };

      if (item.valido) {
        const usedBy = emailsMap.get(emailInterno) || [];
        usedBy.push(`${col}/${docSnap.id}`);
        emailsMap.set(emailInterno, usedBy);
      }

      plan.push(item);
    }
  }

  const invalidos = plan.filter((p) => !p.valido);
  const conflictos = Array.from(emailsMap.entries()).filter(([, refs]) => refs.length > 1);

  console.log(`Total usuarios encontrados: ${plan.length}`);
  console.log(`Usuarios invalidos (sin username util): ${invalidos.length}`);
  console.log(`Conflictos de username/email interno: ${conflictos.length}`);
  console.log(`Auto-fix de invalidos: ${AUTO_FIX_INVALID ? "ACTIVO" : "INACTIVO"}`);

  if (invalidos.length) {
    console.log("\nUsuarios invalidos:");
    invalidos.forEach((u) => {
      console.log(`- ${u.col}/${u.uid} (usuario='${u.usuarioOriginal}')`);
    });
  }

  if (AUTO_FIX_INVALID) {
    const arreglados = plan.filter((p) => p.usuarioOriginal !== p.usuarioSaneado);
    if (arreglados.length) {
      console.log("\nUsuarios a corregir automaticamente:");
      arreglados.forEach((u) => {
        console.log(`- ${u.col}/${u.uid}: '${u.usuarioOriginal}' -> '${u.usuarioSaneado}'`);
      });
    }
  }

  if (conflictos.length) {
    console.log("\nConflictos detectados (debes resolverlos antes de aplicar):");
    conflictos.forEach(([email, refs]) => {
      console.log(`- ${email} -> ${refs.join(", ")}`);
    });
  }

  if (!APPLY) {
    console.log("\nSimulacion completada.");
    return;
  }

  if (invalidos.length || conflictos.length) {
    console.log("\nMigracion detenida: hay usuarios invalidos o conflictos.");
    process.exitCode = 1;
    return;
  }

  let actualizadosFirestore = 0;
  let actualizadosAuth = 0;

  for (const item of plan) {
    const docRef = db.collection(item.col).doc(item.uid);

    await docRef.set(
      {
        usuario: item.usuarioNormalizado,
        correo: fieldDelete,
        email: fieldDelete
      },
      { merge: true }
    );
    actualizadosFirestore += 1;

    try {
      const userRecord = await auth.getUser(item.uid);
      if ((userRecord.email || "").toLowerCase() !== item.emailInterno) {
        await auth.updateUser(item.uid, {
          email: item.emailInterno,
          emailVerified: true
        });
      }
      actualizadosAuth += 1;
    } catch (error) {
      console.error(`No se pudo actualizar Auth para UID ${item.uid}:`, error.message || error.code || error);
    }
  }

  console.log("\nMigracion completada.");
  console.log(`Firestore actualizados: ${actualizadosFirestore}`);
  console.log(`Usuarios Auth procesados: ${actualizadosAuth}`);
}

main().catch((error) => {
  console.error("Error en migracion:", error);
  process.exitCode = 1;
});
