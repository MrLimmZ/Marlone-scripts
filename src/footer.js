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
  let locked = false;
  let atBottomSince = null;
  const AT_BOTTOM_DELAY = 400;
  let wheelAccumulator = 0;
  const WHEEL_THRESHOLD = 200;
  const DRAG_THRESHOLD = 60;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      footer.classList.add('is-ready');
    });
  });

  function showFooter() {
    footer.classList.add('is-visible');
    footer.scrollTop = 0;
    footerVisible = true;
    document.documentElement.classList.add('snap-active');
    if (window.lenis) window.lenis.stop();
  }

  function hideFooter() {
    footer.classList.remove('is-visible');
    footerVisible = false;
    document.documentElement.classList.remove('snap-active');
    if (window.lenis && (typeof hasOpenModal !== 'function' || !hasOpenModal()) && !document.body.classList.contains('lightbox-open')) {
      window.lenis.start();
    }
  }

  function lock(cb) {
    if (locked) return;
    locked = true;
    window._snapLocked = true;
    cb();
    setTimeout(() => {
      locked = false;
      window._snapLocked = false;
    }, 1100);
  }

  function isAtBottomOfFooter() {
    return footer.scrollTop + footer.clientHeight >= footer.scrollHeight - 50;
  }

  function isAtTopOfFooter() {
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
    if (locked) return;
    if (!footerVisible) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = window.scrollY >= maxScroll - 20;
      if (atBottom && deltaY < -DRAG_THRESHOLD) lock(() => showFooter());
    } else {
      if (deltaY > DRAG_THRESHOLD && isAtTopOfFooter()) lock(() => hideFooter());
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
    if (locked) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (footerVisible) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY > 0) {
        if (!isAtBottomOfFooter()) footer.scrollTop += e.deltaY;
      } else {
        if (isAtTopOfFooter()) {
          wheelAccumulator = 0;
          lock(() => hideFooter());
        } else {
          footer.scrollTop += e.deltaY;
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
        lock(() => showFooter());
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
  };
}