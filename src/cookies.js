function initCookies() {
  const COOKIES_KEY = "cookies_accepted";
  const cookiesOverlay = document.querySelector(".cookies-overlay");

  if (!cookiesOverlay) return;

  const cookieStyle = document.createElement("style");

  cookieStyle.textContent = `
    .cookies-overlay {
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .cookies-overlay.is-visible {
      opacity: 1;
    }

    .cookies-modal {
      transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .cookies-modal.is-hiding {
      transform: translateY(150%);
    }
  `;

  document.head.appendChild(cookieStyle);

  if (localStorage.getItem(COOKIES_KEY)) {
    cookiesOverlay.style.display = "none";
    return;
  }

  cookiesOverlay.style.display = "flex";

  document.documentElement.style.overflow = "hidden";
  document.documentElement.style.height = "100%";
  document.body.style.overflow = "hidden";

  function preventTouchOutsideModal(e) {
    const insideModal = !!e.target.closest(".cookies-modal");

    if (!insideModal) {
      e.preventDefault();
    }
  }

  document.addEventListener("touchmove", preventTouchOutsideModal, {
    passive: false,
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      cookiesOverlay.classList.add("is-visible");
    });
  });

  const waitLenis = setInterval(() => {
    if (window.lenis) {
      window.lenis.stop();
      clearInterval(waitLenis);
    }
  }, 50);

  const buttons = cookiesOverlay.querySelectorAll(
    ".cookies-modal_primary, .cookies-modal_secondary",
  );

  buttons.forEach((btn) => {
    btn.addEventListener(
      "click",
      (e) => {
        e.preventDefault();

        localStorage.setItem(COOKIES_KEY, "1");

        document.documentElement.style.overflow = "";
        document.documentElement.style.height = "";
        document.body.style.overflow = "";

        document.removeEventListener("touchmove", preventTouchOutsideModal);

        startLenisIfAllowed();

        const modal = cookiesOverlay.querySelector(".cookies-modal");

        if (modal) {
          modal.classList.add("is-hiding");

          setTimeout(() => {
            cookiesOverlay.style.display = "none";
          }, 600);
        } else {
          cookiesOverlay.style.display = "none";
        }
      },
      { passive: false },
    );
  });
}
