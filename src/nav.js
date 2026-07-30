function initNavScrolled() {
  const nav = document.querySelector(".nav.w-nav");
  if (!nav) return;

  const isLightNav = nav.getAttribute("data-nav-theme") === "light";
  if (!isLightNav) return;

  const trigger = document.querySelector(".product-section");
  if (!trigger) return;

  function update() {
    const scrollY = window.scrollY || window.lenis?.scroll || 0;
    const isScrolled = scrollY >= trigger.offsetTop;
    nav.classList.toggle("scrolled", isScrolled);
  }

  window.addEventListener("scroll", update, { passive: true });
  if (window.lenis) {
    window.lenis.on("scroll", update);
  } else {
    const poll = setInterval(() => {
      if (window.lenis) {
        window.lenis.on("scroll", update);
        clearInterval(poll);
      }
    }, 100);
  }
  update();
}

function initFooterLogoHide() {
  const footer = document.querySelector(".footer");
  const logo = document.querySelector(".nav-logo");
  if (!footer || !logo) return;

  const wrapper = logo.closest(".nav-bar-center");
  if (!wrapper) return;
  wrapper.style.overflow = "hidden";

  const observer = new MutationObserver(() => {
    const isVisible = footer.classList.contains("is-visible");
    logo.style.transition = "transform 0.6s cubic-bezier(0.76, 0, 0.24, 1)";
    logo.style.transform = isVisible ? "translateY(-110%)" : "translateY(0)";
  });

  observer.observe(footer, { attributes: true, attributeFilter: ["class"] });
}