const OPEN_PANEL_DURATION = 1000; // ms
const OPEN_OVERLAY_DURATION = 250; // ms
const CLOSE_DURATION = 600; // ms

const openModalNames = new Set();

function getModalPanel(name) {
  return document.querySelector(`[data-modal-panel="${name}"]`);
}

function getModalOverlay(panel) {
  const group = panel?.dataset.modalOverlayGroup;
  if (!group) return null;
  return document.querySelector(`[data-modal-overlay="${group}"]`);
}

function getModalBodyClass(panel, name) {
  return panel?.dataset.modalBodyClass || `${name}-open`;
}

function getModalDirection(panel) {
  return panel?.dataset.modalDirection || "right";
}

function getAllModalNames() {
  return Array.from(document.querySelectorAll("[data-modal-panel]")).map(
    (el) => el.dataset.modalPanel,
  );
}

function openModal(name) {
  const panel = getModalPanel(name);
  if (!panel) return;
  if (openModalNames.has(name)) return;

  openModalNames.add(name);
  applyScrollLockState();

  const direction = getModalDirection(panel);
  const bodyClass = getModalBodyClass(panel, name);
  const offscreen = direction === "left" ? "-100%" : "100%";

  panel.style.display = "flex";
  panel.style.pointerEvents = "auto";
  if (typeof window.__freezeModalScroll === "function")
    window.__freezeModalScroll(panel);
  panel.style.transition = "none";
  panel.style.transform = `translateX(${offscreen})`;
  panel.offsetHeight; // force reflow

  panel.style.transition = `transform ${OPEN_PANEL_DURATION}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
  panel.style.transform = "translateX(0%)";

  const overlay = getModalOverlay(panel);
  if (overlay) {
    overlay.style.pointerEvents = "auto";
    overlay.style.display = "block";
    overlay.style.transition = "none";
    overlay.style.opacity = "0";
    overlay.offsetHeight;
    overlay.style.transition = `opacity ${OPEN_OVERLAY_DURATION}ms cubic-bezier(0.32, 0, 0.67, 0)`;
    overlay.style.opacity = "1";
  }

  setTimeout(() => {
    if (!openModalNames.has(name)) return;
    document.body.classList.add(bodyClass);
    if (typeof window.__unfreezeModalScroll === "function")
      window.__unfreezeModalScroll(panel);
  }, OPEN_PANEL_DURATION);
}

function closeModal(name) {
  const panel = getModalPanel(name);
  if (!panel) return;
  if (!openModalNames.has(name)) return;

  openModalNames.delete(name);
  applyScrollLockState();

  const direction = getModalDirection(panel);
  const bodyClass = getModalBodyClass(panel, name);
  const offscreen = direction === "left" ? "-100%" : "100%";

  if (typeof window.__freezeModalScroll === "function")
    window.__freezeModalScroll(panel);

  panel.style.transition = `transform ${CLOSE_DURATION}ms cubic-bezier(0.445, 0.05, 0.55, 0.95)`;
  panel.style.transform = `translateX(${offscreen})`;

  const overlay = getModalOverlay(panel);
  if (overlay) {
    overlay.style.transition = `opacity ${CLOSE_DURATION}ms ease-in`;
    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
  }

  setTimeout(() => {
    if (openModalNames.has(name)) return;
    panel.style.display = "none";
    panel.style.pointerEvents = "";
    if (overlay) overlay.style.display = "none";
    document.body.classList.remove(bodyClass);
  }, CLOSE_DURATION);
}

function closeAllModals() {
  getAllModalNames().forEach((name) => {
    if (openModalNames.has(name)) closeModal(name);
  });
}

window.__modals = {
  open: openModal,
  close: closeModal,
  closeAll: closeAllModals,
  isOpen: (name) => openModalNames.has(name),
};

function bindModalTriggers(scope = document) {
  scope.querySelectorAll("[data-modal-open]").forEach((btn) => {
    if (btn.dataset.modalOpenInit === "true") return;
    btn.dataset.modalOpenInit = "true";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(btn.getAttribute("data-modal-open"));
    });
  });

  scope.querySelectorAll("[data-modal-close]").forEach((btn) => {
    if (btn.dataset.modalCloseInit === "true") return;
    btn.dataset.modalCloseInit = "true";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal(btn.getAttribute("data-modal-close"));
    });
  });
}

function initOutsideClickClose() {
  document.addEventListener("click", (e) => {
    getAllModalNames().forEach((name) => {
      const panel = getModalPanel(name);
      if (!panel) return;
      const bodyClass = getModalBodyClass(panel, name);
      if (!document.body.classList.contains(bodyClass)) return;
      if (panel.contains(e.target)) return;
      closeModal(name);
    });
  });
}

function hasOpenModal() {
  return openModalNames.size > 0;
}

function initEscapeKey() {
  if (initEscapeKey._bound) return;
  initEscapeKey._bound = true;
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" && event.key !== "ArrowRight") return;
    const lightbox = document.getElementById("slide-lightbox");
    if (lightbox && lightbox.classList.contains("open")) return;
    if (event.key === "Escape") closeAllModals();
  });
}

function applyScrollLockState() {
  if (!window.lenis) return;
  const isOpen =
    openModalNames.size > 0 ||
    document.body.classList.contains("lightbox-open");
  if (isOpen) {
    window.lenis.stop();
  } else {
    window.lenis.start();
  }
  const pageContent = document.querySelectorAll(
    "main, .footer, .nav-bar, .page-container",
  );
  pageContent.forEach((el) => {
    el.style.pointerEvents = isOpen ? "none" : "auto";
    el.style.userSelect = isOpen ? "none" : "auto";
  });
}

function initModalScrollLock() {
  const observer = new MutationObserver(() => {
    applyScrollLockState();
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function initModals(scope = document) {
  bindModalTriggers(scope);
}

function initMenuCloseOnNavigate() {
  document.addEventListener(
    "click",
    function (e) {
      const link = e.target.closest(".menu-link");
      if (!link) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      const href = link.getAttribute("href");

      if (
        typeof window.__modals?.close !== "function" ||
        !window.__modals.isOpen("menu")
      ) {
        if (typeof barba !== "undefined") {
          barba.go(href);
        } else {
          window.location.href = href;
        }
        return;
      }

      window.__modals.close("menu");

      setTimeout(() => {
        if (typeof barba !== "undefined") {
          barba.go(href);
        } else {
          window.location.href = href;
        }
      }, CLOSE_DURATION);
    },
    true,
  );
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initModals(document);
    initOutsideClickClose();
    initMenuCloseOnNavigate();
  });
} else {
  initModals(document);
  initOutsideClickClose();
  initMenuCloseOnNavigate();
}
