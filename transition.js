<script>
  (function () {
    const overlay = document.getElementById('page-transition');
    if (!overlay) return;

    overlay.classList.remove('w-condition-invisible');
    overlay.style.display = 'flex';
    overlay.style.transform = 'translateY(0vh)';
    overlay.style.transition = 'none';
    overlay.style.overflow = 'hidden';

    const content = overlay.querySelector('.transition-content');
    const textEls = content ? Array.from(content.children) : [];

    if (content) {
      content.style.transition = 'none';
      content.style.transform = 'translateY(0vh)';
      content.style.willChange = 'transform';
    }

    textEls.forEach((el) => {
      el.style.willChange = 'transform, opacity';
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });

    const EASE = 'cubic-bezier(0.6, 0, 0.8, 0.6)';
    const DURATION = 0.45;

    const TEXT_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const OPACITY_EASE = 'ease-in-out';
    const TEXT_RISE = '1.5em';

    const APPEAR_TRANSLATE_DURATION = 0.7;
    const APPEAR_OPACITY_DELAY = 0.15;
    const APPEAR_OPACITY_DURATION = 0.2;

    const DISAPPEAR_TRANSLATE_DURATION = 0.35;
    const DISAPPEAR_OPACITY_DELAY = 0.15;
    const DISAPPEAR_OPACITY_DURATION = 0.12;

    // Délai avant que l'overlay ne se cache et que la page ne se débloque,
    // une fois l'animation de disparition du texte lancée (doit couvrir
    // DISAPPEAR_TRANSLATE_DURATION + un peu de marge).
    const OVERLAY_HIDE_DELAY = 600;

    // Transition entre pages (playExit) : temps d'affichage de l'overlay
    // avant la navigation réelle. Doit laisser le mask + le texte se voir,
    // sans traîner.
    const EXIT_HOLD_BEFORE_NAVIGATE = 1100;

    // Arrivée sur une nouvelle page (playEnter, pas premier chargement) :
    // temps d'affichage avant de lancer la disparition de l'overlay.
    const SUBSEQUENT_LOAD_HOLD = 450;

    // Premier chargement : durée mini pour ne jamais paraître précipitée,
    // et plafond de sécurité pour ne jamais bloquer si une ressource traîne.
    const FIRST_LOAD_MIN_HOLD = 1600;
    const FIRST_LOAD_MAX_HOLD = 6000;

    let generation = 0;
    let pendingTimeouts = [];

    function clearPending() {
      pendingTimeouts.forEach(clearTimeout);
      pendingTimeouts = [];
    }

    function scheduleFor(gen, fn, delay) {
      const id = setTimeout(() => {
        if (gen !== generation) return;
        fn();
      }, delay);
      pendingTimeouts.push(id);
      return id;
    }

    function setMask(overlayVh, withTransition) {
      const t = withTransition ? `transform ${DURATION}s ${EASE}` : 'none';

      overlay.style.transition = t;
      overlay.style.transform = `translateY(${overlayVh}vh)`;

      if (content) {
        content.style.transition = t;
        content.style.transform = `translateY(${-overlayVh}vh)`;
      }
    }

    function textTransition(opacityDuration, opacityDelay, translateDuration) {
      return `opacity ${opacityDuration}s ${OPACITY_EASE} ${opacityDelay}s, transform ${translateDuration}s ${TEXT_EASE}`;
    }

    function textSetHidden() {
      textEls.forEach((el) => {
        el.style.transition = 'none';
        el.style.opacity = '0';
        el.style.transform = `translateY(${TEXT_RISE})`;
      });
    }

    function textSetVisible() {
      textEls.forEach((el) => {
        el.style.transition = 'none';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }

    function textAppear() {
      textEls.forEach((el) => {
        el.style.transition = textTransition(APPEAR_OPACITY_DURATION, APPEAR_OPACITY_DELAY, APPEAR_TRANSLATE_DURATION);
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    }

    function textDisappear() {
      textEls.forEach((el) => {
        el.style.transition = textTransition(DISAPPEAR_OPACITY_DURATION, DISAPPEAR_OPACITY_DELAY, DISAPPEAR_TRANSLATE_DURATION);
        el.style.opacity = '0';
        el.style.transform = `translateY(-${TEXT_RISE})`;
      });
    }

    function forceReflow() {
      overlay.offsetHeight;
    }

    // Attend le chargement RÉEL de la page (images, CSS, fonts), pas juste le DOM.
    function waitForPageReady() {
      const loadPromise =
        document.readyState === 'complete'
          ? Promise.resolve()
          : new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
      const fontsPromise =
        document.fonts && document.fonts.ready
          ? document.fonts.ready.catch(() => {})
          : Promise.resolve();
      return Promise.all([loadPromise, fontsPromise]);
    }

    let scrollLockCount = 0;

    function lockScroll() {
      scrollLockCount++;
      if (scrollLockCount === 1) {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      }
    }

    function unlockScroll() {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      }
    }

    let navigating = false;

    function runExitSequence(gen) {
      forceReflow();
      setMask(-100, true);
      textDisappear();

      scheduleFor(
        gen,
        () => {
          overlay.style.display = 'none';
          window.dispatchEvent(new CustomEvent('transition:done'));
          unlockScroll();
        },
        OVERLAY_HIDE_DELAY,
      );
    }

    function playEnter(isFirstLoad) {
      generation++;
      const gen = generation;
      clearPending();
      navigating = false;

      overlay.classList.remove('w-condition-invisible');
      overlay.style.display = 'flex';
      lockScroll();

      setMask(0, false);

      if (isFirstLoad) {
        textSetHidden();
      } else {
        textSetVisible();
      }

      forceReflow();

      if (isFirstLoad) {
        scheduleFor(
          gen,
          () => {
            textAppear();
          },
          600,
        );

        // On lance la sortie seulement quand la page est vraiment prête,
        // avec une durée mini garantie et un plafond de sécurité.
        const startTime = performance.now();

        function proceedToExit() {
          if (gen !== generation) return;
          const elapsed = performance.now() - startTime;
          const remaining = Math.max(0, FIRST_LOAD_MIN_HOLD - elapsed);
          scheduleFor(gen, () => runExitSequence(gen), remaining);
        }

        Promise.race([
          waitForPageReady(),
          new Promise((resolve) => setTimeout(resolve, FIRST_LOAD_MAX_HOLD)),
        ]).then(proceedToExit);
      } else {
        scheduleFor(gen, () => runExitSequence(gen), SUBSEQUENT_LOAD_HOLD);
      }
    }

    function playExit(href) {
      if (navigating) return;
      navigating = true;

      generation++;
      const gen = generation;
      clearPending();

      overlay.classList.remove('w-condition-invisible');
      overlay.style.display = 'flex';
      lockScroll();

      setMask(100, false);
      textSetHidden();
      forceReflow();

      requestAnimationFrame(() => {
        if (gen !== generation) return;
        requestAnimationFrame(() => {
          if (gen !== generation) return;
          forceReflow();
          setMask(0, true);

          const appearTotal = Math.max(APPEAR_TRANSLATE_DURATION, APPEAR_OPACITY_DELAY + APPEAR_OPACITY_DURATION) * 1000;
          const leadIn = Math.max(0, DURATION * 1000 - appearTotal);
          scheduleFor(
            gen,
            () => {
              textAppear();
            },
            leadIn,
          );

          scheduleFor(
            gen,
            () => {
              overlay.style.transition = 'none';
              overlay.style.transform = 'translateY(0vh)';
              if (content) {
                content.style.transition = 'none';
                content.style.transform = 'translateY(0vh)';
              }
              textEls.forEach((el) => {
                el.style.transition = 'none';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
              });
              window.location.href = href;
            },
            EXIT_HOLD_BEFORE_NAVIGATE,
          );
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

    function initTransitionEnter() {
      const navEntry = performance.getEntriesByType('navigation')[0];
      const isReload = navEntry && navEntry.type === 'reload';
      const isFirstLoad = !sessionStorage.getItem('visited') || isReload;
      sessionStorage.setItem('visited', '1');
      playEnter(isFirstLoad);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTransitionEnter);
    } else {
      initTransitionEnter();
    }

    window.addEventListener('pageshow', function (e) {
      if (e.persisted) playEnter(false);
    });
  })();
</script>
