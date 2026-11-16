(function (Damy) {
  "use strict";

  // The story is one continuous state that the sky reads every frame.
  // Stops are anchored to real section positions; between stops values ease smoothly,
  // so the two lights travel continuously through the page instead of jumping per section.

  // ax/ay, bx/by: the two lights in viewport space (-1..1, y up)
  // sync: how aligned their pulses are · orbit: how much they circle each other
  // dim: brightness of the whole world · warmth: how warm everyone else's lights become
  // flow: how strongly scrolling streams the field sideways (the "drive")
  const DEFAULTS = {
    ax: -0.55, ay: 0.42, bx: 0.62, by: -0.12,
    sync: 0, orbit: 0, radius: 0.12, dim: 1, warmth: 0, flow: 0.15,
  };
  const KEYS = Object.keys(DEFAULTS);

  const smooth = (t) => t * t * (3 - 2 * t);

  function createStory() {
    const target = { ...DEFAULTS };
    const stops = []; // { at: () => scrollY, wide: {}, tall: {} }
    let resolved = [];

    function add(at, wide, tall = wide) {
      stops.push({ at, wide, tall });
    }

    function refresh() {
      const portrait = window.innerWidth / window.innerHeight < 0.9;
      // Each stop inherits anything it does not set from the previous stop.
      let carry = { ...DEFAULTS };
      resolved = stops
        .map((s) => ({ y: s.at(), v: portrait ? s.tall : s.wide }))
        .sort((a, b) => a.y - b.y)
        .map((s) => {
          carry = { ...carry, ...s.v };
          return { y: s.y, v: carry };
        });
    }

    function update(scrollY) {
      if (!resolved.length) return target;
      let i = 0;
      while (i < resolved.length - 1 && scrollY >= resolved[i + 1].y) i++;
      const a = resolved[i];
      const b = resolved[Math.min(i + 1, resolved.length - 1)];
      const span = b.y - a.y;
      const t = span > 0 ? smooth(Math.min(1, Math.max(0, (scrollY - a.y) / span))) : 0;
      for (const k of KEYS) target[k] = a.v[k] + (b.v[k] - a.v[k]) * t;
      return target;
    }

    ScrollTrigger.addEventListener("refresh", refresh);
    return { target, add, refresh, update };
  }

  /** Absolute document Y of an element edge, plus an offset in viewport heights. */
  function edge(selector, side = "top", vhOffset = 0) {
    return () => {
      const el = document.querySelector(selector);
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const y = (side === "top" ? r.top : r.bottom) + window.scrollY;
      return y + vhOffset * window.innerHeight;
    };
  }

  Damy.createStory = createStory;
  Damy.edge = edge;
})((window.Damy = window.Damy || {}));
