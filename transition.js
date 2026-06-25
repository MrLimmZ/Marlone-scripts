/* ============================================================
   PAGE TRANSITION
   ============================================================ */
(function () {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  const textEls = overlay.querySelectorAll('.div-block-235 > div');

  // Textes fixes indépendants de l'overlay pour effet clip naturel
  textEls.forEach((el) => {
    el.style.position = 'fixed';
    el.style.bottom = '10%';
    el.style.left = '5%';
    el.style.zIndex = '100000';
    el.style.transform = 'translateY(40px)';
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  });

  function playEnter() {
    overlay.classList.remove('w-condition-invisible');
    overlay.style.display = 'flex';
    overlay.style.transition = 'none';
    overlay.style.transform = 'translateY(0)';
    overlay.offsetHeight; // force reflow
    overlay.style.transition = 'transform 0.7s cubic-bezier(0.76, 0, 0.24, 1)';
    overlay.style.transform = 'translateY(-100%)';
  }

  function playExit(href) {
    overlay.classList.remove('w-condition-invisible');
    overlay.style.display = 'flex';
    overlay.style.transition = 'none';
    overlay.style.transform = 'translateY(100%)';

    textEls.forEach((el) => {
      el.style.transition = 'none';
      el.style.transform = 'translateY(40px)';
      el.style.opacity = '0';
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transition = 'transform 0.7s cubic-bezier(0.76, 0, 0.24, 1)';
        overlay.style.transform = 'translateY(0)';

        // Textes avec stagger pendant que l'overlay monte
        textEls.forEach((el, i) => {
          setTimeout(() => {
            el.style.transition = 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.6s ease';
            el.style.transform = 'translateY(0)';
            el.style.opacity = '1';
          }, 200 + i * 80);
        });

        setTimeout(() => {
          window.location.href = href;
        }, 700);
      });
    });
  }

  const normalize = (p) => p.replace(/\/$/, '') || '/';

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    const href = link.href;
    if (!href) return;
    if (link.target === '_blank') return;
    if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
    if (link.origin !== window.location.origin) return;
    if (normalize(link.pathname) === normalize(window.location.pathname)) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    playExit(href);
  });

  document.addEventListener('DOMContentLoaded', playEnter);

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) playEnter();
  });
})();
