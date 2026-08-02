function initFixedSectionSnap(options) {
  const {
    key = "default",
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

  if (window.innerWidth < disableBelowWidth) {
    return;
  }

  const cleanupFns = [];

  function registerCleanup(fn) {
    cleanupFns.push(fn);
  }

  const sections = sectionSelectors
    .map((sel) => document.querySelector(sel))
    .filter(Boolean);

  if (!sections.length) {
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sections.forEach((el) => el.classList.add("is-ready"));
    });
  });

  let currentIndex = -1;
  let locked = false;
  let wheelAccumulator = 0;
  let hasReachedBottom = false;

  function current() {
    return currentIndex >= 0 ? sections[currentIndex] : null;
  }

  const nestedLenisInstances = new Map();

  function ensureNestedLenis(section) {
    if (nestedLenisInstances.has(section)) {
      return nestedLenisInstances.get(section);
    }

    if (typeof Lenis === "undefined") return null;
    if (section.scrollHeight <= section.clientHeight + 10) return null;

    const isMobile = window.innerWidth < 992;

    const instance = new Lenis({
      wrapper: section,
      content: section.firstElementChild || section,
      duration: isMobile ? 0.3 : 1.1,
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: isMobile ? 0.9 : 1,
      autoRaf: true,
    });

    nestedLenisInstances.set(section, instance);

    registerCleanup(() => {
      instance.destroy();
      nestedLenisInstances.delete(section);
    });

    return instance;
  }

  function proxyFor(section) {
    if (typeof getScrollProxy === "function") {
      const proxy = getScrollProxy(section);
      if (proxy) return proxy;
    }

    const nested = ensureNestedLenis(section);

    if (nested) {
      return {
        isAtTop: () => nested.scroll <= 10,
        isAtBottom: () => nested.scroll >= nested.limit - 10,
        scrollBy: () => {},
        reset: () => nested.scrollTo(0, { immediate: true }),
        nativeScroll: true,
      };
    }

    return {
      isAtTop: () => section.scrollTop <= 10,
      isAtBottom: () =>
        section.scrollTop + section.clientHeight >= section.scrollHeight - 50,
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

    if (next >= sections.length) {
      return false;
    }

    const section = sections[next];

    section.classList.add("is-visible");
    proxyFor(section).reset();

    const wasInFixedMode = currentIndex >= 0;

    currentIndex = next;
    hasReachedBottom = false;
    wheelAccumulator = 0;

    if (!wasInFixedMode) {
      document.documentElement.classList.add("snap-active");

      if (window.lenis) {
        window.lenis.stop();
      }
    }

    if (typeof onEnter === "function") {
      onEnter(currentIndex, section);
    }

    return true;
  }

  function hideCurrent() {
    const section = current();

    if (!section) return false;

    section.classList.remove("is-visible");

    const leavingIndex = currentIndex;
    currentIndex--;

    if (typeof onLeave === "function") {
      onLeave(leavingIndex, section);
    }

    if (currentIndex < 0) {
      document.documentElement.classList.remove("snap-active");

      if (
        window.lenis &&
        (typeof hasOpenModal !== "function" || !hasOpenModal()) &&
        !document.body.classList.contains("lightbox-open")
      ) {
        window.lenis.start();
      }

      if (typeof onExitToFlow === "function") {
        onExitToFlow();
      } else {
        hasReachedBottom = true;
      }
    }

    return true;
  }

  function getCurrentScroll() {
    return window.lenis ? window.lenis.scroll : window.scrollY;
  }

  function isEntryReached() {
    if (entry.mode === "elementBottom" && entry.element) {
      const el =
        typeof entry.element === "string"
          ? document.querySelector(entry.element)
          : entry.element;

      if (!el) {
        return false;
      }

      const bottom = el.offsetTop + el.offsetHeight;
      const scroll = getCurrentScroll();

      return scroll + window.innerHeight >= bottom - 50;
    }

    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;

    return getCurrentScroll() >= maxScroll - 20;
  }

  let lenisScrollHandler = null;
  let nativeScrollHandler = null;

  function bindEntryDetection() {
    if (entry.manual) {
      hasReachedBottom = true;
      return;
    }

    function check() {
      if (currentIndex >= 0) {
        hasReachedBottom = false;
        return;
      }

      const reached = isEntryReached();
      hasReachedBottom = reached;

      if (!reached) {
        wheelAccumulator = 0;
      }
    }

    if (window.lenis) {
      lenisScrollHandler = () => check();

      window.lenis.on("scroll", lenisScrollHandler);

      registerCleanup(() => {
        if (
          window.lenis &&
          typeof window.lenis.off === "function" &&
          lenisScrollHandler
        ) {
          window.lenis.off("scroll", lenisScrollHandler);
        }
      });
    } else {
      nativeScrollHandler = () => check();

      window.addEventListener("scroll", nativeScrollHandler, {
        passive: true,
      });

      registerCleanup(() =>
        window.removeEventListener("scroll", nativeScrollHandler),
      );

      check();
    }
  }

  bindEntryDetection();

  const TOUCH_THRESHOLD_MULTIPLIER = 3;

  function processDelta(e, deltaY, preventFn, isTouch, softPreventFn) {
    if (document.body.classList.contains("lightbox-open")) return;
    if (typeof hasOpenModal === "function" && hasOpenModal()) return;

    const inFixedMode = currentIndex >= 0;
    const thresholdDelta = isTouch
      ? deltaY * TOUCH_THRESHOLD_MULTIPLIER
      : deltaY;

    if (!inFixedMode && typeof isEligible === "function") {
      const point =
        e.touches && e.touches[0]
          ? e.touches[0]
          : e.changedTouches && e.changedTouches[0]
            ? e.changedTouches[0]
            : e;

      const normalized = {
        clientX: point.clientX,
        clientY: point.clientY,
        deltaY,
      };

      const eligible = isEligible(normalized);

      if (!eligible) return;
    }

    if (inFixedMode) {
      if (locked) {
        preventFn();
        return;
      }

      const section = current();
      const proxy = proxyFor(section);

      const atBottom = isAtBottomOfCurrent();
      const atTop = isAtTopOfCurrent();

      if (deltaY > 0) {
        if (atBottom) {
          preventFn();

          wheelAccumulator += thresholdDelta;

          if (
            wheelAccumulator >= threshold &&
            currentIndex + 1 < sections.length
          ) {
            wheelAccumulator = 0;
            lock(() => showNext());
          }
        } else if (proxy.nativeScroll) {
          if (isTouch && typeof softPreventFn === "function") {
            softPreventFn();
          }

          wheelAccumulator = 0;
        } else {
          wheelAccumulator = 0;
          preventFn();
          scrollCurrent(deltaY);
        }
      } else if (deltaY < 0) {
        if (atTop) {
          preventFn();

          wheelAccumulator += thresholdDelta;

          if (wheelAccumulator <= -threshold) {
            wheelAccumulator = 0;
            lock(() => hideCurrent());
          }
        } else if (proxy.nativeScroll) {
          if (isTouch && typeof softPreventFn === "function") {
            softPreventFn();
          }

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

      wheelAccumulator += thresholdDelta;

      if (wheelAccumulator >= threshold) {
        wheelAccumulator = 0;
        lock(() => showNext());
      }

      return;
    }

    wheelAccumulator = 0;
  }

  const wheelHandler = (e) => {
    processDelta(
      e,
      e.deltaY,
      () => {
        e.preventDefault();
        e.stopPropagation();

        if (typeof e.stopImmediatePropagation === "function") {
          e.stopImmediatePropagation();
        }
      },
      false,
    );
  };

  window.addEventListener("wheel", wheelHandler, {
    passive: false,
    capture: true,
  });

  registerCleanup(() =>
    window.removeEventListener("wheel", wheelHandler, {
      capture: true,
    }),
  );

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

      processDelta(
        e,
        deltaY,
        () => {
          e.preventDefault();
          e.stopPropagation();

          if (typeof e.stopImmediatePropagation === "function") {
            e.stopImmediatePropagation();
          }
        },
        true,
        () => e.preventDefault(),
      );
    };

    const touchEndHandler = () => {
      isTouchTracking = false;
    };

    window.addEventListener("touchstart", touchStartHandler, {
      passive: true,
      capture: true,
    });

    window.addEventListener("touchmove", touchMoveHandler, {
      passive: false,
      capture: true,
    });

    window.addEventListener("touchend", touchEndHandler, {
      passive: true,
      capture: true,
    });

    window.addEventListener("touchcancel", touchEndHandler, {
      passive: true,
      capture: true,
    });

    registerCleanup(() => {
      window.removeEventListener("touchstart", touchStartHandler, {
        capture: true,
      });

      window.removeEventListener("touchmove", touchMoveHandler, {
        capture: true,
      });

      window.removeEventListener("touchend", touchEndHandler, {
        capture: true,
      });

      window.removeEventListener("touchcancel", touchEndHandler, {
        capture: true,
      });
    });
  }

  window[`__fixedSectionSnapExitToTop_${key}`] = function () {
    function step() {
      if (currentIndex >= 0) {
        lock(() => hideCurrent());
        setTimeout(step, lockDuration);
      } else if (window.lenis) {
        window.lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }

    step();
  };

  registerCleanup(() => {
    window[`__fixedSectionSnapExitToTop_${key}`] = null;
  });

  window[`__fixedSectionSnapGetIndex_${key}`] = () => currentIndex;

  window[`__fixedSectionSnapRestore_${key}`] = function (targetIndex) {
    if (targetIndex == null || targetIndex < 0) return;

    const clamped = Math.min(targetIndex, sections.length - 1);

    for (let i = 0; i <= clamped; i++) {
      sections[i].classList.add("is-visible");
    }

    const section = sections[clamped];

    proxyFor(section).reset();

    currentIndex = clamped;
    hasReachedBottom = false;
    wheelAccumulator = 0;

    document.documentElement.classList.add("snap-active");

    if (window.lenis) {
      window.lenis.stop();
    }

    if (typeof onEnter === "function") {
      onEnter(currentIndex, section);
    }
  };

  registerCleanup(() => {
    window[`__fixedSectionSnapGetIndex_${key}`] = null;
    window[`__fixedSectionSnapRestore_${key}`] = null;
  });

  window[cleanupKey] = function () {
    cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch (e) {}
    });

    cleanupFns.length = 0;

    sections.forEach((el) => el.classList.remove("is-visible", "is-ready"));

    document.documentElement.classList.remove("snap-active");

    if (
      window.lenis &&
      (typeof hasOpenModal !== "function" || !hasOpenModal()) &&
      !document.body.classList.contains("lightbox-open")
    ) {
      window.lenis.start();
    }

    window[cleanupKey] = null;
  };
}
