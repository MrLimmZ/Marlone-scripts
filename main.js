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

document.addEventListener("DOMContentLoaded", function () {
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
});
function initLightbox() {
  const allImgs = document.querySelectorAll('img[data-lightbox]');
  if (!allImgs.length) return;
  if (document.getElementById('slide-lightbox')) return;

  const globalCursor = document.createElement('div');
  globalCursor.id = 'global-cursor';
  document.body.appendChild(globalCursor);

  const lb = document.createElement('div');
  lb.id = 'slide-lightbox';
  lb.innerHTML = `
    <div id="lb-thumbs"></div>
    <div id="lb-main">
      <div id="lb-track"></div>
    </div>
    <div id="lb-close"></div>
    <div id="lb-cursor"></div>
    <div id="lb-mobile">
      <div id="lb-mobile-track"></div>
      <div id="lb-mobile-nav">
        <button id="lb-prev" aria-label="Précédent">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button id="lb-next" aria-label="Suivant">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div id="lb-progress-bar">
          <div id="lb-progress-fill"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(lb);

  const style = document.createElement('style');
  style.textContent = `
    #global-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 8000;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      display: none;
      mix-blend-mode: difference;
    }
    #global-cursor::before,
    #global-cursor::after {
      content: '';
      position: absolute;
      background: white;
    }
    #global-cursor::before {
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      transform: translateY(-50%);
    }
    #global-cursor::after {
      left: 50%;
      top: 0;
      height: 100%;
      width: 1px;
      transform: translateX(-50%);
    }
    #slide-lightbox {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: var(--background-color, #fff);
      flex-direction: row;
      overflow: hidden;
    }
    #slide-lightbox.open {
      display: flex;
    }
    #lb-thumbs {
      width: 140px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 40px 24px;
      justify-content: center;
      position: relative;
      z-index: 10001;
      overflow-y: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      box-sizing: border-box;
      transition: opacity 0.2s ease;
    }
    #lb-thumbs::-webkit-scrollbar { display: none; }
    .lb-thumb-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      flex-shrink: 0;
    }
    .lb-thumb-spacer {
      width: 6px;
      flex-shrink: 0;
    }
    .lb-thumb {
      width: 80px;
      height: 88px;
      object-fit: cover;
      object-position: center;
      flex-shrink: 0;
      transition: opacity 0.3s;
      opacity: 0.4;
    }
    .lb-thumb-wrap.active .lb-thumb { opacity: 1; }
    #lb-line-indicator {
      position: absolute;
      left: 24px;
      top: 0;
      width: 2px;
      height: 88px;
      background: currentColor;
      pointer-events: none;
    }
    #lb-main {
      flex: 1;
      overflow-y: scroll;
      overflow-x: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
      position: relative;
      z-index: 10000;
    }
    #lb-main::-webkit-scrollbar { display: none; }
    #lb-track {
      display: flex;
      flex-direction: column;
    }
    .lb-slide {
      width: 100%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }
    .lb-slide img {
      max-width: 85%;
      max-height: 85vh;
      object-fit: contain;
      user-select: none;
      will-change: transform;
      transform-origin: center center;
      display: block;
      cursor: none;
    }
    #lb-close {
      position: fixed;
      top: 28px;
      right: 36px;
      width: 20px;
      height: 20px;
      cursor: pointer;
      z-index: 10005;
      user-select: none;
    }
    #lb-close::before,
    #lb-close::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      background: currentColor;
    }
    #lb-close::before { transform: rotate(45deg); }
    #lb-close::after  { transform: rotate(-45deg); }
    #lb-cursor {
      position: fixed;
      pointer-events: none;
      z-index: 10006;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      display: none;
      mix-blend-mode: difference;
    }
    #lb-cursor::before,
    #lb-cursor::after {
      content: '';
      position: absolute;
      background: white;
    }
    #lb-cursor::before {
      top: 50%;
      left: 0;
      width: 100%;
      height: 1px;
      transform: translateY(-50%);
    }
    #lb-cursor::after {
      left: 50%;
      top: 0;
      height: 100%;
      width: 1px;
      transform: translateX(-50%);
      transition: opacity 0.15s;
    }
    #lb-cursor.is-minus::after { opacity: 0; }
    #lb-mobile {
      display: none;
      position: relative;
      flex: 1;
      overflow: hidden;
    }
    #lb-mobile-track {
      display: flex;
      flex-direction: row;
      height: 100%;
      will-change: transform;
      transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
    .lb-mobile-slide {
      width: 100vw;
      height: 100%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .lb-mobile-slide img {
      max-width: 90%;
      max-height: 80vh;
      object-fit: contain;
      display: block;
      user-select: none;
      transform-origin: center center;
      will-change: transform;
      touch-action: none;
    }
    #lb-mobile-nav {
      transition: opacity 0.3s ease;
    }
    #lb-mobile-nav.is-hidden {
      opacity: 0;
      pointer-events: none;
    }
    #lb-prev,
    #lb-next {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      padding: 16px;
      cursor: pointer;
      color: currentColor;
      z-index: 10;
      -webkit-tap-highlight-color: transparent;
      transition: opacity 0.2s;
    }
    #lb-prev { left: 8px; }
    #lb-next { right: 8px; }
    #lb-prev svg, #lb-next svg { width: 24px; height: 24px; display: block; }
    #lb-prev.hidden, #lb-next.hidden { opacity: 0; pointer-events: none; }
    #lb-progress-bar {
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      width: 80px;
      height: 1px;
      background: transparent;
    }
    #lb-progress-bar::before {
      content: '';
      position: absolute;
      inset: 0;
      background: currentColor;
      opacity: 0.2;
    }
    #lb-progress-fill {
      position: relative;
      height: 100%;
      background: currentColor;
      transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      z-index: 1;
    }
    @media (max-width: 767px) {
      #lb-thumbs { display: none; }
      #lb-main { display: none; }
      #lb-cursor { display: none !important; }
      #lb-mobile { display: block; }
      #lb-close { top: 20px; right: 20px; }
    }
    @media (min-width: 768px) {
      #lb-mobile { display: none !important; }
    }
  `;
  document.head.appendChild(style);

  const lbEl = document.getElementById('slide-lightbox');
  const lbThumbs = document.getElementById('lb-thumbs');
  const lbTrack = document.getElementById('lb-track');
  const lbMain = document.getElementById('lb-main');
  const lbClose = document.getElementById('lb-close');
  const lbCursor = document.getElementById('lb-cursor');
  const lbMobileTrack = document.getElementById('lb-mobile-track');
  const lbMobileNav = document.getElementById('lb-mobile-nav');
  const lbPrev = document.getElementById('lb-prev');
  const lbNext = document.getElementById('lb-next');
  const lbProgressFill = document.getElementById('lb-progress-fill');

  let slides = [];
  let imgEls = [];
  let thumbWraps = [];
  let currentIndex = 0;
  let snapTimer = null;
  let mobileIndex = 0;

  let mobileZoomed = false;
  let mobileScale = 1;
  const MOBILE_ZOOM_SCALE = 3;
  let mobilePanX = 0;
  let mobilePanY = 0;
  let mobileLastTap = 0;
  let mobileDragStart = null;
  let mobilePanAtDrag = null;
  let mobileIsDragging = false;
  let mobilePinchStartDist = null;
  let mobilePinchStartScale = 1;

  const lineIndicator = document.createElement('div');
  lineIndicator.id = 'lb-line-indicator';
  lbThumbs.appendChild(lineIndicator);

  function isCurrentZoomed() {
    const activeImg = imgEls[currentIndex];
    return activeImg && activeImg.classList.contains('zoom-active');
  }

  function centerThumbsList() {
    if (!thumbWraps.length) return;
    const GAP = 6;
    const itemH = thumbWraps[0].offsetHeight;
    const totalH = thumbWraps.length * itemH + (thumbWraps.length - 1) * GAP;
    const available = lbThumbs.clientHeight;
    if (totalH + 80 > available) {
      const pad = Math.round(available / 2 - itemH / 2);
      lbThumbs.style.justifyContent = 'flex-start';
      lbThumbs.style.paddingTop = pad + 'px';
      lbThumbs.style.paddingBottom = pad + 'px';
    } else {
      lbThumbs.style.justifyContent = '';
      lbThumbs.style.paddingTop = '';
      lbThumbs.style.paddingBottom = '';
    }
  }

  function scrollThumbsToIndex(index, smooth) {
    const wrap = thumbWraps[index];
    if (!wrap) return;
    const targetScroll = wrap.offsetTop - lbThumbs.clientHeight / 2 + wrap.offsetHeight / 2;
    lbThumbs.scrollTo({ top: targetScroll, behavior: smooth ? 'smooth' : 'instant' });
  }

  function getMobileCurrentImg() {
    const slides = lbMobileTrack.querySelectorAll('.lb-mobile-slide');
    const slide = slides[mobileIndex];
    return slide ? slide.querySelector('img') : null;
  }

  function applyMobileTransform(animated) {
    const img = getMobileCurrentImg();
    if (!img) return;
    img.style.transition = animated ? 'transform 0.3s ease' : 'none';
    img.style.transform = `scale(${mobileScale}) translate(${mobilePanX / mobileScale}px, ${mobilePanY / mobileScale}px)`;
  }

  function clampMobilePan() {
    const img = getMobileCurrentImg();
    if (!img || mobileScale <= 1) {
      mobilePanX = 0;
      mobilePanY = 0;
      return;
    }
    const maxX = (img.offsetWidth * (mobileScale - 1)) / 2;
    const maxY = (img.offsetHeight * (mobileScale - 1)) / 2;
    mobilePanX = Math.min(maxX, Math.max(-maxX, mobilePanX));
    mobilePanY = Math.min(maxY, Math.max(-maxY, mobilePanY));
  }

  function setMobileZoomed(zoomed) {
    mobileZoomed = zoomed;
    lbMobileNav.classList.toggle('is-hidden', zoomed);
  }

  function resetMobileZoom(animated) {
    mobileScale = 1;
    mobilePanX = 0;
    mobilePanY = 0;
    setMobileZoomed(false);
    applyMobileTransform(animated !== false);
    lbMobileTrack.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
  }

  function bindSourceImage(img) {
    if (img.dataset.lightboxBound === 'true') return;
    img.dataset.lightboxBound = 'true';
    img.addEventListener('mouseenter', () => {
      if (hasOpenModal()) return;
      img.style.cursor = 'none';
      globalCursor.style.display = 'block';
    });
    img.addEventListener('mousemove', (e) => {
      if (hasOpenModal()) {
        img.style.cursor = '';
        globalCursor.style.display = 'none';
        return;
      }
      img.style.cursor = 'none';
      globalCursor.style.left = e.clientX + 'px';
      globalCursor.style.top = e.clientY + 'px';
    });
    img.addEventListener('mouseleave', () => {
      globalCursor.style.display = 'none';
    });
    img.addEventListener('click', () => {
      if (hasOpenModal()) return;
      const group = img.dataset.lightboxGroup || null;
      const currentSlides = getLightboxImgs(group);
      const i = currentSlides.indexOf(img);
      if (i >= 0) open(i, group);
    });
  }

  function bindAllSourceImages() {
    document.querySelectorAll('img[data-lightbox]').forEach(bindSourceImage);
  }

  window._bindAllLightboxImages = bindAllSourceImages;

  function buildLightbox(group) {
    slides = getLightboxImgs(group);
    lbThumbs.querySelectorAll('.lb-thumb-wrap').forEach((el) => el.remove());
    lbTrack.innerHTML = '';
    lbMobileTrack.innerHTML = '';
    imgEls = [];
    thumbWraps = [];
    const images = slides.map((img) => img.src);
    images.forEach((src, i) => {
      const wrap = document.createElement('div');
      wrap.className = 'lb-thumb-wrap';
      const spacer = document.createElement('div');
      spacer.className = 'lb-thumb-spacer';
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.className = 'lb-thumb';
      wrap.appendChild(spacer);
      wrap.appendChild(thumb);
      wrap.addEventListener('click', () => {
        lbMain.scrollTo({ top: i * lbMain.clientHeight, behavior: 'smooth' });
      });
      lbThumbs.appendChild(wrap);
      thumbWraps.push(wrap);
    });
    images.forEach((src) => {
      const slide = document.createElement('div');
      slide.className = 'lb-slide';
      slide.style.height = '100vh';
      const img = document.createElement('img');
      img.src = src;
      slide.appendChild(img);
      lbTrack.appendChild(slide);
      imgEls.push(img);
      initZoom(img);
      bindImageCursor(img);
    });
    images.forEach((src) => {
      const slide = document.createElement('div');
      slide.className = 'lb-mobile-slide';
      const img = document.createElement('img');
      img.src = src;
      img.draggable = false;
      slide.appendChild(img);
      lbMobileTrack.appendChild(slide);
    });
  }

  const themeObserver = new MutationObserver(() => {
    if (!lbEl.classList.contains('open')) {
      bindAllSourceImages();
    }
  });
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  bindAllSourceImages();

  function bindImageCursor(img) {
    img.addEventListener('mouseenter', () => {
      lbCursor.style.display = 'block';
    });
    img.addEventListener('mousemove', (e) => {
      lbCursor.style.left = e.clientX + 'px';
      lbCursor.style.top = e.clientY + 'px';
    });
    img.addEventListener('mouseleave', () => {
      lbCursor.style.display = 'none';
    });
  }

  function updateCursor() {
    const activeImg = imgEls[currentIndex];
    if (!activeImg) return;
    const isZoomed = activeImg.classList.contains('zoom-active');
    const wasZoomed = lbMain.dataset.zoomed === 'true';
    lbCursor.classList.toggle('is-minus', isZoomed);
    lbThumbs.style.display = isZoomed ? 'none' : '';

    if (isZoomed && !wasZoomed) {
      lbMain.dataset.zoomed = 'true';
      lbMain.style.position = 'fixed';
      lbMain.style.inset = '0';
      lbMain.style.width = '100vw';
      lbMain.style.zIndex = '10000';
    } else if (!isZoomed && wasZoomed) {
      lbMain.dataset.zoomed = 'false';
      lbMain.style.position = '';
      lbMain.style.inset = '';
      lbMain.style.width = '';
      lbMain.style.zIndex = '';
      setTimeout(() => {
        lbMain.scrollTop = currentIndex * lbMain.clientHeight;
      }, 50);
    }
  }

  function animateLine(index) {
    const wrap = thumbWraps[index];
    if (!wrap || typeof gsap === 'undefined') return;
    const wrapTop = wrap.offsetTop + wrap.offsetHeight / 2 - 44;
    gsap.to(lineIndicator, { y: wrapTop, duration: 0.45, ease: 'power3.out' });
    thumbWraps.forEach((w, i) => w.classList.toggle('active', i === index));
    scrollThumbsToIndex(index, true);
  }

  function setLineInstant(index) {
    const wrap = thumbWraps[index];
    if (!wrap || typeof gsap === 'undefined') return;
    const wrapTop = wrap.offsetTop + wrap.offsetHeight / 2 - 44;
    gsap.set(lineIndicator, { y: wrapTop });
    thumbWraps.forEach((w, i) => w.classList.toggle('active', i === index));
    scrollThumbsToIndex(index, false);
  }

  lbMain.addEventListener(
    'scroll',
    () => {
      const h = lbMain.clientHeight;
      const idx = Math.round(lbMain.scrollTop / h);
      if (idx !== currentIndex) {
        if (imgEls[currentIndex]?._resetZoom) imgEls[currentIndex]._resetZoom();
        currentIndex = idx;
        animateLine(idx);
        updateCursor();
      }
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => {
        const nearest = Math.round(lbMain.scrollTop / h);
        lbMain.scrollTo({ top: nearest * h, behavior: 'smooth' });
      }, 350);
    },
    { passive: true },
  );

  function onWheel(e) {
    if (!lbEl.classList.contains('open')) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    if (isCurrentZoomed()) return;
    lbMain.scrollTop += e.deltaY;
  }

  function updateMobile(index, immediate) {
    if (mobileZoomed) resetMobileZoom(false);
    mobileIndex = Math.max(0, Math.min(imgEls.length - 1, index));
    lbMobileTrack.style.transition = immediate ? 'none' : 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    lbMobileTrack.style.transform = `translateX(${-mobileIndex * 100}vw)`;
    const pct = imgEls.length > 1 ? (mobileIndex / (imgEls.length - 1)) * 100 : 100;
    lbProgressFill.style.width = pct + '%';
    lbPrev.classList.toggle('hidden', mobileIndex === 0);
    lbNext.classList.toggle('hidden', mobileIndex === imgEls.length - 1);
  }

  lbPrev.addEventListener('click', () => updateMobile(mobileIndex - 1));
  lbNext.addEventListener('click', () => updateMobile(mobileIndex + 1));

  let touchStartX = null;
  let touchStartY = null;

  lbMobileTrack.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        mobilePinchStartDist = Math.sqrt(dx * dx + dy * dy);
        mobilePinchStartScale = mobileScale;
        return;
      }
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      mobileIsDragging = false;
      if (mobileZoomed) {
        mobileDragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        mobilePanAtDrag = { x: mobilePanX, y: mobilePanY };
      }
    },
    { passive: true },
  );

  lbMobileTrack.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = Math.max(1, Math.min(MOBILE_ZOOM_SCALE, mobilePinchStartScale * (dist / mobilePinchStartDist)));
        mobileScale = newScale;
        if (mobileScale <= 1) {
          resetMobileZoom(false);
        } else {
          setMobileZoomed(true);
          clampMobilePan();
          applyMobileTransform(false);
        }
        return;
      }
      if (!mobileZoomed) return;
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const dx = e.touches[0].clientX - mobileDragStart.x;
      const dy = e.touches[0].clientY - mobileDragStart.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mobileIsDragging = true;
      if (mobileIsDragging) {
        mobilePanX = mobilePanAtDrag.x + dx;
        mobilePanY = mobilePanAtDrag.y + dy;
        clampMobilePan();
        applyMobileTransform(false);
      }
    },
    { passive: false },
  );

  lbMobileTrack.addEventListener(
    'touchend',
    (e) => {
      mobilePinchStartDist = null;
      if (e.changedTouches.length !== 1) return;
      const now = Date.now();
      const dx = touchStartX !== null ? e.changedTouches[0].clientX - touchStartX : 0;
      const dy = touchStartY !== null ? e.changedTouches[0].clientY - touchStartY : 0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (now - mobileLastTap < 300 && dist < 20) {
        mobileLastTap = 0;
        if (mobileZoomed) {
          resetMobileZoom(true);
        } else {
          mobileScale = MOBILE_ZOOM_SCALE;
          mobilePanX = 0;
          mobilePanY = 0;
          setMobileZoomed(true);
          lbMobileTrack.style.transition = 'none';
          applyMobileTransform(true);
        }
        return;
      }
      mobileLastTap = now;
      if (!mobileZoomed && !mobileIsDragging && Math.abs(dx) > 40) {
        updateMobile(dx < 0 ? mobileIndex + 1 : mobileIndex - 1);
      }
      mobileIsDragging = false;
    },
    { passive: true },
  );

  function initZoom(img) {
    let zoomed = false;
    const SCALE = 4;
    let panX = 0, panY = 0;
    let velX = 0, velY = 0;
    let dragStart = null, panAtDrag = null, isDragging = false;
    let lastDragX = 0, lastDragY = 0;
    let rafId = null;

    function getMaxPan() {
      const slide = img.closest('.lb-slide');
      if (!slide) return { maxX: 9999, maxY: 9999 };
      const maxX = ((img.offsetWidth * SCALE) / 2) * 0.5;
      const maxY = ((img.offsetHeight * SCALE) / 2) * 0.5;
      return { maxX, maxY };
    }

    function clamp() {
      const { maxX, maxY } = getMaxPan();
      panX = Math.min(maxX, Math.max(-maxX, panX));
      panY = Math.min(maxY, Math.max(-maxY, panY));
    }

    function applyTransform() {
      if (typeof gsap === 'undefined') return;
      gsap.set(img, { scale: SCALE, x: panX, y: panY });
    }

    function startInertia() {
      if (rafId) cancelAnimationFrame(rafId);
      const friction = 0.92;
      function tick() {
        if (Math.abs(velX) < 0.1 && Math.abs(velY) < 0.1) {
          velX = 0;
          velY = 0;
          return;
        }
        panX += velX;
        panY += velY;
        velX *= friction;
        velY *= friction;
        clamp();
        applyTransform();
        rafId = requestAnimationFrame(tick);
      }
      rafId = requestAnimationFrame(tick);
    }

    function resetZoom() {
      zoomed = false;
      panX = 0;
      panY = 0;
      velX = 0;
      velY = 0;
      if (rafId) cancelAnimationFrame(rafId);
      img.classList.remove('zoom-active', 'grabbing');
      if (typeof gsap !== 'undefined') {
        gsap.to(img, { scale: 1, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
      }
      const slide = img.closest('.lb-slide');
      if (slide) slide.style.zIndex = '';
      updateCursor();
    }

    img.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (rafId) cancelAnimationFrame(rafId);
      velX = 0;
      velY = 0;
      dragStart = { x: e.clientX, y: e.clientY };
      panAtDrag = { x: panX, y: panY };
      lastDragX = e.clientX;
      lastDragY = e.clientY;
      isDragging = false;
      if (zoomed) img.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
      if (!dragStart) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) isDragging = true;
      if (zoomed && isDragging) {
        velX = (e.clientX - lastDragX) / 1.5;
        velY = (e.clientY - lastDragY) / 1.5;
        lastDragX = e.clientX;
        lastDragY = e.clientY;
        panX = panAtDrag.x + dx / 1.5;
        panY = panAtDrag.y + dy / 1.5;
        clamp();
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (!dragStart) return;
      const moved = isDragging;
      dragStart = null;
      img.classList.remove('grabbing');
      if (!moved) {
        if (!zoomed) {
          zoomed = true;
          img.classList.add('zoom-active');
          const slide = img.closest('.lb-slide');
          if (slide) slide.style.zIndex = '100';
          if (typeof gsap !== 'undefined') {
            gsap.to(img, { scale: SCALE, x: 0, y: 0, duration: 0.35, ease: 'power2.out' });
          }
          updateCursor();
        } else {
          resetZoom();
        }
      } else if (zoomed) {
        startInertia();
      }
    });

    img._resetZoom = resetZoom;
  }

  function isMobile() {
    return window.innerWidth < 768;
  }

  function open(index, group) {
    buildLightbox(group);
    lbEl.classList.add('open');
    document.body.classList.add('lightbox-open');
    document.body.style.overflow = 'hidden';
    globalCursor.style.display = 'none';
    window._snapLocked = true;
    stopLenis();

    mobileZoomed = false;
    mobileScale = 1;
    mobilePanX = 0;
    mobilePanY = 0;
    mobileLastTap = 0;

    if (isMobile()) {
      updateMobile(index, true);
    } else {
      window.addEventListener('wheel', onWheel, { passive: false, capture: true });
      requestAnimationFrame(() => {
        centerThumbsList();
        lbMain.scrollTop = index * lbMain.clientHeight;
        currentIndex = index;
        requestAnimationFrame(() => {
          setLineInstant(index);
          updateCursor();
        });
      });
    }
  }

  function close() {
    lbEl.classList.remove('open');
    document.body.classList.remove('lightbox-open');
    window.removeEventListener('wheel', onWheel, { capture: true });
    if (snapTimer) clearTimeout(snapTimer);
    imgEls.forEach((img) => img._resetZoom?.());
    if (mobileZoomed) resetMobileZoom(false);
    lbCursor.style.display = 'none';
    globalCursor.style.display = 'none';
    document.body.style.overflow = '';
    window._snapLocked = false;
    startLenisIfAllowed();
  }

  lbClose.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (!lbEl.classList.contains('open')) return;
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!isMobile()) {
      if (isCurrentZoomed()) return;
      if (e.key === 'ArrowDown') lbMain.scrollTop += window.innerHeight;
      if (e.key === 'ArrowUp') lbMain.scrollTop -= window.innerHeight;
    } else {
      if (e.key === 'ArrowRight') updateMobile(mobileIndex + 1);
      if (e.key === 'ArrowLeft') updateMobile(mobileIndex - 1);
    }
  });
}(function () {
  function setupTextReveal() {
    const targets = document.querySelectorAll('[data-text-reveal]');

    targets.forEach((el) => {
      if (el.dataset.textRevealInit === 'true') return;
      el.dataset.textRevealInit = 'true';

      const computedDisplay = window.getComputedStyle(el).display;
      const isInline = computedDisplay === 'inline' || computedDisplay === 'inline-block';

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `display: ${isInline ? 'inline-block' : 'block'}; clip-path: inset(-20% 0 0 0);`;

      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);

      gsap.set(el, { y: '110%', opacity: 0 });
    });
  }

  function setupLogoReveal() {
    const svgs = document.querySelectorAll('[data-logo-reveal]');

    svgs.forEach((svg) => {
      if (svg.dataset.logoRevealInit === 'true') return;
      svg.dataset.logoRevealInit = 'true';

      const paths = Array.from(svg.querySelectorAll('path'));
      if (!paths.length) return;

      const viewBox = svg.viewBox.baseVal;
      const svgHeight = viewBox ? viewBox.height : 100;
      const offset = svgHeight * 1.2;

      paths.forEach((path) => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        path.parentNode.insertBefore(g, path);
        g.appendChild(path);
      });

      const groups = svg.querySelectorAll('g');
      gsap.set(groups, { opacity: 1, y: offset });
    });
  }

  function startTextReveal() {
    document.querySelectorAll('[data-text-reveal]').forEach((el) => {
      const wrapper = el.parentNode;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(wrapper);
            gsap.to(el, {
              y: '0%',
              opacity: 1,
              duration: 0.8,
              ease: 'power3.out',
              delay: parseFloat(el.dataset.textRevealDelay || 0),
            });
          });
        },
        { threshold: 0.1 },
      );

      observer.observe(wrapper);
    });
  }

  function startLogoReveal() {
    document.querySelectorAll('[data-logo-reveal]').forEach((svg) => {
      const groups = svg.querySelectorAll('g');

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(svg);

            gsap.to(groups, {
              opacity: 1,
              y: 0,
              duration: 0.7,
              ease: 'power3.out',
              stagger: 0.06,
              delay: parseFloat(svg.dataset.logoRevealDelay || 0),
            });
          });
        },
        { threshold: 0.3 },
      );

      observer.observe(svg);
    });
  }

  function waitForGsap(cb) {
    if (typeof gsap !== 'undefined') {
      cb();
      return;
    }
    const poll = setInterval(() => {
      if (typeof gsap !== 'undefined') {
        clearInterval(poll);
        cb();
      }
    }, 50);
  }

  // Étape 1 : setup (cacher) dès que possible
  function setup() {
    waitForGsap(() => {
      setupTextReveal();
      setupLogoReveal();
    });
  }

  // Étape 2 : lancer les animations après la transition
  let animStarted = false;

  function startAnimations() {
    if (animStarted) return;
    animStarted = true;
    startTextReveal();
    startLogoReveal();
  }

  // Setup le plus tôt possible
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }

  // Lancer les anims seulement quand la transition est finie
  window.addEventListener('transition:done', startAnimations);

  // Fallback si transition.js ne fire pas
  setTimeout(startAnimations, 2500);
})();(function () {
  const overlay = document.getElementById('page-transition');
  if (!overlay) return;

  const textEls = overlay.querySelectorAll('.div-block-235 > div');

  textEls.forEach((el) => {
    const wrapper = document.createElement('div');
    wrapper.style.overflow = 'hidden';
    el.parentNode.insertBefore(wrapper, el);
    wrapper.appendChild(el);
    el.style.transform = 'translateY(100%)';
    el.style.transition = 'none';
    el.style.display = 'block';
  });

  function getTextEls() {
    return overlay.querySelectorAll('.div-block-235 > div > div');
  }

  function playEnter(isFirstLoad) {
    overlay.classList.remove('w-condition-invisible');
    overlay.style.display = 'flex';
    overlay.style.transition = 'none';
    overlay.style.transform = 'translateY(0)';
    overlay.offsetHeight;

    if (isFirstLoad) {
      getTextEls().forEach((el) => {
        el.style.transition = 'none';
        el.style.transform = 'translateY(100%)';
      });

      setTimeout(() => {
        getTextEls().forEach((el) => {
          el.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
          getTextEls().forEach((el) => {
            el.style.transition = 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1)';
            el.style.transform = 'translateY(100%)';
          });

          setTimeout(() => {
            overlay.style.transition = 'transform 0.7s cubic-bezier(0.6, 0, 0.8, 0.6)';
            overlay.style.transform = 'translateY(-100%)';

            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('transition:done'));
            }, 750);
          }, 500);
        }, 800);
      }, 300);

    } else {
      getTextEls().forEach((el) => {
        el.style.transition = 'none';
        el.style.transform = 'translateY(0)';
      });

      setTimeout(() => {
        getTextEls().forEach((el) => {
          el.style.transition = 'transform 0.4s cubic-bezier(0.76, 0, 0.24, 1)';
          el.style.transform = 'translateY(100%)';
        });

        setTimeout(() => {
          overlay.style.transition = 'transform 0.7s cubic-bezier(0.6, 0, 0.8, 0.6)';
          overlay.style.transform = 'translateY(-100%)';

          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('transition:done'));
          }, 750);
        }, 500);
      }, 200);
    }
  }

  function playExit(href) {
    overlay.classList.remove('w-condition-invisible');
    overlay.style.display = 'flex';

    getTextEls().forEach((el) => {
      el.style.transition = 'none';
      el.style.transform = 'translateY(100%)';
    });

    overlay.style.transition = 'none';
    overlay.style.transform = 'translateY(100%)';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.transition = 'transform 0.7s cubic-bezier(0.6, 0, 0.8, 0.6)';
        overlay.style.transform = 'translateY(0)';

        setTimeout(() => {
          getTextEls().forEach((el) => {
            el.style.transition = 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
            el.style.transform = 'translateY(0)';
          });
        }, 800);

        setTimeout(() => {
          overlay.style.transition = 'none';
          overlay.style.transform = 'translateY(0)';
          window.location.href = href;
        }, 1800);
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

  document.addEventListener('DOMContentLoaded', () => {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isReload = navEntry && navEntry.type === 'reload';
    const isFirstLoad = !sessionStorage.getItem('visited') || isReload;
    sessionStorage.setItem('visited', '1');
    playEnter(isFirstLoad);
  });

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) playEnter(false);
  });
})();