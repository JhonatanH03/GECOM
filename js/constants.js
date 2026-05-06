// Constantes y utilidades centralizadas del proyecto GECOM
// Importar en cualquier módulo que necesite estos valores:
//   import { ESTADOS, ESTADO_DEFAULT, ESTADOS_LISTA, debounce } from "./constants.js";

/**
 * Retrasa la ejecución de fn hasta que pasen `ms` ms sin que se vuelva a llamar.
 * Útil en listeners de filtros para evitar disparar lecturas de Firestore en cada interacción.
 * @param {Function} fn
 * @param {number} ms
 */
export function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export const ESTADOS = Object.freeze({
  PENDIENTE:  "Pendiente",
  EN_PROCESO: "En proceso",
  RESUELTA:   "Resuelta",
  RECHAZADA:  "Rechazada"
});

// Array ordenado para labels de gráficas y filtros
export const ESTADOS_LISTA = [
  ESTADOS.PENDIENTE,
  ESTADOS.EN_PROCESO,
  ESTADOS.RESUELTA,
  ESTADOS.RECHAZADA
];

export const ESTADO_DEFAULT = ESTADOS.PENDIENTE;

// Mapeo estado → clase CSS de chip/badge
export const ESTADO_CLASE = Object.freeze({
  [ESTADOS.PENDIENTE]:  "status-pendiente",
  [ESTADOS.EN_PROCESO]: "status-proceso",
  [ESTADOS.RESUELTA]:   "status-resuelta",
  [ESTADOS.RECHAZADA]:  "status-rechazada"
});

export function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
