/* ============================================================
   THEME
   ============================================================ */
(function () {
  const THEME_KEY = 'site_theme';

  function applyBannerTheme(isLight) {
    document.querySelectorAll('.product-link, .favorites-view-list a').forEach((card) => {
      const lightImg = card.querySelector('.product-card_banner:not(.dark)');
      const darkImg = card.querySelector('.product-card_banner.dark');
      if (lightImg && darkImg) {
        lightImg.style.setProperty('display', !isLight ? 'none' : 'block', 'important');
        darkImg.style.setProperty('display', !isLight ? 'block' : 'none', 'important');
      } else if (lightImg && !darkImg) {
        lightImg.style.setProperty('display', 'block', 'important');
      } else if (!lightImg && darkImg) {
        darkImg.style.setProperty('display', 'block', 'important');
      }
    });
  }

  function applyTheme(value) {
    document.body.classList.toggle('theme-light', value === 'On');
    localStorage.setItem(THEME_KEY, value);
    applyBannerTheme(value === 'On');
  }

  function initThemeSwitch(scope = document) {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) applyTheme(savedTheme);

    scope.querySelectorAll('[data-switch="switch-theme"]').forEach((switchEl) => {
      const options = switchEl.querySelectorAll('.switch-option[data-switch-value]');
      options.forEach((option) => {
        if (option.dataset.themeInit === 'true') return;
        option.dataset.themeInit = 'true';
        option.addEventListener('click', () => {
          const value = option.getAttribute('data-switch-value');
          applyTheme(value);
          options.forEach((opt) => {
            opt.classList.toggle('is-active', opt.getAttribute('data-switch-value') === value);
          });
        });
      });
      if (savedTheme) {
        options.forEach((opt) => {
          opt.classList.toggle('is-active', opt.getAttribute('data-switch-value') === savedTheme);
        });
      }
    });
  }

  window._applyBannerTheme = applyBannerTheme;
  window._initThemeSwitch = initThemeSwitch;
  window._THEME_KEY = THEME_KEY;

  document.addEventListener('DOMContentLoaded', () => {
    initThemeSwitch(document);
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme) applyBannerTheme(savedTheme === 'On');
  });
})();
