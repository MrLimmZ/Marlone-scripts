const BUILD_VERSION = "2026-07-31";
console.log("%c[Marlone] main.js version: " + BUILD_VERSION);
window.__BUILD_VERSION__ = BUILD_VERSION;

window.__nestedLenisRegistry = new Map();

window.__initNestedLenis = function (selectorOrEl) {
  const elements = typeof selectorOrEl === "string" ? Array.from(document.querySelectorAll(selectorOrEl)) : [selectorOrEl];
  const instances = [];

  elements.forEach((wrapper) => {
    if (!wrapper || wrapper.dataset.lenisInit === "true") return;
    if (typeof Lenis === "undefined") return;
    wrapper.dataset.lenisInit = "true";

    const content = document.createElement("div");
    while (wrapper.firstChild) {
      content.appendChild(wrapper.firstChild);
    }
    wrapper.appendChild(content);

    const instance = new Lenis({
      wrapper: wrapper,
      content: content,
      duration: 1.1,
      smoothWheel: true,
      syncTouch: true,
      autoRaf: true,
    });
    window.__nestedLenisRegistry.set(wrapper, instance);
    instances.push(instance);
  });

  return instances;
};

window.__freezeModalScroll = function (panel) {
  if (!panel) return;
  panel.querySelectorAll("[data-modal-scroll]").forEach((wrapper) => {
    const instance = window.__nestedLenisRegistry.get(wrapper);
    if (instance) instance.stop();
  });
};

window.__unfreezeModalScroll = function (panel) {
  if (!panel) return;
  panel.querySelectorAll("[data-modal-scroll]").forEach((wrapper) => {
    const instance = window.__nestedLenisRegistry.get(wrapper);
    if (instance) instance.start();
  });
};

function initModalScrollLenis() {
  if (typeof window.__initNestedLenis !== "function") return;
  if (typeof Lenis === "undefined") {
    setTimeout(initModalScrollLenis, 50);
    return;
  }
  window.__initNestedLenis("[data-modal-scroll]");
}
window.__initModalScrollLenis = initModalScrollLenis;

function initPageFeatures(scope = document) {
  initThemeSwitch(scope);
  initLightbox();
}

function initAll() {
  initCookies();
  initEscapeKey();
  initLenis();
  initPageFeatures(document);
  initModalScrollLock();
  initFooterLogoHide();
  initNavScrolled();
  initProductCardHover();
  initFooterReveal();
  initModalScrollLenis();

  const currentTheme = resolveTheme();
  applyBannerTheme(currentTheme === "On");

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