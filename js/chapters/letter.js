(function (Damy) {
  "use strict";

  // The interlude and the letter.
  // The night gives way to lamplight paper; the lights dim so nothing competes with the
  // words. Lines settle in gently as they arrive, never scrubbed and never hidden once
  // read, and the signature is written in at the end.

  function initLetter({ gsap, reduce, sky }) {
    const html = document.documentElement;
    const letter = document.querySelector(".letter");
    const paper = letter.querySelector(".letter__paper");
    const veil = document.querySelector(".veil");
    const progress = letter.querySelector(".letter__progress");
    const clamp = gsap.utils.clamp(0, 1);

    // Reading progress (desktop margin rule)
    ScrollTrigger.create({
      trigger: paper,
      start: "top 65%",
      end: "bottom 65%",
      onUpdate: (self) => progress?.style.setProperty("--read", self.progress.toFixed(4)),
    });

    if (reduce) return; // static layout: the letter section carries its own paper colour

    // ------------------------------------------------------------ night → paper → night
    // The paper opens out of the two lights like a lamp switching on, and folds back into
    // them when the letter ends: a wipe, never a muddy half-fade between dark and cream.
    let onPaper = false;
    let shown = -1;
    const setWipe = (v, origin) => {
      if (Math.abs(v - shown) < 0.0005) return;
      shown = v;
      const o = sky?.screenOf("mid") ?? origin;
      veil.style.setProperty("--wipe-x", `${o.x}px`);
      veil.style.setProperty("--wipe-y", `${o.y}px`);
      // radius large enough to cover the farthest corner from the origin
      const far = Math.hypot(Math.max(o.x, window.innerWidth - o.x), Math.max(o.y, window.innerHeight - o.y));
      // feathered edge (--wipe-f) so the paper spreads like lamplight, not a cut-out disc
      const feather = Math.min(window.innerWidth, window.innerHeight) * 0.22;
      veil.style.setProperty("--wipe-f", `${feather.toFixed(1)}px`);
      veil.style.setProperty("--wipe-r", `${(v * v * (far + feather * 1.2)).toFixed(1)}px`);
      veil.style.visibility = v > 0 ? "visible" : "hidden";
      // the ink belongs to the paper: it leaves with it
      letter.style.opacity = Math.min(1, v * 1.6).toFixed(3);
      const next = v > 0.55;
      if (next !== onPaper) html.classList.toggle("on-paper", (onPaper = next));
    };
    const fallbackOrigin = () => ({ x: window.innerWidth * 0.72, y: window.innerHeight * 0.48 });
    ScrollTrigger.create({
      trigger: letter,
      start: "top bottom",
      end: "bottom top",
      onUpdate: () => {
        const r = letter.getBoundingClientRect();
        const vh = window.innerHeight;
        const enter = clamp((vh * 0.85 - r.top) / (vh * 0.7));
        const leave = clamp((r.bottom - vh * 0.1) / (vh * 0.75));
        setWipe(Math.min(enter, leave), fallbackOrigin());
      },
      onLeave: () => setWipe(0, fallbackOrigin()),
      onLeaveBack: () => setWipe(0, fallbackOrigin()),
    });

    // ------------------------------------------------------------ interlude
    const words = SplitText.create(".interlude__text", { type: "words" });
    gsap.fromTo(
      words.words,
      { opacity: 0.1, filter: "blur(6px)" },
      {
        opacity: 1,
        filter: "blur(0px)",
        ease: "none",
        stagger: 0.12,
        scrollTrigger: { trigger: ".interlude", start: "top 70%", end: "center 45%", scrub: 0.6 },
      }
    );

    // ------------------------------------------------------------ title + envelope
    const title = SplitText.create(letter.querySelectorAll(".letter__title > span"), { type: "chars", mask: "chars" });
    gsap.from(title.chars, {
      yPercent: 105,
      stagger: 0.03,
      duration: 1.3,
      scrollTrigger: { trigger: letter, start: "top 30%" },
    });
    gsap.from(letter.querySelectorAll(".letter__envelope > div, .letter__progress"), {
      opacity: 0,
      y: 14,
      stagger: 0.12,
      duration: 1,
      scrollTrigger: { trigger: letter, start: "top 25%" },
    });

    // ------------------------------------------------------------ the words
    paper.querySelectorAll(".letter__salute").forEach((el) => {
      gsap.from(el, { opacity: 0, y: 18, duration: 1.4, scrollTrigger: { trigger: el, start: "top 85%" } });
    });
    paper.querySelectorAll("p:not(.letter__salute):not(.letter__signature)").forEach((p) => {
      // autoSplit re-splits on resize / font load so masked lines are always correct.
      SplitText.create(p, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.lines, {
            yPercent: 100,
            opacity: 0,
            duration: 1.1,
            stagger: 0.07,
            ease: "lift",
            scrollTrigger: { trigger: p, start: "top 88%", once: true },
          }),
      });
    });

    // ------------------------------------------------------------ signature, written in
    const ink = paper.querySelector(".letter__ink");
    gsap.fromTo(
      ink,
      { clipPath: "inset(-30% 100% -30% -6%)" },
      {
        clipPath: "inset(-30% -6% -30% -6%)",
        duration: 2.4,
        ease: "ink",
        scrollTrigger: { trigger: ink, start: "top 88%" },
      }
    );
  }

  Damy.initLetter = initLetter;
})((window.Damy = window.Damy || {}));
