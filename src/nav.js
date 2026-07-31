function initNavScrolled() {
  if (window.__navScrolledCleanup) {
    window.__navScrolledCleanup();
  }

  const nav = document.querySelector(".nav.w-nav");
  if (!nav) return;
  if (nav.getAttribute("data-nav-theme") !== "light") return;

  const trigger = document.querySelector(".product-section");
  if (!trigger) return;

  function update() {
    const scroll = window.lenis?.scroll ?? window.scrollY ?? 0;
    nav.classList.toggle("scrolled", scroll >= trigger.offsetTop);
  }

  function bind(lenis) {
    lenis.on("scroll", update);
    update();
    window.__navScrolledCleanup = function () {
      if (lenis && typeof lenis.off === "function") lenis.off("scroll", update);
      window.__navScrolledCleanup = null;
    };
  }

  if (window.lenis) {
    bind(window.lenis);
  } else {
    const poll = setInterval(() => {
      if (window.lenis) {
        clearInterval(poll);
        bind(window.lenis);
      }
    }, 100);
    window.__navScrolledCleanup = function () {
      clearInterval(poll);
      window.__navScrolledCleanup = null;
    };
  }
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