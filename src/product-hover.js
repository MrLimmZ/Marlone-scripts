function initProductCardHover() {
  const noHover = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  if (noHover) return;

  document.querySelectorAll(".product-link").forEach((card) => {
    if (card.closest('[data-skip-hover]')) return;

    if (card.dataset.hoverInit === "true") return;
    card.dataset.hoverInit = "true";

    const header = card.querySelector(".product-card-header");
    const subtitle = card.querySelector(".product-card-subtitle");
    if (!header || !subtitle) return;

    const container = document.createElement("div");
    container.style.cssText = "position: relative;";
    header.parentNode.insertBefore(container, header);
    container.appendChild(header);
    container.appendChild(subtitle);

    const headerHeight = header.offsetHeight;
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