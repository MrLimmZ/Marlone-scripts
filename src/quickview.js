(function () {
  const quickViewCache = new Map();

  // Réutilisé à plusieurs endroits : durée de l'animation de fermeture de
  // la modal quickview (même valeur que CLOSE_DURATION dans modals.js).
  const QUICKVIEW_CLOSE_DURATION = 600;

  // FIX : barba.go(href) appelé directement en JS ne suivait apparemment
  // pas exactement le même chemin interne que l'interception native d'un
  // clic sur un vrai lien — la page d'arrivée se retrouvait cassée après
  // une navigation initiée depuis la quickview, alors qu'un clic normal
  // sur une card fonctionnait parfaitement. On simule donc un vrai clic
  // sur un <a> temporaire plutôt que d'appeler l'API programmatique : ça
  // passe par exactement le même chemin que n'importe quel autre lien du
  // site, quelle que soit la façon dont Barba intercepte les clics en
  // interne.
  function navigateTo(href) {
    if (typeof barba !== "undefined") {
      const tempLink = document.createElement("a");
      tempLink.href = href;
      tempLink.style.display = "none";
      document.body.appendChild(tempLink);
      tempLink.click();
      tempLink.remove();
    } else {
      window.location.href = href;
    }
  }

  // Vider le cache manuellement depuis la console, utile en dev quand on
  // édite le contenu CMS dans Webflow et qu'on veut retester sans faire
  // de hard refresh. Sans argument : vide tout. Avec une URL : ne vide
  // que ce produit précis.
  window.__quickViewClearCache = function (url) {
    if (url) {
      quickViewCache.delete(url);
      console.log("[QuickView] Cache vidé pour :", url);
    } else {
      quickViewCache.clear();
      console.log("[QuickView] Cache entièrement vidé.");
    }
  };

  // ─── Parsing ────────────────────────────────────────────────────────────
  // On parse le HTML brut avec DOMParser plutôt que de le manipuler en
  // string : ça nous donne un vrai arbre DOM (non attaché à la page) sur
  // lequel on peut réutiliser querySelector/querySelectorAll normalement.
  function parseProductPage(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");

    function text(selector) {
      const el = doc.querySelector(selector);
      return el ? el.textContent.trim() : "";
    }

    function html_(selector) {
      const el = doc.querySelector(selector);
      return el ? el.innerHTML.trim() : "";
    }

    // Slider : on ignore les images placeholder Webflow (w-dyn-bind-empty),
    // qui apparaissent quand le champ CMS "images dark" est vide pour ce
    // produit — sinon on se retrouverait avec un faux slide "placeholder.svg".
    function sliderImages(qvValue) {
      const wrapper = doc.querySelector(`[data-qv="${qvValue}"]`);
      if (!wrapper) return [];
      return Array.from(wrapper.querySelectorAll(".slider-item"))
        .filter((img) => !img.classList.contains("w-dyn-bind-empty"))
        .map((img) => img.getAttribute("src"))
        .filter(Boolean);
    }

    // Les 4 sous-modals n'existent pas forcément (contenu CMS vide côté
    // Webflow => bloc w-dyn-empty), et leurs boutons d'ouverture
    // correspondants peuvent carrément être absents du DOM (comme sur la
    // page Jacob 1094, où .div-block-190 est vide). On se base UNIQUEMENT
    // sur la présence du bouton [data-modal-open="{panelName}"] : c'est
    // Webflow qui décide déjà (via sa visibilité conditionnelle dans le
    // Designer) de l'afficher ou non selon que le champ CMS est rempli —
    // pas besoin de revérifier le contenu nous-mêmes. Une détection
    // maison du "vide" (classes .w-dyn-empty/.w-dyn-bind-empty, présence
    // de texte/image/lien...) s'est révélée fragile et parfois en
    // désaccord avec la réalité de la page — la présence du bouton est
    // le signal le plus fiable.
    function modalData(panelName) {
      const panel = doc.querySelector(`[data-modal-panel="${panelName}"]`);
      const button = doc.querySelector(`[data-modal-open="${panelName}"]`);
      if (!panel || !button) return null;

      // FIX : la modal téléchargement n'a PAS de wrapper .modal-body — sa
      // structure va directement de .modal-header à .collection-list-wrapper-16
      // (liste CMS multi-référence), contrairement à
      // description/dimensions/photometriques qui utilisent tous
      // .modal-body > .modal-body_text (champ rich text classique). D'où
      // le repli sur .collection-list-wrapper-16 si .modal-body est absent.
      const body = panel.querySelector(".modal-body") || panel.querySelector(".collection-list-wrapper-16");
      if (!body) return null;

      return {
        title: text(`[data-modal-panel="${panelName}"] .modal_title`),
        bodyHTML: body.innerHTML.trim(),
      };
    }

    return {
      name: text('[data-qv="name"]'),
      ref: text('[data-qv="ref"]'),
      subtitle: text('[data-qv="subtitle"]'),
      description: html_('[data-qv="description"]'),
      sliderLight: sliderImages("slider-light"),
      sliderDark: sliderImages("slider-dark"),
      modals: {
        description: modalData("description"),
        dimensions: modalData("dimensions"),
        photometriques: modalData("photometriques"),
        download: modalData("download"),
      },
    };
  }

  // ─── Rendu du slider ────────────────────────────────────────────────────
  // Choisit le jeu d'images (light/dark) selon le thème actif, avec repli
  // sur l'autre jeu si celui du thème courant est vide (même logique que
  // applyCardTheme ailleurs sur le site : image || imageDark || '').
  function currentSliderImages(data) {
    const isLight = document.body.classList.contains("theme-light");
    const primary = isLight ? data.sliderLight : data.sliderDark;
    const fallback = isLight ? data.sliderDark : data.sliderLight;
    return primary.length ? primary : fallback;
  }

  // ─── CSS scroll-snap + chevrons ─────────────────────────────────────────
  // Injecté une seule fois, sur le même principe que le style de la
  // lightbox : scroll-snap natif (fluide, swipe tactile gratuit sur
  // mobile) plutôt qu'un système de pagination fait main en JS.
  const sliderNavStyle = document.createElement("style");
  sliderNavStyle.textContent = `
    [data-qv-modal="slider-track"] {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    [data-qv-modal="slider-track"]::-webkit-scrollbar {
      display: none;
    }
    [data-qv-modal="slider-track"] .modal-body_slider-image {
      scroll-snap-align: start;
      flex-shrink: 0;
      transition: transform 0.3s ease;
    }
    [data-qv-modal="slider-track"] .modal-body_slider-image:hover {
      transform: scale(1.02);
    }
    .qv-slider-wrapper {
      position: relative;
      isolation: isolate;
    }
    [data-qv-modal="slider-track"] {
      position: relative;
      z-index: 1;
    }
    .qv-slider-prev,
    .qv-slider-next {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 16px;
      cursor: pointer;
      color: currentColor;
      z-index: 20;
      -webkit-tap-highlight-color: transparent;
      transition: opacity 0.2s;
    }
    .qv-slider-prev:hover,
    .qv-slider-next:hover {
      opacity: 0.75;
    }
    .qv-slider-prev:hover,
    .qv-slider-next:hover {
      opacity: 0.75;
    }
    .qv-slider-prev {
      left: 8px;
    }
    .qv-slider-next {
      right: 8px;
    }
    .qv-slider-prev svg,
    .qv-slider-next svg {
      width: 24px;
      height: 24px;
      display: block;
    }
    .qv-slider-prev.is-hidden,
    .qv-slider-next.is-hidden {
      opacity: 0;
      pointer-events: none;
    }
  `;
  document.head.appendChild(sliderNavStyle);

  // Entoure le track d'un wrapper position:relative (nécessaire pour que
  // les chevrons se positionnent par rapport au slider et non par rapport
  // à toute la modal-body). Ne fait rien si déjà fait lors d'une
  // précédente ouverture — le wrapper persiste, seul le contenu du track
  // est reconstruit à chaque fois (voir renderQuickViewSlider).
  function ensureSliderWrapper(track) {
    if (!track) return null;
    if (track.dataset.sliderWrapped === "true") {
      return track.parentElement;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "qv-slider-wrapper";
    track.parentNode.insertBefore(wrapper, track);
    wrapper.appendChild(track);
    track.dataset.sliderWrapped = "true";
    return wrapper;
  }

  // Crée les deux boutons une seule fois (mêmes SVG que le reste du site,
  // cf. initMobileSlider/initInfiniteSliders), les réutilise ensuite.
  function ensureSliderNavButtons(wrapper) {
    let prevBtn = wrapper.querySelector(".qv-slider-prev");
    let nextBtn = wrapper.querySelector(".qv-slider-next");
    if (prevBtn && nextBtn) return { prevBtn, nextBtn };

    prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "qv-slider-prev";
    prevBtn.setAttribute("aria-label", "Précédent");
    prevBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "qv-slider-next";
    nextBtn.setAttribute("aria-label", "Suivant");
    nextBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    wrapper.appendChild(prevBtn);
    wrapper.appendChild(nextBtn);

    return { prevBtn, nextBtn };
  }

  // Bascule la visibilité de chaque chevron selon la position de scroll
  // réelle du track (pas juste au clic, aussi au scroll tactile/trackpad
  // direct, pour rester synchronisé quel que soit le mode d'interaction).
  function updateSliderChevrons(track, prevBtn, nextBtn) {
    const maxScroll = track.scrollWidth - track.clientWidth;
    if (prevBtn) prevBtn.classList.toggle("is-hidden", track.scrollLeft <= 4);
    if (nextBtn) nextBtn.classList.toggle("is-hidden", track.scrollLeft >= maxScroll - 4);
  }

  function initSliderNav(track) {
    if (!track) return;
    const wrapper = ensureSliderWrapper(track);
    if (!wrapper) return;
    const { prevBtn, nextBtn } = ensureSliderNavButtons(wrapper);

    function scrollByOne(direction) {
      const firstImg = track.querySelector(".modal-body_slider-image");
      const step = firstImg ? firstImg.getBoundingClientRect().width : track.clientWidth;
      track.scrollBy({ left: direction * step, behavior: "smooth" });
    }

    // Boutons créés une seule fois (voir ensureSliderNavButtons) : on ne
    // pose les listeners qu'une fois aussi, pour ne pas les empiler à
    // chaque ouverture de la quickview.
    if (prevBtn.dataset.sliderNavInit !== "true") {
      prevBtn.dataset.sliderNavInit = "true";
      prevBtn.addEventListener("click", () => scrollByOne(-1));
    }
    if (nextBtn.dataset.sliderNavInit !== "true") {
      nextBtn.dataset.sliderNavInit = "true";
      nextBtn.addEventListener("click", () => scrollByOne(1));
    }

    if (track.dataset.sliderNavScrollInit !== "true") {
      track.dataset.sliderNavScrollInit = "true";
      track.addEventListener("scroll", () => updateSliderChevrons(track, prevBtn, nextBtn), { passive: true });
      window.addEventListener("resize", () => updateSliderChevrons(track, prevBtn, nextBtn));
    }

    // Le track vient d'être reconstruit (nouvelles images) : on remet le
    // scroll à zéro et on recalcule les chevrons une fois les images
    // effectivement mises en page (requestAnimationFrame, pas juste après
    // l'insertion synchrone où les largeurs ne sont pas encore fiables).
    track.scrollLeft = 0;
    requestAnimationFrame(() => updateSliderChevrons(track, prevBtn, nextBtn));
  }

  function renderQuickViewSlider(track, data) {
    if (!track) return;
    track.innerHTML = "";
    currentSliderImages(data).forEach((src) => {
      const img = document.createElement("img");
      img.src = src;
      img.loading = "lazy";
      img.alt = "";
      img.className = "modal-body_slider-image";
      // Réutilise le système de lightbox existant : ces attributs suffisent
      // pour que bindSourceImage() le capte, à condition d'appeler
      // window._bindAllLightboxImages() juste après (fait plus bas).
      img.setAttribute("data-lightbox", "");
      img.setAttribute("data-lightbox-group", "quickview");
      track.appendChild(img);
    });

    if (typeof window._bindAllLightboxImages === "function") {
      window._bindAllLightboxImages();
    }

    initSliderNav(track);
  }

  // Garde une référence aux données actuellement affichées dans la modal,
  // pour pouvoir re-rendre le slider si le thème change pendant qu'elle
  // est ouverte (sans refetch, juste un re-rendu depuis le cache).
  let currentQuickViewData = null;

  // FIX : cet observer devait ne réagir qu'aux changements de thème, mais
  // observait TOUT changement de classe sur <body> — or openModal()/
  // closeModal() (modals.js) ajoutent/retirent aussi une classe sur
  // <body> (bodyClass, ex: "quickview-open"), via un setTimeout déclenché
  // 1s APRÈS que la modal soit déjà visible à l'écran. Ça redéclenchait
  // renderQuickViewSlider() (donc un reset du scroll à zéro) alors que la
  // modal était déjà pleinement affichée — d'où le flash visible de
  // repositionnement du slider à l'ouverture. On compare maintenant
  // explicitement l'état theme-light avant/après pour ignorer tout le
  // reste.
  let qvLastIsLight = document.body.classList.contains("theme-light");

  const qvThemeObserver = new MutationObserver(() => {
    const isLightNow = document.body.classList.contains("theme-light");
    if (isLightNow === qvLastIsLight) return;
    qvLastIsLight = isLightNow;

    if (!currentQuickViewData) return;
    const track = document.querySelector(
      '[data-modal-panel="quickview"] [data-qv-modal="slider-track"]',
    );
    renderQuickViewSlider(track, currentQuickViewData);
  });
  qvThemeObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // ─── Boutons des 4 sous-modals ──────────────────────────────────────────
  // Pour l'instant on gère uniquement leur visibilité : un bouton
  // [data-qv-modal="open-{key}"] n'est affiché QUE si data.modals[key]
  // existe (contenu CMS non vide sur la page produit source ET bouton
  // présent côté page source — voir modalData() dans parseProductPage).
  // Le clic/l'ouverture effective de ces sous-modals sera géré à l'étape
  // suivante.
  const SUBMODAL_KEYS = ["description", "dimensions", "photometriques", "download"];

  function updateQuickViewButtons(modal, data) {
    SUBMODAL_KEYS.forEach((key) => {
      const btn = modal.querySelector(`[data-qv-modal="open-${key}"]`);
      if (!btn) return; // pas grave si pas encore ajouté dans le template
      const hasContent = !!data.modals[key];
      btn.style.display = hasContent ? "" : "none";
    });
  }

  // Injecte le titre + le contenu de chaque sous-modal dans son panneau
  // dédié [data-modal-panel="qv-{key}"], créé en Designer comme sibling
  // de .nav-quickview. L'ouverture/fermeture elles-mêmes sont déjà gérées
  // nativement par bindModalTriggers() (modals.js) au chargement de la
  // page, puisque ces boutons sont statiques dans le DOM — on n'a besoin
  // que de remplir le contenu ici, rien d'autre à coder pour le clic.
  function updateSubmodalContent(data) {
    SUBMODAL_KEYS.forEach((key) => {
      const panel = document.querySelector(`[data-modal-panel="qv-${key}"]`);
      if (!panel) return; // pas grave si pas encore créé dans le template

      const body = panel.querySelector(".modal-body");
      if (body) {
        const modalInfo = data.modals[key];
        body.innerHTML = modalInfo ? modalInfo.bodyHTML : "";
      }

      const titleEl = panel.querySelector(".modal_title");
      const modalInfo = data.modals[key];
      if (titleEl && modalInfo && modalInfo.title) {
        titleEl.textContent = modalInfo.title;
      }
    });
  }

  // ─── Remplissage + ouverture de la modal ───────────────────────────────
  function populateQuickView(data, url) {
    const modal = document.querySelector('[data-modal-panel="quickview"]');
    if (!modal) {
      console.warn('[QuickView] Panneau [data-modal-panel="quickview"] introuvable.');
      return;
    }

    const nameEl = modal.querySelector('[data-qv-modal="name"]');
    const subtitleEl = modal.querySelector('[data-qv-modal="subtitle"]');
    const descEl = modal.querySelector('[data-qv-modal="description"]');
    const sliderTrack = modal.querySelector('[data-qv-modal="slider-track"]');
    const urlEl = modal.querySelector('[data-qv-modal="url"]');

    if (!nameEl) console.warn('[QuickView] [data-qv-modal="name"] introuvable dans le template.');
    if (!subtitleEl) console.warn('[QuickView] [data-qv-modal="subtitle"] introuvable dans le template.');
    if (!descEl) console.warn('[QuickView] [data-qv-modal="description"] introuvable dans le template.');
    if (!sliderTrack) console.warn('[QuickView] [data-qv-modal="slider-track"] introuvable dans le template — le slider ne sera pas mis à jour.');
    if (!urlEl) console.warn('[QuickView] [data-qv-modal="url"] introuvable dans le template.');

    if (nameEl) {
      nameEl.textContent = [data.name, data.ref].filter(Boolean).join(" ");
    }
    if (subtitleEl) subtitleEl.textContent = data.subtitle || "";
    if (descEl) descEl.innerHTML = data.description || "";
    if (urlEl) {
      urlEl.href = url;
      // Cet élément semble hériter d'un display:none en dur (probablement
      // dupliqué depuis le bouton "Tout voir" de la modal recherche, qui
      // est caché par défaut et rendu visible conditionnellement par
      // initSearch()). On force explicitement l'affichage ici, puisque
      // rien d'autre ne le fait pour la quickview.
      urlEl.style.removeProperty("display");
    }

    renderQuickViewSlider(sliderTrack, data);
    updateQuickViewButtons(modal, data);
    updateSubmodalContent(data);
  }

  function showQuickView(data, url) {
    currentQuickViewData = data;
    populateQuickView(data, url);
    if (typeof window.__modals?.open === "function") {
      window.__modals.open("quickview");
    }
  }

  function openQuickView(url) {
    console.log("[QuickView] openQuickView appelé avec :", url);

    if (quickViewCache.has(url)) {
      console.log("[QuickView] Trouvé en cache :", quickViewCache.get(url));
      showQuickView(quickViewCache.get(url), url);
      return;
    }

    console.log("[QuickView] Pas en cache, fetch en cours...");

    fetch(url)
      .then((res) => {
        console.log("[QuickView] Réponse HTTP reçue, statut :", res.status, res.ok);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((html) => {
        console.log("[QuickView] HTML brut reçu, longueur :", html.length);
        console.log(html);

        const data = parseProductPage(html);
        console.log("[QuickView] Données parsées :", data);

        quickViewCache.set(url, data);
        showQuickView(data, url);
      })
      .catch((err) => {
        console.error("[QuickView] Erreur de fetch pour", url, err);
      });
  }

  document.addEventListener(
    "click",
    function (e) {
      const trigger = e.target.closest('[data-quick-view="true"]');
      if (!trigger) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = trigger.matches("a[href]") ? trigger : trigger.querySelector("a[href]");
      if (!link) return;

      // Phase de capture + stopPropagation : garantit qu'on s'exécute
      // avant tout listener en phase bulle (Barba y compris), peu importe
      // l'ordre de concaténation des fichiers src/*.js dans main.js.
      e.preventDefault();
      e.stopPropagation();

      openQuickView(link.href);
    },
    true,
  );

  // ─── Clic sur "voir la page" (data-qv-modal="url") ─────────────────────
  // Même pattern que initMenuCloseOnNavigate() dans modals.js : on ferme
  // proprement la modal quickview d'abord, puis on navigue seulement une
  // fois l'animation de fermeture terminée (CLOSE_DURATION = 600ms côté
  // modals.js), pour ne pas couper la transition en pleine animation.
  document.addEventListener(
    "click",
    function (e) {
      const link = e.target.closest('[data-qv-modal="url"]');
      if (!link) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      e.preventDefault();
      e.stopPropagation();

      if (typeof window.__modals?.close === "function" && window.__modals.isOpen("quickview")) {
        window.__modals.close("quickview");
        setTimeout(() => navigateTo(href), QUICKVIEW_CLOSE_DURATION);
      } else {
        navigateTo(href);
      }
    },
    true,
  );

  // ─── Clic sur un bouton de sous-modal (description/dimensions/...) ────
  // On gère ce clic nous-mêmes plutôt que de dépendre du comportement
  // natif de bindModalTriggers() pour data-modal-open="qv-{key}" : on
  // veut explicitement FERMER quickview d'abord, attendre la fin de son
  // animation de fermeture, puis OUVRIR la sous-modal correspondante —
  // comportement qu'on ne peut pas garantir sans savoir si modals.js gère
  // déjà l'exclusivité entre modals partageant le même overlay group.
  // On intercepte donc le clic en amont (capture + stopPropagation) pour
  // ne laisser aucune ambiguïté sur le comportement.
  document.addEventListener(
    "click",
    function (e) {
      const btn = e.target.closest('[data-qv-modal^="open-"]');
      if (!btn) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const key = btn.getAttribute("data-qv-modal").replace("open-", "");
      if (!SUBMODAL_KEYS.includes(key)) return;

      e.preventDefault();
      e.stopPropagation();

      const subModalName = `qv-${key}`;

      function openSubModal() {
        if (typeof window.__modals?.open === "function") {
          window.__modals.open(subModalName);
        } else {
          console.warn("[QuickView] window.__modals.open introuvable.");
        }
      }

      if (typeof window.__modals?.close === "function" && window.__modals.isOpen("quickview")) {
        window.__modals.close("quickview");
        setTimeout(openSubModal, QUICKVIEW_CLOSE_DURATION);
      } else {
        openSubModal();
      }
    },
    true,
  );

  // ─── Clic sur "Fermer" à l'intérieur d'une sous-modal qv-* ─────────────
  // Le binding natif de bindModalTriggers() sur ces boutons de fermeture
  // ne se déclenche pas de façon fiable (confirmé : window.__modals.close()
  // fonctionne très bien appelé manuellement en console, donc le problème
  // n'est pas closeModal() lui-même mais le fait que le clic ne l'atteint
  // jamais). Plutôt que de continuer à chercher pourquoi côté binding
  // natif, on gère ce clic nous-mêmes, uniquement pour les panneaux
  // préfixés "qv-" (ne touche pas aux vrais data-modal-close du reste du
  // site — search/favoris/menu/quickview elle-même — qui fonctionnent
  // déjà correctement).
  document.addEventListener(
    "click",
    function (e) {
      const closeBtn = e.target.closest('[data-modal-close^="qv-"]');
      if (!closeBtn) return;
      if (e.button !== 0) return;

      e.preventDefault();
      e.stopPropagation();

      const name = closeBtn.getAttribute("data-modal-close");
      if (typeof window.__modals?.close === "function") {
        window.__modals.close(name);
      } else {
        console.warn("[QuickView] window.__modals.close introuvable.");
      }
    },
    true,
  );

  // ─── Retour automatique à la quickview à la fermeture d'une sous-modal ──
  // On observe directement l'état réel des panneaux qv-* plutôt que
  // d'accrocher cette logique au clic sur "Fermer" : une sous-modal peut
  // aussi se fermer via un clic à l'extérieur (initOutsideClickClose) ou
  // la touche Échap (closeAllModals), deux chemins qui appellent
  // closeModal() directement sans jamais passer par notre handler de
  // clic. Observer le panneau lui-même couvre les trois cas de façon
  // uniforme, sans dupliquer la logique de réouverture à trois endroits.
  //
  // FIX : la version précédente faisait `document.querySelector(...)` UNE
  // SEULE FOIS par panneau, au chargement du script, puis observait CE
  // nœud DOM précis. Si Barba remplace la zone contenant .nav-quickview
  // lors d'une transition de page, ces références devenaient obsolètes —
  // les nouveaux panneaux (fraîchement insérés) n'étaient plus observés
  // du tout, cassant silencieusement ce comportement après navigation.
  // On utilise maintenant UN SEUL observer sur document.body (qui, lui,
  // persiste toujours across Barba) avec subtree:true, et on identifie le
  // panneau concerné à partir de mutation.target à chaque déclenchement —
  // donc jamais de référence figée à un nœud précis, robuste peu importe
  // combien de fois le DOM a été remplacé entre-temps.
  const qvSubmodalOpenState = {};

  function handleSubmodalStyleChange(panel) {
    if (!panel || panel.nodeType !== 1 || typeof panel.matches !== "function") return;
    if (!panel.matches("[data-modal-panel]")) return;

    const panelName = panel.dataset.modalPanel || "";
    if (!panelName.startsWith("qv-")) return;
    const key = panelName.replace("qv-", "");
    if (!SUBMODAL_KEYS.includes(key)) return;

    const isOpenNow = window.getComputedStyle(panel).display !== "none";
    const wasOpen = qvSubmodalOpenState[panelName] ?? false;

    if (wasOpen && !isOpenNow) {
      if (typeof window.__modals?.open === "function") {
        window.__modals.open("quickview");
      }
    }
    qvSubmodalOpenState[panelName] = isOpenNow;
  }

  const submodalCloseObserver = new MutationObserver((mutations) => {
    mutations.forEach((m) => handleSubmodalStyleChange(m.target));
  });

  submodalCloseObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
    subtree: true,
  });
})();