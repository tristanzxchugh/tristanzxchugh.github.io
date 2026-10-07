/* Apply the saved theme before CSS paints, then mark JavaScript available.
   The browser chrome colour is set here too, so it never flashes the wrong
   theme either: index.html carries the light value as the default. */
(() => {
  "use strict";
  const root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  try {
    const saved = window.localStorage.getItem("tristan-theme");
    if (saved === "light" || saved === "dark") root.dataset.theme = saved;
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) root.dataset.theme = "dark";
  } catch {
    /* Local storage is optional. */
  }
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = root.dataset.theme === "dark" ? "#121210" : "#f0eee9";
})();
