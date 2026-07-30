function initFixedSectionSnap(options) {
  const {
    key = 'default',
    sections: sectionSelectors,
    threshold = 200,
    lockDuration = 1100,
    disableBelowWidth = 992,
    entry = {},
    onEnter,
    onLeave,
    onExitToFlow,
    getScrollProxy,
    isEligible,
    enableTouch = true,
  } = options;

  const cleanupKey = `__fixedSectionSnapCleanup_${key}`;
  if (window[cleanupKey]) {
    window[cleanupKey]();
  }

  if (window.innerWidth < disableBelowWidth) return;

  const cleanupFns = [];
  function registerCleanup(fn) {
    cleanupFns.push(fn);
  }

  const sections = sectionSelectors.map((sel) => document.querySelector(sel)).filter(Boolean);
  if (!sections.length) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sections.forEach((el) => el.classList.add('is-ready'));
    });
  });

  let currentIndex = -1;
  let locked = false;
  let wheelAccumulator = 0;
  let hasReachedBottom = false;

  function current() {
    return currentIndex >= 0 ? sections[currentIndex] : null;
  }

  function proxyFor(section) {
    if (typeof getScrollProxy === 'function') {
      const proxy = getScrollProxy(section);
      if (proxy) return proxy;
    }
    return {
      isAtTop: () => section.scrollTop <= 10,
      isAtBottom: () => section.scrollTop + section.clientHeight >= section.scrollHeight - 50,
      scrollBy: (delta) => {
        section.scrollTop += delta;
      },
      reset: () => {
        section.scrollTop = 0;
      },
    };
  }

  function isAtTopOfCurrent() {
    const section = current();
    if (!section) return false;
    return proxyFor(section).isAtTop();
  }

  function isAtBottomOfCurrent() {
    const section = current();
    if (!section) return false;
    return proxyFor(section).isAtBottom();
  }

  function scrollCurrent(delta) {
    const section = current();
    if (!section) return;
    proxyFor(section).scrollBy(delta);
  }

  function lock(cb) {
    if (locked) return;
    locked = true;
    window._snapLocked = true;
    cb();
    setTimeout(() => {
      locked = false;
      window._snapLocked = false;
      wheelAccumulator = 0;
    }, lockDuration);
  }

  function showNext() {
    const next = currentIndex + 1;
    if (next >= sections.length) return false;
    const section = sections[next];
    section.classList.add('is-visible');
    proxyFor(section).reset();
    currentIndex = next;
    hasReachedBottom = false;
    wheelAccumulator = 0;
    if (typeof onEnter === 'function') onEnter(currentIndex, section);
    return true;
  }

  function hideCurrent() {
    const section = current();
    if (!section) return false;
    section.classList.remove('is-visible');
    const leavingIndex = currentIndex;
    currentIndex--;
    if (typeof onLeave === 'function') onLeave(leavingIndex, section);
    if (currentIndex < 0) {
      if (typeof onExitToFlow === 'function') {
        onExitToFlow();
      } else {
        hasReachedBottom = true;
      }
    }
    return true;
  }

  function isEntryReached() {
    if (entry.mode === 'elementBottom' && entry.element) {
      const el = typeof entry.element === 'string' ? document.querySelector(entry.element) : entry.element;
      if (!el || !window.lenis) return false;
      const bottom = el.offsetTop + el.offsetHeight;
      return window.lenis.scroll + window.innerHeight >= bottom - 50;
    }
    if (!window.lenis) {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      return window.scrollY >= maxScroll - 20;
    }
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    return window.lenis.scroll >= maxScroll - 20;
  }

  let lenisScrollHandler = null;
  function bindEntryDetection() {
    if (entry.manual) {
      hasReachedBottom = true;
      return;
    }
    function check(scroll) {
      if (currentIndex >= 0) {
        hasReachedBottom = false;
        return;
      }
      const reached = isEntryReached();
      hasReachedBottom = reached;
      if (!reached) wheelAccumulator = 0;
    }
    if (window.lenis) {
      lenisScrollHandler = ({ scroll }) => check(scroll);
      window.lenis.on('scroll', lenisScrollHandler);
      registerCleanup(() => {
        if (window.lenis && typeof window.lenis.off === 'function' && lenisScrollHandler) {
          window.lenis.off('scroll', lenisScrollHandler);
        }
      });
    } else {
      const poll = setInterval(() => {
        if (window.lenis) {
          clearInterval(poll);
          lenisScrollHandler = ({ scroll }) => check(scroll);
          window.lenis.on('scroll', lenisScrollHandler);
          registerCleanup(() => {
            if (window.lenis && typeof window.lenis.off === 'function' && lenisScrollHandler) {
              window.lenis.off('scroll', lenisScrollHandler);
            }
          });
        }
      }, 50);
      registerCleanup(() => clearInterval(poll));
    }
  }
  bindEntryDetection();

  function processDelta(e, deltaY, preventFn) {
    if (document.body.classList.contains('lightbox-open')) return;
    if (typeof hasOpenModal === 'function' && hasOpenModal()) return;
    if (typeof isEligible === 'function' && !isEligible(e)) return;

    const inFixedMode = currentIndex >= 0;

    if (inFixedMode) {
      if (locked) {
        preventFn();
        return;
      }
      const section = current();
      const proxy = proxyFor(section);
      if (deltaY > 0) {
        if (isAtBottomOfCurrent()) {
          preventFn();
          wheelAccumulator += deltaY;
          if (wheelAccumulator >= threshold && currentIndex + 1 < sections.length) {
            wheelAccumulator = 0;
            lock(() => showNext());
          }
        } else if (proxy.nativeScroll) {
          wheelAccumulator = 0;
        } else {
          wheelAccumulator = 0;
          preventFn();
          scrollCurrent(deltaY);
        }
      } else if (deltaY < 0) {
        if (isAtTopOfCurrent()) {
          preventFn();
          wheelAccumulator += deltaY;
          if (wheelAccumulator <= -threshold) {
            wheelAccumulator = 0;
            lock(() => hideCurrent());
          }
        } else if (proxy.nativeScroll) {
          wheelAccumulator = 0;
        } else {
          wheelAccumulator = 0;
          preventFn();
          scrollCurrent(deltaY);
        }
      }
      return;
    }

    if (locked) {
      preventFn();
      return;
    }

    if (deltaY > 0 && hasReachedBottom) {
      preventFn();
      wheelAccumulator += deltaY;
      if (wheelAccumulator >= threshold) {
        wheelAccumulator = 0;
        lock(() => showNext());
      }
      return;
    }

    wheelAccumulator = 0;
  }

  const wheelHandler = (e) => {
    processDelta(e, e.deltaY, () => e.preventDefault());
  };
  window.addEventListener('wheel', wheelHandler, { passive: false, capture: true });
  registerCleanup(() => window.removeEventListener('wheel', wheelHandler, { capture: true }));

  if (enableTouch) {
    let touchStartY = 0;
    let lastTouchY = 0;
    let isTouchTracking = false;

    const touchStartHandler = (e) => {
      if (e.touches.length !== 1) return;
      isTouchTracking = true;
      touchStartY = e.touches[0].clientY;
      lastTouchY = touchStartY;
    };
    const touchMoveHandler = (e) => {
      if (!isTouchTracking || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const deltaY = lastTouchY - y;
      lastTouchY = y;
      if (deltaY === 0) return;
      processDelta(e, deltaY * 3, () => e.preventDefault());
    };
    const touchEndHandler = () => {
      isTouchTracking = false;
    };

    window.addEventListener('touchstart', touchStartHandler, { passive: true, capture: true });
    window.addEventListener('touchmove', touchMoveHandler, { passive: false, capture: true });
    window.addEventListener('touchend', touchEndHandler, { passive: true, capture: true });
    window.addEventListener('touchcancel', touchEndHandler, { passive: true, capture: true });

    registerCleanup(() => {
      window.removeEventListener('touchstart', touchStartHandler, { capture: true });
      window.removeEventListener('touchmove', touchMoveHandler, { capture: true });
      window.removeEventListener('touchend', touchEndHandler, { capture: true });
      window.removeEventListener('touchcancel', touchEndHandler, { capture: true });
    });
  }

  window[cleanupKey] = function () {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });
    cleanupFns.length = 0;
    window[cleanupKey] = null;
  };
}