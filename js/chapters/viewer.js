(function (Damy) {
  "use strict";

  // The viewer: a photo lifts out of its frame and opens to its full, uncropped shape.
  // Native <dialog> (focus trap, Esc, top layer) + GSAP Flip for the morph.
  // Input: click/tap, arrows, swipe (Observer), Esc / close button / swipe down.

  function initViewer({ gsap, reduce }) {
    const dialog = document.querySelector(".viewer");
    const shade = dialog.querySelector(".viewer__shade");
    const stage = dialog.querySelector(".viewer__stage");
    const frame = dialog.querySelector(".viewer__frame");
    const img = dialog.querySelector(".viewer__img");
    const bar = dialog.querySelector(".viewer__bar");
    const no = dialog.querySelector(".viewer__no");
    const file = dialog.querySelector(".viewer__file");
    const items = [...document.querySelectorAll(".moment")];
    const total = items.length;

    let index = 0;
    let source = null; // the frame button we opened from
    let busy = false;

    const photo = (i) => {
      const li = items[i];
      const thumb = li.querySelector("img");
      return {
        button: li.querySelector(".moment__frame"),
        thumb,
        full: thumb.dataset.fullWebp,
        w: +thumb.getAttribute("width"),
        h: +thumb.getAttribute("height"),
        alt: thumb.alt,
        label: li.querySelector(".moment__file")?.textContent ?? "",
      };
    };

    /** Fit the photo's real aspect ratio inside the stage. */
    function layoutFor(p) {
      const cs = getComputedStyle(stage);
      const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      const availW = stage.clientWidth - padX;
      const availH = stage.clientHeight - padY;
      const ar = p.w / p.h;
      let w = availW, h = w / ar;
      if (h > availH) { h = availH; w = h * ar; }
      return {
        width: Math.round(w),
        height: Math.round(h),
        left: Math.round(parseFloat(cs.paddingLeft) + (availW - w) / 2),
        top: Math.round(parseFloat(cs.paddingTop) + (availH - h) / 2),
      };
    }

    function setContent(p) {
      // Start from the already-loaded thumbnail (instant), upgrade to full resolution.
      img.src = p.thumb.currentSrc || p.thumb.src;
      img.alt = p.alt;
      const hi = new Image();
      hi.decoding = "async";
      hi.src = p.full;
      const want = p.full;
      hi.decode?.().then(() => { if (photo(index).full === want) img.src = want; }).catch(() => {});
      no.textContent = String(index + 1).padStart(2, "0");
      file.textContent = p.label;
    }

    function open(i, button) {
      if (busy || dialog.open) return;
      index = i;
      source = button;
      const p = photo(i);
      setContent(p);
      document.documentElement.classList.add("viewer-open");
      window.Damy.smooth?.stop();
      dialog.showModal();
      gsap.set(frame, layoutFor(p));

      if (reduce) {
        gsap.fromTo([shade, frame, bar], { opacity: 0 }, { opacity: 1, duration: 0.2 });
        return;
      }
      busy = true;
      // Morph from the exact frame on the page into the full shape of the photo.
      const from = Flip.fit(frame, p.button, { scale: false, getVars: true });
      gsap.timeline({ onComplete: () => (busy = false) })
        .fromTo(shade, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "breath" }, 0)
        .from(frame, { ...from, duration: 1, ease: "lift", clearProps: "x,y,transform" }, 0)
        .fromTo(bar, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7 }, 0.35);
    }

    function finishClose() {
      dialog.close();
      document.documentElement.classList.remove("viewer-open");
      window.Damy.smooth?.start();
      gsap.set([frame, shade, bar, img], { clearProps: "all" });
      busy = false;
      source?.focus({ preventScroll: true });
    }

    function close() {
      if (busy || !dialog.open) return;
      if (reduce) return finishClose();
      busy = true;
      const target = photo(index).button;
      const r = target.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
      const tl = gsap.timeline({ onComplete: finishClose });
      tl.to(bar, { opacity: 0, duration: 0.25 }, 0).to(shade, { opacity: 0, duration: 0.6, ease: "breath" }, 0.1);
      if (visible) {
        source = target;
        tl.add(Flip.fit(frame, target, { scale: false, duration: 0.75, ease: "breath" }), 0);
      } else {
        tl.to(frame, { opacity: 0, scale: 0.94, duration: 0.45, ease: "power2.in" }, 0);
      }
    }

    function go(dir) {
      if (busy || !dialog.open) return;
      index = (index + dir + total) % total;
      const p = photo(index);
      if (reduce) {
        setContent(p);
        gsap.set(frame, layoutFor(p));
        return;
      }
      busy = true;
      gsap.timeline({ onComplete: () => (busy = false) })
        .to(img, { opacity: 0, x: -dir * 40, duration: 0.28, ease: "power2.in" })
        .add(() => setContent(p))
        .to(frame, { ...layoutFor(p), duration: 0.7, ease: "breath" })
        .fromTo(img, { opacity: 0, x: dir * 40 }, { opacity: 1, x: 0, duration: 0.6, ease: "lift" }, "-=0.45");
    }

    dialog.querySelector(".viewer__prev").addEventListener("click", () => go(-1));
    dialog.querySelector(".viewer__next").addEventListener("click", () => go(1));
    dialog.querySelector(".viewer__close").addEventListener("click", close);
    shade.addEventListener("click", close);
    stage.addEventListener("click", (e) => e.target === stage && close());
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault(); // Esc → our animated close
      close();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
    });
    window.addEventListener("resize", () => {
      if (dialog.open && !busy) gsap.set(frame, layoutFor(photo(index)));
    });

    Observer.create({
      target: stage,
      type: "touch,pointer",
      dragMinimum: 6,
      tolerance: 40,
      lockAxis: true,
      onLeft: () => go(1),
      onRight: () => go(-1),
      onDown: () => close(),
    });

    return { open, close };
  }

  Damy.initViewer = initViewer;
})((window.Damy = window.Damy || {}));
