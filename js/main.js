/* One-page portfolio interactions. Native anchors remain usable without JavaScript. */
(() => {
  "use strict";

  const root = document.documentElement;
  const header = document.querySelector("[data-header]");
  const navigation = document.getElementById("primary-nav");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const themeToggle = document.querySelector("[data-theme-toggle]");
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const sections = [...document.querySelectorAll("[data-section]")];
  const navLinks = [...document.querySelectorAll('.nav-link[href^="#"]')];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileNavigation = window.matchMedia("(max-width: 72rem)");
  let headerOffset = 104;
  let frameRequested = false;

  const readPreference = (key) => {
    try { return window.localStorage.getItem(key); } catch { return null; }
  };
  const savePreference = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch { /* Optional. */ }
  };

  // Theme portraits
  //
  // The file for the current theme is picked while index.html is still
  // parsing (see the inline script next to the hero portrait), so the first
  // painted frame is never the wrong outfit. From here on we only watch for
  // decode and failure, flag a group with data-shown once its active image is
  // ready, and swap the pair when the theme changes: the outgoing portrait
  // keeps its src and stays visible until the incoming one has decoded, so a
  // toggle cross-fades instead of flashing an empty stage.
  const portraitGroups = [...document.querySelectorAll("[data-portrait-group]")];
  const watchedPortraits = new WeakSet();

  function activePortraitVariant() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function watchPortrait(image) {
    if (watchedPortraits.has(image)) return;
    watchedPortraits.add(image);
    const group = image.closest("[data-portrait-group]");

    image.addEventListener("load", () => revealPortrait(group, image));
    image.addEventListener("error", () => {
      // Only a group that never showed anything falls back, so a failed swap
      // leaves the outfit already on screen in place.
      if (!group || group.dataset.shown) return;
      const slot = group.closest("[data-image-slot]");
      if (slot) slot.dataset.state = "missing";
    });
  }

  function revealPortrait(group, image) {
    if (!group || !image.complete || image.naturalWidth === 0) return;
    // Never show an outfit that belongs to the other theme, however late its
    // load event arrives.
    if (image.dataset.portrait !== activePortraitVariant()) return;
    group.dataset.shown = image.dataset.portrait;
    const slot = group.closest("[data-image-slot]");
    if (slot) slot.dataset.state = "loaded";
  }

  function loadPortrait(image) {
    if (!image || !image.dataset.portraitSrc) return;
    watchPortrait(image);
    if (image.getAttribute("src") !== image.dataset.portraitSrc) {
      image.setAttribute("src", image.dataset.portraitSrc);
    }
    revealPortrait(image.closest("[data-portrait-group]"), image);
  }

  function showActivePortraits() {
    const variant = activePortraitVariant();
    portraitGroups.forEach((group) => {
      loadPortrait(group.querySelector('img[data-portrait="' + variant + '"]'));
    });
  }

  // Only warm up the other outfit when someone actually reaches for the
  // theme toggle, and never on a connection that should not pay for a second
  // multi-megabyte portrait.
  function prefetchOtherPortraits() {
    const connection = navigator.connection;
    if (connection && (connection.saveData || /^(slow-2g|2g)$/.test(connection.effectiveType || ""))) return;
    const variant = activePortraitVariant() === "dark" ? "light" : "dark";
    portraitGroups.forEach((group) => {
      const image = group.querySelector('img[data-portrait="' + variant + '"]');
      if (image && !image.getAttribute("src")) loadPortrait(image);
    });
  }

  function applyTheme(theme, persist = false) {
    const isDark = theme === "dark";
    root.dataset.theme = isDark ? "dark" : "light";
    if (themeColor) themeColor.content = isDark ? "#121210" : "#f0eee9";
    if (themeToggle) {
      const label = isDark ? "Switch to light mode" : "Switch to dark mode";
      themeToggle.setAttribute("aria-label", label);
      themeToggle.title = label;
    }
    showActivePortraits();
    if (persist) savePreference("tristan-theme", root.dataset.theme);
  }

  applyTheme(root.dataset.theme);
  if (themeToggle) {
    themeToggle.hidden = false;
    themeToggle.addEventListener("click", (event) => {
      applyTheme(root.dataset.theme === "dark" ? "light" : "dark", true);
      if (event.detail !== 0) themeToggle.blur();
    });
    // Start the other portrait as soon as a toggle looks likely.
    themeToggle.addEventListener("pointerenter", prefetchOtherPortraits, { once: true });
    themeToggle.addEventListener("focus", prefetchOtherPortraits, { once: true });
  }
  window.addEventListener("storage", (event) => {
    if (event.key === "tristan-theme" || event.key === null) {
      applyTheme(readPreference("tristan-theme"));
    }
  });

  // Header measurement and mobile disclosure
  function measureHeader() {
    if (!header || header.dataset.open === "true") return;
    headerOffset = Math.ceil(header.getBoundingClientRect().bottom + 16);
    root.style.setProperty("--header-height", headerOffset + "px");
  }

  function menuIsOpen() {
    return header?.dataset.open === "true";
  }

  function setMenuOpen(open, restoreFocus = false) {
    if (!header || !menuToggle) return;
    header.dataset.open = String(open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    if (!open) measureHeader();
    if (restoreFocus) menuToggle.focus();
  }

  if (header && navigation && menuToggle) {
    root.classList.add("nav-ready");
    menuToggle.hidden = false;
    menuToggle.addEventListener("click", () => {
      const opening = !menuIsOpen();
      setMenuOpen(opening);
      if (opening) navigation.querySelector("a")?.focus();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuIsOpen()) setMenuOpen(false, true);
    });

    document.addEventListener("click", (event) => {
      if (menuIsOpen() && !header.contains(event.target)) setMenuOpen(false);
    });

    header.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (menuIsOpen() && !header.contains(document.activeElement)) setMenuOpen(false);
      }, 0);
    });

    mobileNavigation.addEventListener("change", () => {
      const restoreFocus = mobileNavigation.matches && navigation.contains(document.activeElement);
      setMenuOpen(false, restoreFocus);
      measureHeader();
    });
setMenuOpen(false);
  }

  // Smooth scroll to section with header offset
  function scrollToSection(id, updateHistory = true) {
    const section = document.getElementById(id);
    if (!section) return;

    measureHeader();
    const rect = section.getBoundingClientRect();
    const targetTop = rect.top + window.scrollY - headerOffset;
    const clampedTop = Math.max(0, targetTop);
    const prefersReduced = reduceMotion.matches;

    if (updateHistory) {
      history.pushState(null, "", "#" + id);
    }

    if (prefersReduced) {
      window.scrollTo(0, clampedTop);
    } else {
      window.scrollTo({ top: clampedTop, behavior: "smooth" });
    }

    section.focus({ preventScroll: true });
  }

  // Same-page navigation: intercept anchor clicks
  document.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) return;

    const anchor = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!anchor || !anchor.hash) return;

    let id;
    try { id = decodeURIComponent(anchor.hash.slice(1)); } catch { return; }
    const destination = document.getElementById(id);
    if (!destination) return;

    event.preventDefault();
    setMenuOpen(false);
    scrollToSection(id, true);
  });

  // Handle initial hash on load
  function handleInitialHash() {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      if (document.getElementById(id)) {
        measureHeader();
        const targetTop = document.getElementById(id).getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo(0, Math.max(0, targetTop));
      }
    }
  }

  // Handle browser back/forward
  window.addEventListener("popstate", () => {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      scrollToSection(id, false);
    }
  });

  // Current section and top progress indicator
  function updateScrollState() {
    frameRequested = false;
    // The probe sits just below the offset used to land on a section, so the
    // section resting under the fixed header is the one marked current even
    // when the last section cannot scroll far enough to reach that offset.
    const probe = headerOffset + 48;
    let current = sections[0]?.id;

    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= probe) {
        current = section.id;
      }
    }

    if (window.scrollY + window.innerHeight >= root.scrollHeight - 3) {
      current = sections.at(-1)?.id;
    }

    navLinks.forEach((link) => {
      if (link.hash === "#" + current) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });

    const maxScroll = Math.max(root.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / maxScroll, 0), 1) * 100;
    root.style.setProperty("--scroll-progress", progress.toFixed(2) + "%");
  }

  function queueScrollState() {
    if (!frameRequested) {
      frameRequested = true;
      window.requestAnimationFrame(updateScrollState);
    }
  }

  window.addEventListener("scroll", queueScrollState, { passive: true });
  window.addEventListener("resize", () => {
    measureHeader();
    queueScrollState();
  }, { passive: true });
  window.addEventListener("hashchange", queueScrollState);

  if ("ResizeObserver" in window && header) {
    new ResizeObserver(() => {
      measureHeader();
      queueScrollState();
    }).observe(header);
  }

  // Header scroll effect
  const headerScrollThreshold = 20;
  window.addEventListener("scroll", () => {
    if (window.scrollY > headerScrollThreshold) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  }, { passive: true });

  // Optional portfolio and tool images
  document.querySelectorAll("[data-image]").forEach((image) => {
    const slot = image.closest("[data-image-slot]");
    if (!slot) return;

    image.classList.add("image-loading");

    const loaded = () => {
      slot.dataset.state = "loaded";
      image.classList.remove("image-loading");
      image.classList.add("image-loaded");
    };
    const missing = () => {
      slot.dataset.state = "missing";
      image.classList.remove("image-loading");
    };
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", missing, { once: true });

    if (image.dataset.imageSrc) image.src = image.dataset.imageSrc;
    if (image.complete && image.getAttribute("src")) {
      if (image.naturalWidth > 0) loaded();
      else missing();
    }
  });

  document.querySelectorAll("[data-tool-logo]").forEach((image) => {
    const slot = image.closest("[data-logo-slot]");
    if (!slot || !image.dataset.logoSrc) return;

    image.classList.add("image-loading");

    image.addEventListener("load", () => {
      slot.dataset.state = "loaded";
      image.classList.remove("image-loading");
      image.classList.add("image-loaded");
    }, { once: true });
    image.addEventListener("error", () => {
      slot.dataset.state = "missing";
      image.classList.remove("image-loading");
    }, { once: true });
    image.src = image.dataset.logoSrc;

    if (image.complete) {
      slot.dataset.state = image.naturalWidth > 0 ? "loaded" : "missing";
      if (image.naturalWidth > 0) {
        image.classList.remove("image-loading");
        image.classList.add("image-loaded");
      } else {
        image.classList.remove("image-loading");
      }
    }
  });

  // IntersectionObserver helper
  function createObserver(callback, options) {
    if (!("IntersectionObserver" in window)) return null;
    const observer = new IntersectionObserver(callback, options);
    return observer;
  }

  // Reveal sections only after this behavior is ready.
  const revealItems = [...document.querySelectorAll(".reveal")];
  if (revealItems.length && !reduceMotion.matches) {
    root.classList.add("reveal-ready");
    const revealObserver = createObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        // Stagger reveal for child elements with [data-stagger]
        const staggerItems = entry.target.querySelectorAll("[data-stagger]");
        staggerItems.forEach((el, i) => {
          el.style.transitionDelay = `${i * 80}ms`;
          requestAnimationFrame(() => el.classList.add("is-visible"));
        });
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    if (revealObserver) revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Metric counters
  const counters = [...document.querySelectorAll("[data-counter]")];
  function formatCounter(element, value) {
    const decimals = Number(element.dataset.counterDecimals || 0);
    const prefix = element.dataset.counterPrefix || "";
    const suffix = element.dataset.counterSuffix || "";
    return prefix + value.toFixed(decimals) + suffix;
  }
  function runCounter(element) {
    if (element.dataset.counted === "true") return;
    element.dataset.counted = "true";
    const target = Number(element.dataset.counter);
    if (!Number.isFinite(target) || reduceMotion.matches) {
      element.textContent = formatCounter(element, target);
      return;
    }

    const start = performance.now();
    const duration = 1050;
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = formatCounter(element, target * eased);
      if (progress < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  if (counters.length) {
    const counterObserver = createObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.65 });
    if (counterObserver) counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(runCounter);
  }

  // Proof of Work track carousel
  // One flex track inside a clipping viewport, moved with translate3d.
  // Arrows, dots, keyboard and swipe all feed the same index, and both ends
  // wrap around. JavaScript only writes the track transform and state
  // attributes; every coordinate stays in CSS.
  function initPowCarousel() {
    const carousel = document.querySelector("[data-carousel]");
    if (!carousel) return;

    const track = carousel.querySelector("[data-pow-track]");
    const slides = [...carousel.querySelectorAll("[data-pow-slide]")];
    const dots = [...carousel.querySelectorAll("[data-pow-dot]")];
    const prevControl = carousel.querySelector("[data-pow-prev]");
    const nextControl = carousel.querySelector("[data-pow-next]");
    if (!track || !slides.length) return;

    const total = slides.length;
    let currentIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    let suppressClick = false;

    function render() {
      track.style.transform = `translate3d(${-currentIndex * 100}%, 0, 0)`;
      slides.forEach((slide, index) => {
        const active = index === currentIndex;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", active ? "false" : "true");
      });
      dots.forEach((dot, index) => {
        const active = index === currentIndex;
        dot.classList.toggle("is-active", active);
        if (active) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function goToIndex(newIndex) {
      currentIndex = ((newIndex % total) + total) % total;
      render();
    }

    // Previous / Next sit below the stage. Both ends wrap, so Next from the
    // last slide returns to the first and Previous from the first reaches
    // the last one.
    if (prevControl) prevControl.addEventListener("click", () => goToIndex(currentIndex - 1));
    if (nextControl) nextControl.addEventListener("click", () => goToIndex(currentIndex + 1));

    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        const index = Number(dot.dataset.powDot);
        if (!Number.isNaN(index)) goToIndex(index);
      });
    });

    // Keyboard navigation while the carousel region holds focus.
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToIndex(currentIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goToIndex(currentIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        goToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        goToIndex(total - 1);
      }
    });

    // Finger swipe (mobile): only take over once the gesture is clearly
    // horizontal, so vertical scrolling through the page stays untouched.
    carousel.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      isSwiping = true;
      suppressClick = false;
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    }, { passive: true });

    carousel.addEventListener("touchend", (event) => {
      if (!isSwiping) return;
      isSwiping = false;
      const dx = event.changedTouches[0].clientX - touchStartX;
      const dy = event.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
      suppressClick = true;
      if (dx < 0) goToIndex(currentIndex + 1);
      else goToIndex(currentIndex - 1);
    }, { passive: true });

    carousel.addEventListener("touchcancel", () => {
      isSwiping = false;
    }, { passive: true });

    // A swipe must not also click whatever sat under the finger.
    carousel.addEventListener("click", (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    // Stop native image dragging from interfering with the carousel.
    carousel.querySelectorAll("img").forEach((img) => {
      img.addEventListener("dragstart", (event) => event.preventDefault());
    });

    render();
  }

  initPowCarousel();

  // Experience accordion: three editorial rows with one story open at a
  // time. The markup already ships with the first entry open, so the first
  // painted frame matches the settled layout; this only keeps the class,
  // aria-expanded and the single-open rule in sync. Because the trigger is a
  // real <button>, Enter and Space come from the browser.
  function initExperienceAccordion() {
    const list = document.querySelector("[data-experience-list]");
    if (!list) return;

    const items = [...list.querySelectorAll("[data-experience-item]")];
    if (!items.length) return;

    function setOpen(item, open) {
      item.classList.toggle("is-open", open);
      const trigger = item.querySelector(".experience-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", String(open));
    }

    items.forEach((item) => {
      const trigger = item.querySelector(".experience-trigger");
      if (!trigger) return;

      // Re-assert the markup state, so class and aria-expanded can never
      // drift apart if the HTML is ever edited by hand.
      setOpen(item, item.classList.contains("is-open"));

      trigger.addEventListener("click", () => {
        // Clicking the open row closes it; opening one closes the rest.
        const shouldOpen = !item.classList.contains("is-open");
        items.forEach((other) => setOpen(other, other === item && shouldOpen));
      });
    });

    if (window.__experienceFallbackTimer) {
      window.clearTimeout(window.__experienceFallbackTimer);
      window.__experienceFallbackTimer = null;
    }
    root.classList.add("experience-ready");
  }

  initExperienceAccordion();

  // Moving hero text: runs by default, pauses only when the tab or the
  // hero itself is out of view, and respects prefers-reduced-motion.
  {
    const updateVisibility = () => {
      root.dataset.pageHidden = String(document.hidden);
    };
    document.addEventListener("visibilitychange", updateVisibility);
    updateVisibility();

    const hero = document.getElementById("home");
    if (hero) {
      const heroObserver = createObserver(([entry]) => {
        root.dataset.heroHidden = String(!entry.isIntersecting);
      }, { threshold: 0 });
      if (heroObserver) heroObserver.observe(hero);
    }
  }

// Interactive trait deck - scattered cards
  function initTraitDeck() {
    const deck = document.querySelector(".trait-deck");
    if (!deck) return;

    const cards = [...deck.querySelectorAll(".trait-card")];
    if (cards.length < 2) return;

    let isAnimating = false;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const depthClasses = ["is-top", "is-back-1", "is-back-2", "is-back-3", "is-hidden-back", "is-hidden-back"];

    function updateDeckClasses() {
      const currentCards = [...deck.querySelectorAll(".trait-card")];
      currentCards.forEach((card, index) => {
        card.classList.remove(...depthClasses);
        const className = depthClasses[index] || depthClasses[depthClasses.length - 1];
        card.classList.add(className);
        card.tabIndex = className === "is-top" ? 0 : -1;
      });
    }

    function cycleTrait() {
      if (isAnimating) return;

      const currentCards = [...deck.querySelectorAll(".trait-card")];
      const topCard = currentCards[0];

      if (!topCard) return;

      // Moving a focused card in the DOM drops focus to the body, so
      // keyboard users get handed straight to the new top card.
      const hadFocus = deck.contains(document.activeElement);

      isAnimating = true;

      const finishCycle = () => {
        deck.appendChild(topCard);
        updateDeckClasses();
        if (hadFocus) deck.querySelector(".trait-card.is-top")?.focus({ preventScroll: true });
      };

      const animateOut = async () => {
        topCard.classList.add("is-animating-out");

        if (reduceMotion) {
          finishCycle();
          topCard.classList.remove("is-animating-out");
          return;
        }

        // 1. Fly the current top card away. The filled animation keeps it
        //    parked (and invisible) while the rest of the deck re-ranks.
        const flyOut = topCard.animate(
          [
            { transform: "translate(0, 0) rotate(2deg)", opacity: 1, offset: 0 },
            { transform: "translate(0, -8px) rotate(3deg)", opacity: 1, offset: 0.15 },
            { transform: "translate(75px, -35px) rotate(10deg)", opacity: 0, offset: 1 }
          ],
          { duration: 420, easing: "cubic-bezier(.4, 0, .2, 1)", fill: "forwards" }
        );
        try { await flyOut.finished; } catch { /* Animation was cancelled. */ }

        // 2. Re-rank the deck while the outgoing card stays hidden.
        finishCycle();

        // 3. Release it on the next frame: the CSS transition now carries it
        //    from the fly-out pose into its new slot without a visible jump,
        //    and cancelling guarantees no stale transform is left behind.
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        topCard.classList.remove("is-animating-out");
        flyOut.cancel();
      };

      animateOut().finally(() => {
        isAnimating = false;
      });
    }

    deck.addEventListener("click", cycleTrait);

    deck.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        cycleTrait();
      }
    });

    updateDeckClasses();
  }

  initTraitDeck();

  // Inline contact form -> Web3Forms (static hosting, no backend).
  // The access key only identifies the receiving mailbox; it is public by
  // design. Where submissions are allowed from is configured afterwards in
  // the Web3Forms dashboard, so no redeploy is needed to change that.
  const ACCESS_KEY_PLACEHOLDER = "PASTE_MY_WEB3FORMS_ACCESS_KEY_HERE";
  const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
  const SUBMIT_TIMEOUT_MS = 20000;
  // Brief fade before the confirmation swaps into the form's footprint.
  const SUCCESS_SWAP_MS = 180;
  // Fade back out of the confirmation when the visitor sends another.
  const RESET_SWAP_MS = 160;

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");
    if (!form) return;

    const live = document.querySelector("[data-contact-live]");
    const alertBox = form.querySelector("[data-contact-alert]");
    const alertText = form.querySelector("[data-contact-alert-text]");
    const alertDetail = form.querySelector("[data-contact-alert-detail]");
    const submitButton = form.querySelector("[data-contact-submit]");
    const submitLabel = form.querySelector("[data-contact-submit-text]");
    const spinner = form.querySelector("[data-contact-spinner]");
    const successPanel = document.querySelector("[data-contact-success]");
    const panelHead = document.querySelector("[data-contact-head]");
    const resetButton = document.querySelector("[data-contact-reset]");
    const keyField = form.querySelector('input[name="access_key"]');
    const fields = [...form.querySelectorAll(".form-field input, .form-field textarea")];

    const requiredMessage = {
      name: "Please enter your full name.",
      email: "Please enter your email address.",
      subject: "Please add a subject.",
      message: "Please write a message.",
    };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // The browser only takes over validation when this script is available;
    // without JavaScript the native constraints on the inputs still apply.
    form.noValidate = true;

    function fieldMessage(input) {
      const value = input.value.trim();
      if (!value) return requiredMessage[input.name] || "Please fill in this field.";
      if (input.name === "email" && !emailPattern.test(value)) {
        return "Please enter a valid email address, for example name@example.com.";
      }
      return "";
    }

    function setFieldError(input, message) {
      const error = document.getElementById(`${input.id}-error`);
      if (message) {
        input.setAttribute("aria-invalid", "true");
        if (error) {
          error.textContent = message;
          error.hidden = false;
        }
      } else {
        input.removeAttribute("aria-invalid");
        if (error) {
          error.textContent = "";
          error.hidden = true;
        }
      }
    }

    function clearFieldErrors() {
      fields.forEach((input) => setFieldError(input, ""));
    }

    function firstInvalidField() {
      let firstInvalid = null;
      fields.forEach((input) => {
        const message = fieldMessage(input);
        setFieldError(input, message);
        if (message && !firstInvalid) firstInvalid = input;
      });
      return firstInvalid;
    }

    function showAlert(detail) {
      alertBox.dataset.state = "visible";
      alertText.textContent =
        "Your message could not be sent right now. Please try again, or contact me directly by email.";
      alertDetail.textContent = detail || "";
      alertDetail.hidden = !detail;
    }

    function clearAlert() {
      alertBox.dataset.state = "hidden";
      alertText.textContent = "";
      alertDetail.textContent = "";
      alertDetail.hidden = true;
    }

    function setSending(sending) {
      submitButton.disabled = sending;
      form.setAttribute("aria-busy", String(sending));
      spinner.hidden = !sending;
      submitLabel.textContent = sending ? "Sending\u2026" : "Send Message";
    }

    function configuredKey() {
      const key = (keyField?.value || "").trim();
      const unusable =
        !key ||
        key === ACCESS_KEY_PLACEHOLDER ||
        /^PASTE_/i.test(key) ||
        /YOUR_ACCESS_KEY/i.test(key) ||
        key.length < 20;
      return unusable ? "" : key;
    }

    function failureDetail(status, message) {
      if (status === 429) {
        return "Too many attempts in a short time. Please wait a moment and try again.";
      }
      if (message && /access key/i.test(message)) {
        return "The access key configured for this form was not accepted.";
      }
      if (message && message.length <= 180) return message;
      if (status >= 500) {
        return "The message service is temporarily unavailable. Please try again shortly.";
      }
      return "The service rejected this submission. Please check the fields and try again.";
    }

    function showSuccess() {
      clearAlert();
      delivered = true;
      // Preserve the form's footprint so the confirmation swaps in without
      // the panel jumping: head + form height, measured while both exist.
      const headHeight = panelHead && !panelHead.hidden
        ? panelHead.getBoundingClientRect().height +
          (parseFloat(getComputedStyle(panelHead).marginBottom) || 0)
        : 0;
      const keepHeight = Math.round(headHeight + form.getBoundingClientRect().height);
      form.classList.add("is-leaving");
      window.setTimeout(() => {
        form.reset();
        clearFieldErrors();
        form.classList.remove("is-leaving");
        form.hidden = true;
        if (panelHead) panelHead.hidden = true;
        successPanel.style.minHeight = keepHeight ? `${keepHeight}px` : "";
        successPanel.hidden = false;
        void successPanel.offsetHeight;
        successPanel.classList.add("is-active");
        if (live) live.textContent = "Message sent successfully.";
        successPanel.focus({ preventScroll: true });
      }, SUCCESS_SWAP_MS);
    }

    fields.forEach((input) => {
      input.addEventListener("input", () => {
        if (input.getAttribute("aria-invalid") === "true") setFieldError(input, fieldMessage(input));
      });
    });

    const retryButton = form.querySelector("[data-contact-retry]");

    let inFlight = false;
    let delivered = false;

    resetButton?.addEventListener("click", () => {
      if (successPanel.hidden) return;
      delivered = false;
      successPanel.classList.remove("is-active");
      window.setTimeout(() => {
        successPanel.hidden = true;
        successPanel.style.minHeight = "";
        clearAlert();
        form.reset();
        clearFieldErrors();
        form.hidden = false;
        if (panelHead) panelHead.hidden = false;
        setSending(false);
        document.getElementById("contact-name")?.focus();
      }, RESET_SWAP_MS);
    });

    retryButton?.addEventListener("click", () => {
      form.requestSubmit();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (inFlight || delivered) return;

      clearAlert();
      const invalid = firstInvalidField();
      if (invalid) {
        invalid.focus();
        return;
      }

      const key = configuredKey();
      if (!key) {
        showAlert("This contact form has not been configured yet, so it cannot deliver messages.");
        if (live) live.textContent = "Your message could not be sent. The contact form is not configured yet.";
        return;
      }

      const values = Object.fromEntries(new FormData(form).entries());
      const payload = {
        ...values,
        access_key: key,
        name: values.name.trim(),
        email: values.email.trim(),
        subject: `Portfolio enquiry: ${values.subject.trim()}`,
        message: values.message.trim(),
        page: window.location.href,
        submitted_at: new Date().toISOString(),
      };

      inFlight = true;
      setSending(true);
      if (live) live.textContent = "Sending your message. Please wait.";

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

      try {
        const response = await fetch(WEB3FORMS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        let result = null;
        try {
          result = await response.json();
        } catch {
          result = null;
        }

        const message = result?.body?.message || result?.message || "";
        const delivered = response.ok && result && (result.success === true || result.success === "true");

        if (delivered) showSuccess();
        else showAlert(failureDetail(response.status, message));
      } catch (error) {
        if (error && error.name === "AbortError") {
          showAlert("The request took too long to complete. Please try again.");
        } else {
          showAlert("We could not reach the message service. Check your connection and try again.");
        }
      } finally {
        clearTimeout(timer);
        setSending(false);
        inFlight = false;
      }
    });
  }

  initContactForm();

  // Contact stage extras: pointer-follow light on the two panels and a
  // one-shot glow when the visitor navigates to the section.
  function initContactSection() {
    const panel = document.querySelector("[data-contact-panel]");
    if (!panel) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (finePointer && !reduceMotion) {
      const zones = [panel.querySelector(".contact-info"), panel.querySelector(".contact-main")]
        .filter(Boolean);
      let frame = 0;
      let pending = null;

      zones.forEach((zone) => {
        zone.addEventListener("pointerenter", () => zone.classList.add("is-pointer"));
        zone.addEventListener("pointerleave", () => zone.classList.remove("is-pointer"));
        zone.addEventListener("pointermove", (event) => {
          pending = { zone, x: event.clientX, y: event.clientY };
          if (frame) return;
          frame = window.requestAnimationFrame(() => {
            frame = 0;
            if (!pending) return;
            const { zone: active, x, y } = pending;
            pending = null;
            const rect = active.getBoundingClientRect();
            active.style.setProperty("--contact-mx", `${Math.round(x - rect.left)}px`);
            active.style.setProperty("--contact-my", `${Math.round(y - rect.top)}px`);
          });
        });
      });
    }

    document.querySelectorAll('a[href="#contact"]').forEach((link) => {
      link.addEventListener("click", () => {
        window.setTimeout(() => {
          panel.classList.remove("is-arrived");
          void panel.offsetWidth;
          panel.classList.add("is-arrived");
        }, reduceMotion ? 0 : 420);
      });
    });

    panel.addEventListener("animationend", (event) => {
      if (event.target === panel && event.animationName === "contact-arrive") {
        panel.classList.remove("is-arrived");
      }
    });
  }

  initContactSection();

  measureHeader();
  updateScrollState();
  handleInitialHash();
  window.addEventListener("load", () => {
    measureHeader();
    // Re-assert the header offset after the browser's own fragment scroll
    // and late layout settle, so deep links land where the scrollspy probes.
    handleInitialHash();
    updateScrollState();
  }, { once: true });

  document.querySelectorAll("[data-year]").forEach((item) => {
    item.textContent = String(new Date().getFullYear());
  });
})();
