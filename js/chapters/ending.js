(function (Damy) {
  "use strict";

  // "Always": the closing words, and one last thing to do.
  // Press and hold: the two lights spiral in and become one, and every other light in
  // the world turns warm. Holding is the point, staying a little longer. It can be done
  // again, and again.

  const HOLD_SECONDS = 2.6;

  function initEnding({ gsap, reduce, sky }) {
    const section = document.querySelector(".ending");
    const button = section.querySelector(".hold__button");
    const help = section.querySelector(".hold__help");
    const srLabel = button.querySelector(".sr-only");
    const reveal = section.querySelector(".reveal__text");
    const dawn = document.querySelector(".dawn");
    const extra = sky?.extra ?? { hold: 0, merge: 0 };

    // ------------------------------------------------------------ words
    if (!reduce) {
      const lines = SplitText.create(section.querySelectorAll(".ending__title > span"), { type: "lines", mask: "lines" });
      gsap.from(lines.lines, {
        yPercent: 105,
        stagger: 0.16,
        duration: 1.5,
        scrollTrigger: { trigger: section, start: "top 55%" },
      });
      gsap.from(section.querySelectorAll(".ending__again span"), {
        opacity: 0,
        y: 10,
        stagger: 0.55, // a rhythm, like saying it again
        duration: 1.1,
        ease: "breath",
        scrollTrigger: { trigger: ".ending__again", start: "top 85%" },
      });
      gsap.from(".hold", { opacity: 0, y: 20, duration: 1.2, scrollTrigger: { trigger: ".hold", start: "top 92%" } });
    }

    // ------------------------------------------------------------ hold
    const state = { v: 0 };
    let holding = false;
    let merged = false;
    let tween;
    const setRing = () => {
      button.style.setProperty("--hold-offset", (1 - state.v).toFixed(4));
      extra.hold = state.v;
    };

    let lastPress = 0;
    function start() {
      if (holding) return;
      holding = true;
      lastPress = performance.now();
      button.classList.add("is-holding");
      if (merged) return unmerge();
      navigator.vibrate?.(8);
      tween?.kill();
      tween = gsap.to(state, {
        v: 1,
        duration: HOLD_SECONDS * (1 - state.v) * (reduce ? 0.5 : 1),
        ease: "none",
        onUpdate: setRing,
        onComplete: merge,
      });
    }

    function release() {
      if (!holding) return;
      holding = false;
      button.classList.remove("is-holding");
      if (merged) return;
      tween?.kill();
      tween = gsap.to(state, { v: 0, duration: 0.5 + state.v * 0.6, ease: "power2.out", onUpdate: setRing });
    }

    function placeDawn() {
      const vw = window.innerWidth, vh = window.innerHeight;
      const p = sky ? sky.screenOf("mid") : { x: vw * 0.7, y: vh * 0.5 };
      dawn.style.setProperty("--dawn-x", `${(p.x / vw) * 100}%`);
      dawn.style.setProperty("--dawn-y", `${(p.y / vh) * 100}%`);
      // The words belong to the light: just above it if there's room, else just below.
      const h = reveal.offsetHeight || vh * 0.3;
      const gap = Math.min(vw, vh) * 0.11;
      const hold = section.querySelector(".hold").getBoundingClientRect();
      const clash = (top) => top < hold.bottom + 12 && top + h > hold.top - 12;
      const above = p.y - gap - h;
      const below = Math.min(p.y + gap * 0.8, vh - h - 16);
      const y = above > vh * 0.09 && !clash(above) ? above : !clash(below) ? below : above;
      gsap.set(reveal, { y: Math.round(y) });
    }
    const follow = () => merged && placeDawn();

    function merge() {
      merged = true;
      navigator.vibrate?.([10, 60, 18]);
      section.classList.add("is-merged");
      reveal.hidden = false;
      placeDawn();
      gsap.ticker.add(follow);
      help.textContent = "Hold again — as many times as you like";
      srLabel.textContent = "Hold again";
      const lines = reveal.querySelectorAll(".reveal__line, .reveal__from");
      if (reduce) {
        extra.merge = 1;
        gsap.set(dawn, { opacity: 1 });
        return;
      }
      gsap
        .timeline()
        .to(extra, { merge: 1, duration: 2.6, ease: "breath" }, 0)
        .to(dawn, { opacity: 1, duration: 2.8, ease: "breath" }, 0.2)
        .fromTo(lines, { opacity: 0, y: 26, filter: "blur(8px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.6, stagger: 0.35, ease: "lift" }, 1.2);
    }

    function unmerge() {
      merged = false;
      section.classList.remove("is-merged");
      help.textContent = "Press & hold — stay a little longer";
      srLabel.textContent = "Hold to stay a little longer";
      const lines = reveal.querySelectorAll(".reveal__line, .reveal__from");
      tween?.kill();
      gsap
        .timeline({
          onComplete: () => {
            reveal.hidden = true;
            gsap.ticker.remove(follow);
          },
        })
        .to(lines, { opacity: 0, y: -12, duration: reduce ? 0.01 : 0.6, stagger: 0.08 }, 0)
        .to(extra, { merge: 0, duration: reduce ? 0.01 : 1.6, ease: "breath" }, 0)
        .to(dawn, { opacity: 0, duration: reduce ? 0.01 : 1.4 }, 0)
        .to(state, { v: 0, duration: reduce ? 0.01 : 0.8, onUpdate: setRing }, 0);
      // after the lights part, a new hold starts the moment they release & press again
      holding = false;
      button.classList.remove("is-holding");
    }

    button.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      button.setPointerCapture?.(e.pointerId);
      start();
    });
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("contextmenu", (e) => e.preventDefault());
    button.addEventListener("keydown", (e) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        start();
      }
    });
    button.addEventListener("keyup", (e) => {
      if (e.key === " " || e.key === "Enter") release();
    });
    button.addEventListener("blur", release);
    // Screen readers and switch devices activate with a single click and cannot "hold":
    // a click that didn't come from one of our presses completes the moment directly.
    button.addEventListener("click", () => {
      if (performance.now() - lastPress < 5000) return;
      if (merged) return unmerge();
      tween?.kill();
      state.v = 1;
      setRing();
      merge();
    });

  }

  Damy.initEnding = initEnding;
})((window.Damy = window.Damy || {}));
