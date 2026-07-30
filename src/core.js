// ─── Orchestration ─────────────────────────────────────────────────────────

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