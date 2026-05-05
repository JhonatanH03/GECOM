/**
 * GECOM – Parche: agrega motivo de rechazo a denuncias "Rechazada" sin respuesta
 *
 * Modo simulación:
 *   node fix-rechazadas.mjs
 *
 * Modo aplicar:
 *   node fix-rechazadas.mjs --aplicar
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SA_PATH   = path.join(__dirname, "serviceAccountKey.json");
const APLICAR   = process.argv.includes("--aplicar");

const MOTIVO_GENERICO =
  "La denuncia fue revisada por el equipo técnico municipal y no cumple con los requisitos " +
  "mínimos de evidencia o no corresponde al ámbito de competencia de este ayuntamiento. " +
  "Puede presentar una nueva denuncia con documentación adicional si considera que el caso persiste.";

function initAdmin() {
  if (admin.apps.length) return;
  const sa = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
  admin.initializeApp({ credential: admin.credential.cert(sa) });
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  console.log(APLICAR
    ? "\n[APLICAR] Asignando motivo a denuncias rechazadas sin respuesta...\n"
    : "\n[SIMULACIÓN] Ejecuta con --aplicar para aplicar los cambios.\n");

  const snap = await db.collection("denuncias")
    .where("estado", "==", "Rechazada")
    .get();

  const sinRespuesta = snap.docs.filter(d => !d.data().respuesta_ayuntamiento);

  if (sinRespuesta.length === 0) {
    console.log("✅ No hay denuncias rechazadas sin motivo. Nada que hacer.");
    process.exit(0);
  }

  console.log(`Se encontraron ${sinRespuesta.length} denuncia(s) rechazada(s) sin motivo:\n`);

  for (const d of sinRespuesta) {
    const data = d.data();
    console.log(`  • [${d.id}] "${data.titulo}" — ${data.municipio}`);
    if (APLICAR) {
      await d.ref.update({ respuesta_ayuntamiento: MOTIVO_GENERICO });
      console.log("    ✓ Motivo agregado.");
    }
  }

  if (!APLICAR) {
    console.log("\n  (Simulación — no se realizaron cambios)");
  } else {
    console.log(`\n✅ ${sinRespuesta.length} denuncia(s) actualizadas correctamente.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
