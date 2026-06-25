/* ============================================================
   LIGHTBOX
   ============================================================ */
(function () {
  function hasOpenModal() {
    return window._hasOpenModal ? window._hasOpenModal() : false;
  }

  function stopLenis() {
    if (window._stopLenis) window._stopLenis();
    else if (window.lenis) window.lenis.stop();
  }

  function startLenisIfAllowed() {
    if (window._startLenisIfAllowed) window._startLenisIfAllowed();
  }

  function getLightboxImgs(group) {
    if (group) {
      const themedImgs = document.querySelectorAll(`img[data-lightbox][data-lightbox-theme][data-lightbox-group="${group}"]`);
      if (themedImgs.length) {
        const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
        return Array.from(themedImgs).filter((img) => img.dataset.lightboxTheme === currentTheme);
      }
      const staticImgs = document.querySelectorAll(`img[data-lightbox][data-lightbox-group="${group}"]`);
      if (staticImgs.length) return Array.from(staticImgs);
      return [];
    }
    const themedImgs = document.querySelectorAll('img[data-lightbox][data-lightbox-theme]');
    if (themedImgs.length) {
      const currentTheme = document.body.classList.contains('theme-light') ? 'light' : 'dark';
      return Array.from(themedImgs).filter((img) => img.dataset.lightboxTheme === currentTheme);
    }
    const containers = document.querySelectorAll('[data-lightbox]:not(img)');
    if (containers.length) {
      return Array.from(document.querySelectorAll('[data-lightbox]:not(img) img'));
    }
    const staticImgs = document.querySelectorAll('img[data-lightbox]');
    if (staticImgs.length) return Array.from(staticImgs);
    return [];
  }

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
      <div id="lb-main"><div id="lb-track"></div></div>
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
          <div id="lb-progress-bar"><div id="lb-progress-fill"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(lb);

    const style = document.createElement('style');
    style.textContent = `
      #global-cursor {
        position: fixed; pointer-events: none; z-index: 8000;
        width: 16px; height: 16px; transform: translate(-50%, -50%);
        display: none; mix-blend-mode: difference;
      }
      #global-cursor::before, #global-cursor::after {
        content: ''; position: absolute; background: white;
      }
      #global-cursor::before {
        top: 50%; left: 0; width: 100%; height: 1px; transform: translateY(-50%);
      }
      #global-cursor::after {
        left: 50%; top: 0; height: 100%; width: 1px; transform: translateX(-50%);
      }
      #slide-lightbox {
        display: none; position: fixed; inset: 0; z-index: 9999;
        background: var(--background-color, #fff); flex-direction: row; overflow: hidden;
      }
      #slide-lightbox.open { display: flex; }
      #lb-thumbs {
        width: 140px; flex-shrink: 0; display: flex; flex-direction: column;
        gap: 6px; padding: 40px 24px; justify-content: center; position: relative;
        z-index: 10001; overflow-y: auto; scrollbar-width: none;
        -ms-overflow-style: none; box-sizing: border-box; transition: opacity 0.2s ease;
      }
      #lb-thumbs::-webkit-scrollbar { display: none; }
      .lb-thumb-wrap { display: flex; align-items: center; gap: 4px; cursor: pointer; flex-shrink: 0; }
      .lb-thumb-spacer { width: 6px; flex-shrink: 0; }
      .lb-thumb {
        width: 80px; height: 88px; object-fit: cover; object-position: center;
        flex-shrink: 0; transition: opacity 0.3s; opacity: 0.4;
      }
      .lb-thumb-wrap.active .lb-thumb { opacity: 1; }
      #lb-line-indicator {
        position: absolute; left: 24px; top: 0; width: 2px; height: 88px;
        background: currentColor; pointer-events: none;
      }
      #lb-main {
        flex: 1; overflow-y: scroll; overflow-x: hidden; scrollbar-width: none;
        -ms-overflow-style: none; position: relative; z-index: 10000;
      }
      #lb-main::-webkit-scrollbar { display: none; }
      #lb-track { display: flex; flex-direction: column; }
      .lb-slide {
        width: 100%; flex-shrink: 0; display: flex; align-items: center;
        justify-content: center; position: relative; overflow: hidden;
      }
      .lb-slide img {
        max-width: 85%; max-height: 85vh; object-fit: contain; user-select: none;
        will-change: transform; transform-origin: center center; display: block; cursor: none;
      }
      #lb-close {
        position: fixed; top: 28px; right: 36px; width: 20px; height: 20px;
        cursor: pointer; z-index: 10005; user-select: none;
      }
      #lb-close::before, #lb-close::after {
        content: ''; position: absolute; top: 50%; left: 0;
        width: 100%; height: 1px; background: currentColor;
      }
      #lb-close::before { transform: rotate(45deg); }
      #lb-close::after { transform: rotate(-45deg); }
      #lb-cursor {
        position: fixed; pointer-events: none; z-index: 10006; width: 16px; height: 16px;
        transform: translate(-50%, -50%); display: none; mix-blend-mode: difference;
      }
      #lb-cursor::before, #lb-cursor::after { content: ''; position: absolute; background: white; }
      #lb-cursor::before { top: 50%; left: 0; width: 100%; height: 1px; transform: translateY(-50%); }
      #lb-cursor::after { left: 50%; top: 0; height: 100%; width: 1px; transform: translateX(-50%); transition: opacity 0.15s; }
      #lb-cursor.is-minus::after { opacity: 0; }
      #lb-mobile { display: none; position: relative; flex: 1; overflow: hidden; }
      #lb-mobile-track {
        display: flex; flex-direction: row; height: 100%; will-change: transform;
        transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
      }
      .lb-mobile-slide {
        width: 100vw; height: 100%; flex-shrink: 0; display: flex;
        align-items: center; justify-content: center; overflow: hidden;
      }
      .lb-mobile-slide img {
        max-width: 90%; max-height: 80vh; object-fit: contain; display: block;
        user-select: none; transform-origin: center center; will-change: transform; touch-action: none;
      }
      #lb-mobile-nav { transition: opacity 0.3s ease; }
      #lb-mobile-nav.is-hidden { opacity: 0; pointer-events: none; }
      #lb-prev, #lb-next {
        position: absolute; top: 50%; transform: translateY(-50%); background: none;
        border: none; padding: 16px; cursor: pointer; color: currentColor; z-index: 10;
        -webkit-tap-highlight-color: transparent; transition: opacity 0.2s;
      }
      #lb-prev { left: 8px; }
      #lb-next { right: 8px; }
      #lb-prev svg, #lb-next svg { width: 24px; height: 24px; display: block; }
      #lb-prev.hidden, #lb-next.hidden { opacity: 0; pointer-events: none; }
      #lb-progress-bar {
        position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
        width: 80px; height: 1px; background: transparent;
      }
      #lb-progress-bar::before {
        content: ''; position: absolute; inset: 0; background: currentColor; opacity: 0.2;
      }
      #lb-progress-fill {
        position: relative; height: 100%; background: currentColor;
        transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94); z-index: 1;
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
      if (!img || mobileScale <= 1) { mobilePanX = 0; mobilePanY = 0; return; }
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
      mobileScale = 1; mobilePanX = 0; mobilePanY = 0;
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
        if (hasOpenModal()) { img.style.cursor = ''; globalCursor.style.display = 'none'; return; }
        img.style.cursor = 'none';
        globalCursor.style.left = e.clientX + 'px';
        globalCursor.style.top = e.clientY + 'px';
      });
      img.addEventListener('mouseleave', () => { globalCursor.style.display = 'none'; });
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
        wrap.addEventListener('click', () => { lbMain.scrollTo({ top: i * lbMain.clientHeight, behavior: 'smooth' }); });
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
      if (!lbEl.classList.contains('open')) bindAllSourceImages();
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    bindAllSourceImages();

    function bindImageCursor(img) {
      img.addEventListener('mouseenter', () => { lbCursor.style.display = 'block'; });
      img.addEventListener('mousemove', (e) => { lbCursor.style.left = e.clientX + 'px'; lbCursor.style.top = e.clientY + 'px'; });
      img.addEventListener('mouseleave', () => { lbCursor.style.display = 'none'; });
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
        lbMain.style.position = 'fixed'; lbMain.style.inset = '0';
        lbMain.style.width = '100vw'; lbMain.style.zIndex = '10000';
      } else if (!isZoomed && wasZoomed) {
        lbMain.dataset.zoomed = 'false';
        lbMain.style.position = ''; lbMain.style.inset = '';
        lbMain.style.width = ''; lbMain.style.zIndex = '';
        setTimeout(() => { lbMain.scrollTop = currentIndex * lbMain.clientHeight; }, 50);
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

    lbMain.addEventListener('scroll', () => {
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
    }, { passive: true });

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

    lbMobileTrack.addEventListener('touchstart', (e) => {
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
    }, { passive: true });

    lbMobileTrack.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const newScale = Math.max(1, Math.min(MOBILE_ZOOM_SCALE, mobilePinchStartScale * (dist / mobilePinchStartDist)));
        mobileScale = newScale;
        if (mobileScale <= 1) { resetMobileZoom(false); } else { setMobileZoomed(true); clampMobilePan(); applyMobileTransform(false); }
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
    }, { passive: false });

    lbMobileTrack.addEventListener('touchend', (e) => {
      mobilePinchStartDist = null;
      if (e.changedTouches.length !== 1) return;
      const now = Date.now();
      const dx = touchStartX !== null ? e.changedTouches[0].clientX - touchStartX : 0;
      const dy = touchStartY !== null ? e.changedTouches[0].clientY - touchStartY : 0;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (now - mobileLastTap < 300 && dist < 20) {
        mobileLastTap = 0;
        if (mobileZoomed) { resetMobileZoom(true); } else {
          mobileScale = MOBILE_ZOOM_SCALE; mobilePanX = 0; mobilePanY = 0;
          setMobileZoomed(true); lbMobileTrack.style.transition = 'none'; applyMobileTransform(true);
        }
        return;
      }
      mobileLastTap = now;
      if (!mobileZoomed && !mobileIsDragging && Math.abs(dx) > 40) {
        updateMobile(dx < 0 ? mobileIndex + 1 : mobileIndex - 1);
      }
      mobileIsDragging = false;
    }, { passive: true });

    function initZoom(img) {
      let zoomed = false;
      const SCALE = 4;
      let panX = 0, panY = 0, velX = 0, velY = 0;
      let dragStart = null, panAtDrag = null, isDragging = false;
      let lastDragX = 0, lastDragY = 0, rafId = null;

      function getMaxPan() {
        const slide = img.closest('.lb-slide');
        if (!slide) return { maxX: 9999, maxY: 9999 };
        return { maxX: ((img.offsetWidth * SCALE) / 2) * 0.5, maxY: ((img.offsetHeight * SCALE) / 2) * 0.5 };
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
          if (Math.abs(velX) < 0.1 && Math.abs(velY) < 0.1) { velX = 0; velY = 0; return; }
          panX += velX; panY += velY; velX *= friction; velY *= friction;
          clamp(); applyTransform(); rafId = requestAnimationFrame(tick);
        }
        rafId = requestAnimationFrame(tick);
      }
      function resetZoom() {
        zoomed = false; panX = 0; panY = 0; velX = 0; velY = 0;
        if (rafId) cancelAnimationFrame(rafId);
        img.classList.remove('zoom-active', 'grabbing');
        if (typeof gsap !== 'undefined') gsap.to(img, { scale: 1, x: 0, y: 0, duration: 0.3, ease: 'power2.out' });
        const slide = img.closest('.lb-slide');
        if (slide) slide.style.zIndex = '';
        updateCursor();
      }
      img.addEventListener('mousedown', (e) => {
        e.preventDefault();
        if (rafId) cancelAnimationFrame(rafId);
        velX = 0; velY = 0;
        dragStart = { x: e.clientX, y: e.clientY };
        panAtDrag = { x: panX, y: panY };
        lastDragX = e.clientX; lastDragY = e.clientY; isDragging = false;
        if (zoomed) img.classList.add('grabbing');
      });
      window.addEventListener('mousemove', (e) => {
        if (!dragStart) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) isDragging = true;
        if (zoomed && isDragging) {
          velX = (e.clientX - lastDragX) / 1.5; velY = (e.clientY - lastDragY) / 1.5;
          lastDragX = e.clientX; lastDragY = e.clientY;
          panX = panAtDrag.x + dx / 1.5; panY = panAtDrag.y + dy / 1.5;
          clamp(); applyTransform();
        }
      });
      window.addEventListener('mouseup', () => {
        if (!dragStart) return;
        const moved = isDragging;
        dragStart = null; img.classList.remove('grabbing');
        if (!moved) {
          if (!zoomed) {
            zoomed = true; img.classList.add('zoom-active');
            const slide = img.closest('.lb-slide');
            if (slide) slide.style.zIndex = '100';
            if (typeof gsap !== 'undefined') gsap.to(img, { scale: SCALE, x: 0, y: 0, duration: 0.35, ease: 'power2.out' });
            updateCursor();
          } else { resetZoom(); }
        } else if (zoomed) { startInertia(); }
      });
      img._resetZoom = resetZoom;
    }

    function isMobile() { return window.innerWidth < 768; }

    function open(index, group) {
      buildLightbox(group);
      lbEl.classList.add('open');
      document.body.classList.add('lightbox-open');
      document.body.style.overflow = 'hidden';
      globalCursor.style.display = 'none';
      window._snapLocked = true;
      stopLenis();
      mobileZoomed = false; mobileScale = 1; mobilePanX = 0; mobilePanY = 0; mobileLastTap = 0;
      if (isMobile()) {
        updateMobile(index, true);
      } else {
        window.addEventListener('wheel', onWheel, { passive: false, capture: true });
        requestAnimationFrame(() => {
          centerThumbsList();
          lbMain.scrollTop = index * lbMain.clientHeight;
          currentIndex = index;
          requestAnimationFrame(() => { setLineInstant(index); updateCursor(); });
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
      if (e.key === 'Escape') { close(); return; }
      if (!isMobile()) {
        if (isCurrentZoomed()) return;
        if (e.key === 'ArrowDown') lbMain.scrollTop += window.innerHeight;
        if (e.key === 'ArrowUp') lbMain.scrollTop -= window.innerHeight;
      } else {
        if (e.key === 'ArrowRight') updateMobile(mobileIndex + 1);
        if (e.key === 'ArrowLeft') updateMobile(mobileIndex - 1);
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initLightbox);
})();
