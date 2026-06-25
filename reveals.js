/* ============================================================
   REVEALS — text, logo, image
   ============================================================ */
(function () {

  /* ---------- IMAGE REVEAL ---------- */
  function getDominantColor(src, cb) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      try {
        const canvas = document.createElement('canvas');
        const SIZE = 10;
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const data = ctx.getImageData(0, 0, SIZE, SIZE).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; count++; }
        cb(`rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`);
      } catch (e) { cb(null); }
    };
    img.onerror = () => cb(null);
    img.src = src;
  }

  function initImageReveal() {
    const targets = document.querySelectorAll('img[data-reveal]');
    const isDark = !document.body.classList.contains('theme-light');

    targets.forEach((img) => {
      if (img.dataset.revealInit === 'true') return;
      img.dataset.revealInit = 'true';

      const styleAtInit = img.getAttribute('style') || '';
      if (styleAtInit.includes('display: none')) return;

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        overflow: hidden;
        display: block;
        width: 100%;
        transition: transform 600ms ease-in-out;
      `;
      wrapper.addEventListener('mouseenter', () => { wrapper.style.transform = 'scale(1.02)'; });
      wrapper.addEventListener('mouseleave', () => { wrapper.style.transform = 'scale(1)'; });

      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      const bg = document.createElement('div');
      bg.style.cssText = `
        position: absolute; inset: 0; z-index: 1;
        background: ${isDark ? '#1a1a1a' : '#e8e8e8'};
        transition: opacity 0.6s ease; pointer-events: none;
      `;
      wrapper.appendChild(bg);

      img.style.position = 'relative';
      img.style.zIndex = '2';
      img.style.opacity = '0';
      img.style.transition = 'opacity 0.8s ease';
      img.style.width = '100%';

      function reveal() {
        const src = img.currentSrc || img.src;
        if (!src || src.includes('placeholder')) return;
        const styleAtReveal = img.getAttribute('style') || '';
        if (styleAtReveal.includes('display: none')) return;
        getDominantColor(src, (color) => {
          if (color) bg.style.background = color;
          setTimeout(() => {
            const styleAtFade = img.getAttribute('style') || '';
            if (styleAtFade.includes('display: none')) return;
            img.style.opacity = '1';
          }, 400);
        });
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(img);
          const styleAtObserve = img.getAttribute('style') || '';
          if (styleAtObserve.includes('display: none')) return;
          if (img.complete && img.naturalWidth > 0) { reveal(); }
          else { img.addEventListener('load', reveal, { once: true }); }
        });
      }, { threshold: 0.5 });

      observer.observe(img);
    });
  }

  /* ---------- TEXT REVEAL ---------- */
  function initTextReveal() {
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

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(el);
          gsap.to(el, {
            y: '0%',
            opacity: 1,
            duration: 0.8,
            ease: 'power3.out',
            delay: parseFloat(el.dataset.textRevealDelay || 0),
          });
        });
      }, { threshold: 0.1 });

      observer.observe(wrapper);
    });
  }

  /* ---------- LOGO REVEAL ---------- */
  function initLogoReveal() {
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

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(svg);
          gsap.to(groups, {
            opacity: 1, y: 0, duration: 0.7, ease: 'power3.out',
            stagger: 0.06, delay: parseFloat(svg.dataset.logoRevealDelay || 0),
          });
        });
      }, { threshold: 0.3 });

      observer.observe(svg);
    });
  }

  /* ---------- VIDEO OBSERVER ---------- */
  function initVideoObserver() {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting) { video.play(); } else { video.pause(); }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('video[autoplay]').forEach((video) => {
      videoObserver.observe(video);
    });
  }

  /* ---------- INIT ---------- */
  function waitForGsap(cb) {
    if (typeof gsap !== 'undefined') { cb(); return; }
    const poll = setInterval(() => {
      if (typeof gsap !== 'undefined') { clearInterval(poll); cb(); }
    }, 50);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initImageReveal();
    initVideoObserver();
    waitForGsap(() => {
      initTextReveal();
      initLogoReveal();
    });
  });

  if (document.readyState !== 'loading') {
    initImageReveal();
    initVideoObserver();
    waitForGsap(() => {
      initTextReveal();
      initLogoReveal();
    });
  }
})();
