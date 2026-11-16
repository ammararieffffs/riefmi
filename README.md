# DAMY — A Journey Of Two (plain HTML)

No npm, no build step. Just files.

- Open `index.html` in a browser (double-click works), or use VS Code Live Server.
- To deploy, upload this whole folder as-is to any static host.

```
index.html            all the content
css/style.css         all the styles
js/smooth.js          smooth scrolling (Lenis) + scroll lock + in-page links
js/story.js           scroll → the story state the two lights follow
js/sky.js             the Three.js night (custom shaders, fallback, cleanup)
js/chapters/*.js      intro · chrome · us · moments · viewer · letter · ending
js/main.js            starts everything, and holds the light positions per chapter
media/                optimised photos and figurines
```

Libraries load from jsDelivr (GSAP 3.15 + ScrollTrigger, SplitText, Flip, Observer,
CustomEase; Three.js r160; Lenis 1.3 for smooth scrolling) and the fonts from Google Fonts, so the first visit needs
internet. Without WebGL the night falls back to a CSS version; with "reduce motion"
turned on, the page becomes a calm, static layout.

Smooth scrolling: tune the glide with `lerp` in `js/smooth.js` (lower = silkier, higher =
snappier). Touch scrolling stays native on phones; reduce-motion turns smoothing off.
