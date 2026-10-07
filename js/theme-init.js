/* Dark mode is the mandatory starting state, reasserted before the first
   paint. Nothing here is read from localStorage, sessionStorage, cookies or
   prefers-color-scheme: index.html already carries data-theme="dark" on the
   root element, so the first frame can never be light. This file only
   re-applies that state (in case the attribute was ever edited), clears any
   preference a previous version of the site may have stored, and marks the
   document as script-enabled so the theme-independent fallbacks can go. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  root.dataset.theme = "dark";
  try {
    window.localStorage.removeItem("tristan-theme");
  } catch {
    /* Local storage is optional. */
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = "#121210";
})();
