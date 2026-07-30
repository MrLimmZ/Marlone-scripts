(function () {
  // ─── Patch global DOMContentLoaded ──────────────────────────────────────
  // Beaucoup de code embeds Webflow (existants et futurs) sont écrits en
  // `document.addEventListener('DOMContentLoaded', fn)`. Cet évènement ne se
  // déclenche qu'UNE SEULE FOIS dans toute la vie du document — donc quand
  // Barba ré-exécute ces scripts après une transition, `fn` s'enregistre
  // pour un évènement déjà passé et ne se lance jamais.
  //
  // Plutôt que de corriger chaque code embed un par un, on intercepte ces
  // enregistrements : si le DOM est déjà prêt au moment de l'appel (ce qui
  // est TOUJOURS le cas lors d'une ré-exécution Barba), on exécute `fn`
  // immédiatement au lieu de l'enregistrer. Comportement inchangé lors du
  // tout premier chargement réel (le DOM n'est pas encore prêt à ce moment).
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
  // Preuve concrète (lue dans webflow.xxx.js) :
  // - Webflow.destroy() déclenche l'évènement global "__wf_destroy"
  // - le module ix3 y est abonné et fait this.interactions.clear() —
  //   ça vide TOUTES les interactions enregistrées (menu, search,
  //   favoris, switch, etc.), de façon PERMANENTE.
  // - Webflow.ready() recrée une instance IX3 neuve mais VIDE : rien ne
  //   rappelle le t.register([...]) d'origine, car cet enregistrement ne
  //   vit que dans le script one-shot généré par Webflow (exécuté une
  //   seule fois au vrai chargement de page, jamais relancé).
  // Conclusion : ne jamais toucher à Webflow.destroy()/ready() ici. Les
  // interactions déclenchées au clic sur la nav (persistante, hors
  // container) continuent de fonctionner nativement sans rien faire,
  // puisque ni les éléments ni les listeners délégués sur document ne
  // sont affectés par le swap Barba.
  // Barba ne remplace jamais <body> — seulement le contenu de
  // data-barba="container". Un attribut custom posé sur <body> par Webflow
  // au vrai chargement d'une page (ex: data-footer-managed="true") reste
  // donc "collé" de la page précédente après une transition Barba, tant
  // qu'on ne le synchronise pas manuellement ici.
  const PAGE_BODY_ATTRIBUTES = ['data-footer-managed'];

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

  function reinitWebflow(data) {
    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(data.next.html, 'text/html');
    const nextPageId = nextDoc.documentElement.getAttribute('data-wf-page');
    if (nextPageId) document.documentElement.setAttribute('data-wf-page', nextPageId);

    syncBodyAttributes(nextDoc);

    const oldIxData = document.querySelector('script[type="application/json"][data-wf-page]');
    const newIxData = nextDoc.querySelector('script[type="application/json"][data-wf-page]');
    if (oldIxData) oldIxData.remove();
    if (newIxData) document.head.appendChild(document.adoptNode(newIxData));
  }

  // ─── Réexécution des scripts présents DANS le contenu qui vient d'être
  // injecté (inline <script> de code embeds spécifiques à la page, et
  // <script src> externes). Un <script> injecté via innerHTML par Barba ne
  // s'exécute jamais tout seul — il faut le remplacer par un clone pour que
  // le navigateur le relance.
  //
  // On récupère aussi les scripts marqués data-page-script="true" — ce sont
  // les scripts ajoutés en "Before </body>" dans Page Settings Webflow,
  // spécifiques à une page, qui vivent HORS du container Barba. On les
  // cible explicitement par cet attribut plutôt que d'essayer de deviner/
  // exclure les scripts globaux (jQuery, Webflow, GSAP, Lenis, nos loaders,
  // Barba...) qui eux sont déjà chargés et ne doivent jamais être rejoués.
  function reexecuteScripts(container, nextHtml) {
    // Scripts DANS le container : déjà présents dans le vrai DOM (Barba les
    // a insérés mais ne les a pas exécutés) — on les remplace en place.
    const containerScripts = container.querySelectorAll('script');
    console.log('[BARBA-TEST] scripts dans le container à réexécuter:', containerScripts.length);
    containerScripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.textContent = oldScript.textContent;
      oldScript.replaceWith(newScript);
    });

    // Scripts marqués data-page-script, HORS container ("Before </body>"
    // dans Page Settings) : n'existent que dans le HTML texte récupéré —
    // jamais insérés par Barba puisqu'ils sont en dehors du container.
    // On retire d'abord ceux qu'on avait injectés lors d'une transition
    // précédente, pour ne pas accumuler des listeners en double au fil des
    // navigations, puis on crée et ajoute les nouveaux.
    const oldPageScripts = document.querySelectorAll('script[data-page-script]');
    console.log('[BARBA-TEST] script[data-page-script] actuellement dans le DOM (à retirer):', oldPageScripts.length);
    oldPageScripts.forEach((el) => el.remove());

    const parser = new DOMParser();
    const nextDoc = parser.parseFromString(nextHtml, 'text/html');
    const newPageScripts = nextDoc.querySelectorAll('script[data-page-script]');
    console.log('[BARBA-TEST] script[data-page-script] trouvés dans le HTML de la nouvelle page:', newPageScripts.length);
    newPageScripts.forEach((oldScript) => {
      const newScript = document.createElement('script');
      Array.from(oldScript.attributes).forEach((attr) => {
        newScript.setAttribute(attr.name, attr.value);
      });
      newScript.setAttribute('data-injected-by-barba', 'true');
      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
      console.log('[BARBA-TEST] script de page injecté et exécuté.');
    });

    // Même traitement pour les <style> marqués data-page-style, HORS
    // container ("Before </body>" dans Page Settings) — utile seulement si
    // le CSS diffère réellement d'une page de test à l'autre ; sinon le
    // style déjà présent depuis le premier chargement reste valide tel quel.
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
  }

  // ─── Ré-init des features scopées au contenu (pas nav/footer, qui
  // persistent hors du container et restent déjà correctement bindés).
  function reinitContentFeatures(container) {
    if (typeof initImageReveal === 'function') initImageReveal();
    if (typeof initProductCardHover === 'function') initProductCardHover();
    if (typeof initLightbox === 'function') initLightbox();
    if (typeof window.__revealSetupAndStart === 'function') window.__revealSetupAndStart();
  }

  function initBarba() {
    barba.init({
      preventRunning: true,
      transitions: [
        {
          name: 'default',

          async leave(data) {
            if (typeof window.__modals !== 'undefined' && window.__modals.closeAll) {
              window.__modals.closeAll();
            }

            if (typeof window.__transitionCoverInstant === 'function') {
              window.__barbaGen = window.__transitionCoverInstant();
              await window.__transitionRevealMask(window.__barbaGen);
            } else {
              // Filet de sécurité si transition.js n'est pas chargé/exposé
              await new Promise((resolve) => setTimeout(resolve, 450));
            }
          },

          async afterEnter(data) {
            reinitWebflow(data);
            reexecuteScripts(data.next.container, data.next.html);

            if (typeof initFooterReveal === 'function') {
              initFooterReveal();
            }

            if (window.lenis) {
              window.lenis.resize();
              window.lenis.scrollTo(0, { immediate: true });
            } else {
              window.scrollTo(0, 0);
            }

            reinitContentFeatures(data.next.container);

            if (typeof initPageFeatures === 'function') {
              initPageFeatures(data.next.container);
            }

            window.dispatchEvent(new CustomEvent('transition:done'));

            // Double rAF : garantit que le navigateur a eu au moins une
            // frame complète pour peindre le nouveau contenu (déjà dans le
            // DOM à ce stade) pendant qu'il est encore caché derrière
            // l'overlay, avant de lancer l'animation de révélation.
            await new Promise((resolve) => {
              requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
              });
            });

            // Second resize() Lenis, une fois le paint garanti : le premier
            // resize() (juste après le swap) peut capturer une hauteur de
            // page obsolète si le nouveau contenu n'est pas encore rendu,
            // ce qui bloque le scroll virtuel de Lenis avant le vrai bas
            // de page (symptôme : le footer ne se révèle jamais au scroll).
            if (window.lenis) {
              window.lenis.resize();
            }

            // Barba garde l'ancien container dans le DOM jusqu'à la toute
            // fin de la chaîne de hooks (pour permettre des transitions
            // crossfade custom) — on le cache nous-mêmes ici pour être sûr
            // que seul le nouveau contenu soit visible pendant la révélation,
            // sans attendre le nettoyage tardif de Barba.
            if (data.current && data.current.container && document.body.contains(data.current.container)) {
              data.current.container.style.display = 'none';
            }

            if (typeof window.__transitionHideOverlay === 'function') {
              await window.__transitionHideOverlay(window.__barbaGen);
            }

            // Filet de sécurité : si des images encore en chargement à ce
            // stade changent la hauteur de la page une fois arrivées,
            // Lenis doit s'en rendre compte pour ne pas rester bloqué sur
            // une hauteur de page trop courte.
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