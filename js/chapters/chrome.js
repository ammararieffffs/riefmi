(function (Damy) {
  "use strict";

  // The fixed frame: wordmark + a quiet chapter indicator with page progress.

  function initChrome({ gsap, reduce }) {
    const index = document.querySelector(".chrome__index");
    const name = document.querySelector(".chrome__name");
    const rule = document.querySelector(".chrome__rule");
    let current = "Prologue";

    function setChapter(section) {
      const next = section.dataset.chapter;
      if (!next || next === current) return;
      current = next;
      index.textContent = section.dataset.index;
      if (reduce) {
        name.textContent = next;
        return;
      }
      gsap.killTweensOf(name);
      gsap
        .timeline()
        .to(name, { yPercent: -110, duration: 0.35, ease: "power2.in" })
        .add(() => (name.textContent = next))
        .fromTo(name, { yPercent: 110 }, { yPercent: 0, duration: 0.6, ease: "lift" });
    }

    document.querySelectorAll("[data-chapter]").forEach((section) => {
      ScrollTrigger.create({
        trigger: section,
        start: "top 55%",
        end: "bottom 55%",
        onToggle: (self) => self.isActive && setChapter(section),
      });
    });

    ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => rule.style.setProperty("--progress", self.progress.toFixed(4)),
    });
  }

  Damy.initChrome = initChrome;
})((window.Damy = window.Damy || {}));
