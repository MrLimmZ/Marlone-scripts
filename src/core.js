const THEME_KEY = "site_theme";
let escapeKeyBound = false;
let snapWheelHandler = null;
let projectSnapWheelHandler = null;
window._snapLocked = false;

function hasOpenModal() {
  const modalClasses = [
    "menu-open",
    "favorites-open",
    "search-open",
    "newsletter-open",
    "langage-open",
    "dimensions-modal-open",
    "photometrie-modal-open",
    "description-modal-open",
    "download-modal-open",
  ];
  return modalClasses.some((cls) => document.body.classList.contains(cls));
}

function stopLenis() {
  if (window.lenis) window.lenis.stop();
}

function startLenisIfAllowed() {
  if (
    window.lenis &&
    !hasOpenModal() &&
    !document.body.classList.contains("lightbox-open")
  ) {
    window.lenis.start();
  }
}

function applyBannerTheme(isLight) {
  document
    .querySelectorAll(".product-link, .favorites-view-list a")
    .forEach((card) => {
      const lightImg = card.querySelector(".product-card_banner:not(.dark)");
      const darkImg = card.querySelector(".product-card_banner.dark");
      if (lightImg && darkImg) {
        lightImg.style.setProperty(
          "display",
          !isLight ? "none" : "block",
          "important",
        );
        darkImg.style.setProperty(
          "display",
          !isLight ? "block" : "none",
          "important",
        );
      } else if (lightImg && !darkImg) {
        lightImg.style.setProperty("display", "block", "important");
      } else if (!lightImg && darkImg) {
        darkImg.style.setProperty("display", "block", "important");
      }
    });
}

function initThemeSwitch(scope = document) {
  function applyTheme(value) {
    document.body.classList.toggle("theme-light", value === "On");
    localStorage.setItem(THEME_KEY, value);
    applyBannerTheme(value === "On");
  }
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) applyTheme(savedTheme);
  scope.querySelectorAll('[data-switch="switch-theme"]').forEach((switchEl) => {
    const options = switchEl.querySelectorAll(
      ".switch-option[data-switch-value]",
    );
    options.forEach((option) => {
      if (option.dataset.themeInit === "true") return;
      option.dataset.themeInit = "true";
      option.addEventListener("click", () => {
        const value = option.getAttribute("data-switch-value");
        applyTheme(value);
        options.forEach((opt) => {
          opt.classList.toggle(
            "is-active",
            opt.getAttribute("data-switch-value") === value,
          );
        });
      });
    });
    if (savedTheme) {
      options.forEach((opt) => {
        opt.classList.toggle(
          "is-active",
          opt.getAttribute("data-switch-value") === savedTheme,
        );
      });
    }
  });
}

function initEscapeKey() {
  if (escapeKeyBound) return;
  escapeKeyBound = true;
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape" && event.key !== "ArrowRight") return;
    const lightbox = document.getElementById("slide-lightbox");
    if (lightbox && lightbox.classList.contains("open")) return;
    if (!window.Webflow) return;
    const wfIx = Webflow.require("ix3");
    if (!wfIx) return;
    if (document.body.classList.contains("menu-open")) wfIx.emit("close-menu");
    if (document.body.classList.contains("favorites-open"))
      wfIx.emit("close-favorites");
    if (document.body.classList.contains("search-open"))
      wfIx.emit("close-search");
    if (document.body.classList.contains("newsletter-open"))
      wfIx.emit("close-newsletter");
    if (document.body.classList.contains("langage-open"))
      wfIx.emit("close-langage");
    if (document.body.classList.contains("dimensions-modal-open"))
      wfIx.emit("close-modal-dimensions");
    if (document.body.classList.contains("photometrie-modal-open"))
      wfIx.emit("close-modal-photometriques");
    if (document.body.classList.contains("description-modal-open"))
      wfIx.emit("close-modal-description");
    if (document.body.classList.contains("download-modal-open"))
      wfIx.emit("close-modal-download");
  });
}

function initModalScrollLock() {
  const observer = new MutationObserver(() => {
    if (!window.lenis) return;
    const isOpen = hasOpenModal();
    if (isOpen || document.body.classList.contains("lightbox-open")) {
      window.lenis.stop();
    } else {
      window.lenis.start();
    }
    const pageContent = document.querySelectorAll(
      "main, .footer, .nav-bar, .page-container",
    );
    pageContent.forEach((el) => {
      el.style.pointerEvents = isOpen ? "none" : "auto";
      el.style.userSelect = isOpen ? "none" : "auto";
    });
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
}

function initNavOverlayFix() {
  if (!window.Webflow) return;
  const menuMap = [
    {
      bodyClass: "menu-open",
      contentSelector: ".nav-menu",
      closeEvent: "close-menu",
    },
    {
      bodyClass: "favorites-open",
      contentSelector: ".favorites-wrapper",
      closeEvent: "close-favorites",
    },
    {
      bodyClass: "search-open",
      contentSelector: ".search-wrapper",
      closeEvent: "close-search",
    },
    {
      bodyClass: "newsletter-open",
      contentSelector: ".newsletter-wrapper",
      closeEvent: "close-newsletter",
    },
    {
      bodyClass: "langage-open",
      contentSelector: ".langage",
      closeEvent: "close-langage",
    },
    {
      bodyClass: "description-modal-open",
      contentSelector: ".modal-description",
      closeEvent: "close-modal-description",
    },
    {
      bodyClass: "dimensions-modal-open",
      contentSelector: ".modal-dimensions",
      closeEvent: "close-modal-dimensions",
    },
    {
      bodyClass: "photometrie-modal-open",
      contentSelector: ".modal-photometriques",
      closeEvent: "close-modal-photometriques",
    },
    {
      bodyClass: "download-modal-open",
      contentSelector: ".modal-download",
      closeEvent: "close-modal-download",
    },
  ];
  document.addEventListener("click", (e) => {
    if (!window.Webflow) return;
    const wfIx = Webflow.require("ix3");
    if (!wfIx) return;
    for (const { bodyClass, contentSelector, closeEvent } of menuMap) {
      if (!document.body.classList.contains(bodyClass)) continue;
      const content = document.querySelector(contentSelector);
      if (content && content.contains(e.target)) continue;
      wfIx.emit(closeEvent);
      break;
    }
  });
}

function initNavScrolled() {
  const nav = document.querySelector(".nav.w-nav");
  if (!nav) return;

  const isLightNav =
    nav.getAttribute("data-wf--navigation--variant") === "light";
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

function initProjectSnap(lenis) {
  if (projectSnapWheelHandler) {
    window.removeEventListener("wheel", projectSnapWheelHandler, {
      capture: true,
    });
    projectSnapWheelHandler = null;
  }

  const section0 = document.querySelector(".div-block-197");
  const section1 = document.querySelector(".div-block-199");
  if (!section0 || !section1) return;

  const sections = [section0, section1];
  let sectionTops = sections.map((s) => s.offsetTop);
  window.addEventListener("resize", () => {
    sectionTops = sections.map((s) => s.offsetTop);
  });

  let locked = false;

  function goTo(index) {
    if (index < 0 || index >= sections.length) return;
    if (locked) return;
    locked = true;
    window._snapLocked = true;
    lenis.scrollTo(sectionTops[index], {
      duration: 1,
      easing: (t) => 1 - Math.pow(1 - t, 3),
      force: true,
      onComplete: () => {
        setTimeout(() => {
          locked = false;
          window._snapLocked = false;
        }, 200);
      },
    });
  }

  projectSnapWheelHandler = (e) => {
    if (document.body.classList.contains("lightbox-open")) return;
    if (hasOpenModal()) return;
    if (locked) {
      e.preventDefault();
      return;
    }
    const atSection0 =
      lenis.scroll >= sectionTops[0] && lenis.scroll <= sectionTops[0] + 50;
    const atSection1 =
      lenis.scroll >= sectionTops[1] && lenis.scroll <= sectionTops[1] + 50;
    if (atSection0 && e.deltaY > 0) {
      e.preventDefault();
      goTo(1);
    } else if (atSection1 && e.deltaY < 0) {
      e.preventDefault();
      goTo(0);
    }
  };

  window.addEventListener("wheel", projectSnapWheelHandler, {
    passive: false,
    capture: true,
  });
}

function initLenis() {
  if (window.lenis || typeof Lenis === "undefined") return;
  const lenis = new Lenis({
    duration: 1.1,
    smoothWheel: true,
    autoRaf: false,
    prevent: (node) => {
      return (
        node.closest(".modal-body") !== null ||
        node.closest(".favorites-wrapper") !== null ||
        node.closest(".favorites-list") !== null ||
        node.closest(".search") !== null ||
        node.closest(".newsletter-form") !== null ||
        node.closest(".langage") !== null ||
        node.closest("#slide-lightbox") !== null ||
        node.closest(".cookies-modal_text") !== null
      );
    },
    virtualScroll: () => {
      if (window._snapLocked) return false;
      if (document.body.classList.contains("lightbox-open")) return false;
      return true;
    },
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
  window.lenis = lenis;
  setTimeout(() => {
    initProjectSnap(lenis);
  }, 300);
}

function getLightboxImgs(group) {
  if (group) {
    const themedImgs = document.querySelectorAll(
      `img[data-lightbox][data-lightbox-theme][data-lightbox-group="${group}"]`,
    );
    if (themedImgs.length) {
      const currentTheme = document.body.classList.contains("theme-light")
        ? "light"
        : "dark";
      return Array.from(themedImgs).filter(
        (img) => img.dataset.lightboxTheme === currentTheme,
      );
    }
    const staticImgs = document.querySelectorAll(
      `img[data-lightbox][data-lightbox-group="${group}"]`,
    );
    if (staticImgs.length) return Array.from(staticImgs);
    return [];
  }
  const themedImgs = document.querySelectorAll(
    "img[data-lightbox][data-lightbox-theme]",
  );
  if (themedImgs.length) {
    const currentTheme = document.body.classList.contains("theme-light")
      ? "light"
      : "dark";
    return Array.from(themedImgs).filter(
      (img) => img.dataset.lightboxTheme === currentTheme,
    );
  }
  const containers = document.querySelectorAll("[data-lightbox]:not(img)");
  if (containers.length) {
    return Array.from(
      document.querySelectorAll("[data-lightbox]:not(img) img"),
    );
  }
  const staticImgs = document.querySelectorAll("img[data-lightbox]");
  if (staticImgs.length) return Array.from(staticImgs);
  return [];
}

function initCookies() {
  const COOKIES_KEY = "cookies_accepted";
  const cookiesOverlay = document.querySelector(".cookies-overlay");
  if (!cookiesOverlay) return;

  const cookieStyle = document.createElement("style");
  cookieStyle.textContent = `
    .cookies-modal {
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .cookies-modal.is-hiding {
      transform: translateY(150%);
    }
  `;
  document.head.appendChild(cookieStyle);

  if (localStorage.getItem(COOKIES_KEY)) return;

  cookiesOverlay.style.display = "flex";
  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.height = "100%";

  const waitLenis = setInterval(() => {
    if (window.lenis) {
      window.lenis.stop();
      clearInterval(waitLenis);
    }
  }, 50);

  cookiesOverlay
    .querySelectorAll(".cookies-modal_primary, .cookies-modal_secondary")
    .forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        localStorage.setItem(COOKIES_KEY, "1");
        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        startLenisIfAllowed();

        const modal = cookiesOverlay.querySelector(".cookies-modal");
        if (modal) {
          modal.classList.add("is-hiding");
          setTimeout(() => {
            cookiesOverlay.style.display = "none";
          }, 600);
        } else {
          cookiesOverlay.style.display = "none";
        }
      });
    });
}

function getDominantColor(src, cb) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = function () {
    try {
      const canvas = document.createElement("canvas");
      const SIZE = 10;
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      cb(
        `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`,
      );
    } catch (e) {
      cb(null);
    }
  };
  img.onerror = () => cb(null);
  img.src = src;
}

function initImageReveal() {
  const targets = document.querySelectorAll("img[data-reveal]");
  const isDark = !document.body.classList.contains("theme-light");

  targets.forEach((img) => {
    if (img.dataset.revealInit === "true") return;
    img.dataset.revealInit = "true";

    const styleAtInit = img.getAttribute("style") || "";
    if (styleAtInit.includes("display: none")) return;

    const wrapper = document.createElement("div");
    wrapper.style.cssText = `
      position: relative;
      overflow: hidden;
      display: block;
      width: 100%;
      transition: transform 600ms ease-in-out;
    `;

    wrapper.addEventListener("mouseenter", () => {
      wrapper.style.transform = "scale(1.02)";
    });
    wrapper.addEventListener("mouseleave", () => {
      wrapper.style.transform = "scale(1)";
    });

    img.parentNode.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    const bg = document.createElement("div");
    bg.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 1;
      background: ${isDark ? "#1a1a1a" : "#e8e8e8"};
      transition: opacity 0.6s ease;
      pointer-events: none;
    `;
    wrapper.appendChild(bg);

    img.style.position = "relative";
    img.style.zIndex = "2";
    img.style.opacity = "0";
    img.style.transition = "opacity 0.8s ease";
    img.style.width = "100%";

    function reveal() {
      const src = img.currentSrc || img.src;
      if (!src || src.includes("placeholder")) return;
      const styleAtReveal = img.getAttribute("style") || "";
      if (styleAtReveal.includes("display: none")) return;
      getDominantColor(src, (color) => {
        if (color) bg.style.background = color;
        setTimeout(() => {
          const styleAtFade = img.getAttribute("style") || "";
          if (styleAtFade.includes("display: none")) return;
          img.style.opacity = "1";
        }, 400);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(img);
          const styleAtObserve = img.getAttribute("style") || "";
          if (styleAtObserve.includes("display: none")) return;
          if (img.complete && img.naturalWidth > 0) {
            reveal();
          } else {
            img.addEventListener("load", reveal, { once: true });
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(img);
  });
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

function initPageFeatures(scope = document) {
  initThemeSwitch(scope);
  initLightbox();
}

function initProductCardHover() {
  document.querySelectorAll(".product-link").forEach((card) => {
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

function initAll() {
  initCookies();
  initEscapeKey();
  initLenis();
  initNavOverlayFix();
  initPageFeatures(document);
  initModalScrollLock();
  initFooterLogoHide();
  initNavScrolled();
  initProductCardHover();

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) applyBannerTheme(savedTheme === "On");

  initImageReveal();

  const videoObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        const video = entry.target;
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll("video[autoplay]").forEach(function (video) {
    videoObserver.observe(video);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAll);
} else {
  initAll();
}