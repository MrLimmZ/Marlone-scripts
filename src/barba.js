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
  document.addEventListener(
    'click',
    function (e) {
      const link = e.target.closest('a[href]');
      if (!link) return;
      if (link.target === '_blank') return;
      if (link.hasAttribute('data-modal-open') || link.hasAttribute('data-modal-close')) return;
      if (link.closest('.filters-panel') || link.closest('.filter-slide') || link.closest('.cookies-overlay')) return;
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
            // Sauvegarde la position de scroll ET l'index de section actif
            // (systeme initFixedSectionSnap) de la page qu'on quitte,
            // associes a son URL - pour les restaurer si l'utilisateur
            // revient dessus via le bouton retour du navigateur (voir
            // afterEnter). Doit imperativement se faire AVANT tout appel
            // de cleanup ci-dessous : __currentPageCleanup /
            // __fixedSectionSnapCleanup_* detruisent les fonctions
            // __fixedSectionSnapGetIndex_* qu'on utilise ici.
            try {
              const urlBase = window.location.pathname + window.location.search;
              sessionStorage.setItem('scrollpos:' + urlBase, String(window.scrollY || window.pageYOffset || 0));

              const snapIndices = {};
              for (const k in window) {
                if (k.indexOf('__fixedSectionSnapGetIndex_') === 0 && typeof window[k] === 'function') {
                  const snapKey = k.slice('__fixedSectionSnapGetIndex_'.length);
                  snapIndices[snapKey] = window[k]();
                }
              }
              sessionStorage.setItem('snapindex:' + urlBase, JSON.stringify(snapIndices));
            } catch (e) {}

            if (typeof window.__modals !== 'undefined' && window.__modals.closeAll) {
              window.__modals.closeAll();
            }
            if (typeof window.__transitionCoverInstant === 'function') {
              window.__barbaGen = window.__transitionCoverInstant();
              await window.__transitionRevealMask(window.__barbaGen);
            } else {
              await new Promise((resolve) => setTimeout(resolve, 450));
            }
            if (typeof window.__currentPageCleanup === 'function') {
              window.__currentPageCleanup();
            }
            for (const k in window) {
              if (k.indexOf('__fixedSectionSnapCleanup_') === 0 && typeof window[k] === 'function') {
                window[k]();
              }
            }
            window._snapLocked = false;
          },
          async afterEnter(data) {
            // Navigation via bouton retour/avant du navigateur -> on
            // restaure la position sauvegardee dans leave() (scroll ET
            // index de section active). Navigation normale (clic sur un
            // lien, "Tout voir" de la quickview, barba.go()...) -> on
            // garde le comportement scroll-to-top existant.
            const isBackForward = data.trigger === 'back' || data.trigger === 'forward';

            let restoreY = 0;
            let savedSnapIndices = null;
            if (isBackForward) {
              try {
                const urlBase = new URL(data.next.url.href).pathname + new URL(data.next.url.href).search;
                const savedY = sessionStorage.getItem('scrollpos:' + urlBase);
                restoreY = savedY ? parseInt(savedY, 10) || 0 : 0;
                const savedIndices = sessionStorage.getItem('snapindex:' + urlBase);
                savedSnapIndices = savedIndices ? JSON.parse(savedIndices) : null;
              } catch (e) {
                restoreY = 0;
                savedSnapIndices = null;
              }
            }

            function applyScroll() {
              if (window.lenis) {
                window.lenis.resize();
                window.lenis.scrollTo(restoreY, { immediate: true });
              }
              window.scrollTo(0, restoreY);
              document.documentElement.scrollTop = restoreY;
              document.body.scrollTop = restoreY;
            }

            // Restaure l'index de section active (systeme
            // initFixedSectionSnap) pour un retour arriere. Utilise
            // waitFor() car initSectionSnap (script de la page) attend
            // Lenis de facon asynchrone avant d'appeler
            // initFixedSectionSnap() - la fonction
            // __fixedSectionSnapRestore_${key} n'existe donc pas forcement
            // encore au moment ou on veut l'appeler.
            function restoreSnapIndices() {
              if (!savedSnapIndices) return;
              Object.keys(savedSnapIndices).forEach((snapKey) => {
                const idx = savedSnapIndices[snapKey];
                if (idx == null || idx < 0) return;
                waitFor(
                  () => typeof window[`__fixedSectionSnapRestore_${snapKey}`] === 'function',
                  () => window[`__fixedSectionSnapRestore_${snapKey}`](idx),
                );
              });
            }

            // FIX : l'ancien conteneur doit etre supprime AVANT de relancer
            // les scripts de la nouvelle page (reexecuteScripts), pas
            // apres. Un <script> insere dans le DOM s'execute
            // immediatement, de facon synchrone - donc tant que l'ancien
            // conteneur est encore present, tout document.querySelector()
            // non scope dans le script de la nouvelle page (ex:
            // initSectionSnap cherchant .montage-product-section) risque
            // de matcher l'element de l'ANCIENNE page plutot que celui de
            // la nouvelle, s'il apparait en premier dans l'ordre du DOM.
            reinitWebflow(data);

            if (data.current && data.current.container && document.body.contains(data.current.container)) {
              data.current.container.remove();
            }

            reexecuteScripts(data.next.container, data.next.html);
            if (typeof initFooterReveal === 'function') {
              initFooterReveal();
            }
            applyScroll();
            reinitContentFeatures(data.next.container);
            if (typeof initPageFeatures === 'function') {
              initPageFeatures(data.next.container);
            }
            restoreSnapIndices();
            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });
            applyScroll();
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