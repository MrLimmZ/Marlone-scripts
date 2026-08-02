const THEME_KEY = "site_theme";
const THEME_MANUAL_KEY = "site_theme_manual";

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

  // FIX : dès qu'une image (light ou dark) vient de passer à display:block,
  // on relance initImageReveal(). Grâce au fix appliqué dans
  // image-reveal-fixed.js (le flag revealInit n'est plus posé tant que
  // l'image est cachée), cet appel va effectivement wrapper toute image
  // qui vient de devenir visible pour la première fois et qui ne l'était
  // pas au chargement initial — lui donnant enfin le même wrapper/bg/
  // opacity/transition que son homologue déjà traité, et donc la même
  // taille et le même comportement au hover.
  // Les images déjà wrappées ne sont pas retouchées (revealInit === "true"
  // les fait sortir immédiatement de la boucle).
  if (typeof window.initImageReveal === "function") {
    window.initImageReveal();
  }
}

function getSystemTheme() {
  const prefersLight = window.matchMedia(
    "(prefers-color-scheme: light)",
  ).matches;
  return prefersLight ? "On" : "Off";
}

function resolveTheme() {
  const manual = sessionStorage.getItem(THEME_MANUAL_KEY) === "1";
  const stored = sessionStorage.getItem(THEME_KEY);
  if (manual && stored) return stored;
  return getSystemTheme();
}

function initThemeSwitch(scope = document) {
  function applyTheme(value) {
    document.body.classList.toggle("theme-light", value === "On");
    document.documentElement.classList.toggle("theme-light", value === "On");
    sessionStorage.setItem(THEME_KEY, value);
    applyBannerTheme(value === "On");

    const meta = document.getElementById("theme-color-meta");
    if (meta) meta.setAttribute("content", value === "On" ? "#ffffff" : "#0a0a0a");
  }

  const savedTheme = resolveTheme();
  applyTheme(savedTheme);

  scope.querySelectorAll('[data-switch="switch-theme"]').forEach((switchEl) => {
    const options = switchEl.querySelectorAll(
      ".switch-option[data-switch-value]",
    );
    options.forEach((option) => {
      if (option.dataset.themeInit === "true") return;
      option.dataset.themeInit = "true";
      option.addEventListener("click", () => {
        const value = option.getAttribute("data-switch-value");
        sessionStorage.setItem(THEME_MANUAL_KEY, "1");
        applyTheme(value);
        options.forEach((opt) => {
          opt.classList.toggle(
            "is-active",
            opt.getAttribute("data-switch-value") === value,
          );
        });
      });
    });
    options.forEach((opt) => {
      opt.classList.toggle(
        "is-active",
        opt.getAttribute("data-switch-value") === savedTheme,
      );
    });
  });

  if (!initThemeSwitch._liveListenerBound) {
    initThemeSwitch._liveListenerBound = true;
    const mql = window.matchMedia("(prefers-color-scheme: light)");
    mql.addEventListener("change", (e) => {
      if (sessionStorage.getItem(THEME_MANUAL_KEY) === "1") return;

      const value = e.matches ? "On" : "Off";
      applyTheme(value);

      document
        .querySelectorAll('[data-switch="switch-theme"] .switch-option[data-switch-value]')
        .forEach((opt) => {
          opt.classList.toggle(
            "is-active",
            opt.getAttribute("data-switch-value") === value,
          );
        });
    });
  }
}