(function (Damy) {
  "use strict";

  // The threshold: a dark room, a dedication, then the two lights come on and the
  // title rises out of the dark. Short on purpose; scroll is never held for long.

  const MIN_HOLD = 1.1; // seconds the dedication stays, so it can be read
  const FAILSAFE = 4500; // never wait longer than this for assets

  function settle(promise, ms) {
    return Promise.race([promise.catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
  }

  function decode(img) {
    if (!img) return Promise.resolve();
    if (img.complete && img.naturalWidth) return img.decode?.().catch(() => {}) ?? Promise.resolve();
    return new Promise((r) => {
      img.addEventListener("load", r, { once: true });
      img.addEventListener("error", r, { once: true });
    });
  }

  async function runIntro({ gsap, reduce, sky }) {
    const html = document.documentElement;
    const threshold = document.querySelector(".threshold");
    const num = document.querySelector(".threshold__num");
    const line = document.querySelector(".threshold__line");
    const hero = document.querySelector(".hero");
    const pairImg = hero.querySelector(".hero__pair img");

    const assets = [document.fonts?.ready ?? Promise.resolve(), decode(pairImg)];

    if (reduce) {
      await settle(Promise.all(assets), 2500);
      if (sky) sky.extra.intro = 1;
      threshold?.remove();
      return;
    }

    // Hold the page still while the threshold plays (released early, never for long).
    window.Damy.smooth?.stop();
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      window.Damy.smooth?.start();
    };
    const failsafe = setTimeout(unlock, FAILSAFE + 2000);

    // Dedication + counter while fonts and the hero image arrive.
    const counter = { v: 0 };
    let loaded = 0;
    const bump = () => {
      loaded++;
      gsap.to(counter, {
        v: (loaded / assets.length) * 100,
        duration: 0.6,
        ease: "power2.out",
        onUpdate: () => (num.textContent = String(Math.round(counter.v)).padStart(2, "0")),
      });
    };
    assets.forEach((p) => p.then(bump, bump));

    gsap.fromTo(line, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.2, delay: 0.15 });
    await Promise.all([settle(Promise.all(assets), FAILSAFE), new Promise((r) => setTimeout(r, MIN_HOLD * 1000))]);
    await new Promise((r) => gsap.to(counter, { v: 100, duration: 0.35, onUpdate: () => (num.textContent = String(Math.round(counter.v)).padStart(2, "0")), onComplete: r }));

    // Prepare the hero (fonts are ready now, so splitting is measured correctly).
    const words = hero.querySelectorAll(".hero__word");
    const split = SplitText.create(words, { type: "chars", charsClass: "char" });
    const always = hero.querySelectorAll(".hero__always > *");
    const pair = hero.querySelector(".hero__pair");
    const chrome = document.querySelector(".chrome");

    gsap.set(split.chars, { yPercent: 115 });
    gsap.set([always, ".hero__to", ".hero__cue", chrome], { opacity: 0 });
    gsap.set(pair, { opacity: 0, y: 60 });

    const tl = gsap.timeline({ onComplete: () => clearTimeout(failsafe) });
    tl.to([line, ".threshold__count"], { opacity: 0, y: -10, duration: 0.6, ease: "power2.in" })
      .to(threshold, { opacity: 0, duration: 1.1, ease: "breath", onComplete: () => threshold.remove() }, "-=0.1")
      // the two lights come on — first everyone else, then the two of us
      .to(sky?.extra ?? {}, { intro: 1, duration: 2.4, ease: "power1.inOut" }, "<")
      .to(split.chars, { yPercent: 0, duration: 1.5, stagger: 0.035, ease: "lift" }, "-=1.7")
      .add(unlock, "-=1.2")
      .to(pair, { opacity: 1, y: 0, duration: 1.8, ease: "lift" }, "-=1.3")
      .to(always, { opacity: 1, duration: 1.2, stagger: 0.18, ease: "breath" }, "-=1.4")
      .to([".hero__to", ".hero__cue", chrome], { opacity: 1, duration: 1, stagger: 0.1, ease: "breath" }, "-=0.9");

    // Scroll-out: the journey's two words part ways across the screen as you move on.
    gsap
      .timeline({
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.8 },
        defaults: { ease: "none" },
      })
      .to(".hero__line--a .hero__word", { xPercent: -14, opacity: 0.15 }, 0)
      .to(".hero__line--b .hero__word", { xPercent: 12, opacity: 0.15 }, 0)
      // fromTo + immediateRender:false: these elements are also faded in by the intro.
      .fromTo(pair, { yPercent: 0, scale: 1, opacity: 1 }, { yPercent: -14, scale: 0.92, opacity: 0.2, immediateRender: false }, 0)
      .to(".hero__always", { yPercent: -60, opacity: 0 }, 0)
      .fromTo(".hero__cue, .hero__to", { opacity: 1 }, { opacity: 0, duration: 0.3, immediateRender: false }, 0);

    // Resolve once the title is legible; the rest keeps settling on its own.
    await new Promise((r) => tl.call(r, null, 2.2));
  }

  Damy.runIntro = runIntro;
})((window.Damy = window.Damy || {}));
