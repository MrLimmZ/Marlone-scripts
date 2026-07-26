(function () {
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

  function initTransitionEnter() {
    const navEntry = performance.getEntriesByType('navigation')[0];
    const isReload = navEntry && navEntry.type === 'reload';
    const isFirstLoad = !sessionStorage.getItem('visited') || isReload;
    sessionStorage.setItem('visited', '1');
    playEnter(isFirstLoad);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTransitionEnter);
  } else {
    initTransitionEnter();
  }

  window.addEventListener('pageshow', function (e) {
    if (e.persisted) playEnter(false);
  });
})();