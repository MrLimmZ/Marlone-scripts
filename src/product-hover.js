function initProductCardHover() {
  const noHover = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (noHover) return;

  document.querySelectorAll(".product-link").forEach((card) => {
    if (card.closest('[data-skip-hover]')) return;

    if (card.dataset.hoverInit === "true") return;

    const header = card.querySelector(".product-card-header");
    const subtitle = card.querySelector(".product-card-subtitle");
    if (!header || !subtitle) return;

    // FIX : si la card est actuellement dans un ancêtre display:none
    // (ex: modal recherche fermée au chargement de la page),
    // header.offsetHeight vaut 0 — pas parce que le header est vide,
    // mais parce que rien n'est rendu. Si on marquait hoverInit=true ici
    // quand même, la hauteur "0px" restait figée pour toujours, même une
    // fois la modal ouverte, puisque cette card ne serait plus jamais
    // retraitée. On skip donc SANS poser le flag, pour pouvoir réessayer
    // plus tard (voir l'observer plus bas) une fois la card réellement
    // visible.
    const headerHeight = header.offsetHeight;
    if (headerHeight === 0) return;

    card.dataset.hoverInit = "true";

    const container = document.createElement("div");
    container.style.cssText = "position: relative;";
    header.parentNode.insertBefore(container, header);
    container.appendChild(header);
    container.appendChild(subtitle);

    container.style.height = headerHeight + "px";
    container.style.overflow = "hidden";

    subtitle.style.cssText = `
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: ${headerHeight}px;
      align-items: center;
    `;

    const subtitleInner = subtitle.querySelector(".product-card-subtitle_text");

    gsap.set(header, { y: 0 });
    gsap.set(subtitleInner, { y: headerHeight });

    card.addEventListener("mouseenter", () => {
      gsap.to(header, {
        y: -headerHeight,
        duration: 0.6,
        ease: "power3.inOut",
      });
      gsap.to(subtitleInner, { y: 0, duration: 0.6, ease: "power3.inOut" });
    });

    card.addEventListener("mouseleave", () => {
      gsap.to(header, { y: 0, duration: 0.6, ease: "power3.inOut" });
      gsap.to(subtitleInner, {
        y: headerHeight,
        duration: 0.6,
        ease: "power3.inOut",
      });
    });
  });
}

// FILET DE SÉCURITÉ : relance initProductCardHover() dès qu'un ancêtre
// caché (ex: modal recherche) devient visible, ou qu'une nouvelle card
// est injectée dans le DOM. Les cards déjà correctement initialisées
// (hoverInit === "true") ressortent immédiatement de la boucle, donc pas
// de double-binding des listeners mouseenter/mouseleave.
// initAll() se charge déjà du tout premier appel (DOMContentLoaded) et
// des transitions de page (transition:done) — cet observer ne fait que
// compléter ces deux appels avec un cas qu'ils ne couvrent pas :
// l'ouverture d'une modal après coup.
(function watchHiddenHoverCards() {
  let pending = false;

  function scheduleRecheck() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      initProductCardHover();
    });
  }

  const styleObserver = new MutationObserver(() => {
    scheduleRecheck();
  });

  styleObserver.observe(document.body, {
    attributes: true,
    attributeFilter: ["style", "class"],
    subtree: true,
  });

  const insertObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length) {
        scheduleRecheck();
        return;
      }
    }
  });

  insertObserver.observe(document.body, { childList: true, subtree: true });
})();