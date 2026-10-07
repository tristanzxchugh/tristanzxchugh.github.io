/* First-visit greeting loader: seven greetings, then the overlay lifts away
   with a curved lower edge and unmounts itself.

   Whether the loader runs at all is decided before the first paint by the
   inline script in index.html (session-storage key plus ?showLoader=1), which
   marks <html> with .loader-active. This file only plays that marked loader:
   it holds the page at the top, keeps focus out of the covered content, walks
   the greeting sequence, and removes every timer, listener, attribute and node
   it added when the screen has left. */
(() => {
  "use strict";

  const root = document.documentElement;
  const loader = document.querySelector("[data-loader]");
  const words = loader ? [...loader.querySelectorAll("[data-loader-word]")] : [];

  // Not this session's first entry, or the markup is incomplete: drop the
  // overlay and leave the portfolio exactly as it was.
  if (!root.classList.contains("loader-active") || !loader || words.length !== 2) {
    root.classList.remove("loader-active");
    if (loader) loader.remove();
    return;
  }

  const GREETINGS = ["Hello", "Bonjour", "Hola", "Ciao", "Olá", "こんにちは", "Kumusta"];
  const HOLD_FIRST = 400;
  const HOLD_MIDDLE = 280;
  const HOLD_LAST = 650;
  const SWAP_DURATION = 200;
  const EXIT_DURATION = 800;
  const REDUCED_HOLD = 400;
  const REDUCED_EXIT_DURATION = 240;
  const SAFETY_TIMEOUT = 5000;
  const EASE = "cubic-bezier(0.76, 0, 0.24, 1)";
  const SCROLL_KEYS = new Set([" ", "Spacebar", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"]);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const teardowns = [];
  const timers = new Set();
  const startedAt = performance.now();
  const canAnimate = typeof words[0].animate === "function";

  let activeSlot = 0;
  let exiting = false;
  let readyObserver = null;
  let markReady;

  // The hero is what has to be ready: the page itself or the portrait it is
  // waiting on, whichever arrives first.
  const heroPortrait = document.querySelector(".hero [data-portrait-group]");
  const pageReady = new Promise((resolve) => { markReady = resolve; });

  function criticalReady() {
    return document.readyState === "complete" || Boolean(heroPortrait && heroPortrait.dataset.shown);
  }

  function settleReady() {
    if (!criticalReady()) return;
    if (readyObserver) {
      readyObserver.disconnect();
      readyObserver = null;
    }
    markReady();
  }

  if (criticalReady()) settleReady();
  else {
    window.addEventListener("load", settleReady, { once: true });
    if (heroPortrait && "MutationObserver" in window) {
      readyObserver = new MutationObserver(settleReady);
      readyObserver.observe(heroPortrait, { attributes: true, attributeFilter: ["data-shown"] });
    }
  }

  function later(delay, callback) {
    const id = window.setTimeout(() => {
      timers.delete(id);
      callback();
    }, delay);
    timers.add(id);
    return id;
  }

  function wait(delay) {
    return new Promise((resolve) => later(delay, resolve));
  }

  function clearTimers() {
    timers.forEach((id) => window.clearTimeout(id));
    timers.clear();
  }

  function stopWord(word) {
    if (typeof word.getAnimations === "function") {
      word.getAnimations().forEach((animation) => animation.cancel());
    }
  }

  // Both greetings share one grid cell: the incoming word rises into place
  // while the outgoing one fades and drifts up, so the two overlap instead of
  // swapping one after the other.
  function placeGreeting(index, animate) {
    const incoming = words[1 - activeSlot];
    const outgoing = words[activeSlot];

    stopWord(incoming);
    stopWord(outgoing);

    incoming.textContent = GREETINGS[index];
    incoming.classList.add("is-active");
    outgoing.classList.remove("is-active");
    activeSlot = 1 - activeSlot;

    if (!animate || !canAnimate) return;

    incoming.animate(
      [
        { opacity: 0, transform: "translateY(16px)" },
        { opacity: 1, transform: "translateY(0)" }
      ],
      { duration: SWAP_DURATION, easing: EASE, fill: "both" }
    );
    outgoing.animate(
      [
        { opacity: 1, transform: "translateY(0)" },
        { opacity: 0, transform: "translateY(-16px)" }
      ],
      { duration: SWAP_DURATION, easing: EASE, fill: "forwards" }
    );
  }

  async function runSequence() {
    for (let index = 1; index < GREETINGS.length; index += 1) {
      await wait(index === 1 ? HOLD_FIRST : HOLD_MIDDLE);
      if (exiting) return;
      placeGreeting(index, true);
    }

    // Kumusta has landed. It holds, then the page leaves as soon as the hero
    // underneath can stand on its own, never earlier than its own hold and
    // never later than the safety timeout.
    await wait(HOLD_LAST);
    if (exiting) return;

    if (!criticalReady()) {
      await Promise.race([
        pageReady,
        wait(Math.max(0, SAFETY_TIMEOUT - (performance.now() - startedAt)))
      ]);
    }

    if (exiting) return;
    beginExit();
  }

  function beginExit() {
    if (exiting) return;
    exiting = true;
    clearTimers();
    if (readyObserver) {
      readyObserver.disconnect();
      readyObserver = null;
    }
    root.classList.add("loader-leaving");
    loader.classList.add("is-leaving");
    later(reduceMotion.matches ? REDUCED_EXIT_DURATION : EXIT_DURATION, finish);
  }

  function finish() {
    clearTimers();
    teardowns.splice(0).forEach((undo) => undo());
    words.forEach(stopWord);
    root.classList.remove("loader-active", "loader-leaving");
    loader.classList.remove("is-leaving");
    loader.remove();
  }

  function blockScroll(event) {
    event.preventDefault();
  }

  function blockScrollKeys(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!SCROLL_KEYS.has(event.key)) return;
    event.preventDefault();
  }

  // The scrollbar stays where it is so unlocking never shifts the layout;
  // anything that does move the page while the overlay is up is sent back.
  function holdScrollTop() {
    if (window.scrollY <= 0) return;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  }

  function lockPage() {
    const covered = [".skip-link", ".site-header", "main", ".site-footer"]
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    covered.forEach((element) => { element.inert = true; });

    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });
    window.addEventListener("keydown", blockScrollKeys);
    window.addEventListener("scroll", holdScrollTop, { passive: true });

    teardowns.push(() => {
      covered.forEach((element) => { element.inert = false; });
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
      window.removeEventListener("keydown", blockScrollKeys);
      window.removeEventListener("scroll", holdScrollTop);
    });
  }

  lockPage();

  // Whatever else happens, the visitor is handed the page within five seconds.
  later(SAFETY_TIMEOUT, () => {
    if (exiting) return;
    placeGreeting(GREETINGS.length - 1, false);
    beginExit();
  });

  if (reduceMotion.matches) {
    // No multilingual run and no curtain for reduced motion: a static Kumusta,
    // one short hold, one short fade.
    placeGreeting(GREETINGS.length - 1, false);
    later(REDUCED_HOLD, beginExit);
  } else {
    runSequence();
  }
})();
