function initFooterReveal() {
  if (window.__footerRevealCleanup) {
    window.__footerRevealCleanup();
  }

  if (document.body.dataset.footerManaged === 'true') return;
  const footer = document.querySelector('.footer');
  if (!footer) return;

  const cleanupFns = [];
  function registerCleanup(fn) {
    cleanupFns.push(fn);
  }

  let footerVisible = false;
  let atBottomSince = null;
  const AT_BOTTOM_DELAY = 400;
  let wheelAccumulator = 0;
  const WHEEL_THRESHOLD = 200;
  const DRAG_THRESHOLD = 60;

  let lastToggleTime = 0;
  const TOGGLE_COOLDOWN = 0;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      footer.classList.add('is-ready');
    });
  });

  let footerLenis = null;
  function ensureFooterLenis() {
    if (footerLenis) return footerLenis;
    if (typeof Lenis === 'undefined') return null;
    if (window.innerWidth <= 991) return null;
    footerLenis = new Lenis({
      wrapper: footer,
      content: footer.firstElementChild || footer,
      duration: 1.1,
      smoothWheel: true,
      syncTouch: true,
      autoRaf: true,
    });
    registerCleanup(() => {
      footerLenis.destroy();
      footerLenis = null;
    });
    return footerLenis;
  }

  let lenisRestartTimer = null;
  function clearLenisRestartTimer() {
    if (lenisRestartTimer) {
      clearTimeout(lenisRestartTimer);
      lenisRestartTimer = null;
    }
  }
  registerCleanup(clearLenisRestartTimer);

  function showFooter() {
    clearLenisRestartTimer();
    footer.classList.add('is-visible');
    footerVisible = true;
    lastToggleTime = Date.now();
    document.documentElement.classList.add('snap-active');
    if (window.lenis) window.lenis.stop();
    const fl = ensureFooterLenis();
    if (fl) {
      fl.scrollTo(0, { immediate: true });
      fl.stop();
      const unfreezeTimer = setTimeout(() => {
        if (footerLenis && footerVisible) footerLenis.start();
      }, 1050);
      registerCleanup(() => clearTimeout(unfreezeTimer));
    } else {
      footer.scrollTop = 0;
    }
  }

  function hideFooter() {
    clearLenisRestartTimer();
    footer.classList.remove('is-visible');
    footerVisible = false;
    lastToggleTime = Date.now();
    document.documentElement.classList.remove('snap-active');
    if (footerLenis) footerLenis.stop();
    lenisRestartTimer = setTimeout(() => {
      lenisRestartTimer = null;
      if (!footerVisible && window.lenis && (typeof hasOpenModal !== 'function' || !hasOpenModal()) && !document.body.classList.contains('lightbox-open')) {
        window.lenis.start();
      }
    }, 1050);
  }

  function canToggleNow() {
    return Date.now() - lastToggleTime >= TOGGLE_COOLDOWN;
  }

  function isAtBottomOfFooter() {
    if (footerLenis) return footerLenis.scroll >= footerLenis.limit - 10;
    return footer.scrollTop + footer.clientHeight >= footer.scrollHeight - 50;
  }

  function isAtTopOfFooter() {
    if (footerLenis) return footerLenis.scroll <= 10;
    return footer.scrollTop <= 10;
  }

  function isStabilizedAtBottom() {
    return atBottomSince !== null && Date.now() - atBottomSince >= AT_BOTTOM_DELAY;
  }

  let touchStartY = null;

  const touchStartHandler = (e) => {
    touchStartY = e.touches[0].clientY;
  };

  const touchEndHandler = (e) => {
    if (touchStartY === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    touchStartY = null;
    if (!canToggleNow()) return;
    if (!footerVisible) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= maxScroll - 20;
      if (atBottom && deltaY < -DRAG_THRESHOLD) showFooter();
    } else {
      if (deltaY > DRAG_THRESHOLD && isAtTopOfFooter()) hideFooter();
    }
  };

  document.addEventListener('touchstart', touchStartHandler, { passive: true });
  document.addEventListener('touchend', touchEndHandler, { passive: true });
  registerCleanup(() => {
    document.removeEventListener('touchstart', touchStartHandler);
    document.removeEventListener('touchend', touchEndHandler);
  });

  function onWheel(e) {
    if (typeof hasOpenModal === 'function' && hasOpenModal()) return;

    if (footerVisible) {
      if (e.deltaY > 0) {
        if (isAtBottomOfFooter()) {
          e.preventDefault();
          e.stopPropagation();
        }
      } else {
        if (isAtTopOfFooter()) {
          e.preventDefault();
          e.stopPropagation();
          wheelAccumulator = 0;
          if (canToggleNow()) hideFooter();
        }
      }
      return;
    }

    if (e.deltaY > 0 && isStabilizedAtBottom()) {
      e.preventDefault();
      e.stopPropagation();
      wheelAccumulator += e.deltaY;
      if (wheelAccumulator >= WHEEL_THRESHOLD) {
        wheelAccumulator = 0;
        if (canToggleNow()) showFooter();
      }
      return;
    }

    wheelAccumulator = 0;
  }

  function waitForLenis(cb) {
    if (window.lenis) {
      cb();
      return;
    }
    const poll = setInterval(() => {
      if (window.lenis) {
        clearInterval(poll);
        cb();
      }
    }, 50);
    registerCleanup(() => clearInterval(poll));
  }

  waitForLenis(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 20) {
      if (!atBottomSince) atBottomSince = Date.now();
    }

    const lenisScrollHandler = ({ scroll }) => {
      if (footerVisible) return;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (scroll >= maxScroll - 20) {
        if (!atBottomSince) atBottomSince = Date.now();
      } else {
        atBottomSince = null;
        wheelAccumulator = 0;
      }
    };
    window.lenis.on('scroll', lenisScrollHandler);
    registerCleanup(() => {
      if (window.lenis && typeof window.lenis.off === 'function') {
        window.lenis.off('scroll', lenisScrollHandler);
      }
    });

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    registerCleanup(() => window.removeEventListener('wheel', onWheel, { capture: true }));
  });

  window.__footerRevealCleanup = function () {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    cleanupFns.length = 0;
    footer.classList.remove('is-ready', 'is-visible');
    document.documentElement.classList.remove('snap-active');
    window.__footerRevealCleanup = null;
    window.__footerRevealScrollToTop = null;
  };

  // Exposé pour le clic "même page" (barba-test.js) : si le footer est
  // visible, la molette Lenis principale n'a aucun effet visuel (il est en
  // position:fixed par-dessus tout) — il faut d'abord jouer l'animation de
  // fermeture, PUIS scroller la page principale vers le haut une fois le
  // footer réellement parti de l'écran (~1050ms, transition CSS).
  window.__footerRevealScrollToTop = function () {
    const scrollMainToTop = () => {
      if (window.lenis) window.lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (footerVisible) {
      hideFooter();
      setTimeout(scrollMainToTop, 1050);
    } else {
      scrollMainToTop();
    }
  };
}