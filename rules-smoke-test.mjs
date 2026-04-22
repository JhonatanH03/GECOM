import fs from "node:fs";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
} from "firebase/firestore";

const projectId = "demo-gecom-rules";
const rules = fs.readFileSync("firestore.rules", "utf8");

const testEnv = await initializeTestEnvironment({
  projectId,
  firestore: { rules },
});

await testEnv.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();

  await setDoc(doc(db, "Administradores", "admin1"), {
    rol: "admin",
  });

  await setDoc(doc(db, "Ayuntamientos", "ay1"), {
    rol: "ayuntamiento",
    provincia: "Santo Domingo",
    municipio: "Santo Domingo Este",
  });

  await setDoc(doc(db, "Ayuntamientos", "ay2"), {
    rol: "ayuntamiento",
    provincia: "Santiago",
    municipio: "Santiago de los Caballeros",
  });

  await setDoc(doc(db, "JuntasDeVecinos", "j1"), {
    rol: "junta",
    creada_por: "ay1",
    provincia: "Santo Domingo",
    municipio: "Santo Domingo Este",
    nombre: "Junta A",
  });

  await setDoc(doc(db, "JuntasDeVecinos", "j2"), {
    rol: "junta",
    creada_por: "ay2",
    provincia: "Santiago",
    municipio: "Santiago de los Caballeros",
    nombre: "Junta B",
  });
});

const adminDb = testEnv.authenticatedContext("admin1").firestore();
const ay1Db = testEnv.authenticatedContext("ay1").firestore();

const ok = [];
const fail = [];

async function check(name, fn) {
  try {
    await fn();
    ok.push(name);
  } catch (e) {
    fail.push(`${name}: ${e.message}`);
  }
}

await check("Ayuntamiento lee junta de su municipio", async () => {
  await assertSucceeds(getDoc(doc(ay1Db, "JuntasDeVecinos", "j1")));
});

await check("Ayuntamiento NO lee junta de otro municipio", async () => {
  await assertFails(getDoc(doc(ay1Db, "JuntasDeVecinos", "j2")));
});

await check("Ayuntamiento crea junta en su municipio", async () => {
  await assertSucceeds(
    setDoc(doc(ay1Db, "JuntasDeVecinos", "j3"), {
      rol: "junta",
      creada_por: "ay1",
      provincia: "Santo Domingo",
      municipio: "Santo Domingo Este",
      nombre: "Junta C",
    })
  );
});

await check("Ayuntamiento NO crea junta en otro municipio", async () => {
  await assertFails(
    setDoc(doc(ay1Db, "JuntasDeVecinos", "j4"), {
      rol: "junta",
      creada_por: "ay1",
      provincia: "Santiago",
      municipio: "Santiago de los Caballeros",
      nombre: "Junta D",
    })
  );
});

await check("Ayuntamiento NO edita junta de otro municipio", async () => {
  await assertFails(
    updateDoc(doc(ay1Db, "JuntasDeVecinos", "j2"), {
      nombre: "Intento no permitido",
    })
  );
});

await check("Admin puede leer junta de otro municipio", async () => {
  await assertSucceeds(getDoc(doc(adminDb, "JuntasDeVecinos", "j2")));
});

await testEnv.cleanup();

if (fail.length) {
  console.error("\nPruebas fallidas:");
  for (const f of fail) console.error(`- ${f}`);
  console.log("\nPruebas exitosas:", ok.length);
  process.exit(1);
} else {
  console.log("\nTodas las pruebas pasaron:");
  for (const s of ok) console.log(`- ${s}`);
}
