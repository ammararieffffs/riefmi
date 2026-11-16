(function (Damy) {
  "use strict";

  // "Us": the two of you, introduced by what you call each other.
  // The trailing letters of each name stretch out the way a name does when it's called
  // across a room. At the end the two figures walk to the middle and stand together.
  // Hidden detail: tap a figure and it calls the other one's name again.

  const MAX_EXTRA = 5;

  function initUs({ gsap, reduce, mm }) {
    const section = document.querySelector(".us");
    const stage = section.querySelector(".us__stage");
    const her = section.querySelector(".us__name--her");
    const him = section.querySelector(".us__name--him");
    const figHim = section.querySelector(".us__figure--him");
    const figHer = section.querySelector(".us__figure--her");
    const amp = section.querySelector(".us__amp");
    const floor = section.querySelector(".us__floor");

    // ------------------------------------------------------------ tap to call
    const extras = new Map(); // tail → { count, timer }
    function callAgain(fig) {
      const name = fig.dataset.calls === "her" ? her : him;
      const tail = name.querySelector(".us__tail");
      const said = fig.dataset.calls === "her" ? "Anje Babyyyy" : "Baby Booooo";
      const state = extras.get(tail) ?? { count: 0, timer: 0 };
      extras.set(tail, state);

      if (state.count < MAX_EXTRA) {
        const letter = document.createElement("span");
        letter.textContent = tail.dataset.letter;
        letter.className = "is-extra";
        tail.append(letter);
        state.count++;
        if (!reduce) gsap.from(letter, { opacity: 0, x: "-0.35em", scaleX: 0.3, transformOrigin: "left", duration: 0.6 });
      }
      clearTimeout(state.timer);
      state.timer = setTimeout(() => {
        const added = tail.querySelectorAll(".is-extra");
        gsap.to(added, {
          opacity: 0,
          x: "-0.3em",
          duration: reduce ? 0.01 : 0.45,
          stagger: { each: 0.06, from: "end" },
          ease: "power2.in",
          onComplete: () => added.forEach((n) => n.remove()),
        });
        state.count = 0;
      }, 2600);

      // A little voice that floats up from the figure.
      const voice = document.createElement("span");
      voice.className = "us__voice";
      voice.setAttribute("aria-hidden", "true");
      voice.textContent = said;
      fig.append(voice);
      if (reduce) {
        setTimeout(() => voice.remove(), 1400);
        return;
      }
      gsap.fromTo(
        voice,
        { opacity: 0, y: 10, rotate: fig.dataset.calls === "her" ? -6 : 6 },
        { opacity: 1, y: -46, duration: 0.7, ease: "lift" }
      );
      gsap.to(voice, { opacity: 0, y: -80, delay: 0.9, duration: 0.7, ease: "power1.in", onComplete: () => voice.remove() });
      // a hop: squash, lift, settle
      gsap
        .timeline({ overwrite: true })
        .to(fig.querySelector("picture"), { scaleY: 0.94, scaleX: 1.04, duration: 0.12, ease: "power2.out", transformOrigin: "50% 100%" })
        .to(fig.querySelector("picture"), { y: -22, scaleY: 1.04, scaleX: 0.97, duration: 0.24, ease: "power2.out" })
        .to(fig.querySelector("picture"), { y: 0, scaleY: 1, scaleX: 1, duration: 0.6, ease: "bounce.out" });
    }
    [figHim, figHer].forEach((fig) => fig.addEventListener("click", () => callAgain(fig)));

    if (reduce) return;

    // ------------------------------------------------------------ scroll story
    const splitHer = SplitText.create(her.querySelector(".us__base"), { type: "chars", mask: "chars" });
    const splitHim = SplitText.create(him.querySelector(".us__base"), { type: "chars", mask: "chars" });
    const tailHer = her.querySelectorAll(".us__tail > span");
    const tailHim = him.querySelectorAll(".us__tail > span");

    // How far each figure has to walk to meet in the middle (measured, so it survives resizes).
    const meetGap = () => figHim.offsetWidth * 0.1;
    const toCenterHim = () => stage.clientWidth / 2 + meetGap() - (figHim.offsetLeft + figHim.offsetWidth);
    const toCenterHer = () => stage.clientWidth / 2 - meetGap() - figHer.offsetLeft;

    mm.add("(min-width: 0px)", () => {
      // Explicit starting states: staggered tweens only pre-render their first target.
      gsap.set(floor, { scaleX: 0 });
      gsap.set(figHim, { xPercent: -220, opacity: 0 });
      gsap.set(figHer, { xPercent: 260, opacity: 0 });
      gsap.set(her.querySelector(".us__caption"), { opacity: 0, x: -24 });
      gsap.set(him.querySelector(".us__caption"), { opacity: 0, x: 24 });
      gsap.set(splitHer.chars, { yPercent: 110 });
      gsap.set(splitHim.chars, { yPercent: -175 });
      gsap.set([...tailHer, ...tailHim], { opacity: 0, x: "-0.5em", scaleX: 0.2, transformOrigin: "left center" });
      gsap.set(amp, { opacity: 0 });

      const tl = gsap.timeline({
        defaults: { ease: "lift" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      });

      // fromTo throughout: explicit start values survive invalidateOnRefresh (needed for the
      // measured walk-to-centre distances) without re-recording hidden states as end states.
      const tailIn = { opacity: 1, x: 0, scaleX: 1, duration: 0.9, ease: "power2.out" };
      const tailOut = { opacity: 0, x: "-0.5em", scaleX: 0.2, transformOrigin: "left center" };
      // Movement is tied to the scrollbar; LETTERS are not. A scrubbed letter-by-letter
      // reveal freezes half-masked whenever you stop scrolling and reads as clipped text,
      // so each name plays as a short timed reveal once its scroll point is passed.
      tl.fromTo(floor, { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "breath" }, 0)
        .fromTo(figHim, { xPercent: -220, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 2 }, 0)
        .fromTo(figHer, { xPercent: 260, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 2 }, 3)
        // names recede, the two walk to the middle; an ampersand rises behind them
        .fromTo([her, him], { opacity: 1 }, { opacity: 0.13, duration: 1.6, ease: "breath" }, 7)
        .fromTo(her, { y: 0 }, { y: () => -window.innerHeight * 0.05, duration: 1.6, ease: "breath" }, 7)
        .fromTo(figHim, { x: 0 }, { x: toCenterHim, duration: 2.4, ease: "breath" }, 7.2)
        .fromTo(figHer, { x: 0 }, { x: toCenterHer, duration: 2.4, ease: "breath" }, 7.2)
        .fromTo(amp, { opacity: 0, yPercent: 8, scale: 0.94 }, { opacity: 0.2, yPercent: 0, scale: 1, duration: 2.2, ease: "breath" }, 7.6)
        .to({}, { duration: 0.8 }); // a held beat before the section releases

      // Timed reveals, triggered at the same points in the scroll as the figures arrive.
      const total = tl.duration();
      const at = (t) => () => `top+=${Math.round((section.offsetHeight - window.innerHeight) * (t / total))} top`;
      const reveal = (nameEl, chars, tail, from, t) =>
        gsap
          .timeline({
            paused: true,
            scrollTrigger: { trigger: section, start: at(t), toggleActions: "play none none reverse", invalidateOnRefresh: true },
          })
          .to(nameEl.querySelector(".us__caption"), { opacity: 1, x: 0, duration: 0.8 }, 0)
          .fromTo(chars, { yPercent: from }, { yPercent: 0, duration: 1.1, stagger: 0.045, ease: "lift" }, 0.05)
          .to(tail, { opacity: 1, x: 0, scaleX: 1, duration: 0.7, stagger: 0.16, ease: "power2.out" }, 0.55);
      reveal(her, splitHer.chars, tailHer, 110, 0.6);
      reveal(him, splitHim.chars, tailHim, -175, 3.6);
    });
  }

  Damy.initUs = initUs;
})((window.Damy = window.Damy || {}));
