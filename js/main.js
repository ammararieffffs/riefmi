(function () {
  "use strict";

  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, Observer, CustomEase);

  // One motion vocabulary for the whole piece.
  CustomEase.create("lift", "0.16, 1, 0.3, 1"); // arrivals: quick start, long tender settle
  CustomEase.create("breath", "0.45, 0, 0.15, 1"); // transitions between states
  CustomEase.create("ink", "0.65, 0, 0.25, 1"); // handwriting
  gsap.defaults({ ease: "lift", duration: 1.1 });

  const html = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  html.classList.toggle("motion", !reduce);

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (!location.hash) window.scrollTo(0, 0);

  ScrollTrigger.config({ ignoreMobileResize: true });

  const { createSmooth, createStory, edge, createSky, runIntro, initChrome, initUs, initMoments, initViewer, initLetter, initEnding } = window.Damy;

  const story = createStory();
  // The story of the two lights, anchored to the page.
  //                                    wide (landscape)                       tall (portrait)
  story.add(() => 0, { ax: -0.5, ay: 0.5, bx: 0.66, by: -0.2, sync: 0, flow: 0.15 }, { ax: -0.55, ay: 0.62, bx: 0.6, by: 0.12 });
  story.add(edge(".us", "top", -0.2), { ax: -0.5, ay: 0.55, bx: 0.5, by: 0.38, sync: 0.15 }, { ax: -0.6, ay: 0.68, bx: 0.6, by: 0.5 });
  story.add(edge(".us", "top", 0.6), { ax: -0.42, ay: 0.6, bx: 0.44, by: 0.5, sync: 0.3 }, { ax: -0.55, ay: 0.74, bx: 0.55, by: 0.6 });
  story.add(edge(".us", "bottom", -1.6), { ax: -0.12, ay: 0.6, bx: 0.12, by: 0.58, sync: 0.5 }, { ax: -0.16, ay: 0.74, bx: 0.16, by: 0.72 });
  story.add(edge(".us", "bottom", -1), { ax: -0.04, ay: 0.62, bx: 0.05, by: 0.6, sync: 0.6, flow: 0.4 }, { ax: -0.05, ay: 0.76, bx: 0.06, by: 0.74 });
  story.add(edge(".moments", "top", 0), { ax: 0.5, ay: 0.66, bx: 0.58, by: 0.6, sync: 0.65, flow: 1 }, { ax: 0.55, ay: 0.78, bx: 0.66, by: 0.74, flow: 0.35 });
  story.add(edge(".moments", "bottom", -1), { ax: 0.42, ay: 0.68, bx: 0.5, by: 0.62, sync: 0.75, flow: 1 }, { ax: 0.5, ay: 0.8, bx: 0.6, by: 0.76 });
  story.add(edge(".interlude", "top", 0), { ax: 0.42, ay: 0.06, bx: 0.5, by: 0.0, sync: 0.8, flow: 0.25, dim: 1, warmth: 0 }, { ax: 0.4, ay: -0.5, bx: 0.52, by: -0.56 });
  story.add(edge(".letter", "top", -0.3), { dim: 1, warmth: 0.1 });
  story.add(edge(".letter", "top", 0.25), { dim: 0, warmth: 0.25 });
  story.add(edge(".letter", "bottom", -1.1), { dim: 0, ax: 0.4, ay: -0.02, bx: 0.4, by: -0.02, orbit: 0.4 }, { ax: 0.18, ay: -0.1, bx: 0.18, by: -0.1 });
  story.add(edge(".ending", "top", -0.2), { dim: 1, warmth: 0.2, sync: 0.9, orbit: 0.7, radius: 0.12 });
  story.add(edge(".ending", "top", 0.4), { ax: 0.42, ay: 0.04, bx: 0.42, by: 0.04, orbit: 1, radius: 0.13, sync: 1, warmth: 0.3, flow: 0.1 }, { ax: 0.38, ay: -0.36, bx: 0.38, by: -0.36, radius: 0.2 });
  story.add(edge(".coda", "top", -0.35), {}, { ax: 0.38, ay: -0.36, bx: 0.38, by: -0.36 });
  story.add(edge(".coda", "bottom", -1), { ax: 0.5, ay: 0.3, bx: 0.5, by: 0.3, radius: 0.1 }, { ax: 0.3, ay: 0.52, bx: 0.3, by: 0.52, radius: 0.16 });

  const sky = createSky(document.querySelector(".sky"), { reduce, story });

  const smooth = createSmooth({ gsap, reduce });
  window.Damy.smooth = smooth;
  const ctx = { gsap, reduce, sky, story, smooth, mm: gsap.matchMedia() };

  initChrome(ctx);
  const viewer = initViewer(ctx);

  runIntro(ctx).then(() => {
    initUs(ctx);
    initMoments({ ...ctx, viewer });
    initLetter(ctx);
    initEnding(ctx);
    ScrollTrigger.refresh();
    story.refresh();
    if (location.hash && document.querySelector(location.hash)) smooth.scrollTo(location.hash, { immediate: true });
  });

  // Late layout changes (fonts, lazy images) → recalc once things settle.
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
