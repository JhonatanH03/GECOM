/**
 * gecomConfirm — modal de confirmación estilizado para GECOM
 * Uso: const ok = await gecomConfirm({ title, message, confirmText, cancelText, type })
 * type: "danger" | "warning" | "info"  (default: "danger")
 */
(function () {
  const MODAL_ID = "gecomConfirmModal";

  const ICONS = {
    danger:  { icon: "bi-exclamation-triangle-fill", color: "#ef4444", bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.25)"  },
    warning: { icon: "bi-exclamation-circle-fill",   color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)" },
    info:    { icon: "bi-info-circle-fill",           color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)" },
  };

  function ensureModal() {
    if (document.getElementById(MODAL_ID)) return;

    const el = document.createElement("div");
    el.innerHTML = `
      <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-modal="true" role="dialog">
        <div class="modal-dialog modal-dialog-centered" style="max-width:420px">
          <div class="modal-content gecom-confirm-content">
            <div class="modal-body gecom-confirm-body">
              <div class="gecom-confirm-icon-wrap" id="gecomConfirmIconWrap">
                <i class="bi gecom-confirm-icon" id="gecomConfirmIcon"></i>
              </div>
              <h5 class="gecom-confirm-title" id="gecomConfirmTitle"></h5>
              <p class="gecom-confirm-message" id="gecomConfirmMessage"></p>
            </div>
            <div class="modal-footer gecom-confirm-footer">
              <button type="button" class="btn gecom-confirm-btn-cancel" id="gecomConfirmCancel" data-bs-dismiss="modal"></button>
              <button type="button" class="btn gecom-confirm-btn-ok" id="gecomConfirmOk"></button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el.firstElementChild);
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById("gecom-confirm-styles")) return;
    const style = document.createElement("style");
    style.id = "gecom-confirm-styles";
    style.textContent = `
      .gecom-confirm-content {
        border-radius: 18px;
        border: 1px solid var(--gecom-stroke, #e8ecf1);
        background: var(--gecom-surface, #fff);
        box-shadow: 0 24px 60px rgba(15,23,42,0.14);
        overflow: hidden;
      }
      .gecom-confirm-body {
        padding: 2rem 1.75rem 1.25rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.6rem;
      }
      .gecom-confirm-icon-wrap {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 0.25rem;
        flex-shrink: 0;
        border: 1px solid transparent;
      }
      .gecom-confirm-icon {
        font-size: 1.75rem;
        line-height: 1;
      }
      .gecom-confirm-title {
        font-weight: 800;
        font-size: 1.1rem;
        color: var(--gecom-text, #1a2332);
        margin: 0;
        letter-spacing: -0.02em;
      }
      .gecom-confirm-message {
        color: var(--gecom-subtext, #6b7785);
        font-size: 0.9rem;
        line-height: 1.55;
        margin: 0;
        max-width: 340px;
      }
      .gecom-confirm-footer {
        border-top: 1px solid var(--gecom-stroke, #e8ecf1);
        padding: 1rem 1.75rem 1.25rem;
        display: flex;
        gap: 0.6rem;
        justify-content: stretch;
      }
      .gecom-confirm-btn-cancel,
      .gecom-confirm-btn-ok {
        flex: 1;
        border-radius: 12px;
        font-weight: 700;
        font-size: 0.9rem;
        padding: 0.6rem 1rem;
        transition: filter 0.18s ease, transform 0.15s ease;
      }
      .gecom-confirm-btn-cancel {
        background: color-mix(in srgb, var(--gecom-stroke, #e8ecf1) 55%, transparent);
        color: var(--gecom-text, #1a2332);
        border: 1px solid var(--gecom-stroke, #e8ecf1);
      }
      .gecom-confirm-btn-cancel:hover { filter: brightness(0.95); }
      .gecom-confirm-btn-ok:hover     { filter: brightness(1.08); transform: translateY(-1px); }
      .gecom-confirm-btn-ok:active    { transform: translateY(0); }
      [data-bs-theme="dark"] .gecom-confirm-content {
        background: var(--gecom-surface, #141d2e);
        border-color: rgba(148,163,184,0.2);
        box-shadow: 0 28px 70px rgba(0,0,0,0.55);
      }
      [data-bs-theme="dark"] .gecom-confirm-title  { color: #f0f4fa; }
      [data-bs-theme="dark"] .gecom-confirm-footer { border-color: rgba(148,163,184,0.18); }
      [data-bs-theme="dark"] .gecom-confirm-btn-cancel {
        background: rgba(148,163,184,0.12);
        border-color: rgba(148,163,184,0.22);
        color: #e2e8f0;
      }
    `;
    document.head.appendChild(style);
  }

  window.gecomConfirm = function ({
    title       = "¿Estás seguro?",
    message     = "",
    confirmText = "Confirmar",
    cancelText  = "Cancelar",
    type        = "danger",
  } = {}) {
    return new Promise((resolve) => {
      ensureModal();

      const cfg = ICONS[type] || ICONS.danger;

      const iconWrap = document.getElementById("gecomConfirmIconWrap");
      const iconEl   = document.getElementById("gecomConfirmIcon");
      const titleEl  = document.getElementById("gecomConfirmTitle");
      const msgEl    = document.getElementById("gecomConfirmMessage");
      const okBtn    = document.getElementById("gecomConfirmOk");
      const cancelBtn = document.getElementById("gecomConfirmCancel");

      iconWrap.style.background = cfg.bg;
      iconWrap.style.borderColor = cfg.border;
      iconEl.className = `bi ${cfg.icon} gecom-confirm-icon`;
      iconEl.style.color = cfg.color;
      titleEl.textContent   = title;
      msgEl.textContent     = message;
      okBtn.textContent     = confirmText;
      cancelBtn.textContent = cancelText;

      okBtn.style.background = cfg.color;
      okBtn.style.border     = "none";
      okBtn.style.color      = "#fff";

      const modalEl = document.getElementById(MODAL_ID);
      const modal   = bootstrap.Modal.getOrCreateInstance(modalEl);

      // Limpiar listeners anteriores
      const newOk     = okBtn.cloneNode(true);
      const newCancel = cancelBtn.cloneNode(true);
      okBtn.parentNode.replaceChild(newOk, okBtn);
      cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

      // Restaurar estilos en los nuevos nodos
      newOk.style.background = cfg.color;
      newOk.style.border     = "none";
      newOk.style.color      = "#fff";
      newOk.textContent      = confirmText;
      newCancel.textContent  = cancelText;

      function cleanup() {
        modalEl.removeEventListener("hidden.bs.modal", onHide);
      }

      function onHide() {
        cleanup();
        resolve(false);
      }

      newOk.addEventListener("click", () => {
        cleanup();
        modalEl.removeEventListener("hidden.bs.modal", onHide);
        modal.hide();
        resolve(true);
      });

      newCancel.addEventListener("click", () => {
        cleanup();
        resolve(false);
      });

      modalEl.addEventListener("hidden.bs.modal", onHide, { once: true });

      modal.show();
    });
  };
})();
