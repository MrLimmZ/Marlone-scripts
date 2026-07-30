(function () {
  let resizeTimer = null;

  window.addEventListener(
    'resize',
    () => {
      document.documentElement.classList.add('resizing');
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        document.documentElement.classList.remove('resizing');
      }, 200);
    },
    { passive: true },
  );
})();