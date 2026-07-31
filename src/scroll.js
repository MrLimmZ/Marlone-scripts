let projectSnapWheelHandler = null;
window._snapLocked = false;

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
  if (window.innerWidth < 992) return;
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