(function () {
  (function patchDOMContentLoaded() {
    [document, window].forEach((target) => {
      const nativeAdd = target.addEventListener;
      target.addEventListener = function (type, listener, options) {
        if (type === 'DOMContentLoaded' && document.readyState !== 'loading') {
          if (typeof listener === 'function') {
            setTimeout(listener, 0);
          } else if (listener && typeof listener.handleEvent === 'function') {
            setTimeout(() => listener.handleEvent(), 0);
          }
          return;
        }
        return nativeAdd.call(this, type, listener, options);
      };
    });
  })();

  window.addEventListener(
    'wheel',
    () => {
      console.log('[RAW-WHEEL-DEBUG] wheel détecté au niveau window — overflow html:', document.documentElement.style.overflow, '| overflow body:', document.body.style.overflow, '| lenis isStopped:', window.lenis?.isStopped);
    },
    { passive: true, capture: true },
  );

  document.addEventListener(
    'click',
    function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('data-modal-open') || link.hasAttribute('data-modal-close')) return;
      // Liens qui gèrent leur propre logique de clic (filtres, tris, etc.)
      // et ne doivent jamais être interceptés par ce scroll-to-top.
      if (link.closest('.filters-panel') || link.closest('.filter-slide')) return;

      let url;
      try {
        url = new URL(link.href, window.location.href);
      } catch (err) {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const normalize = (p) => (p || '').replace(/\/$/, '') || '/';
      const samePath = normalize(url.pathname) === normalize(window.location.pathname);
      const sameSearch = url.search === window.location.search;
      if (!samePath || !sameSearch) return;
      if (url.hash && url.hash !== window.location.hash) return;

      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

      function callActiveFixedSectionSnapExit() {
        for (const k in window) {
          if (k.indexOf('__fixedSectionSnapExitToTop_') === 0 && typeof window[k] === 'function') {
            window[k]();
            return true;
          }
        }
        return false;
      }

      if (typeof window.__footerRevealScrollToTop === 'function') {
        window.__footerRevealScrollToTop();
      } else if (callActiveFixedSectionSnapExit()) {
      } else if (window.lenis) {
        window.lenis.scrollTo(0, { duration: 1.2 });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    true,
  );

  function waitFor(checkFn, cb) {
    if (checkFn()) {
      cb();
      return;
    }
    const poll = setInterval(() => {
      if (checkFn()) {
        clearInterval(poll);
        cb();
      }
    }, 50);
  }

  // ⚠️ Webflow.destroy()/Webflow.ready() ne DOIT JAMAIS être appelé ici.
  // Webflow.destroy() vide définitivement toutes les interactions IX3
  // enregistrées (menu, search, favoris, switch...), et Webflow.ready()
  // ne les recrée pas — elles ne vivent que dans le script one-shot généré
  // au vrai chargement de page, jamais relancé.
  const PAGE_BODY_ATTRIBUTES = ['data-footer-managed'];
  const NAV_ATTRIBUTES = ['data-nav-theme'];

  function syncBodyAttributes(nextDoc) {
    PAGE_BODY_ATTRIBUTES.forEach((attr) => {
      const value = nextDoc.body.getAttribute(attr);
      if (value !== null) {
        document.body.setAttribute(attr, value);
      } else {
        document.body.removeAttribute(attr);
      }
    });
  }

  function syncNavAttributes(nextDoc) {
    const liveNav = document.querySelector('.nav[role="banner"]');
    const nextNav = nextDoc.querySelector('.nav[role="banner"]');
    if (!liveNav || !nextNav) return;
    NAV_ATTRIBUTES.forEach((attr) => {
      const value = nextNav.getAttribute(attr);
      if (value !== null) {
        liveNav.setAttribute(attr, value);
      } else {
        liveNav.removeAttribute(attr);
      }
    });
  }

  // Classe native Webflow ("Component Variants" du Designer, ex:
  // w-variant-691a7966-...) — indépendante de notre système data-nav-theme,
  // posée sur la nav ET tous ses descendants (icônes mobile, liens...) par
  // le HTML brut de CHAQUE page. Comme la nav est persistante (jamais
  // remplacée par Barba), cette classe reste collée de la page précédente
  // si on ne la resynchronise pas explicitement — pouvant forcer des
  // couleurs de la page d'origine (ex: texte blanc) sur la page de
  // destination, potentiellement invisible sur fond de couleur différente.
  const WF_VARIANT_PATTERN = /^w-variant-[\w-]+$/;

  function syncNavVariantClass(nextDoc) {
    const liveNav = document.querySelector('.nav[role="banner"]');
    const nextNav = nextDoc.querySelector('.nav[role="banner"]');
    if (!liveNav || !nextNav) return;

    const nextVariantClass = Array.from(nextNav.classList).find((c) => WF_VARIANT_PATTERN.test(c)) || null;

    const liveElsWithVariant = [liveNav, ...liveNav.querySelectorAll('[class*="w-variant-"]')];
    liveElsWithVariant.forEach((el) => {
      const oldVariantClass = Array.from(el.classList).find((c) => WF_VARIANT_PATTERN.test(c));
      if (oldVariantClass) el.classList.remove(oldVariantClass);
      if (nextVariantClass) el.classList.add(nextVariantClass);
    });
  }

  function updateActiveNavLink() {
    const normalize = (p) => (p || '').replace(/\/$/, '') || '/';
    const current = normalize(window.location.pathname);
    document.querySelectorAll('.nav .nav-bar-link, .nav .menu-link').forEach((link) => {
      const isCurrent = normalize(link.pathname) === current;
      link.classList.toggle('w--current', isCurrent);
      if (isCurrent) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function reinitWebflow(data) {
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(data.next.html, 'text/html');
    const nextPageId = nextDoc.documentElement.getAttribute('data-wf-page');
    if (nextPageId) document.documentElement.setAttribute('data-wf-page', nextPageId);

    syncBodyAttributes(nextDoc);
    syncNavAttributes(nextDoc);
    syncNavVariantClass(nextDoc);
    updateActiveNavLink();

    const oldIxData = document.querySelector('script[type="application/json"][data-wf-page]');
    const newIxData = nextDoc.querySelector('script[type="application/json"][data-wf-page]');
    if (oldIxData) oldIxData.remove();
    if (newIxData) document.head.appendChild(document.adoptNode(newIxData));
  }

  function reexecuteScripts(container, nextHtml) {
    const containerScripts = container.querySelectorAll('script');
    containerScripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(nextHtml, 'text/html');

    // Le style DOIT être réinjecté avant le script : un <script> s'exécute
    // immédiatement dès son insertion dans le DOM, donc si le CSS n'est pas
    // encore en place, un script qui vérifie du getComputedStyle (ex:
    // initFixedSectionSnap qui checke position:fixed) verrait l'ancien état
    // ou aucun style du tout — exactement ce qui cassait la séquence fixe
    // sur les pages produit après une transition Barba.
    document.querySelectorAll('style[data-page-style]').forEach((el) => el.remove());

    nextDoc.querySelectorAll('style[data-page-style]').forEach((oldStyle) => {
      const newStyle = document.createElement('style');
      Array.from(oldStyle.attributes).forEach((attr) => {
        newStyle.setAttribute(attr.name, attr.value);
      });
      newStyle.setAttribute('data-injected-by-barba', 'true');
      newStyle.textContent = oldStyle.textContent;
      document.head.appendChild(newStyle);
    });

    const oldPageScripts = document.querySelectorAll('script[data-page-script]');
    oldPageScripts.forEach((el) => el.remove());

    const newPageScripts = nextDoc.querySelectorAll('script[data-page-script]');
    newPageScripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.setAttribute('data-injected-by-barba', 'true');
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
    });
  }

  function reinitContentFeatures(container) {
    if (typeof initImageReveal === 'function') initImageReveal();
    if (typeof initProductCardHover === 'function') initProductCardHover();
    if (typeof initLightbox === 'function') initLightbox();
    if (typeof initNavScrolled === 'function') initNavScrolled();
    if (typeof window.__revealSetup === 'function') window.__revealSetup();
    if (typeof window.__reinitFavorites === 'function') window.__reinitFavorites(container);
    if (typeof window.__initModalScrollLenis === 'function') window.__initModalScrollLenis();
    if (typeof bindModalTriggers === 'function') bindModalTriggers(container);
  }

  function initBarba() {
    barba.init({
      preventRunning: true,
      transitions: [
        {
          name: 'default',

          async leave(data) {
            console.log('[BARBA-DEBUG] leave() — de', data.current?.namespace, 'vers', data.next?.namespace, '| window.lenis isStopped:', window.lenis?.isStopped, '| window._snapLocked:', window._snapLocked);

            if (typeof window.__modals !== 'undefined' && window.__modals.closeAll) {
              window.__modals.closeAll();
            }

            if (typeof window.__transitionCoverInstant === 'function') {
              window.__barbaGen = window.__transitionCoverInstant();
              await window.__transitionRevealMask(window.__barbaGen);
            } else {
              await new Promise((resolve) => setTimeout(resolve, 450));
            }

            console.log('[BARBA-DEBUG] leave() — __currentPageCleanup existe:', typeof window.__currentPageCleanup === 'function');
            if (typeof window.__currentPageCleanup === 'function') {
              window.__currentPageCleanup();
            }

            const foundKeys = [];
            for (const k in window) {
              if (k.indexOf('__fixedSectionSnapCleanup_') === 0 && typeof window[k] === 'function') {
                foundKeys.push(k);
                window[k]();
              }
            }
            console.log('[BARBA-DEBUG] leave() — clés __fixedSectionSnapCleanup_* trouvées et nettoyées:', foundKeys);
            window._snapLocked = false;
            console.log('[BARBA-DEBUG] leave() — fin. window.lenis isStopped:', window.lenis?.isStopped, '| window._snapLocked:', window._snapLocked);
          },

          async afterEnter(data) {
            console.log('[BARBA-DEBUG] afterEnter() début — window.lenis isStopped:', window.lenis?.isStopped, '| window._snapLocked:', window._snapLocked);

            reinitWebflow(data);
            reexecuteScripts(data.next.container, data.next.html);

            console.log('[BARBA-DEBUG] afterEnter() après reexecuteScripts (scripts data-page-script relancés) — window.lenis isStopped:', window.lenis?.isStopped);

            if (typeof initFooterReveal === 'function') {
              initFooterReveal();
            }

            if (window.lenis) {
              window.lenis.resize();
              window.lenis.scrollTo(0, { immediate: true });
            }
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            reinitContentFeatures(data.next.container);

            if (typeof initPageFeatures === 'function') {
              initPageFeatures(data.next.container);
            }

            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });

            if (window.lenis) {
              window.lenis.resize();
              window.lenis.scrollTo(0, { immediate: true });
            }
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            if (data.current && data.current.container && document.body.contains(data.current.container)) {
              data.current.container.style.display = 'none';
            }
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;

            if (typeof window.__transitionHideOverlay === 'function') {
              await window.__transitionHideOverlay(window.__barbaGen);
            }

            window.dispatchEvent(new CustomEvent('transition:done'));

            if (window.lenis) {
              setTimeout(() => window.lenis.resize(), 500);
            }
          },
        },
      ],
    });
  }

  waitFor(() => typeof barba !== 'undefined', initBarba);
})();