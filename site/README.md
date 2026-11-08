# Two-Color Map — Team Architectors

A fully static site (GitHub Pages), with no server or databases. Data is stored in the browser's localStorage.
## What works
- **Infinite Worlds:** World 1 is a trial (2×2 grid, 1 level); subsequent worlds consist of 10 levels each, with 5 worlds for every grid size (3×3, 4×4, 5×5, etc.). Constants are defined at the beginning of `js/levels.js`.
- **Puzzle** (`js/game.js`): Color the regions using 2 colors such that no two adjacent regions share the same color. Levels are generated using a seed, and a solution is guaranteed to exist. The rules are my own interpretation; if they differ from the original, the `generate()` function and the validation logic in `update()` can be adjusted.
- **Stars:** 1 star for completion, 2 stars for finishing within the standard time limit, and 3 stars for achieving the "gold" time limit (thresholds are defined in `levels.js` and can be calibrated).
- **Profiles:** Supports multiple profiles per device, with progress saved to and loaded from a JSON file.
- **Ratings:** Tracks progress, stars, speed, and match ratings (Elo) for each profile on the device.
- **Competitions:** Includes "Quick Match" and a 3-puzzle challenge; two players take turns on a single device.
- **Tournaments:** Knockout and round-robin formats, supporting up to 16 participants; matches are played directly within the browser.

- **Themes and Languages:** Light/dark theme (toggle via the ☀/☾ button; defaults to the system setting) and 12 supported languages: Ukrainian, English, Spanish, German, Japanese, French, Portuguese, Czech, Chinese, Italian, Dutch, and Polish. Translations are located in `js/i18n-data1.js` and `js/i18n-data2.js` (key = Ukrainian text; language order: ua, en, es, de, ja, fr, pt, cs, zh, it, nl, pl). The selection is saved in the browser.
## Limitation
This is a local version: results can be modified via DevTools, and online matches between different devices—as well as shared global leaderboards—are not possible without a server.
## GitHub Pages
Upload the folder contents to the root of the repository, preserving the structure (`css/`, `js/`, `assets/`); go to Settings → Pages → select the `main` branch.