# Tristan Reyes: portfolio (one-page)

A single-page HTML/CSS/JavaScript portfolio. No build step or account needed
to view it, open `index.html` in any browser, or run a local server for the
smoothest experience (e.g. `python -m http.server 5500`).

## Structure

| File | Purpose |
| --- | --- |
| `index.html` | The whole site: hero, services, proof of work, experience, tools, about, certifications |
| `css/global.css` | Design tokens, header, shared components |
| `css/loader.css` | First-visit greeting loader overlay and its curved exit |
| `css/home.css` | Hero portrait and moving text |
| `css/pages.css` | Section layouts, the Proof of Work carousel, tool tiles |
| `css/tailwind.css` | Compiled Tailwind utilities used sparingly alongside the custom CSS |
| `js/theme-init.js` | Restores the saved theme before first paint |
| `js/loader.js` | Greeting sequence, scroll lock, readiness wait, and loader teardown |
| `js/main.js` | Theme toggle, mobile nav, reveal-on-scroll, counters, and the carousel |

## Previewing the loading screen

The greeting loader only plays on the first entry of a browser session
(`sessionStorage` key `tristan-portfolio-loader-seen-v1`). Append
`?showLoader=1` to the URL to force it again while testing.

## Adding your own images

Nothing breaks while images are missing. Every slot shows a clean labeled
placeholder until you add the real file at the exact path it expects.

- **Portrait:** `assets/images/profile.png`
- **Certificate:** `assets/images/certifications/google-ads-search.png`
- **Proof of Work screenshots:** `assets/images/work/hospitality-campaign.png`, `keyword-research.png`, `search-terms.png`
- **Tool logos:** see `assets/images/tools/README.md` for the full filename list, including the four web-development tiles (HTML, CSS, Java, GitHub)

## Editing contact info

- Email/phone appear in the About section's contact card and in the footer. Search for `reyestristanreyes@gmail.com` and `+639219282896` to update both places.
- The OnlineJobs.ph link in the contact card is a placeholder. Replace the `href` on that link in `index.html` with your real profile URL.
