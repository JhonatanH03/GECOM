const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.resetAyuntamientoPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError("unauthenticated", "Debes iniciar sesión.");
  }

  const callerUid = context.auth.uid;
  const adminDoc = await admin.firestore().collection("Administradores").doc(callerUid).get();
  if (!adminDoc.exists) {
    throw new functions.https.HttpsError("permission-denied", "Solo un administrador puede restablecer contraseñas.");
  }

  const ayuntamientoUid = (data && data.ayuntamientoUid ? String(data.ayuntamientoUid) : "").trim();
  const temporaryPassword = (data && data.temporaryPassword ? String(data.temporaryPassword) : "Inicial123").trim();

  if (!ayuntamientoUid) {
    throw new functions.https.HttpsError("invalid-argument", "Debes indicar el UID del ayuntamiento.");
  }

  if (temporaryPassword.length < 6) {
    throw new functions.https.HttpsError("invalid-argument", "La contraseña temporal debe tener al menos 6 caracteres.");
  }

  const ayuntamientoDocRef = admin.firestore().collection("Ayuntamientos").doc(ayuntamientoUid);
  const ayuntamientoDoc = await ayuntamientoDocRef.get();

  if (!ayuntamientoDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Ayuntamiento no encontrado.");
  }

  await admin.auth().updateUser(ayuntamientoUid, { password: temporaryPassword });

  await ayuntamientoDocRef.set(
    {
      primerLogin: true,
      ultimaReasignacionContrasena: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  return {
    ok: true,
    temporaryPassword
  };
});
