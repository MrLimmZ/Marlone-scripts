/* ============================================================
   MODALS — escape key, scroll lock, nav overlay fix
   ============================================================ */
(function () {
  let escapeKeyBound = false;

  function hasOpenModal() {
    const modalClasses = [
      'menu-open', 'favorites-open', 'search-open', 'newsletter-open',
      'langage-open', 'dimensions-modal-open', 'photometrie-modal-open',
      'description-modal-open', 'download-modal-open',
    ];
    return modalClasses.some((cls) => document.body.classList.contains(cls));
  }

  function initEscapeKey() {
    if (escapeKeyBound) return;
    escapeKeyBound = true;
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.key !== 'ArrowRight') return;
      const lightbox = document.getElementById('slide-lightbox');
      if (lightbox && lightbox.classList.contains('open')) return;
      if (!window.Webflow) return;
      const wfIx = Webflow.require('ix3');
      if (!wfIx) return;
      if (document.body.classList.contains('menu-open')) wfIx.emit('close-menu');
      if (document.body.classList.contains('favorites-open')) wfIx.emit('close-favorites');
      if (document.body.classList.contains('search-open')) wfIx.emit('close-search');
      if (document.body.classList.contains('newsletter-open')) wfIx.emit('close-newsletter');
      if (document.body.classList.contains('langage-open')) wfIx.emit('close-langage');
      if (document.body.classList.contains('dimensions-modal-open')) wfIx.emit('close-modal-dimensions');
      if (document.body.classList.contains('photometrie-modal-open')) wfIx.emit('close-modal-photometriques');
      if (document.body.classList.contains('description-modal-open')) wfIx.emit('close-modal-description');
      if (document.body.classList.contains('download-modal-open')) wfIx.emit('close-modal-download');
    });
  }

  function initModalScrollLock() {
    const observer = new MutationObserver(() => {
      if (!window.lenis) return;
      const isOpen = hasOpenModal();
      if (isOpen || document.body.classList.contains('lightbox-open')) {
        window.lenis.stop();
      } else {
        window.lenis.start();
      }
      const pageContent = document.querySelectorAll('main, .footer, .nav-bar, .page-container');
      pageContent.forEach((el) => {
        el.style.pointerEvents = isOpen ? 'none' : 'auto';
        el.style.userSelect = isOpen ? 'none' : 'auto';
      });
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  function initNavOverlayFix() {
    if (!window.Webflow) return;
    const menuMap = [
      { bodyClass: 'menu-open', contentSelector: '.nav-menu', closeEvent: 'close-menu' },
      { bodyClass: 'favorites-open', contentSelector: '.favorites-wrapper', closeEvent: 'close-favorites' },
      { bodyClass: 'search-open', contentSelector: '.search-wrapper', closeEvent: 'close-search' },
      { bodyClass: 'newsletter-open', contentSelector: '.newsletter-wrapper', closeEvent: 'close-newsletter' },
      { bodyClass: 'langage-open', contentSelector: '.langage', closeEvent: 'close-langage' },
      { bodyClass: 'description-modal-open', contentSelector: '.modal-description', closeEvent: 'close-modal-description' },
      { bodyClass: 'dimensions-modal-open', contentSelector: '.modal-dimensions', closeEvent: 'close-modal-dimensions' },
      { bodyClass: 'photometrie-modal-open', contentSelector: '.modal-photometriques', closeEvent: 'close-modal-photometriques' },
      { bodyClass: 'download-modal-open', contentSelector: '.modal-download', closeEvent: 'close-modal-download' },
    ];
    document.addEventListener('click', (e) => {
      if (!window.Webflow) return;
      const wfIx = Webflow.require('ix3');
      if (!wfIx) return;
      for (const { bodyClass, contentSelector, closeEvent } of menuMap) {
        if (!document.body.classList.contains(bodyClass)) continue;
        const content = document.querySelector(contentSelector);
        if (content && content.contains(e.target)) continue;
        wfIx.emit(closeEvent);
        break;
      }
    });
  }

  window._hasOpenModal = hasOpenModal;

  document.addEventListener('DOMContentLoaded', () => {
    initEscapeKey();
    initModalScrollLock();
    initNavOverlayFix();
  });
})();
