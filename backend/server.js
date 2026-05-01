const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const admin = require("firebase-admin");

dotenv.config();

const PORT = Number(process.env.PORT || 4000);
const RECENT_AUTH_MAX_AGE_SECONDS = Number(process.env.RECENT_AUTH_MAX_AGE_SECONDS || 300);
const DEFAULT_RESET_PASSWORD = String(process.env.DEFAULT_RESET_PASSWORD || "Temporal123A").trim();
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "http://127.0.0.1:5500,http://localhost:5500")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function readServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
  }

  return null;
}

function initFirebaseAdmin() {
  if (admin.apps.length) {
    return;
  }

  const serviceAccount = readServiceAccount();

  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    return;
  }

  throw createHttpError(
    500,
    "missing-service-account",
    "Falta configurar una cuenta de servicio de Firebase Admin. Define FIREBASE_SERVICE_ACCOUNT_PATH o FIREBASE_SERVICE_ACCOUNT_JSON en backend/.env."
  );
}

function createHttpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function getCollectionNameByRole(role) {
  if (role === "admin") return "Administradores";
  if (role === "ayuntamiento") return "Ayuntamientos";
  if (role === "junta") return "JuntasDeVecinos";
  return null;
}

async function resolveCallerProfile(uid) {
  const roleChecks = [
    { role: "admin", collection: "Administradores" },
    { role: "ayuntamiento", collection: "Ayuntamientos" },
    { role: "junta", collection: "JuntasDeVecinos" }
  ];

  for (const candidate of roleChecks) {
    const snapshot = await admin.firestore().collection(candidate.collection).doc(uid).get();
    if (snapshot.exists) {
      return {
        role: candidate.role,
        collection: candidate.collection,
        data: snapshot.data() || {}
      };
    }
  }

  throw createHttpError(403, "permission-denied", "No se pudo validar el rol del usuario autenticado.");
}

async function authorizeReset(callerUid, callerRole, targetUid, targetRole) {
  const collectionName = getCollectionNameByRole(targetRole);
  if (!collectionName || targetRole === "admin") {
    throw createHttpError(400, "invalid-target", "El rol de destino no es válido para restablecimiento.");
  }

  const targetRef = admin.firestore().collection(collectionName).doc(targetUid);
  const targetSnap = await targetRef.get();

  if (!targetSnap.exists) {
    throw createHttpError(404, "not-found", "Usuario objetivo no encontrado.");
  }

  if (callerRole === "admin") {
    return { targetRef };
  }

  if (callerRole !== "ayuntamiento" || targetRole !== "junta") {
    throw createHttpError(403, "permission-denied", "No tienes permiso para restablecer esta contraseña.");
  }

  const targetData = targetSnap.data() || {};
  if (targetData.creada_por !== callerUid) {
    throw createHttpError(403, "permission-denied", "Solo puedes restablecer contraseñas de tus propias juntas.");
  }

  return { targetRef };
}

async function verifyCaller(req, _res, next) {
  try {
    const authorization = String(req.headers.authorization || "");
    if (!authorization.startsWith("Bearer ")) {
      throw createHttpError(401, "unauthenticated", "Falta el token de autenticación.");
    }

    const idToken = authorization.slice(7).trim();
    const decodedToken = await admin.auth().verifyIdToken(idToken, true);
    const authTime = Number(decodedToken.auth_time || 0);
    const ageSeconds = Math.floor(Date.now() / 1000) - authTime;

    if (!authTime || ageSeconds > RECENT_AUTH_MAX_AGE_SECONDS) {
      throw createHttpError(401, "recent-login-required", "Debes confirmar tu contraseña nuevamente antes de restablecer otra cuenta.");
    }

    req.auth = {
      uid: decodedToken.uid,
      decodedToken
    };
    next();
  } catch (error) {
    next(error);
  }
}

try {
  initFirebaseAdmin();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}

const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(createHttpError(403, "cors-not-allowed", "Origen no permitido."));
  }
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/password-resets/generic", verifyCaller, async (req, res, next) => {
  try {
    const { targetUid, targetRole } = req.body || {};
    const normalizedTargetUid = String(targetUid || "").trim();
    const normalizedTargetRole = String(targetRole || "").trim().toLowerCase();

    if (!normalizedTargetUid || !normalizedTargetRole) {
      throw createHttpError(400, "invalid-argument", "Debes indicar el usuario y rol de destino.");
    }

    const callerUid = req.auth.uid;
    const callerProfile = await resolveCallerProfile(callerUid);
    const { targetRef } = await authorizeReset(
      callerUid,
      callerProfile.role,
      normalizedTargetUid,
      normalizedTargetRole
    );

    await admin.auth().updateUser(normalizedTargetUid, {
      password: DEFAULT_RESET_PASSWORD
    });

    await targetRef.set(
      {
        primerLogin: true,
        ultimaReasignacionContrasena: admin.firestore.FieldValue.serverTimestamp(),
        restablecidaPor: callerUid
      },
      { merge: true }
    );

    res.json({
      ok: true,
      temporaryPassword: DEFAULT_RESET_PASSWORD,
      targetRole: normalizedTargetRole
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  const status = Number(error.status || 500);
  const code = String(error.code || "internal-error");
  const message = error.message || "Error interno del servidor.";

  if (status >= 500) {
    console.error(error);
  }

  res.status(status).json({
    ok: false,
    error: {
      code,
      message
    }
  });
});

app.listen(PORT, () => {
  console.log(`GECOM reset backend escuchando en http://localhost:${PORT}`);
});
