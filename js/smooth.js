(function (Damy) {
  "use strict";

  // Smooth scrolling.
  // Lenis smooths the real window scroll, so position: sticky scenes, ScrollTrigger and
  // the sky (which reads window.scrollY) all keep working unchanged. It runs on GSAP's
  // ticker so every scrubbed animation and the two lights move in the same frame.
  // Touch keeps native scrolling (phones already have their own momentum), and with
  // "reduce motion" turned on there is no smoothing at all.
  function createSmooth({ gsap, reduce }) {
    const html = document.documentElement;
    let lenis = null;

    if (!reduce && typeof window.Lenis === "function") {
      lenis = new window.Lenis({
        lerp: 0.085, // lower = silkier and longer glide; higher = snappier
        wheelMultiplier: 0.9,
        smoothWheel: true,
        syncTouch: false,
        anchors: false, // anchors are handled below so focus moves too
      });
      lenis.on("scroll", window.ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    let locks = 0;
    const api = {
      lenis,
      /** Pause page scrolling (intro, photo viewer). Calls are counted, so nested locks are safe. */
      stop() {
        locks++;
        if (lenis) lenis.stop();
        else html.style.overflow = "hidden";
      },
      start() {
        locks = Math.max(0, locks - 1);
        if (locks) return;
        if (lenis) lenis.start();
        else html.style.overflow = "";
      },
      scrollTo(target, { immediate = false, offset = 0 } = {}) {
        if (lenis) {
          lenis.scrollTo(target, { immediate, offset, duration: immediate ? 0 : 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
          return;
        }
        const el = typeof target === "string" ? document.querySelector(target) : target;
        const y = typeof target === "number" ? target : el ? el.getBoundingClientRect().top + window.scrollY + offset : 0;
        window.scrollTo({ top: y, behavior: immediate || reduce ? "auto" : "smooth" });
      },
    };

    // In-page links (#top, the skip link, "Begin again") glide instead of jumping,
    // and keyboard focus follows so assistive tech lands in the right place.
    document.addEventListener("click", (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      const el = id === "#top" ? document.getElementById("top") : document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      api.scrollTo(id === "#top" ? 0 : el);
      history.replaceState(null, "", id);
      const focusable = el.hasAttribute("tabindex") ? el : null;
      (focusable || a).focus({ preventScroll: true });
    });

    return api;
  }

  Damy.createSmooth = createSmooth;
})((window.Damy = window.Damy || {}));
