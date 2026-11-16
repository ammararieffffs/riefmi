(function (Damy) {
  "use strict";

  // "Moments in Motion": the nine photographs.
  // Wide screens: the page turns into a slow night drive — frames pass sideways like
  // lit windows, each image drifting inside its frame. Narrow screens: a deliberately
  // composed vertical sequence, each frame developing as it arrives.
  // Every frame opens in the viewer (tap, click, Enter/Space).

  function initMoments({ gsap, reduce, mm, viewer }) {
    const section = document.querySelector(".moments");
    const track = section.querySelector(".moments__track");
    const items = [...section.querySelectorAll(".moment")];
    const buttons = items.map((li) => li.querySelector(".moment__frame"));

    buttons.forEach((btn, i) => btn.addEventListener("click", () => viewer.open(i, btn)));

    if (reduce) return;

    const title = SplitText.create(section.querySelectorAll(".moments__title > span"), { type: "chars", mask: "chars" });

    mm.add(
      {
        wide: "(min-width: 900px)",
        narrow: "(max-width: 899.98px)",
      },
      (context) => {
        const { wide } = context.conditions;

        if (wide) {
          const travel = () => Math.max(0, track.scrollWidth - window.innerWidth);
          const setTravel = () => section.style.setProperty("--travel", `${travel()}px`);
          setTravel();
          window.addEventListener("resize", setTravel);
          // Section height must be correct before ScrollTrigger measures anything.
          ScrollTrigger.addEventListener("refreshInit", setTravel);

          const bar = section.querySelector(".moments__progress i");
          const drive = gsap.to(track, {
            x: () => -travel(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.7,
              invalidateOnRefresh: true,
              onUpdate: (self) => bar && gsap.set(bar, { scaleX: self.progress }),
            },
          });

          gsap.from(title.chars, {
            yPercent: 110,
            stagger: 0.04,
            duration: 1.4,
            scrollTrigger: { trigger: section, start: "top 70%", toggleActions: "play none none reverse" },
          });

          items.forEach((item, i) => {
            const frame = item.querySelector(".moment__frame");
            const img = item.querySelector("img");
            const meta = item.querySelector(".moment__meta");
            // the image drifts inside its frame — depth without leaving the frame
            gsap.fromTo(
              img,
              { xPercent: 6 },
              {
                xPercent: -6,
                ease: "none",
                scrollTrigger: { trigger: item, containerAnimation: drive, start: "left right", end: "right left", scrub: true },
              }
            );
            // each frame "develops" as it enters, from the side the drive comes from
            gsap
              .timeline({
                scrollTrigger: { trigger: item, containerAnimation: drive, start: "left 98%", end: "left 62%", scrub: true },
              })
              .fromTo(frame, { clipPath: "inset(6% 0% 6% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "power2.out" })
              .from(meta, { opacity: 0, x: 30, ease: "power2.out" }, 0.3);
            // gentle vertical counter-drift so the row never feels like a strip of film
            gsap.to(item, {
              y: (i % 2 ? -1 : 1) * window.innerHeight * 0.04,
              ease: "none",
              scrollTrigger: { trigger: item, containerAnimation: drive, start: "left right", end: "right left", scrub: true },
            });
          });

          const outro = section.querySelectorAll(".moments__outro > *");
          gsap.set(outro, { opacity: 0, xPercent: 20 });
          gsap.to(outro, {
            opacity: 1,
            xPercent: 0,
            stagger: 0.15,
            ease: "none",
            scrollTrigger: { trigger: ".moments__outro", containerAnimation: drive, start: "left 95%", end: "left 55%", scrub: true },
          });

          return () => {
            window.removeEventListener("resize", setTravel);
            ScrollTrigger.removeEventListener("refreshInit", setTravel);
            section.style.removeProperty("--travel");
          };
        }

        // ---------------------------------------------------- narrow: vertical sequence
        gsap.from(title.chars, {
          yPercent: 110,
          stagger: 0.04,
          duration: 1.3,
          scrollTrigger: { trigger: section, start: "top 75%" },
        });
        items.forEach((item) => {
          const frame = item.querySelector(".moment__frame");
          const img = item.querySelector("img");
          const meta = item.querySelector(".moment__meta");
          const fromEnd = item.dataset.align === "e";
          gsap
            .timeline({ scrollTrigger: { trigger: item, start: "top 88%", toggleActions: "play none none none" } })
            .fromTo(
              frame,
              { clipPath: fromEnd ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" },
              { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "lift" }
            )
            .fromTo(img, { scale: 1.3 }, { scale: 1.1, duration: 1.8, ease: "lift" }, 0)
            .from(meta, { opacity: 0, y: 10, duration: 0.8 }, 0.5);
          // slow parallax inside the frame while scrolling past
          gsap.fromTo(
            img,
            { yPercent: -4 },
            { yPercent: 4, ease: "none", scrollTrigger: { trigger: item, start: "top bottom", end: "bottom top", scrub: true } }
          );
        });
        gsap.from(section.querySelectorAll(".moments__outro > *"), {
          opacity: 0,
          y: 30,
          stagger: 0.15,
          scrollTrigger: { trigger: ".moments__outro", start: "top 85%" },
        });
      }
    );
  }

  Damy.initMoments = initMoments;
})((window.Damy = window.Damy || {}));
