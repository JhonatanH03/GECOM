window.GECOM_BACKEND_BASE_URL =
  window.GECOM_BACKEND_BASE_URL ||
  localStorage.getItem("gecomBackendBaseUrl") ||
  "http://localhost:4000";

window.gecomBuildBackendUrl = function(path) {
  const baseUrl = String(window.GECOM_BACKEND_BASE_URL || "http://localhost:4000").replace(/\/+$/, "");
  const normalizedPath = String(path || "").startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

window.gecomResetManagedUserPassword = async function({ auth, callerPassword, targetUid, targetRole }) {
  const user = auth.currentUser;
  if (!user || !user.email) {
    const error = new Error("Sesión no válida.");
    error.code = "auth/session-invalid";
    throw error;
  }

  const credential = firebase.auth.EmailAuthProvider.credential(user.email, callerPassword);
  await user.reauthenticateWithCredential(credential);

  const idToken = await user.getIdToken(true);
  const response = await fetch(window.gecomBuildBackendUrl("/api/password-resets/generic"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ targetUid, targetRole })
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch (_error) {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(
      payload.error && payload.error.message
        ? payload.error.message
        : "No se pudo restablecer la contraseña."
    );
    error.code = payload.error && payload.error.code ? payload.error.code : "request-failed";
    throw error;
  }

  return payload;
};