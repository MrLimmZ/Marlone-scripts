(function () {
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
})();