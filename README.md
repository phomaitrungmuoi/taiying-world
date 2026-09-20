# Tai Ying's World

Personal website for 黃泰英 (Huang Tai Ying). Traditional Chinese + English, original block-inspired styling, responsive layout, subtle particles, scroll reveals, motion toggle, and email copy buttons. CPE appears only in the About section.

## Preview

Open `index.html`, or run `python3 -m http.server 8000` and visit http://localhost:8000.

## Publish on GitHub Pages

1. Create a public repository named `taiying-world` under `phomaitrungmuoi`.
2. Upload `index.html`, `style.css`, `script.js`, and this README to the repository root, then commit to `main`.
3. Under Settings → Pages, select **Deploy from a branch**, **main**, **/ (root)**, and Save.
4. Once deployment succeeds, the expected address is https://phomaitrungmuoi.github.io/taiying-world/ . This address is not live merely because these files exist.

No build step, framework, npm packages, or secrets are needed. All local references are relative, so project Pages subpaths work.

## Edit

- Text, avatar URL, and contact links: `index.html`
- Palette and layout: `style.css` (`:root` variables)
- Effects and copying: `script.js`

The avatar loads from the public GitHub profile endpoint and falls back to TY if unavailable. Fonts load from Google Fonts, with system fallbacks. For a fully self-contained site, download your avatar as `avatar.png` and change the image source to `./avatar.png`; remove the font import to use system fonts. No official Minecraft assets are included.

Motion respects system reduced-motion settings and can also be paused manually. Content remains readable with JavaScript disabled. Email copying requires HTTPS or localhost and displays an instruction if clipboard access is unavailable.
